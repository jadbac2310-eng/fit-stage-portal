"use client";

/**
 * 写真を送る前にブラウザの中で小さくする。
 *
 * iPhone の写真は1枚3〜8MBある。Vercel（このアプリが動いているサーバー）は
 * 4.5MBを超えるリクエストをその場で弾くので、大きい写真を選ぶと
 * 「This page couldn't load」になって、何回やっても登録できない。
 * next.config.ts の bodySizeLimit はアプリ側の上限なので、ここは上げられない。
 *
 * アイコンや素材に元の解像度はいらないので、送る前に縮めてしまう。
 * 通信も速くなるし、ストレージも減る。
 *
 * 失敗しても止めない。縮められなかったら元のファイルをそのまま返し、
 * あとはサーバー側のサイズ判定に任せる（黙って写真を捨てない）。
 */

export interface ResizeOptions {
  /** 長辺の最大px。これより大きい写真だけ縮める */
  maxSize: number;
  /** JPEGの画質（0〜1） */
  quality?: number;
  /** この大きさ（バイト）に収まるまで画質を下げる */
  targetBytes?: number;
}

/** 画質を下げながら、目標のバイト数に収まるまで試す回数 */
const MAX_ATTEMPTS = 4;

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap は EXIF の向き（iPhoneの縦写真）も見てくれる。
  // これを使わないと縦で撮った写真が横向きになる。
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 古いブラウザや未対応の形式。下の <img> で読み直す
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像を読み込めませんでした"));
      img.src = url;
    });
  } finally {
    // 読み込み後なら解放してよい（描画はデコード済みの中身を使う）
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function shrinkImage(file: File, options: ResizeOptions): Promise<File> {
  const { maxSize, quality = 0.85, targetBytes } = options;
  if (!file.type.startsWith("image/")) return file;
  // GIF は動くものがあるので触らない（1コマ目だけの静止画になってしまう）
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  try {
    const source = await loadBitmap(file);
    const width  = "width"  in source ? source.width  : 0;
    const height = "height" in source ? source.height : 0;
    if (!width || !height) return file;

    const scale = Math.min(1, maxSize / Math.max(width, height));
    // すでに小さく、容量にも収まっているなら触らない（再圧縮で荒れるだけ）
    if (scale === 1 && (targetBytes == null || file.size <= targetBytes)) return file;

    const canvas = document.createElement("canvas");
    canvas.width  = Math.max(1, Math.round(width  * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // 透過PNGをJPEGにすると黒く沈むので、白い下地を敷く
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    if ("close" in source) source.close();

    let q = quality;
    let blob = await toBlob(canvas, q);
    for (let i = 1; blob && targetBytes != null && blob.size > targetBytes && i < MAX_ATTEMPTS; i++) {
      q = Math.max(0.4, q - 0.15);
      blob = await toBlob(canvas, q);
    }
    if (!blob) return file;
    // 縮めたのに元より大きくなったら元を使う（小さいPNGなどで起こる）
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * 選び直したファイルを <input type="file"> に入れ直す。
 *
 * フォームは input の中身を送るので、縮めたファイルをここに戻さないと
 * 元の大きい写真が送られてしまう。
 * 差し替えに失敗したときは false を返し、呼び出し側で元のまま送らせる。
 */
export function setInputFile(input: HTMLInputElement | null, file: File): boolean {
  if (!input) return false;
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    return input.files.length === 1;
  } catch {
    return false;
  }
}
