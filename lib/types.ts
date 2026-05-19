export type Shop = {
  id: string;
  name: string;
  area: string;
  x_handle?: string | null;
  x_user_id?: string | null;
  priority?: boolean | null;
  valid_default?: string | null;
  genres?: string[] | null;
  watch_enabled?: boolean | null;
  last_seen_post_id?: string | null;
  last_checked_at?: string | null;
};

export type BuyPrice = {
  id: string;
  card_name: string;
  card_number?: string | null;
  tcg_type: string;
  shop_id: string;
  price_yen: number;
  source: string;
  source_url?: string | null;
  published_at?: string | null;
  valid_until?: string | null;
  valid_label?: string | null;
  confidence?: number | null;
};

export type UserItem = {
  id: string;
  card_name: string;
  card_number?: string | null;
  quantity: number;
  purchase_price_yen: number;
};

export type ImportLog = {
  id: string;
  shop_id: string;
  added_count: number;
  raw_text: string;
  created_at: string;
};