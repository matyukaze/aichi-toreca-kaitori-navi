import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json({ cards: [] });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase service key が未設定です" },
      { status: 500 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data: cardsByName, error: cardError } = await supabase
    .from("cards")
    .select("*")
    .or(
      `card_name.ilike.%${q}%,card_number.ilike.%${q}%,set_name.ilike.%${q}%,variant.ilike.%${q}%`
    )
    .limit(20);

  if (cardError) {
    return NextResponse.json(
      { error: cardError.message },
      { status: 500 }
    );
  }

  const { data: aliases, error: aliasError } = await supabase
    .from("card_aliases")
    .select("card_id, alias, cards(*)")
    .ilike("alias", `%${q}%`)
    .limit(20);

  if (aliasError) {
    return NextResponse.json(
      { error: aliasError.message },
      { status: 500 }
    );
  }

  const merged = new Map<string, any>();

  for (const card of cardsByName || []) {
    merged.set(card.id, card);
  }

  for (const alias of aliases || []) {
    const card = (alias as any).cards;
    if (card?.id) merged.set(card.id, card);
  }

  return NextResponse.json({
    cards: Array.from(merged.values()).slice(0, 20)
  });
}