"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";
import { Shop } from "@/lib/types";
import { parsePriceText } from "@/lib/price-parser";

type PreviewRow = {
  id: string;
  checked: boolean;
  card_name: string;
  card_number: string;
  tcg_type: string;
  price_yen: number;
};

const sample = `【ポケカ高価買取】
ナンジャモ SAR 350/190 ￥55,000買取
リーリエの決心 SAR 091/063 140万円買取
ゲッコウガex SAR 090/066 13,000円
OP05-119 モンキー・D・ルフィ SEC 8.5万円
※買取表は本日のみ有効`;

function yenTextToNumber(text: string) {
  const raw = text.replace(/,/g, "").replace(/￥|¥/g, "");

  const man = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*万円/);
  if (man) return Math.round(Number(man[1]) * 10000);

  const yen = raw.match(/([0-9]{4,})\s*円?/);
  if (yen) return Number(yen[1]);

  return null;
}

function extractPricesFromOcr(text: string) {
  const matches = text.match(/[0-9]+(?:\.[0-9]+)?\s*万円|[0-9]{4,}\s*円?/g) || [];

  const prices = matches
    .map((match) => yenTextToNumber(match))
    .filter((value): value is number => Boolean(value && value > 0));

  return prices;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = reject;
    img.src = url;
  });
}

async function createPriceOnlyImage({
  file,
  columns,
  rows,
  topPercent,
  bottomPercent,
  sidePercent
}: {
  file: File;
  columns: number;
  rows: number;
  topPercent: number;
  bottomPercent: number;
  sidePercent: number;
}) {
  const img = await loadImageFromFile(file);

  const sourceWidth = img.naturalWidth;
  const sourceHeight = img.naturalHeight;

  const left = Math.round(sourceWidth * (sidePercent / 100));
  const right = Math.round(sourceWidth * (sidePercent / 100));
  const top = Math.round(sourceHeight * (topPercent / 100));
  const bottom = Math.round(sourceHeight * (bottomPercent / 100));

  const gridWidth = sourceWidth - left - right;
  const gridHeight = sourceHeight - top - bottom;

  const cellWidth = gridWidth / columns;
  const cellHeight = gridHeight / rows;

  const priceCropYRate = 0.70;
  const priceCropHRate = 0.26;

  const scale = 5;
  const outCellWidth = Math.round(cellWidth * scale);
  const outCellHeight = Math.round(cellHeight * priceCropHRate * scale);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outCellWidth * columns;
  outCanvas.height = outCellHeight * rows;

  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("canvas context error");

  outCtx.fillStyle = "white";
  outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  outCtx.imageSmoothingEnabled = false;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const sx = left + x * cellWidth;
      const sy = top + y * cellHeight + cellHeight * priceCropYRate;
      const sw = cellWidth;
      const sh = cellHeight * priceCropHRate;

      const dx = x * outCellWidth;
      const dy = y * outCellHeight;

      outCtx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        dx,
        dy,
        outCellWidth,
        outCellHeight
      );
    }
  }

  const imageData = outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const isRed =
      r > 110 &&
      g < 130 &&
      b < 130 &&
      r > g * 1.15 &&
      r > b * 1.15;

    const isDarkRed =
      r > 80 &&
      g < 90 &&
      b < 90 &&
      r > g * 1.1 &&
      r > b * 1.1;

    if (isRed || isDarkRed) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  outCtx.putImageData(imageData, 0, 0);

  return outCanvas.toDataURL("image/png");
}

