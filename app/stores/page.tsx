import Link from "next/link";
import { getPrices, getShops } from "@/lib/data";
import { yen } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Price = {
  id: string;
  card_name: string;
  card_number: string | null;
  tcg_type: string;
  shop_id: string;
  price_yen: number;
  source: string;
  published_at: string | null;
  valid_label: string | null;
};

function isExpired(price: Price) {
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

export const metadata = {
  title: "愛知県のカードショップ別買取価格 | 愛知トレカ買取ナビ",
  description:
    "愛知県内のカードショップ別に、ポケカ・ワンピースカード・BOXなどの買取価格を確認できます。"
};

export default async function StoresPage() {
  const [shops, prices] = await Promise.all([getShops(), getPrices()]);

  const typedPrices = prices as Price[];

  return (
    <div className="grid grid2">
      <div className="card">
        <h2>愛知県カードショップ一覧</h2>
        <p>
          店舗ごとに、現在有効な買取価格・最高買取・最終更新日を確認できます。
        </p>

        {shops.length === 0 ? (
          <div className="empty">店舗が登録されていません</div>
        ) : (
          <div className="list">
            {shops.map((shop) => {
              const shopPrices = typedPrices.filter(
                (price) => price.shop_id === shop.id
              );

              const activePrices = shopPrices.filter((price) => !isExpired(price));
              const best = [...activePrices].sort(
                (a, b) => b.price_yen - a.price_yen
              )[0];

              const latest = [...shopPrices]
                .filter((price) => price.published_at)
                .sort((a, b) =>
                  String(b.published_at).localeCompare(String(a.published_at))
                )[0];

              return (
                <div
                  className="row"
                  key={shop.id}
                  style={{
                    alignItems: "flex-start"
                  }}
                >
                  <div>
                    <strong>{shop.name}</strong>
                    <small>
                      {shop.area} / {shop.x_handle || "X未登録"} /{" "}
                      {(shop.genres || []).join("・") || "ジャンル未設定"}
                    </small>

                    <p className="mini" style={{ marginTop: 6 }}>
                      有効中：{activePrices.length}件 / 全価格：
                      {shopPrices.length}件
                      <br />
                      最終更新：{latest?.published_at || "-"}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div className="price">
                      {best ? yen(best.price_yen) : "-"}
                    </div>
                    <small>{best ? best.card_name : "有効価格なし"}</small>

                    <div style={{ height: 8 }} />

                    <Link
                      href={`/stores/${shop.id}`}
                      className="btn btnBlue"
                      style={{ padding: "8px 10px" }}
                    >
                      店舗ページ
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>店舗別ページで見る内容</h2>

        <div className="list">
          <div className="row">
            <div>
              <strong>有効中の買取価格</strong>
              <small>期限切れ価格を除外して、今見ても意味がある価格だけ表示</small>
            </div>
            <span className="tag tagGreen">重要</span>
          </div>

          <div className="row">
            <div>
              <strong>店舗内ランキング</strong>
              <small>その店舗で高額買取されているカードを上から確認</small>
            </div>
            <span className="tag tagBlue">SEO向き</span>
          </div>

          <div className="row">
            <div>
              <strong>公式X・投稿元リンク</strong>
              <small>価格の根拠を確認できるようにする</small>
            </div>
            <span className="tag">信用性</span>
          </div>
        </div>
      </div>
    </div>
  );
}