"use client";

import { useState } from "react";

export function CardMasterForm() {
  const [tcgType, setTcgType] = useState("ポケカ");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [rarity, setRarity] = useState("");
  const [setName, setSetName] = useState("");
  const [variant, setVariant] = useState("");
  const [aliases, setAliases] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!cardName.trim()) {
      alert("カード名を入力してください");
      return;
    }

    setLoading(true);
    setMessage("登録中...");

    const res = await fetch("/api/cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        tcg_type: tcgType,
        card_name: cardName,
        card_number: cardNumber,
        rarity,
        set_name: setName,
        variant,
        aliases
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setMessage(json?.error || "登録に失敗しました");
      return;
    }

    setMessage("カードマスターに登録しました。");

    setCardName("");
    setCardNumber("");
    setRarity("");
    setSetName("");
    setVariant("");
    setAliases("");
  }

  return (
    <div>
      <div className="formGrid">
        <div className="field">
          <label>ジャンル</label>
          <select value={tcgType} onChange={(e) => setTcgType(e.target.value)}>
            <option>ポケカ</option>
            <option>ワンピース</option>
            <option>BOX</option>
            <option>ユニアリ</option>
            <option>遊戯王</option>
            <option>その他</option>
          </select>
        </div>

        <div className="field">
          <label>正式カード名</label>
          <input
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="ナンジャモ SAR"
          />
        </div>

        <div className="field">
          <label>型番</label>
          <input
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="350/190"
          />
        </div>

        <div className="field">
          <label>レアリティ</label>
          <input
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
            placeholder="SAR / SR / SEC"
          />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="formGrid">
        <div className="field">
          <label>収録弾</label>
          <input
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            placeholder="シャイニートレジャーex"
          />
        </div>

        <div className="field">
          <label>バリエーション</label>
          <input
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="SAR / PSA10 / コミパラ など"
          />
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="field">
        <label>別名・表記ゆれ</label>
        <textarea
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          placeholder={`ナンジャモ\nナンジャモSAR\n350/190\nシャイニートレジャー ナンジャモ`}
        />
      </div>

      <div style={{ height: 12 }} />

      <button
        className="btn btnGreen"
        onClick={submit}
        disabled={loading}
        type="button"
      >
        {loading ? "登録中..." : "カードマスターに登録"}
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