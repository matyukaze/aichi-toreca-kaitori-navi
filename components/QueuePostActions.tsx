"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QueuePostActions({
  id,
  status
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(nextStatus: string) {
    setLoading(true);

    const res = await fetch(`/api/post-queue/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        status: nextStatus
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "ステータス更新に失敗しました");
      return;
    }

    router.refresh();
    window.location.reload();
  }

  async function deletePost() {
    const ok = window.confirm("この投稿キューを削除しますか？関連するAI候補も削除されます。");
    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/post-queue/${id}`, {
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
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {status !== "ignored" ? (
        <button
          className="btn btnGhost"
          onClick={() => updateStatus("ignored")}
          disabled={loading}
          type="button"
          style={{ padding: "8px 10px" }}
        >
          無視
        </button>
      ) : (
        <button
          className="btn btnBlue"
          onClick={() => updateStatus("unprocessed")}
          disabled={loading}
          type="button"
          style={{ padding: "8px 10px" }}
        >
          未処理に戻す
        </button>
      )}

      {status !== "registered" && (
        <button
          className="btn btnGhost"
          onClick={() => updateStatus("registered")}
          disabled={loading}
          type="button"
          style={{ padding: "8px 10px" }}
        >
          処理済みにする
        </button>
      )}

      <button
        className="btn btnGhost"
        onClick={deletePost}
        disabled={loading}
        type="button"
        style={{ padding: "8px 10px" }}
      >
        削除
      </button>
    </div>
  );
}
