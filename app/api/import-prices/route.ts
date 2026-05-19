import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parsePriceText } from "@/lib/price-parser";
import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase/server";

type ImportRow = {
  card_name: string;
  card_number?: string | null;
  tcg_type: string;
  price_yen: number;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.shop_id || !body?.raw_text) {
    return NextResponse.json(
      { error: "shop_id と raw_text が必要です" },
      { status: 400 }
    );
  }

  const parsedRows: ImportRow[] =
    Array.isArray(body.rows) && body.rows.length > 0
      ? body.rows
      : parsePriceText(body.raw_text);

  const validLabel = /本日|当日|POP掲載日/.test(body.raw_text)
    ? "本日限り"
    : "7日間";

  const publishedAt = new Date().toISOString().slice(0, 10);

  const rows = parsedRows
    .filter((row) => row.card_name && Number(row.price_yen) > 0)
    .map((row) => ({
      card_name: row.card_name,
      card_number: row.card_number || null,
      tcg_type: row.tcg_type || "その他",
      shop_id: body.shop_id,
      price_yen: Number(row.price_yen),
      source: "管理画面取り込み",
      source_url: body.source_url || null,
      published_at: publishedAt,
      valid_label: validLabel
    }));

  if (rows.length === 0) {
    return NextResponse.json({
      added_count: 0,
      stored: false,
      error: "登録できる価格データがありません",
      parsed: []
    });
  }

  if (hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createSupabaseServiceClient();

    for (const row of rows) {
      let deleteQuery = supabase
        .from("buy_prices")
        .delete()
        .eq("shop_id", row.shop_id)
        .eq("card_name", row.card_name)
        .eq("published_at", row.published_at);

      if (row.card_number) {
        deleteQuery = deleteQuery.eq("card_number", row.card_number);
      } else {
        deleteQuery = deleteQuery.is("card_number", null);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message, step: "delete before insert", row },
          { status: 500 }
        );
      }
    }

    const { error } = await supabase.from("buy_prices").insert(rows);

    if (error) {
      return NextResponse.json(
        { error: error.message, parsed: rows },
        { status: 500 }
      );
    }

    await supabase.from("import_logs").insert({
      shop_id: body.shop_id,
      added_count: rows.length,
      raw_text: body.raw_text
    });

    revalidatePath("/");
    revalidatePath("/prices");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }

  return NextResponse.json({
    added_count: rows.length,
    stored: hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    parsed: rows
  });
}