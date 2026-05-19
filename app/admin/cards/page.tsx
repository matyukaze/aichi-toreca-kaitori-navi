import { CardMasterForm } from "./ui";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { DeleteCardButton } from "@/components/DeleteCardButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CardMaster = {
  id: string;
  tcg_type: string;
  card_name: string;
  card_number: string | null;
  rarity: string | null;
  set_name: string | null;
  variant: string | null;
  created_at: string;
};

export const metadata = {
  title: "カードマスター管理 | 愛知トレカ買取ナビ",
  description: "カード名・型番・表記ゆれを管理する画面です。"
};

export default async function CardMasterPage() {
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const cards = (data || []) as CardMaster[];

  return (
    <div className="grid grid2">
      <div className="card">
        <h2>カードマスター登録</h2>
        <p>
          AIが読んだ曖昧なカード名を、正式カード名・型番へ寄せるためのマスターです。
        </p>
        <CardMasterForm />
      </div>

      <div className="card">
        <h2>登録済みカードマスター</h2>

        {cards.length === 0 ? (
          <div className="empty">カードマスターはまだありません</div>
        ) : (
          <div className="list">
            {cards.map((card) => (
              <div className="row" key={card.id}>
                <div>
                  <strong>{card.card_name}</strong>
                  <small>
                    {card.tcg_type} / {card.card_number || "-"} /{" "}
                    {card.rarity || "-"} / {card.set_name || "-"}
                  </small>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}
                >
                  <span className="tag tagBlue">
                    {card.variant || card.tcg_type}
                  </span>

                  <DeleteCardButton id={card.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}