export function ImportForm({ shops }: { shops: Shop[] }) {
  const router = useRouter();

  const [shopId, setShopId] = useState(shops[0]?.id || "");
  const [rawText, setRawText] = useState(sample);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [priceOnlyImageUrl, setPriceOnlyImageUrl] = useState("");

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState("");

  const [columns, setColumns] = useState(10);
  const [gridRows, setGridRows] = useState(6);
  const [topPercent, setTopPercent] = useState(12);
  const [bottomPercent, setBottomPercent] = useState(5);
  const [sidePercent, setSidePercent] = useState(10);

  function handleImageChange(file: File | null) {
    setImageFile(file);
    setPriceOnlyImageUrl("");

    if (!file) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setMessage("画像を読み込みました。通常OCRまたは価格専用OCRを実行してください。");
  }

  async function runNormalOcr() {
    if (!imageFile) {
      alert("画像を選択してください");
      return;
    }

    setOcrLoading(true);
    setOcrProgress("OCR準備中...");
    setMessage("通常OCR読み取り中です。");

    try {
      const worker = await createWorker("jpn+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const percent = Math.round((m.progress || 0) * 100);
            setOcrProgress(`文字認識中... ${percent}%`);
          } else if (m.status) {
            setOcrProgress(m.status);
          }
        }
      });

      const result = await worker.recognize(imageFile);
      await worker.terminate();

      const text = result.data.text || "";

      if (!text.trim()) {
        setMessage("OCR結果が空でした。画像が小さい、文字が潰れている、背景が複雑な可能性があります。");
        return;
      }

      setRawText(text);
      setMessage("通常OCR結果をテキスト欄に反映しました。次に解析プレビューを押してください。");
    } catch (error) {
      console.error(error);
      setMessage("OCRに失敗しました。画像を変えるか、テキストを手入力してください。");
    } finally {
      setOcrLoading(false);
      setOcrProgress("");
    }
  }

  async function runPriceOnlyOcr() {
    if (!imageFile) {
      alert("画像を選択してください");
      return;
    }

    setOcrLoading(true);
    setOcrProgress("価格専用画像を生成中...");
    setMessage("価格専用OCRを実行中です。");

    try {
      const priceImage = await createPriceOnlyImage({
        file: imageFile,
        columns,
        rows: gridRows,
        topPercent,
        bottomPercent,
        sidePercent
      });

      setPriceOnlyImageUrl(priceImage);
      setOcrProgress("価格文字をOCR中...");

      const worker = await createWorker("jpn+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const percent = Math.round((m.progress || 0) * 100);
            setOcrProgress(`価格認識中... ${percent}%`);
          } else if (m.status) {
            setOcrProgress(m.status);
          }
        }
      });

      await worker.setParameters({
        tessedit_char_whitelist: "0123456789.万円円¥￥, "
      });

      const result = await worker.recognize(priceImage);
      await worker.terminate();

      const text = result.data.text || "";
      const prices = extractPricesFromOcr(text);

      setRawText(text || "価格OCR結果なし");

      if (prices.length === 0) {
        setRows([]);
        setMessage("価格を読み取れませんでした。行数・上余白・左右余白を調整して再実行してください。");
        return;
      }

      const previewRows: PreviewRow[] = prices.map((price, index) => ({
        id: `${Date.now()}-${index}`,
        checked: true,
        card_name: `カード名未設定 ${index + 1}`,
        card_number: "",
        tcg_type: "ポケカ",
        price_yen: price
      }));

      setRows(previewRows);
      setMessage(`${prices.length}件の価格を読み取りました。カード名を修正して登録してください。`);
    } catch (error) {
      console.error(error);
      setMessage("価格専用OCRに失敗しました。設定を変えるか、テキスト入力で登録してください。");
    } finally {
      setOcrLoading(false);
      setOcrProgress("");
    }
  }

  function analyze() {
    const parsed = parsePriceText(rawText);

    const previewRows: PreviewRow[] = parsed.map((row, index) => ({
      id: `${Date.now()}-${index}`,
      checked: true,
      card_name: row.card_name,
      card_number: row.card_number,
      tcg_type: row.tcg_type,
      price_yen: row.price_yen
    }));

    setRows(previewRows);
    setMessage(`${previewRows.length}件を解析しました。登録前に確認してください。`);
  }

  function updateRow(
    id: string,
    key: keyof PreviewRow,
    value: string | boolean | number
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]: key === "price_yen" ? Number(value) : value
            }
          : row
      )
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function submit() {
    const selectedRows = rows.filter((row) => row.checked);

    if (!shopId) {
      alert("店舗を選択してください");
      return;
    }

    if (selectedRows.length === 0) {
      alert("登録する行がありません");
      return;
    }

    setLoading(true);
    setMessage("登録中...");

    const res = await fetch("/api/import-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        shop_id: shopId,
        raw_text: rawText,
        rows: selectedRows.map((row) => ({
          card_name: row.card_name,
          card_number: row.card_number,
          tcg_type: row.tcg_type,
          price_yen: row.price_yen
        }))
      })
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setMessage(json?.error || "登録に失敗しました");
      return;
    }

    setMessage(`${json.added_count}件の買取価格を登録しました。`);
    router.refresh();

    setTimeout(() => {
      window.location.href = "/prices";
    }, 700);
  }

  return (
    <div>
      <div className="field">
        <label>店舗</label>
        <select value={shopId} onChange={(event) => setShopId(event.target.value)}>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}（{shop.area}）
            </option>
          ))}
        </select>
      </div>

      <div style={{ height: 16 }} />

      <div className="card" style={{ boxShadow: "none" }}>
        <h3>買取表画像OCR</h3>
        <p className="mini">
          通常OCRは画像全体を読みます。magi系の表は「価格専用OCR」を使ってください。
        </p>

        <div className="field">
          <label>買取表画像</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleImageChange(event.target.files?.[0] || null)}
          />
        </div>

        {imageUrl && (
          <>
            <div style={{ height: 12 }} />
            <img
              src={imageUrl}
              alt="買取表プレビュー"
              style={{
                width: "100%",
                maxHeight: 360,
                objectFit: "contain",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#f8fafc"
              }}
            />
          </>
        )}

        <div style={{ height: 14 }} />
        <h4>価格専用OCR設定</h4>

        <div className="formGrid">
          <div className="field">
            <label>列数</label>
            <input
              type="number"
              value={columns}
              onChange={(event) => setColumns(Number(event.target.value))}
            />
          </div>

          <div className="field">
            <label>行数</label>
            <input
              type="number"
              value={gridRows}
              onChange={(event) => setGridRows(Number(event.target.value))}
            />
          </div>

          <div className="field">
            <label>上余白%</label>
            <input
              type="number"
              value={topPercent}
              onChange={(event) => setTopPercent(Number(event.target.value))}
            />
          </div>

          <div className="field">
            <label>下余白%</label>
            <input
              type="number"
              value={bottomPercent}
              onChange={(event) => setBottomPercent(Number(event.target.value))}
            />
          </div>

          <div className="field">
            <label>左右余白%</label>
            <input
              type="number"
              value={sidePercent}
              onChange={(event) => setSidePercent(Number(event.target.value))}
            />
          </div>
        </div>

        <div style={{ height: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btnBlue" onClick={runNormalOcr} disabled={ocrLoading || !imageFile} type="button">
            {ocrLoading ? "OCR中..." : "通常OCR実行"}
          </button>

          <button className="btn btnGreen" onClick={runPriceOnlyOcr} disabled={ocrLoading || !imageFile} type="button">
            {ocrLoading ? "価格OCR中..." : "価格専用OCR実行"}
          </button>

          {ocrProgress && <span className="tag tagOrange">{ocrProgress}</span>}
        </div>

        {priceOnlyImageUrl && (
          <>
            <div style={{ height: 12 }} />
            <h4>価格専用OCR用に切り出した画像</h4>
            <img
              src={priceOnlyImageUrl}
              alt="価格専用OCR画像"
              style={{
                width: "100%",
                maxHeight: 280,
                objectFit: "contain",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#fff"
              }}
            />
          </>
        )}

        <div className="notice warning" style={{ marginTop: 12 }}>
          価格専用OCRで拾えるのは主に価格です。カード名は「カード名未設定」として出るので、確認画面で手修正してください。
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="field">
        <label>OCR済みテキスト / X投稿本文</label>
        <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} />
      </div>

      <div style={{ height: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btnBlue" onClick={analyze} type="button">
          解析プレビュー
        </button>

        <button className="btn btnGreen" onClick={submit} disabled={loading || rows.length === 0} type="button">
          確認した内容で登録
        </button>
      </div>

      {message && (
        <>
          <div style={{ height: 14 }} />
          <div className="notice">{message}</div>
        </>
      )}

      {rows.length > 0 && (
        <>
          <div style={{ height: 18 }} />
          <h3>解析結果の確認・修正</h3>
          <p className="mini">
            OCRミスがあればここで修正してください。チェックを外した行は登録しません。
          </p>

          <div style={{ overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>登録</th>
                  <th>カード名</th>
                  <th>型番</th>
                  <th>ジャンル</th>
                  <th>買取価格</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={(event) => updateRow(row.id, "checked", event.target.checked)}
                        style={{ width: 18, height: 18 }}
                      />
                    </td>

                    <td>
                      <input
                        value={row.card_name}
                        onChange={(event) => updateRow(row.id, "card_name", event.target.value)}
                      />
                    </td>

                    <td>
                      <input
                        value={row.card_number}
                        onChange={(event) => updateRow(row.id, "card_number", event.target.value)}
                      />
                    </td>

                    <td>
                      <select
                        value={row.tcg_type}
                        onChange={(event) => updateRow(row.id, "tcg_type", event.target.value)}
                      >
                        <option>ポケカ</option>
                        <option>ワンピース</option>
                        <option>BOX</option>
                        <option>ユニアリ</option>
                        <option>遊戯王</option>
                        <option>その他</option>
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        value={row.price_yen}
                        onChange={(event) => updateRow(row.id, "price_yen", event.target.value)}
                      />
                    </td>

                    <td>
                      <button className="btn btnGhost" onClick={() => removeRow(row.id)} type="button">
                        行削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}