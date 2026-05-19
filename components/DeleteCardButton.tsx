"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteCardButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm("このカードマスターを削除しますか？");
    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/cards/${id}`, {
      method: "DELETE",
      cache: "no-store"
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "削除に失敗しました");
      return;
    }

    router.refresh();
    window.location.reload();
  }

  return (
    <button
      className="btn btnGhost"
      onClick={handleDelete}
      disabled={loading}
      type="button"
      style={{ padding: "8px 10px" }}
    >
      {loading ? "削除中..." : "削除"}
    </button>
  );
}