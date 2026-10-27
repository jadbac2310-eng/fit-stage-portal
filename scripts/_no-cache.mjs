// scripts/ から lib/search-console.ts を使うときの next/cache の代わり。
// Next の外では unstable_cache が動かないので、そのまま関数を返す（キャッシュしない）。
export function unstable_cache(fn) {
  return fn;
}
