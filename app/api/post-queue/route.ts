import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.shop_id) {
    return NextResponse.json({ error: "shop_id が必要です" }, { status: 400 });
  }

  if (!body?.post_text && !body?.image_url && !body?.source_url) {
    return NextResponse.json(
      { error: "本文・画像URL・投稿URLのいずれかが必要です" },
      { status: 400 }
    );
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase service key が未設定です" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("x_post_queue")
    .insert({
      shop_id: body.shop_id,
      source_url: body.source_url || null,
      post_text: body.post_text || null,
      image_url: body.image_url || null,
      status: "unprocessed",
      posted_at: body.posted_at || null
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/admin/queue");

  return NextResponse.json({
    created: true,
    post: data
  });
}