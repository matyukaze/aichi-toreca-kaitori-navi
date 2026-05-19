"use client";

import { useState } from "react";

type Candidate = {
  id: string;
  post_id: string;
  card_name: string | null;
  card_number: string | null;
  tcg_type: string | null;
  price_yen: number | null;
  confidence: number | null;
  status: string;
  created_at: string;
};

type CardSearchResult = {
  id: string;
  tcg_type: string;
  card_name: string;
  card_number: string | null;
  rarity: string | null;
  set_name: string | null;
  variant: string | null;
};

type EditableCandidate = {
  id: string;
  checked: boolean;
  card_name: string;
  card_number: string;
  tcg_type: string;
  price_yen: number;
  confidence: number;
};

function yen(value: number) {
  return Number(value || 0).toLocaleString("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  });
}

function getWarnings(row: EditableCandidate) {
  const warnings: string[] = [];

  if (!row.card_name || row.card_name.length <= 2) {
    warnings.push("カード名が短い");
  }

  if (row.price_yen >= 5000000) {
    warnings.push("高額すぎる可能性");
  }

  if (row.price_yen < 1000) {
    warnings.push("価格が低すぎる可能性");
  }

  if (row.confidence < 0.7) {
    warnings.push("信頼度低め");
  }

  if (/未設定|不明/.test(row.card_name)) {
    warnings.push("カード名未確定");
  }

  return warnings;
}

export function CandidateEditor({
  postId,
  candidates
}: {
  postId: string;
  candidates: Candidate[];
}) {
  const [rows, setRows] = useState<EditableCandidate[]>(
    candidates.map((candidate) => ({
      id: candidate.id,
      checked:
        candidate.status !== "registered" &&
        Boolean(candidate.card_name) &&
        Boolean(candidate.price_yen),
      card_name: candidate.card_name || "",
      card_number: candidate.card_number || "",
      tcg_type: candidate.tcg_type || "その他",
      price_yen: Number(candidate.price_yen || 0),
      confidence: Number(candidate.confidence || 0)
    }))
  );

  const [loading, setLoading] = useState(false);
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, CardSearchResult[]>>({});

  function updateRow(
    id: string,
    key: keyof EditableCandidate,
    value: string | number | boolean
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]: key === "price_yen" ? Number(value) : value
            }
          : row
      )
    );
  }

  function applyCard(rowId: string, card: CardSearchResult) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              card_name: card.card_name,
              card_number: card.card_number || "",
              tcg_type: card.tcg_type || row.tcg_type
            }
          : row
      )
    );

    setSuggestions((current) => ({
      ...current,
      [rowId]: []
    }));
  }

  async function searchCards(row: EditableCandidate) {
    const query = row.card_name || row.card_number;

    if (!query.trim()) {
      alert("検索するカード名を入力してください");
      return;
    }

    setSearchingId(row.id);

    const res = await fetch(`/api/cards/search?q=${encodeURIComponent(query)}`, {
      method: "GET",
      cache: "no-store"
    });

    const json = await res.json().catch(() => null);
    setSearchingId(null);

    if (!res.ok) {
      alert(json?.error || "カード検索に失敗しました");
      return;
    }

    setSuggestions((current) => ({
      ...current,
      [row.id]: json.cards || []
    }));
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function checkAll(value: boolean) {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        checked: value
      }))
    );
  }

  async function submit() {
    const selected = rows.filter((row) => row.checked);

    if (selected.length === 0) {
      alert("登録する候補がありません");
      return;
    }

    const risky = selected.filter((row) => getWarnings(row).length > 0);

    if (risky.length > 0) {
      const ok = window.confirm(
        `警告ありの候補が${risky.length}件あります。このまま登録しますか？`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `${selected.length}件を買取価格一覧へ登録しますか？`
      );
      if (!ok) return;
    }

    setLoading(true);

    const res = await fetch(`/api/post-queue/${postId}/confirm-candidates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        rows: selected.map((row) => ({
          card_name: row.card_name,
          card_number: row.card_number || null,
          tcg_type: row.tcg_type,
          price_yen: row.price_yen,
          confidence: row.confidence
        }))
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      alert(json?.error || "登録に失敗しました");
      return;
    }

    alert(`${json.count}件を買取価格へ登録しました`);
    window.location.href = "/prices";
  }

  if (rows.length === 0) {
    return <div className="empty">AI解析候補がありません</div>;
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <button className="btn btnGhost" onClick={() => checkAll(true)} type="button">
          全選択
        </button>

        <button className="btn btnGhost" onClick={() => checkAll(false)} type="button">
          全解除
        </button>

        <button
          className="btn btnGreen"
          onClick={submit}
          disabled={loading}
          type="button"
        >
          {loading ? "登録中..." : "チェックした候補を買取価格へ登録"}
        </button>
      </div>

      <div style={{ overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>登録</th>
              <th>カード名 / マスター検索</th>
              <th>型番</th>
              <th>ジャンル</th>
              <th>価格</th>
              <th>信頼度</th>
              <th>警告</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const warnings = getWarnings(row);
              const rowSuggestions = suggestions[row.id] || [];

              return (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.checked}
                      onChange={(event) =>
                        updateRow(row.id, "checked", event.target.checked)
                      }
                      style={{ width: 18, height: 18 }}
                    />
                  </td>

                  <td style={{ minWidth: 260 }}>
                    <input
                      value={row.card_name}
                      onChange={(event) =>
                        updateRow(row.id, "card_name", event.target.value)
                      }
                      placeholder="カード名"
                    />

                    <div style={{ height: 6 }} />

                    <button
                      className="btn btnBlue"
                      onClick={() => searchCards(row)}
                      disabled={searchingId === row.id}
                      type="button"
                      style={{ padding: "7px 9px" }}
                    >
                      {searchingId === row.id ? "検索中..." : "カードマスター検索"}
                    </button>

                    {rowSuggestions.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#fff"
                        }}
                      >
                        {rowSuggestions.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => applyCard(row.id, card)}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 10px",
                              border: 0,
                              borderBottom: "1px solid #e5e7eb",
                              background: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            <strong>{card.card_name}</strong>
                            <br />
                            <span className="mini">
                              {card.tcg_type} / {card.card_number || "-"} /{" "}
                              {card.rarity || "-"} / {card.set_name || "-"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  <td>
                    <input
                      value={row.card_number}
                      onChange={(event) =>
                        updateRow(row.id, "card_number", event.target.value)
                      }
                      placeholder="型番"
                    />
                  </td>

                  <td>
                    <select
                      value={row.tcg_type}
                      onChange={(event) =>
                        updateRow(row.id, "tcg_type", event.target.value)
                      }
                    >
                      <option>ポケカ</option>
                      <option>ワンピース</option>
                      <option>BOX</option>
                      <option>ユニアリ</option>
                      <option>遊戯王</option>
                      <option>その他</option>
                    </select>
                  </td>

                  <td>
                    <input
                      type="number"
                      value={row.price_yen}
                      onChange={(event) =>
                        updateRow(row.id, "price_yen", event.target.value)
                      }
                    />
                    <div className="mini">{yen(row.price_yen)}</div>
                  </td>

                  <td>{Math.round(row.confidence * 100)}%</td>

                  <td>
                    {warnings.length === 0 ? (
                      <span className="tag tagGreen">OK</span>
                    ) : (
                      <div style={{ display: "grid", gap: 4 }}>
                        {warnings.map((warning) => (
                          <span key={warning} className="tag tagOrange">
                            {warning}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td>
                    <button
                      className="btn btnGhost"
                      onClick={() => removeRow(row.id)}
                      type="button"
                    >
                      行削除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}