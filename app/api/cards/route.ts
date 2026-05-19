import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.card_name || !body?.tcg_type) {
    return NextResponse.json(
      { error: "card_name と tcg_type が必要です" },
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

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .insert({
      tcg_type: body.tcg_type,
      card_name: body.card_name,
      card_number: body.card_number || null,
      rarity: body.rarity || null,
      set_name: body.set_name || null,
      variant: body.variant || null,
      image_url: body.image_url || null,
      language: body.language || "ja"
    })
    .select("*")
    .single();

  if (cardError) {
    return NextResponse.json(
      { error: cardError.message },
      { status: 500 }
    );
  }

  const aliases: string[] = Array.isArray(body.aliases)
    ? body.aliases
    : String(body.aliases || "")
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);

  const uniqueAliases = Array.from(
    new Set([
      body.card_name,
      body.card_number,
      ...aliases
    ].filter(Boolean))
  );

  if (uniqueAliases.length > 0) {
    const { error: aliasError } = await supabase.from("card_aliases").insert(
      uniqueAliases.map((alias) => ({
        card_id: card.id,
        alias
      }))
    );

    if (aliasError) {
      return NextResponse.json(
        { error: aliasError.message, card },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    created: true,
    card
  });
}