export type PriceQualityInput = {
  card_name: string | null;
  card_number?: string | null;
  price_yen: number | null;
  confidence?: number | null;
};

export type PriceWarning = {
  code: string;
  label: string;
  severity: "warning" | "danger";
};

export function getPriceWarnings(price: PriceQualityInput): PriceWarning[] {
  const warnings: PriceWarning[] = [];

  const cardName = String(price.card_name || "").trim();
  const cardNumber = String(price.card_number || "").trim();
  const priceYen = Number(price.price_yen || 0);
  const confidence = Number(price.confidence ?? 1);

  if (priceYen >= 5000000) {
    warnings.push({
      code: "high_price",
      label: "要確認",
      severity: "danger"
    });
  }

  if (!cardNumber) {
    warnings.push({
      code: "no_card_number",
      label: "型番未確認",
      severity: "warning"
    });
  }

  if (cardName.length <= 2) {
    warnings.push({
      code: "short_name",
      label: "名称未確認",
      severity: "danger"
    });
  }

  if (confidence < 0.7) {
    warnings.push({
      code: "low_confidence",
      label: "低信頼度",
      severity: "danger"
    });
  }

  return warnings;
}

export function shouldExcludeFromPublicRanking(price: PriceQualityInput) {
  const warnings = getPriceWarnings(price);

  return warnings.some((warning) =>
    ["high_price", "short_name", "low_confidence"].includes(warning.code)
  );
}