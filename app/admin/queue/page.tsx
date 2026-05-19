import Link from "next/link";
import { QueueForm } from "./ui";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getShops } from "@/lib/data";
import { shopOf } from "@/lib/pricing";
import { AnalyzePostButton } from "@/components/AnalyzePostButton";
import { VisionAnalyzeButton } from "@/components/VisionAnalyzeButton";
import { GeminiVisionAnalyzeButton } from "@/components/GeminiVisionAnalyzeButton";
import { CandidateEditor } from "@/components/CandidateEditor";
import { SyncXPostsButton } from "@/components/SyncXPostsButton";
import { QueuePostActions } from "@/components/QueuePostActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QueuePost = {
  id: string;
  shop_id: string;
  source_url: string | null;
  post_text: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

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

const statusTabs = [
  { href: "/admin/queue?status=unprocessed", label: "未処理", value: "unprocessed" },
  { href: "/admin/queue?status=analyzed", label: "解析済み", value: "analyzed" },
  { href: "/admin/queue?status=registered", label: "登録済み", value: "registered" },
  { href: "/admin/queue?status=ignored", label: "無視", value: "ignored" },
  { href: "/admin/queue?status=all", label: "すべて", value: "all" }
];

export const metadata = {
  title: "X投稿キュー | 愛知トレカ買取ナビ",
  description: "愛知県内カードショップ公式Xの買取投稿を処理する管理画面です。"
};

export default async function QueuePage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const currentStatus = searchParams?.status || "unprocessed";

  const shops = await getShops();
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("x_post_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (currentStatus !== "all") {
    query = query.eq("status", currentStatus);
  }

  const { data } = await query;

  const posts = (data || []) as QueuePost[];

  let candidates: Candidate[] = [];

  if (posts.length > 0) {
    const postIds = posts.map((post) => post.id);

    const { data: candidateData } = await supabase
      .from("x_post_price_candidates")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: false });

    candidates = (candidateData || []) as Candidate[];
  }

  return (
    <div className="grid grid2">
      <div className="card">
        <h2>X投稿キュー登録</h2>

        <p>
          手動登録に加えて、X APIで監視店舗の投稿を取得できます。
        </p>

        <div style={{ marginBottom: 12 }}>
          <SyncXPostsButton />
        </div>

        <QueueForm shops={shops} />
      </div>

      <div className="card">
        <h2>未処理・処理待ち投稿</h2>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14
          }}
        >
          {statusTabs.map((tab) => (
            <Link
              key={tab.value}
              href={tab.href}
              className={
                currentStatus === tab.value
                  ? "btn btnDark"
                  : "btn btnGhost"
              }
              style={{ padding: "8px 10px" }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="empty">該当する投稿キューはありません</div>
        ) : (
          <div className="list">
            {posts.map((post) => {
              const shop = shopOf(shops, post.shop_id);
              const postCandidates = candidates.filter(
                (candidate) => candidate.post_id === post.id
              );

              return (
                <div
                  className="row"
                  key={post.id}
                  style={{
                    alignItems: "flex-start",
                    display: "block"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12
                    }}
                  >
                    <div>
                      <strong>{shop.name}</strong>
                      <small>
                        {shop.area} / 状態：{post.status} /{" "}
                        {new Date(post.created_at).toLocaleString("ja-JP")}
                      </small>
                    </div>

                    <span
                      className={
                        post.status === "unprocessed"
                          ? "tag tagOrange"
                          : post.status === "analyzed"
                            ? "tag tagGreen"
                            : post.status === "registered"
                              ? "tag tagGreen"
                              : post.status === "ignored"
                                ? "tag"
                                : post.status === "needs_review"
                                  ? "tag"
                                  : "tag"
                      }
                    >
                      {post.status}
                    </span>
                  </div>

                  {post.post_text && (
                    <p
                      style={{
                        margin: "10px 0",
                        color: "#334155",
                        lineHeight: 1.7
                      }}
                    >
                      {post.post_text}
                    </p>
                  )}

                  {post.source_url && (
                    <p className="mini">投稿URL：{post.source_url}</p>
                  )}

                  {post.image_url && (
                    <p className="mini">画像URL：{post.image_url}</p>
                  )}

                  {post.image_url && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={post.image_url}
                        alt="投稿画像"
                        style={{
                          width: "100%",
                          maxHeight: 260,
                          objectFit: "contain",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          background: "#fff"
                        }}
                      />
                    </div>
                  )}

                  <QueuePostActions id={post.id} status={post.status} />

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap"
                    }}
                  >
                    <AnalyzePostButton id={post.id} />
                    <VisionAnalyzeButton id={post.id} />
                    <GeminiVisionAnalyzeButton id={post.id} />
                  </div>

                  {postCandidates.length > 0 && (
                    <>
                      <div style={{ height: 12 }} />

                      <h4 style={{ margin: 0 }}>AI解析候補の確認・修正</h4>

                      <p className="mini">
                        AIの読み間違いがあれば修正してください。
                        チェックした候補だけ買取価格一覧へ登録します。
                      </p>

                      <CandidateEditor
                        postId={post.id}
                        candidates={postCandidates}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}