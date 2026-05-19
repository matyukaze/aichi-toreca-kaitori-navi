import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import {
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "@/lib/supabase/server";

type AiCandidate = {
  card_name: string;
  card_number?: string | null;
  tcg_type: string;
  price_yen: number;
  confidence?: number;
};

function stripCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeCandidates(input: unknown): AiCandidate[] {
  if (!Array.isArray(input)) return [];

  const rows: AiCandidate[] = [];

  for (const row of input) {
    if (!row || typeof row !== "object") continue;

    const r = row as Record<string, unknown>;

    const card_name = String(r.card_name || "").trim();
    const card_number = r.card_number ? String(r.card_number).trim() : null;
    const tcg_type = String(r.tcg_type || "その他").trim();
    const price_yen = Number(r.price_yen || 0);
    const confidence = Number(r.confidence ?? 0.5);

    if (!card_name || !price_yen || price_yen <= 0) continue;

    rows.push({
      card_name,
      card_number,
      tcg_type,
      price_yen,
      confidence: Math.max(0, Math.min(1, confidence))
    });
  }

  return rows;
}

function inferMimeType(url: string, contentType: string | null) {
  if (contentType && contentType.startsWith("image/")) return contentType;

  const lower = url.toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";

  return "image/jpeg";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("503") ||
    message.toLowerCase().includes("overloaded") ||
    message.toLowerCase().includes("high demand") ||
    message.toLowerCase().includes("unavailable")
  );
}

async function generateWithRetry({
  ai,
  prompt,
  mimeType,
  base64Image
}: {
  ai: GoogleGenAI;
  prompt: string;
  mimeType: string;
  base64Image: string;
}) {
  const models = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];

  let lastError: unknown = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        });

        return {
          model,
          text: response.text || ""
        };
      } catch (error) {
        lastError = error;

        if (!isRetryableGeminiError(error)) {
          throw error;
        }

        await sleep(1000 * attempt);
      }
    }
  }

  throw lastError;
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

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY が未設定です" },
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

  if (!post.image_url) {
    return NextResponse.json(
      { error: "image_url がありません" },
      { status: 400 }
    );
  }

  if (/x\.com\/.+\/photo\/\d+/i.test(post.image_url)) {
    return NextResponse.json(
      {
        error:
          "x.com の閲覧ページURLでは解析できません。アップロード済み画像URLを使ってください。"
      },
      { status: 400 }
    );
  }

  try {
    const imageResponse = await fetch(post.image_url);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `画像URLを取得できませんでした: ${imageResponse.status}` },
        { status: 500 }
      );
    }

    const contentType = imageResponse.headers.get("content-type");
    const mimeType = inferMimeType(post.image_url, contentType);

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const prompt = `
あなたは日本のトレーディングカードショップの買取表画像を解析するアシスタントです。
画像内にあるカードごとの買取価格を抽出してください。

必ずJSON配列だけを返してください。説明文は不要です。

返す形式:
[
  {
    "card_name": "カード名",
    "card_number": "型番またはnull",
    "tcg_type": "ポケカ",
    "price_yen": 55000,
    "confidence": 0.85
  }
]

ルール:
- price_yen は必ず円の整数にしてください。
  - 5万円 → 50000
  - 8.5万円 → 85000
  - 140万円 → 1400000
- tcg_type は "ポケカ" / "ワンピース" / "BOX" / "ユニアリ" / "遊戯王" / "その他" のいずれか。
- 「最大◯万円」「5%UP」「本日のみ有効」など、カード個別価格ではない文言は除外してください。
- カード名が明確に読めないものは無理に作らないでください。
- 同じカードを重複して返さないでください。
- 価格やカード名が不明確なものは confidence を低めにしてください。
- 画像が買取表でない場合は空配列 [] を返してください。
`;

    const generated = await generateWithRetry({
      ai,
      prompt,
      mimeType,
      base64Image
    });

    const raw = stripCodeFence(generated.text);
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "Geminiの返答をJSONとして解釈できませんでした",
          model: generated.model,
          raw
        },
        { status: 500 }
      );
    }

    const candidates = normalizeCandidates(parsed);

    await supabase
      .from("x_post_price_candidates")
      .delete()
      .eq("post_id", params.id);

    if (candidates.length > 0) {
      const insertRows = candidates.map((row) => ({
        post_id: params.id,
        card_name: row.card_name,
        card_number: row.card_number || null,
        tcg_type: row.tcg_type,
        price_yen: row.price_yen,
        confidence: row.confidence ?? 0.5,
        status: (row.confidence ?? 0.5) >= 0.85 ? "auto_ready" : "pending"
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
      model: generated.model,
      candidate_count: candidates.length,
      candidates
    });
  } catch (error) {
    console.error("gemini-vision-analyze error:", error);

    const message =
      error instanceof Error ? error.message : "Gemini画像解析に失敗しました";

    return NextResponse.json(
      {
        error: message,
        detail: String(error)
      },
      { status: 500 }
    );
  }
}