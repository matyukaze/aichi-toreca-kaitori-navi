"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnalyzePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);

    const res = await fetch(`/api/post-queue/${id}/analyze`, {
      method: "POST",
      cache: "no-store"
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "解析に失敗しました");
      return;
    }

    alert(`${json.candidate_count}件の候補を作成しました`);
    router.refresh();
    window.location.reload();
  }

  return (
    <button
      className="btn btnBlue"
      onClick={analyze}
      disabled={loading}
      type="button"
      style={{ padding: "8px 10px" }}
    >
      {loading ? "解析中..." : "AI解析"}
    </button>
  );
}