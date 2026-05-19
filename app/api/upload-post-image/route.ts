import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Supabase service key が未設定です" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "画像ファイルがありません" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();

    const ext = file.name.split(".").pop() || "jpg";
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
    const filePath = `x-posts/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      uploaded: true,
      url: data.publicUrl
    });
  } catch (error) {
    console.error("upload-post-image error:", error);

    return NextResponse.json(
      { error: "画像アップロードAPIでエラーが発生しました" },
      { status: 500 }
    );
  }
}