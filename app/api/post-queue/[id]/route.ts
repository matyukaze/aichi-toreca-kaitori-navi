import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!params.id) {
    return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;

  const allowedStatuses = [
    "unprocessed",
    "analyzed",
    "needs_review",
    "registered",
    "ignored"
  ];

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: "不正なstatusです" },
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

  const { error } = await supabase
    .from("x_post_queue")
    .update({ status })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  revalidatePath("/admin/queue");

  return NextResponse.json({
    updated: true,
    id: params.id,
    status
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
    .from("x_post_queue")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  revalidatePath("/admin/queue");

  return NextResponse.json({
    deleted: true,
    id: params.id
  });
}
