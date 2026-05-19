"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShopActions({
  id,
  xHandle,
  watchEnabled
}: {
  id: string;
  xHandle: string | null;
  watchEnabled: boolean | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleWatch() {
    setLoading(true);

    const res = await fetch(`/api/shops/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        watch_enabled: !watchEnabled
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "監視設定の変更に失敗しました");
      return;
    }

    router.refresh();
    window.location.reload();
  }

  async function resolveXUser() {
    if (!xHandle) {
      alert("Xアカウントが未登録です");
      return;
    }

    setLoading(true);

    const username = xHandle.replace("@", "");

    const res = await fetch(
      `/api/x/resolve-user?username=${encodeURIComponent(username)}&shop_id=${encodeURIComponent(id)}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "XユーザーID取得に失敗しました");
      return;
    }

    alert(`XユーザーIDを保存しました: ${json.user?.id}`);
    router.refresh();
    window.location.reload();
  }

  async function resetSeen() {
    const ok = window.confirm("この店舗の取得済み投稿IDをリセットしますか？");
    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/shops/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        last_seen_post_id: null
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "リセットに失敗しました");
      return;
    }

    router.refresh();
    window.location.reload();
  }

  async function deleteShop() {
    const ok = window.confirm("この店舗を削除しますか？関連するキュー投稿も残る場合があります。");
    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/shops/${id}`, {
      method: "DELETE",
      cache: "no-store"
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "店舗削除に失敗しました");
      return;
    }

    router.refresh();
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="btn btnBlue" onClick={resolveXUser} disabled={loading} type="button">
        X ID取得
      </button>

      <button className="btn btnGhost" onClick={toggleWatch} disabled={loading} type="button">
        {watchEnabled ? "監視OFF" : "監視ON"}
      </button>

      <button className="btn btnGhost" onClick={resetSeen} disabled={loading} type="button">
        既読リセット
      </button>

      <button className="btn btnGhost" onClick={deleteShop} disabled={loading} type="button">
        削除
      </button>
    </div>
  );
}