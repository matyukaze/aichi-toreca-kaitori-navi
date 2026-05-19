"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePriceButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm("この買取価格を削除しますか？");
    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/buy-prices/${id}`, {
      method: "DELETE",
      cache: "no-store"
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
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
      style={{ padding: "8px 10px" }}
    >
      {loading ? "削除中" : "削除"}
    </button>
  );
}