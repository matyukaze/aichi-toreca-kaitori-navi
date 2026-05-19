import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function cleanUsername(value: string) {
  return value.replace(/^@/, "").trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const usernameRaw = searchParams.get("username") || "";
  const shopId = searchParams.get("shop_id") || "";

  const username = cleanUsername(usernameRaw);

  if (!username) {
    return NextResponse.json(
      { error: "username が必要です。例: ?username=magiNagoya" },
      { status: 400 }
    );
  }

  if (!process.env.X_BEARER_TOKEN) {
    return NextResponse.json(
      { error: "X_BEARER_TOKEN が未設定です" },
      { status: 500 }
    );
  }

  const url = `https://api.x.com/2/users/by/username/${encodeURIComponent(
    username
  )}?user.fields=id,name,username,verified,profile_image_url`;

  const xRes = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`
    },
    cache: "no-store"
  });

  const xJson = await xRes.json().catch(() => null);

  if (!xRes.ok) {
    return NextResponse.json(
      {
        error: "X APIでユーザー取得に失敗しました",
        status: xRes.status,
        detail: xJson
      },
      { status: xRes.status }
    );
  }

  const user = xJson?.data;

  if (!user?.id) {
    return NextResponse.json(
      {
        error: "XユーザーIDを取得できませんでした",
        detail: xJson
      },
      { status: 404 }
    );
  }

  let updatedShop = null;

  if (shopId) {
    if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "shop_id を指定して保存するには Supabase service key が必要です",
          user
        },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("shops")
      .update({
        x_user_id: user.id,
        x_handle: `@${user.username}`
      })
      .eq("id", shopId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          user
        },
        { status: 500 }
      );
    }

    updatedShop = data;
    revalidatePath("/stores");
    revalidatePath("/admin/queue");
  }

  return NextResponse.json({
    resolved: true,
    user,
    updated_shop: updatedShop
  });
}