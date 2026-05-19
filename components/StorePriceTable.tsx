"use client";

import { useMemo, useState } from "react";
import { yen } from "@/lib/format";
import {
  getPriceWarnings,
  shouldExcludeFromPublicRanking
} from "@/lib/price-quality";

type StorePrice = {
  id: string;
  card_name: string;
  card_number: string | null;
  tcg_type: string;
  shop_id: string;
  price_yen: number;
  source: string;
  source_url: string | null;
  published_at: string | null;
  valid_label: string | null;
  confidence: number | null;
};

function isExpired(price: StorePrice) {
  if (!price.published_at) return false;

  const today = new Date();
  const published = new Date(price.published_at);

  if (Number.isNaN(published.getTime())) return false;

  const diffMs = today.getTime() - published.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const label = price.valid_label || "";

  if (label.includes("本日")) return diffDays >= 1;
  if (label.includes("7日")) return diffDays >= 7;

  return false;
}

export function StorePriceTable({ prices }: { prices: StorePrice[] }) {
  const [keyword, setKeyword] = useState("");
  const [validFilter, setValidFilter] = useState("active");
  const [qualityFilter, setQualityFilter] = useState("normal");
  const [sort, setSort] = useState("price_desc");

  const filteredPrices = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    let rows = prices.filter((price) => {
      const expired = isExpired(price);
      const needReview = shouldExcludeFromPublicRanking(price);

      const target = [
        price.card_name,
        price.card_number || "",
        price.tcg_type,
        price.source
      ]
        .join(" ")
        .toLowerCase();

      if (q && !target.includes(q)) return false;

      if (validFilter === "active" && expired) return false;
      if (validFilter === "expired" && !expired) return false;

      if (qualityFilter === "normal" && needReview) return false;
      if (qualityFilter === "review" && !needReview) return false;

      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "price_desc") {
        return Number(b.price_yen || 0) - Number(a.price_yen || 0);
      }

      if (sort === "price_asc") {
        return Number(a.price_yen || 0) - Number(b.price_yen || 0);
      }

      if (sort === "date_desc") {
        return String(b.published_at || "").localeCompare(
          String(a.published_at || "")
        );
      }

      if (sort === "date_asc") {
        return String(a.published_at || "").localeCompare(
          String(b.published_at || "")
        );
      }

      if (sort === "name_asc") {
        return a.card_name.localeCompare(b.card_name, "ja");
      }

      return 0;
    });

    return rows;
  }, [prices, keyword, validFilter, qualityFilter, sort]);

  const reviewCount = prices.filter((price) =>
    shouldExcludeFromPublicRanking(price)
  ).length;

  return (
    <div>
      <div className="card" style={{ boxShadow: "none" }}>
        <div className="formGrid">
          <div className="field">
            <label>店舗内検索</label>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="カード名・型番・ジャンル"
            />
          </div>

          <div className="field">
            <label>有効期限</label>
            <select
              value={validFilter}
              onChange={(event) => setValidFilter(event.target.value)}
            >
              <option value="active">有効中のみ</option>
              <option value="expired">期限切れのみ</option>
              <option value="all">全て表示</option>
            </select>
          </div>

          <div className="field">
            <label>品質</label>
            <select
              value={qualityFilter}
              onChange={(event) => setQualityFilter(event.target.value)}
            >
              <option value="normal">通常価格のみ</option>
              <option value="review">要確認のみ</option>
              <option value="all">全て表示</option>
            </select>
          </div>

          <div className="field">
            <label>並び順</label>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="price_desc">価格が高い順</option>
              <option value="price_asc">価格が安い順</option>
              <option value="date_desc">更新日が新しい順</option>
              <option value="date_asc">更新日が古い順</option>
              <option value="name_asc">カード名順</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }} className="mini">
          表示：{filteredPrices.length}件 / 要確認：{reviewCount}件
        </div>
      </div>

      <div style={{ height: 14 }} />

      {filteredPrices.length === 0 ? (
        <div className="empty">条件に一致する買取価格がありません</div>
      ) : (
        <div style={{ overflow: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>順位</th>
                <th>カード</th>
                <th>ジャンル</th>
                <th>買取価格</th>
                <th>更新日</th>
                <th>有効期限</th>
                <th>品質</th>
                <th>根拠</th>
              </tr>
            </thead>

            <tbody>
              {filteredPrices.map((price, index) => {
                const expired = isExpired(price);
                const warnings = getPriceWarnings(price);
                const needReview = shouldExcludeFromPublicRanking(price);

                return (
                  <tr
                    key={price.id}
                    style={{
                      opacity: expired ? 0.45 : 1,
                      background: expired ? "#f8fafc" : "transparent"
                    }}
                  >
                    <td>{index + 1}</td>

                    <td>
                      <strong>{price.card_name}</strong>
                      <br />
                      <span className="muted">{price.card_number || "-"}</span>
                    </td>

                    <td>
                      <span className="tag tagBlue">{price.tcg_type}</span>
                    </td>

                    <td className="price">{yen(price.price_yen)}</td>

                    <td>
                      {price.published_at || "-"}
                      <br />
                      <span className="muted">{price.source}</span>
                    </td>

                    <td>
                      <span
                        className={
                          price.valid_label?.includes("本日")
                            ? "tag tagRed"
                            : price.valid_label?.includes("7日")
                              ? "tag tagGreen"
                              : "tag"
                        }
                      >
                        {price.valid_label || "未設定"}
                      </span>
                    </td>

                    <td>
                      {needReview ? (
                        <div style={{ display: "grid", gap: 4 }}>
                          {warnings.map((warning) => (
                            <span
                              key={warning.code}
                              className={
                                warning.severity === "danger"
                                  ? "tag tagRed"
                                  : "tag tagOrange"
                              }
                            >
                              {warning.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="tag tagGreen">OK</span>
                      )}
                    </td>

                    <td>
                      {price.source_url ? (
                        <a
                          href={price.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="tag"
                        >
                          投稿元
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}