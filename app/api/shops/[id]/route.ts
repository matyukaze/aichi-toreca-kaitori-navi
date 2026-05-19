import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

function parseGenres(value: unknown) {
  if (Array.isArray(value)) return value;

  return String(value || "")
    .split(/\n|,|、/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function PATCH(
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

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.area !== undefined) updates.area = body.area;
  if (body.x_handle !== undefined) updates.x_handle = body.x_handle || null;
  if (body.x_user_id !== undefined) updates.x_user_id = body.x_user_id || null;
  if (body.priority !== undefined) updates.priority = Boolean(body.priority);
  if (body.valid_default !== undefined) updates.valid_default = body.valid_default || "7日間";
  if (body.genres !== undefined) updates.genres = parseGenres(body.genres);
  if (body.watch_enabled !== undefined) updates.watch_enabled = Boolean(body.watch_enabled);
  if (body.last_seen_post_id !== undefined) updates.last_seen_post_id = body.last_seen_post_id || null;

  const { data, error } = await supabase
    .from("shops")
    .update(updates)
    .eq("id", params.id)
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
    updated: true,
    shop: data
  });
}

export async function DELETE(
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

  const { error } = await supabase
    .from("shops")
    .delete()
    .eq("id", params.id);

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
    deleted: true,
    id: params.id
  });
}