"use client";

import { useMemo, useState } from "react";
import { BuyPrice, Shop } from "@/lib/types";
import { shopOf } from "@/lib/pricing";
import { yen } from "@/lib/format";
import {
  getPriceWarnings,
  shouldExcludeFromPublicRanking
} from "@/lib/price-quality";

function isExpired(price: BuyPrice) {
  if (!price.published_at) return false;

  const today = new Date();
  const published = new Date(price.published_at);

  if (Number.isNaN(published.getTime())) return false;

  const diffMs = today.getTime() - published.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const label = price.valid_label || "";

  if (label.includes("本日")) {
    return diffDays >= 1;
  }

  if (label.includes("7日")) {
    return diffDays >= 7;
  }

  return false;
}

export function PriceSearchTable({
  prices,
  shops
}: {
  prices: BuyPrice[];
  shops: Shop[];
}) {
  const [keyword, setKeyword] = useState("");
  const [area, setArea] = useState("all");
  const [tcgType, setTcgType] = useState("all");
  const [validFilter, setValidFilter] = useState("active");
  const [qualityFilter, setQualityFilter] = useState("normal");
  const [sort, setSort] = useState("price_desc");

  const areas = useMemo(() => {
    return Array.from(new Set(shops.map((shop) => shop.area))).filter(Boolean);
  }, [shops]);

  const tcgTypes = useMemo(() => {
    return Array.from(new Set(prices.map((price) => price.tcg_type))).filter(Boolean);
  }, [prices]);

  const filteredPrices = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    let rows = prices.filter((price) => {
      const shop = shopOf(shops, price.shop_id);
      const expired = isExpired(price);
      const needReview = shouldExcludeFromPublicRanking(price);

      const target = [
        price.card_name,
        price.card_number || "",
        price.tcg_type,
        shop.name,
        shop.area,
        shop.x_handle || "",
        price.source
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedKeyword && !target.includes(normalizedKeyword)) {
        return false;
      }

      if (area !== "all" && shop.area !== area) {
        return false;
      }

      if (tcgType !== "all" && price.tcg_type !== tcgType) {
        return false;
      }

      if (validFilter === "active" && expired) {
        return false;
      }

      if (validFilter === "expired" && !expired) {
        return false;
      }

      if (qualityFilter === "normal" && needReview) {
        return false;
      }

      if (qualityFilter === "review" && !needReview) {
        return false;
      }

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
        return String(b.published_at || "").localeCompare(String(a.published_at || ""));
      }

      if (sort === "date_asc") {
        return String(a.published_at || "").localeCompare(String(b.published_at || ""));
      }

      return 0;
    });

    return rows;
  }, [prices, shops, keyword, area, tcgType, validFilter, qualityFilter, sort]);

  const activeCount = prices.filter((price) => !isExpired(price)).length;
  const expiredCount = prices.filter((price) => isExpired(price)).length;
  const reviewCount = prices.filter((price) =>
    shouldExcludeFromPublicRanking(price)
  ).length;

  return (
    <div>
      <div className="grid grid4">
        <div className="card" style={{ boxShadow: "none" }}>
          <p>表示件数</p>
          <h2>{filteredPrices.length}件</h2>
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <p>有効中</p>
          <h2>{activeCount}件</h2>
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <p>期限切れ</p>
          <h2>{expiredCount}件</h2>
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <p>要確認</p>
          <h2>{reviewCount}件</h2>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div className="card" style={{ boxShadow: "none" }}>
        <div className="formGrid">
          <div className="field">
            <label>キーワード検索</label>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="カード名・型番・店舗名・エリア"
            />
          </div>

          <div className="field">
            <label>エリア</label>
            <select value={area} onChange={(event) => setArea(event.target.value)}>
              <option value="all">全エリア</option>
              {areas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>ジャンル</label>
            <select value={tcgType} onChange={(event) => setTcgType(event.target.value)}>
              <option value="all">全ジャンル</option>
              {tcgTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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
              <option value="price_desc">買取価格が高い順</option>
              <option value="price_asc">買取価格が安い順</option>
              <option value="date_desc">更新日が新しい順</option>
              <option value="date_asc">更新日が古い順</option>
            </select>
          </div>
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
                <th>カード</th>
                <th>ジャンル</th>
                <th>店舗</th>
                <th>エリア</th>
                <th>買取価格</th>
                <th>更新</th>
                <th>有効期限</th>
                <th>品質</th>
              </tr>
            </thead>

            <tbody>
              {filteredPrices.map((price) => {
                const shop = shopOf(shops, price.shop_id);
                const valid = price.valid_label || "未設定";
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
                    <td>
                      <strong>{price.card_name}</strong>
                      <br />
                      <span className="muted">{price.card_number || "-"}</span>
                    </td>

                    <td>
                      <span className="tag tagBlue">{price.tcg_type}</span>
                    </td>

                    <td>
                      {shop.name}
                      <br />
                      <span className="muted">{shop.x_handle || ""}</span>
                    </td>

                    <td>{shop.area}</td>

                    <td className="price">{yen(price.price_yen)}</td>

                    <td>
                      {price.published_at || "-"}
                      <br />
                      <span className="muted">{price.source}</span>
                    </td>

                    <td>
                      <span
                        className={
                          valid.includes("本日")
                            ? "tag tagRed"
                            : valid.includes("7日")
                              ? "tag tagGreen"
                              : "tag"
                        }
                      >
                        {valid}
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