"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConfirmCandidatesButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    const ok = window.confirm("このAI解析候補を買取価格一覧へ登録しますか？");
    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/post-queue/${id}/confirm-candidates`, {
      method: "POST",
      cache: "no-store"
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "候補の登録に失敗しました");
      return;
    }

    alert(`${json.count}件を買取価格へ登録しました`);
    router.refresh();
    window.location.href = "/prices";
  }

  return (
    <button
      className="btn btnGreen"
      onClick={confirm}
      disabled={loading}
      type="button"
      style={{ padding: "8px 10px" }}
    >
      {loading ? "登録中..." : "候補を買取価格へ登録"}
    </button>
  );
}