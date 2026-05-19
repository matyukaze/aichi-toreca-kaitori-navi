import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

function makeShopId(name: string, xHandle?: string) {
  const handle = (xHandle || "").replace("@", "").trim();

  if (handle) return handle;

  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return ascii || `shop-${Date.now()}`;
}

function parseGenres(value: unknown) {
  if (Array.isArray(value)) return value;

  return String(value || "")
    .split(/\n|,|、/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.name || !body?.area) {
    return NextResponse.json(
      { error: "店舗名とエリアが必要です" },
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

  const id = body.id || makeShopId(body.name, body.x_handle);

  const { data, error } = await supabase
    .from("shops")
    .upsert(
      {
        id,
        name: body.name,
        area: body.area,
        x_handle: body.x_handle || null,
        x_user_id: body.x_user_id || null,
        priority: Boolean(body.priority),
        valid_default: body.valid_default || "7日間",
        genres: parseGenres(body.genres),
        watch_enabled: body.watch_enabled ?? true
      },
      {
        onConflict: "id"
      }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  revalidatePath("/admin/shops");
  revalidatePath("/stores");
  revalidatePath("/admin/queue");

  return NextResponse.json({
    saved: true,
    shop: data
  });
}