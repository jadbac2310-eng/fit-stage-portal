"use client";

import { useState, useRef } from "react";
import {
  Plus, Pencil, Trash2, X, Mail, Briefcase, StickyNote,
  Camera, User, Lock, Eye, EyeOff, KeyRound, ShieldCheck,
} from "lucide-react";
import { Member } from "@/lib/members";
import { createMember, updateMemberAction, deleteMemberAction } from "./actions";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";

// ─── アバター選択 ─────────────────────────────────────
function AvatarPicker({ currentSrc, name }: { currentSrc?: string; name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentSrc ?? null);
  const initials = (name ?? "").split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("");

  return (
    <div className="flex flex-col items-center gap-2 mb-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-20 h-20 rounded-full overflow-hidden group cursor-pointer"
        aria-label="写真を選択"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="アバター" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-blue-100 flex items-center justify-center">
            {initials
              ? <span className="text-2xl font-bold text-blue-700">{initials}</span>
              : <User size={32} className="text-blue-300" />}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera size={20} className="text-white" />
          <span className="text-white text-xs mt-1">変更</span>
        </div>
      </button>
      <span className="text-xs text-gray-400">タップして写真を選択</span>
      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPreview(URL.createObjectURL(f));
        }}
      />
    </div>
  );
}

// ─── パスワード入力フィールド ──────────────────────────
function PasswordInput({ name, placeholder }: { name: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ─── パスワードセクション ─────────────────────────────
function PasswordSection({ isEdit, hasPassword }: { isEdit: boolean; hasPassword: boolean }) {
  const [expanded, setExpanded] = useState(!isEdit);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = password !== "" && confirm !== "" && password !== confirm;

  if (isEdit && !expanded) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <Lock size={12} /> パスワード
          </span>
          <div className="flex items-center gap-3">
            {hasPassword
              ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><KeyRound size={11} />設定済み</span>
              : <span className="text-xs text-gray-400">未設定</span>
            }
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {hasPassword ? "変更する" : "設定する"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          <Lock size={12} /> {isEdit ? "新しいパスワード" : "パスワード"}
          {!isEdit && <span className="text-gray-400 font-normal">（任意）</span>}
        </label>
        {isEdit && (
          <button
            type="button"
            onClick={() => { setExpanded(false); setPassword(""); setConfirm(""); }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            キャンセル
          </button>
        )}
      </div>
      <div>
        <PasswordInput name="password" placeholder={isEdit ? "新しいパスワード" : "パスワード（省略可）"} />
        {/* 値追跡用の隠れinputは使わず、直接formDataから取得 */}
      </div>
      <div>
        <PasswordInput name="passwordConfirm" placeholder="パスワードを再入力" />
      </div>
      {mismatch && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          パスワードが一致しません
        </p>
      )}
    </div>
  );
}

// ─── フォーム ─────────────────────────────────────────
function MemberForm({
  defaultValues,
  isEdit = false,
  isAdmin = false,
  onClose,
  action,
  submitLabel,
}: {
  defaultValues?: Partial<Member>;
  isEdit?: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    const pw = (fd.get("password") as string)?.trim();
    const pc = (fd.get("passwordConfirm") as string)?.trim();
    if (pw && pw !== pc) {
      setError("パスワードが一致しません");
      return;
    }
    setError("");
    setLoading(true);
    await action(fd);
    formRef.current?.reset();
    setLoading(false);
    onClose();
  }

  return (
    <form ref={formRef} action={handleSubmit} encType="multipart/form-data" className="space-y-4">
      <AvatarPicker currentSrc={defaultValues?.avatarUrl} name={name} />

      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
          <User size={12} /> 名前 <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田 太郎"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
          <Briefcase size={12} /> 役割
        </label>
        <input
          name="role"
          defaultValue={defaultValues?.role}
          placeholder="トレーナー、マネージャー など"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
          <Mail size={12} /> メールアドレス
        </label>
        <input
          name="email"
          type="email"
          defaultValue={defaultValues?.email}
          placeholder="example@fitstage.jp"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
          <StickyNote size={12} /> メモ
        </label>
        <textarea
          name="note"
          defaultValue={defaultValues?.note}
          rows={2}
          placeholder="備考など（任意）"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {isAdmin && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
              <ShieldCheck size={12} /> 管理者権限
            </span>
            <input
              type="checkbox"
              name="isAdmin"
              defaultChecked={defaultValues?.isAdmin ?? false}
              className="w-4 h-4 accent-blue-600"
            />
          </label>
          <p className="text-xs text-gray-400 mt-1.5">オンにすると管理者として扱われます</p>
        </div>
      )}

      {/* パスワード */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <PasswordSection isEdit={isEdit} hasPassword={!!defaultValues?.authUserId} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition"
        >
          {loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── 担当者カード ─────────────────────────────────────
function MemberCard({ member, isAdmin, currentMemberId }: { member: Member; isAdmin: boolean; currentMemberId?: string }) {

  const [editing, setEditing] = useState(false);
  const boundUpdate = updateMemberAction.bind(null, member.id);

  async function handleDelete() {
    if (confirm(`「${member.name}」を削除しますか？`)) {
      await deleteMemberAction(member.id);
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">担当者を編集</p>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <MemberForm
          defaultValues={member}
          isEdit
          isAdmin={isAdmin}
          onClose={() => setEditing(false)}
          action={boundUpdate}
          submitLabel="保存する"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar name={member.name} src={member.avatarUrl} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-snug">{member.name}</p>
          {member.role && <p className="text-xs text-blue-600 font-medium mt-0.5">{member.role}</p>}
          {member.email && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate">
              <Mail size={10} className="flex-shrink-0" />{member.email}
            </p>
          )}
          {member.note && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{member.note}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {member.isAdmin && (
            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full font-medium">
              <ShieldCheck size={11} /> 管理者
            </span>
          )}
          {member.authUserId
            ? (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                <KeyRound size={11} /> ログイン可
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                <Lock size={11} /> 未設定
              </span>
            )}
        </div>
      </div>

      <div className="flex items-center px-4 pb-3">
        {(isAdmin || member.id === currentMemberId) && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition py-1 px-2 rounded-lg hover:bg-blue-50"
          >
            <Pencil size={11} /> 編集
          </button>
        )}
        {isAdmin && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition py-1 px-2 rounded-lg hover:bg-red-50 ml-auto"
          >
            <Trash2 size={11} /> 削除
          </button>
        )}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function MembersClient({ members, isAdmin, currentMemberId }: { members: Member[]; isAdmin: boolean; currentMemberId?: string }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">担当者マスタ</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length}名登録済み</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
        >
          <Plus size={16} /> 担当者を追加
        </button>
      </div>

      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">新しい担当者</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <MemberForm isAdmin={isAdmin} onClose={() => setShowAdd(false)} action={createMember} submitLabel="追加する" />
        </div>
      )}

      {members.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-sm font-semibold text-gray-600">担当者が登録されていません</p>
          <p className="text-xs text-gray-400 mt-1">最初の担当者を追加しましょう</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <Plus size={15} /> 担当者を追加
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => <MemberCard key={m.id} member={m} isAdmin={isAdmin} currentMemberId={currentMemberId} />)}
        </div>
      )}

      <button
        onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
        aria-label="担当者を追加"
      >
        <Plus size={26} />
      </button>

      {showAdd && (
        <BottomSheet title="新しい担当者" onClose={() => setShowAdd(false)} scrollable>
          <MemberForm isAdmin={isAdmin} onClose={() => setShowAdd(false)} action={createMember} submitLabel="追加する" />
        </BottomSheet>
      )}
    </div>
  );
}
