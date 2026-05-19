import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { yen } from "@/lib/format";
import { StorePriceTable } from "@/components/StorePriceTable";
import { shouldExcludeFromPublicRanking } from "@/lib/price-quality";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Shop = {
  id: string;
  name: string;
  area: string;
  x_handle: string | null;
  x_user_id: string | null;
  priority: boolean | null;
  valid_default: string | null;
  genres: string[] | null;
  watch_enabled: boolean | null;
  last_checked_at: string | null;
};

type Price = {
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

export async function generateMetadata({
  params
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServiceClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!shop) {
    return {
      title: "店舗が見つかりません | 愛知トレカ買取ナビ"
    };
  }

  return {
    title: `${shop.name}のカード買取価格 | 愛知トレカ買取ナビ`,
    description: `${shop.name}のポケカ・ワンピースカード・BOXなどの買取価格を確認できます。`
  };
}

export default async function StoreDetailPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServiceClient();

  const { data: shopData } = await supabase
    .from("shops")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!shopData) {
    notFound();
  }

  const shop = shopData as Shop;

  const { data: pricesData } = await supabase
    .from("buy_prices")
    .select("*")
    .eq("shop_id", shop.id)
    .order("price_yen", { ascending: false })
    .limit(500);

  const prices = (pricesData || []) as Price[];

  const activePrices = prices.filter((price) => !isExpired(price));

  const normalActivePrices = activePrices.filter(
    (price) => !shouldExcludeFromPublicRanking(price)
  );

  const reviewPrices = activePrices.filter((price) =>
    shouldExcludeFromPublicRanking(price)
  );

  const bestPrice = normalActivePrices[0];

  const latestDate =
    [...prices]
      .filter((price) => price.published_at)
      .sort((a, b) =>
        String(b.published_at).localeCompare(String(a.published_at))
      )[0]?.published_at || "-";

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-start"
          }}
        >
          <div>
            <h2>{shop.name}</h2>
            <p>
              {shop.area} / {shop.x_handle || "X未登録"} /{" "}
              {(shop.genres || []).join("・") || "ジャンル未設定"}
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {shop.priority && <span className="tag tagBlue">優先店舗</span>}
              <span className={shop.watch_enabled ? "tag tagGreen" : "tag"}>
                {shop.watch_enabled ? "X監視ON" : "X監視OFF"}
              </span>
              <span className="tag">
                価格有効期限：{shop.valid_default || "未設定"}
              </span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <Link href="/stores" className="btn btnGhost">
              店舗一覧へ戻る
            </Link>

            {shop.x_handle && (
              <>
                <div style={{ height: 8 }} />
                <a
                  href={`https://x.com/${shop.x_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btnBlue"
                >
                  公式Xを開く
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="grid grid4">
        <div className="card">
          <p>有効中価格</p>
          <h2>{normalActivePrices.length}件</h2>
        </div>

        <div className="card">
          <p>要確認価格</p>
          <h2>{reviewPrices.length}件</h2>
        </div>

        <div className="card">
          <p>最高買取</p>
          <h2>{bestPrice ? yen(bestPrice.price_yen) : "-"}</h2>
        </div>

        <div className="card">
          <p>最終更新</p>
          <h2 style={{ fontSize: 18 }}>{latestDate}</h2>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="card">
        <h2>店舗内 買取価格一覧</h2>
        <p>
          店舗内で検索・ソートできます。通常表示では、AI誤読の可能性が高い価格は除外しています。
        </p>

        <StorePriceTable prices={prices} />
      </div>
    </div>
  );
}