import { PriceSearchTable } from "@/components/PriceSearchTable";
import { AdBox } from "@/components/AdBox";
import { getPrices, getShops } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "愛知県内カード買取価格一覧 | 愛知トレカ買取ナビ",
  description:
    "愛知県内のポケカ、ワンピースカード、BOX買取価格を店舗別に比較できます。"
};

export default async function PricesPage() {
  const [prices, shops] = await Promise.all([getPrices(), getShops()]);

  return (
    <>
      <div className="card">
        <h2>愛知県内 買取価格一覧</h2>
        <p>
          カード名・型番・店舗・エリア・ジャンルで検索できます。
          期限切れ価格は通常非表示です。
        </p>

        <PriceSearchTable prices={prices} shops={shops} />
      </div>

      <div style={{ height: 16 }} />

      <AdBox label="価格表下" />
    </>
  );
}