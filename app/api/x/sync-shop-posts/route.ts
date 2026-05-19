import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Shop = {
  id: string;
  name: string;
  x_handle: string | null;
  x_user_id: string | null;
  last_seen_post_id: string | null;
  watch_enabled: boolean | null;
};

type XPost = {
  id: string;
  text: string;
  created_at?: string;
  attachments?: {
    media_keys?: string[];
  };
};

type XMedia = {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
};

const INCLUDE_KEYWORDS = [
  "買取",
  "高価買取",
  "買取表",
  "買取情報",
  "買取価格",
  "買取更新",
  "PSA買取",
  "BOX買取"
];

const EXCLUDE_KEYWORDS = [
  "商品情報",
  "販売",
  "販売中",
  "販売開始",
  "入荷",
  "入荷しました",
  "入荷情報",
  "お値段見直し",
  "値下げ",
  "特価",
  "大会",
  "デュエルスペース",
  "求人",
  "営業時間",
  "抽選販売",
  "オリパ販売"
];

function isBuybackPost(text: string) {
  const normalized = text.toLowerCase();

  const hasInclude = INCLUDE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );

  const hasExclude = EXCLUDE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );

  return hasInclude && !hasExclude;
}

function getMediaUrl(post: XPost, mediaList: XMedia[]) {
  const mediaKeys = post.attachments?.media_keys || [];

  for (const key of mediaKeys) {
    const media = mediaList.find((item) => item.media_key === key);

    if (!media) continue;

    if (media.type === "photo" && media.url) {
      return media.url;
    }

    if (media.preview_image_url) {
      return media.preview_image_url;
    }
  }

  return null;
}

function isWithinDays(dateText: string | undefined, days: number) {
  if (!dateText) return false;

  const postedAt = new Date(dateText);
  if (Number.isNaN(postedAt.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - postedAt.getTime();
  const limitMs = days * 24 * 60 * 60 * 1000;

  return diffMs >= 0 && diffMs <= limitMs;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const recentDays = Number(searchParams.get("days") || 7);

  if (!process.env.X_BEARER_TOKEN) {
    return NextResponse.json(
      { error: "X_BEARER_TOKEN が未設定です" },
      { status: 500 }
    );
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase service key が未設定です" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data: shopsData, error: shopsError } = await supabase
    .from("shops")
    .select("id,name,x_handle,x_user_id,last_seen_post_id,watch_enabled")
    .eq("watch_enabled", true)
    .not("x_user_id", "is", null);

  if (shopsError) {
    return NextResponse.json(
      { error: shopsError.message },
      { status: 500 }
    );
  }

  const shops = (shopsData || []) as Shop[];

  let insertedCount = 0;
  const results: any[] = [];

  for (const shop of shops) {
    if (!shop.x_user_id) continue;

    const params = new URLSearchParams({
      max_results: "100",
      "tweet.fields": "created_at,attachments,author_id",
      expansions: "attachments.media_keys",
      "media.fields": "media_key,type,url,preview_image_url"
    });

    if (shop.last_seen_post_id && !force) {
      params.set("since_id", shop.last_seen_post_id);
    }

    const url = `https://api.x.com/2/users/${shop.x_user_id}/tweets?${params.toString()}`;

    const xRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`
      },
      cache: "no-store"
    });

    const xJson = await xRes.json().catch(() => null);

    if (!xRes.ok) {
      results.push({
        shop_id: shop.id,
        shop_name: shop.name,
        ok: false,
        status: xRes.status,
        detail: xJson
      });
      continue;
    }

    const posts = (xJson?.data || []) as XPost[];
    const mediaList = (xJson?.includes?.media || []) as XMedia[];

    let newestPostId = shop.last_seen_post_id;

    let imagePostCount = 0;
    let keywordMatchCount = 0;
    let insertedForShop = 0;
    let alreadyExistingCount = 0;
    let skippedOld = 0;
    let skippedNoImage = 0;
    let skippedKeyword = 0;
    let skippedInsertError = 0;

    for (const post of posts) {
      if (!isWithinDays(post.created_at, recentDays)) {
        skippedOld++;
        continue;
      }

      const imageUrl = getMediaUrl(post, mediaList);
      const keywordMatched = isBuybackPost(post.text);

      if (imageUrl) imagePostCount++;
      if (keywordMatched) keywordMatchCount++;

      if (!imageUrl) {
        skippedNoImage++;
        continue;
      }

      if (!keywordMatched) {
        skippedKeyword++;
        continue;
      }

      const sourceUrl = shop.x_handle
        ? `https://x.com/${shop.x_handle.replace("@", "")}/status/${post.id}`
        : `https://x.com/i/web/status/${post.id}`;

      const { data: existing } = await supabase
        .from("x_post_queue")
        .select("id")
        .eq("x_post_id", post.id)
        .maybeSingle();

      if (existing) {
        alreadyExistingCount++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("x_post_queue")
        .insert({
          x_post_id: post.id,
          shop_id: shop.id,
          source_url: sourceUrl,
          post_text: post.text,
          image_url: imageUrl,
          status: "unprocessed",
          posted_at: post.created_at || null
        });

      if (insertError) {
        skippedInsertError++;
        continue;
      }

      insertedCount++;
      insertedForShop++;
    }

    if (posts[0]?.id) {
      newestPostId = posts[0].id;
    }

    await supabase
      .from("shops")
      .update({
        last_seen_post_id: newestPostId,
        last_checked_at: new Date().toISOString()
      })
      .eq("id", shop.id);

    results.push({
      shop_id: shop.id,
      shop_name: shop.name,
      ok: true,
      force,
      recent_days: recentDays,
      fetched_count: posts.length,
      image_post_count: imagePostCount,
      keyword_match_count: keywordMatchCount,
      inserted_count: insertedForShop,
      already_existing_count: alreadyExistingCount,
      skipped_old: skippedOld,
      skipped_no_image: skippedNoImage,
      skipped_keyword: skippedKeyword,
      skipped_insert_error: skippedInsertError,
      last_seen_post_id: newestPostId
    });
  }

  revalidatePath("/admin/queue");

  return NextResponse.json({
    synced: true,
    force,
    recent_days: recentDays,
    inserted_count: insertedCount,
    results
  });
}