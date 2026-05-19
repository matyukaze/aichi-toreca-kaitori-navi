import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parsePriceText } from "@/lib/price-parser";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

type CandidateRow = {
  card_name: string;
  card_number: string | null;
  tcg_type: string;
  price_yen: number;
  confidence: number;
};

function yenTextToNumber(text: string) {
  const raw = text.replace(/,/g, "").replace(/￥|¥/g, "");

  const man = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*万円/);
  if (man) return Math.round(Number(man[1]) * 10000);

  const yen = raw.match(/([0-9]{4,})\s*円?/);
  if (yen) return Number(yen[1]);

  return null;
}

function extractPriceFallback(text: string): CandidateRow[] {
  const matches =
    text.match(/[0-9]+(?:\.[0-9]+)?\s*万円|[0-9]{4,}\s*円?/g) || [];

  const rows: CandidateRow[] = [];

  matches.forEach((match, index) => {
    const price = yenTextToNumber(match);

    if (!price) return;

    rows.push({
      card_name: `カード名未設定 ${index + 1}`,
      card_number: null,
      tcg_type: "ポケカ",
      price_yen: price,
      confidence: 0.25
    });
  });

  return rows;
}

export async function POST(
  _request: Request,
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

  const sourceText = post.post_text || "";

  let candidates: CandidateRow[] = parsePriceText(sourceText).map((row) => ({
    card_name: row.card_name,
    card_number: row.card_number || null,
    tcg_type: row.tcg_type || "その他",
    price_yen: row.price_yen,
    confidence: 0.65
  }));

  if (candidates.length === 0) {
    candidates = extractPriceFallback(sourceText);
  }

  await supabase
    .from("x_post_price_candidates")
    .delete()
    .eq("post_id", params.id);

  if (candidates.length > 0) {
    const insertRows = candidates.map((row) => ({
      post_id: params.id,
      card_name: row.card_name,
      card_number: row.card_number,
      tcg_type: row.tcg_type,
      price_yen: row.price_yen,
      confidence: row.confidence,
      status: row.confidence >= 0.8 ? "auto_ready" : "pending"
    }));

    const { error: insertError } = await supabase
      .from("x_post_price_candidates")
      .insert(insertRows);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }
  }

  await supabase
    .from("x_post_queue")
    .update({
      status: candidates.length > 0 ? "analyzed" : "needs_review"
    })
    .eq("id", params.id);

  revalidatePath("/admin/queue");

  return NextResponse.json({
    analyzed: true,
    candidate_count: candidates.length,
    candidates
  });
}