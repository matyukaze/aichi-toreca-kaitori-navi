import { unstable_noStore as noStore } from "next/cache";
import { mockItems, mockPrices, mockShops } from "./mock-data";
import { BuyPrice, Shop, UserItem } from "./types";
import {
  createSupabaseAnonClient,
  createSupabaseServiceClient,
  hasSupabaseEnv
} from "./supabase/server";

function canUseServiceClient() {
  return hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getClient() {
  return canUseServiceClient()
    ? createSupabaseServiceClient()
    : createSupabaseAnonClient();
}

export async function getShops(): Promise<Shop[]> {
  noStore();

  if (!hasSupabaseEnv()) return mockShops;

  try {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      console.error("getShops error:", error.message);
      return mockShops;
    }

    return (data || []) as Shop[];
  } catch (error) {
    console.error("getShops exception:", error);
    return mockShops;
  }
}

export async function getPrices(): Promise<BuyPrice[]> {
  noStore();

  if (!hasSupabaseEnv()) return mockPrices;

  try {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("buy_prices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("getPrices error:", error.message);
      return mockPrices;
    }

    return (data || []) as BuyPrice[];
  } catch (error) {
    console.error("getPrices exception:", error);
    return mockPrices;
  }
}

export async function getDemoUserItems(): Promise<UserItem[]> {
  noStore();

  if (!hasSupabaseEnv()) return mockItems;

  try {
    const supabase = getClient();

    const { data, error } = await supabase
      .from("user_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("getDemoUserItems error:", error.message);
      return mockItems;
    }

    if (!data || data.length === 0) {
      return mockItems;
    }

    return data as UserItem[];
  } catch (error) {
    console.error("getDemoUserItems exception:", error);
    return mockItems;
  }
}