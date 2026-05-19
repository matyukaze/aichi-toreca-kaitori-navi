import { BuyPrice, Shop } from "@/lib/types";
import { shopOf } from "@/lib/pricing";
import { yen } from "@/lib/format";
import { DeletePriceButton } from "@/components/DeletePriceButton";

export function PriceTable({
  prices,
  shops
}: {
  prices: BuyPrice[];
  shops: Shop[];
}) {
  if (!prices.length) {
    return <div className="empty">買取価格がありません</div>;
  }

  return (
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
            <th>操作</th>
          </tr>
        </thead>

        <tbody>
          {prices.map((price) => {
            const shop = shopOf(shops, price.shop_id);
            const valid = price.valid_label || "未設定";

            return (
              <tr key={price.id}>
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
                      valid.includes("本日") ? "tag tagRed" : "tag tagGreen"
                    }
                  >
                    {valid}
                  </span>
                </td>

                <td>
                  <DeletePriceButton id={price.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}