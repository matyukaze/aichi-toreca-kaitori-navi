export type ParsedPrice = {
  card_name: string;
  card_number: string;
  tcg_type: string;
  price_yen: number;
};

export function parsePriceText(text: string): ParsedPrice[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: ParsedPrice[] = [];

  for (const line of lines) {
    const price = parsePrice(line);
    if (!price) continue;

    const num = line.match(/(OP\d{2}-\d{3}|[0-9]{3}\/[0-9]{3}|[A-Z]{1,5}\d{1,3}[a-z]?)/i);
    const card_number = num ? num[1] : "";

    let card_name = line
      .replace(/【.*?】/g, "")
      .replace(/※.*/g, "")
      .replace(/[￥¥]/g, "")
      .replace(/,/g, "")
      .replace(/[0-9]+(?:\.[0-9]+)?\s*万円/g, "")
      .replace(/[0-9]{4,}\s*(?:円|買取)?/g, "")
      .replace(/買取|円/g, "")
      .replace(card_number, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (card_name.length < 2) continue;

    rows.push({
      card_name,
      card_number,
      tcg_type: guessTcg(line),
      price_yen: price
    });
  }

  return rows;
}

export function parsePrice(line: string): number | null {
  const raw = line.replace(/,/g, "").replace(/￥/g, "¥");

  const man = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*万円/);
  if (man) return Math.round(parseFloat(man[1]) * 10000);

  const yen = raw.match(/[¥円]?\s*([0-9]{4,})\s*(?:円|買取)?/);
  if (yen) return parseInt(yen[1], 10);

  return null;
}

export function guessTcg(line: string): string {
  if (/OP[0-9]|ルフィ|ナミ|ゾロ|ワンピ|ONE/i.test(line)) return "ワンピース";
  if (/BOX|ボックス|シュリンク/i.test(line)) return "BOX";
  return "ポケカ";
}