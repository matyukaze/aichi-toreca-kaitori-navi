"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shop } from "@/lib/types";

export function QueueForm({ shops }: { shops: Shop[] }) {
  const router = useRouter();

  const [shopId, setShopId] = useState(shops[0]?.id || "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [postText, setPostText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File | null) {
    if (!file) return;

    setUploading(true);
    setMessage("画像アップロード中...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-post-image", {
      method: "POST",
      body: formData
    });

    const json = await res.json().catch(() => null);
    setUploading(false);

    if (!res.ok) {
      setMessage(json?.error || "画像アップロードに失敗しました");
      return;
    }

    setImageUrl(json.url);
    setMessage("画像をアップロードしました。");
  }

  async function submit() {
    if (!shopId) {
      alert("店舗を選択してください");
      return;
    }

    setLoading(true);
    setMessage("登録中...");

    const res = await fetch("/api/post-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        shop_id: shopId,
        source_url: sourceUrl,
        image_url: imageUrl,
        post_text: postText
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setMessage(json?.error || "登録に失敗しました");
      return;
    }

    setMessage("未処理投稿キューに登録しました。");
    setSourceUrl("");
    setImageUrl("");
    setPostText("");

    router.refresh();
    window.location.reload();
  }

  return (
    <div>
      <div className="field">
        <label>店舗</label>
        <select value={shopId} onChange={(event) => setShopId(event.target.value)}>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}（{shop.area}）
            </option>
          ))}
        </select>
      </div>

      <div style={{ height: 10 }} />

      <div className="field">
        <label>X投稿URL</label>
        <input
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://x.com/..."
        />
      </div>

      <div style={{ height: 10 }} />

      <div className="field">
        <label>画像ファイル</label>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => uploadImage(event.target.files?.[0] || null)}
        />
      </div>

      {uploading && (
        <>
          <div style={{ height: 10 }} />
          <div className="notice">画像アップロード中...</div>
        </>
      )}

      <div style={{ height: 10 }} />

      <div className="field">
        <label>画像URL</label>
        <input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="画像をアップロードすると自動で入ります"
        />
      </div>

      {imageUrl && (
        <>
          <div style={{ height: 10 }} />
          <img
            src={imageUrl}
            alt="アップロード画像"
            style={{
              width: "100%",
              maxHeight: 260,
              objectFit: "contain",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff"
            }}
          />
        </>
      )}

      <div style={{ height: 10 }} />

      <div className="field">
        <label>投稿本文</label>
        <textarea
          value={postText}
          onChange={(event) => setPostText(event.target.value)}
          placeholder="ポケカ高価買取更新しました、など"
        />
      </div>

      <div style={{ height: 12 }} />

      <button
        className="btn btnGreen"
        onClick={submit}
        disabled={loading || uploading}
        type="button"
      >
        {loading ? "登録中..." : "未処理キューに登録"}
      </button>

      {message && (
        <>
          <div style={{ height: 12 }} />
          <div className="notice">{message}</div>
        </>
      )}
    </div>
  );
}