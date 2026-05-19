"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncXPostsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState<"normal" | "force" | null>(null);
  const [result, setResult] = useState("");

  async function sync(mode: "normal" | "force") {
    setLoading(mode);

    const label =
      mode === "normal"
        ? "新規投稿のみ取得中..."
        : "初回/強制同期中...";

    setResult(label);

    const url =
      mode === "force"
        ? "/api/x/sync-shop-posts?force=1&days=7"
        : "/api/x/sync-shop-posts?days=7";

    const res = await fetch(url, {
      method: "POST",
      cache: "no-store"
    });

    const text = await res.text();

    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {
      setResult(
        `JSONではない返答が返ってきました。\n\nstatus: ${res.status}\n\n${text}`
      );
      setLoading(null);
      alert("X投稿同期に失敗しました。画面下の詳細を確認してください。");
      return;
    }

    setLoading(null);

    setResult(JSON.stringify(json, null, 2));

    if (!res.ok) {
      alert(json?.error || "X投稿同期に失敗しました");
      return;
    }

    alert(`${json.inserted_count}件の投稿をキューに追加しました`);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn btnBlue"
          onClick={() => sync("normal")}
          disabled={loading !== null}
          type="button"
        >
          {loading === "normal" ? "新規取得中..." : "新規投稿のみ同期"}
        </button>

        <button
          className="btn btnGhost"
          onClick={() => sync("force")}
          disabled={loading !== null}
          type="button"
        >
          {loading === "force" ? "強制同期中..." : "初回/強制同期"}
        </button>
      </div>

      <p className="mini" style={{ marginTop: 8 }}>
        通常は「新規投稿のみ同期」を使用。初回セットアップや取り直し時だけ「初回/強制同期」を使います。
        どちらも7日以内の投稿だけキュー登録します。
      </p>

      {result && (
        <pre
          className="notice"
          style={{
            marginTop: 12,
            whiteSpace: "pre-wrap",
            maxHeight: 360,
            overflow: "auto"
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}