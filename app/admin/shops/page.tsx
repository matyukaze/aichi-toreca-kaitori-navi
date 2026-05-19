import { ShopForm } from "./ui";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { ShopActions } from "@/components/ShopActions";

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
  last_seen_post_id: string | null;
  last_checked_at: string | null;
};

export const metadata = {
  title: "店舗管理 | 愛知トレカ買取ナビ",
  description: "監視対象カードショップを管理する画面です。"
};

export default async function AdminShopsPage() {
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase
    .from("shops")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  const shops = (data || []) as Shop[];

  return (
    <div className="grid grid2">
      <div className="card">
        <h2>店舗登録</h2>
        <p>
          愛知県内のカードショップを登録します。Xアカウント登録後、一覧からX ID取得を押してください。
        </p>
        <ShopForm />
      </div>

      <div className="card">
        <h2>登録済み店舗</h2>

        {shops.length === 0 ? (
          <div className="empty">店舗はまだありません</div>
        ) : (
          <div className="list">
            {shops.map((shop) => (
              <div
                className="row"
                key={shop.id}
                style={{
                  display: "block"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap"
                  }}
                >
                  <div>
                    <strong>{shop.name}</strong>
                    <small>
                      {shop.area} / {shop.x_handle || "X未登録"} / X ID:{" "}
                      {shop.x_user_id || "未取得"}
                    </small>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {shop.priority && <span className="tag tagBlue">優先</span>}
                    <span className={shop.watch_enabled ? "tag tagGreen" : "tag"}>
                      {shop.watch_enabled ? "監視ON" : "監視OFF"}
                    </span>
                  </div>
                </div>

                <div style={{ height: 8 }} />

                <p className="mini">
                  ジャンル：{(shop.genres || []).join(" / ") || "-"}
                  <br />
                  有効期限：{shop.valid_default || "-"}
                  <br />
                  最終確認：{shop.last_checked_at
                    ? new Date(shop.last_checked_at).toLocaleString("ja-JP")
                    : "-"}
                  <br />
                  last_seen_post_id：{shop.last_seen_post_id || "-"}
                </p>

                <ShopActions
                  id={shop.id}
                  xHandle={shop.x_handle}
                  watchEnabled={shop.watch_enabled}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}