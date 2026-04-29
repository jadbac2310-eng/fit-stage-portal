"use client";

import { ReactNode } from "react";

export function BottomSheet({
  title,
  onClose,
  children,
  scrollable,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div className="md:hidden">
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className={[
          "fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl p-5 pb-10 shadow-2xl",
          scrollable ? "overflow-y-auto max-h-[92vh]" : "",
        ].join(" ")}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <p className="text-base font-bold text-gray-900 mb-4">{title}</p>
        {children}
      </div>
    </div>
  );
}
