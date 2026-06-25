import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type StoreRow = {
  id: string;
  store_code: string;
  store_name: string;
  display_name: string;
  login_code: string;
  logo_url: string | null;
  frame_url: string | null;
  theme_color: string | null;
  sns_display_name: string | null;
  instagram_account: string | null;
  default_hashtags: string | null;
  address: string | null;
  phone: string | null;
  business_hours_note: string | null;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

export async function GET(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("stores")
      .select(
        "id, store_code, store_name, display_name, login_code, logo_url, frame_url, theme_color, sns_display_name, instagram_account, default_hashtags, address, phone, business_hours_note, is_active, sort_order, notes"
      )
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { message: "店舗マスタを取得できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ stores: (data ?? []) as StoreRow[] });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "店舗マスタを取得できませんでした。" },
      { status: 500 }
    );
  }
}
