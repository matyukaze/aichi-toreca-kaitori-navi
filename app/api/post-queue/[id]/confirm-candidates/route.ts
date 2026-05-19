import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

type InputRow = {
  card_name: string;
  card_number?: string | null;
  tcg_type: string;
  price_yen: number;
  confidence?: number | null;
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
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!params.id) {
    return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase service key が未設定です" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);

  const supabase = createSupabaseServiceClient();

  const { data: post, error: postError } = await supabase
    .from("x_post_queue")
    .select("*")
    .eq("id", params.id)
    .single();

  if (postError || !post) {
    return NextResponse.json(
      { error: postError?.message || "投稿が見つかりません" },
      { status: 404 }
    );
  }

  let inputRows: InputRow[] = [];

  if (Array.isArray(body?.rows) && body.rows.length > 0) {
    inputRows = body.rows;
  } else {
    const { data: candidatesData, error: candidatesError } = await supabase
      .from("x_post_price_candidates")
      .select("*")
      .eq("post_id", params.id);

    if (candidatesError) {
      return NextResponse.json(
        { error: candidatesError.message },
        { status: 500 }
      );
    }

    const candidates = (candidatesData || []) as Candidate[];

    inputRows = candidates
      .filter(
        (candidate) =>
          candidate.card_name &&
          candidate.price_yen &&
          Number(candidate.price_yen) > 0
      )
      .map((candidate) => ({
        card_name: candidate.card_name || "",
        card_number: candidate.card_number || null,
        tcg_type: candidate.tcg_type || "その他",
        price_yen: Number(candidate.price_yen || 0),
        confidence: candidate.confidence || 0.5
      }));
  }

  const validRows = inputRows
    .filter((row) => row.card_name && Number(row.price_yen) > 0)
    .map((row) => ({
      card_name: String(row.card_name).trim(),
      card_number: row.card_number ? String(row.card_number).trim() : null,
      tcg_type: row.tcg_type || "その他",
      price_yen: Number(row.price_yen),
      confidence: Number(row.confidence || 0.5)
    }));

  if (validRows.length === 0) {
    return NextResponse.json(
      { error: "登録できる候補がありません" },
      { status: 400 }
    );
  }

  const publishedAt = post.created_at
    ? String(post.created_at).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const validLabel =
    /本日|当日|POP掲載日/.test(post.post_text || "")
      ? "本日限り"
      : "7日間";

  for (const row of validRows) {
    let deleteQuery = supabase
      .from("buy_prices")
      .delete()
      .eq("shop_id", post.shop_id)
      .eq("card_name", row.card_name)
      .eq("published_at", publishedAt);

    if (row.card_number) {
      deleteQuery = deleteQuery.eq("card_number", row.card_number);
    } else {
      deleteQuery = deleteQuery.is("card_number", null);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      return NextResponse.json(
        {
          error: deleteError.message,
          step: "delete before insert",
          row
        },
        { status: 500 }
      );
    }
  }

  const rows = validRows.map((row) => ({
    card_name: row.card_name,
    card_number: row.card_number,
    tcg_type: row.tcg_type,
    shop_id: post.shop_id,
    price_yen: row.price_yen,
    source: "Gemini画像解析",
    source_url: post.source_url || post.image_url || null,
    published_at: publishedAt,
    valid_label: validLabel,
    confidence: row.confidence,
    approved: true
  }));

  const { error: insertError } = await supabase
    .from("buy_prices")
    .insert(rows);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  await supabase
    .from("x_post_price_candidates")
    .update({ status: "registered" })
    .eq("post_id", params.id);

  await supabase
    .from("x_post_queue")
    .update({ status: "registered" })
    .eq("id", params.id);

  revalidatePath("/");
  revalidatePath("/prices");
  revalidatePath("/admin/queue");
  revalidatePath("/dashboard");

  return NextResponse.json({
    registered: true,
    count: rows.length
  });
}