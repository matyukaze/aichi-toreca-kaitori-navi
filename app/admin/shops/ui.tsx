"use client";

import { useState } from "react";

export function ShopForm() {
  const [name, setName] = useState("");
  const [area, setArea] = useState("大須・栄");
  const [xHandle, setXHandle] = useState("");
  const [genres, setGenres] = useState("ポケカ\nワンピース");
  const [validDefault, setValidDefault] = useState("7日間");
  const [priority, setPriority] = useState(false);
  const [watchEnabled, setWatchEnabled] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim()) {
      alert("店舗名を入力してください");
      return;
    }

    setLoading(true);
    setMessage("登録中...");

    const res = await fetch("/api/shops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        area,
        x_handle: xHandle,
        genres,
        valid_default: validDefault,
        priority,
        watch_enabled: watchEnabled
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setMessage(json?.error || "店舗登録に失敗しました");
      return;
    }

    setMessage("店舗を登録しました。必要なら一覧からX ID取得を押してください。");
    setName("");
    setXHandle("");
  }

  return (
    <div>
      <div className="formGrid">
        <div className="field">
          <label>店舗名</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例：magi名古屋PARCO店"
          />
        </div>

        <div className="field">
          <label>エリア</label>
          <select value={area} onChange={(event) => setArea(event.target.value)}>
            <option>大須・栄</option>
            <option>名古屋駅</option>
            <option>岡崎</option>
            <option>安城・刈谷</option>
            <option>豊田</option>
            <option>豊橋</option>
            <option>その他愛知</option>
          </select>
        </div>

        <div className="field">
          <label>Xアカウント</label>
          <input
            value={xHandle}
            onChange={(event) => setXHandle(event.target.value)}
            placeholder="@magiNagoya"
          />
        </div>

        <div className="field">
          <label>価格有効期限デフォルト</label>
          <select
            value={validDefault}
            onChange={(event) => setValidDefault(event.target.value)}
          >
            <option>当日限り</option>
            <option>7日間</option>
            <option>未設定</option>
          </select>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="field">
        <label>得意ジャンル</label>
        <textarea
          value={genres}
          onChange={(event) => setGenres(event.target.value)}
          placeholder="ポケカ&#10;ワンピース&#10;遊戯王"
        />
      </div>

      <div style={{ height: 12 }} />

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={priority}
          onChange={(event) => setPriority(event.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        優先店舗にする
      </label>

      <div style={{ height: 8 }} />

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={watchEnabled}
          onChange={(event) => setWatchEnabled(event.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        X監視を有効にする
      </label>

      <div style={{ height: 12 }} />

      <button className="btn btnGreen" onClick={submit} disabled={loading} type="button">
        {loading ? "登録中..." : "店舗を登録"}
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