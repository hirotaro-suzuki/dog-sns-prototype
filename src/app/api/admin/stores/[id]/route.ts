import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UpdateStoreRequest = {
  storeName?: unknown;
  displayName?: unknown;
  logoUrl?: unknown;
  frameUrl?: unknown;
  themeColor?: unknown;
  snsDisplayName?: unknown;
  instagramAccount?: unknown;
  defaultHashtags?: unknown;
  address?: unknown;
  phone?: unknown;
  businessHoursNote?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  notes?: unknown;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type UpdatedStoreRow = {
  id: string;
  store_name: string;
  display_name: string;
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

type StoreUpdateQuery = {
  eq: (column: string, value: string) => {
    select: (columns: string) => {
      single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
    };
  };
};

type StoresTable = {
  update: (values: Record<string, unknown>) => StoreUpdateQuery;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, maxLength);
  return text || null;
}

function requiredText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Math.trunc(Number(value));
  return 0;
}

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const { id } = await context.params;
  let body: UpdateStoreRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "更新内容を読み取れませんでした。" }, { status: 400 });
  }

  const storeName = requiredText(body.storeName, 120);
  const displayName = requiredText(body.displayName, 120);
  const themeColor = cleanText(body.themeColor, 7);

  if (!storeName || !displayName) {
    return NextResponse.json({ message: "店舗名と表示名を入力してください。" }, { status: 400 });
  }

  if (themeColor && !/^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
    return NextResponse.json({ message: "テーマカラーは #176f62 のように入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const storesTable = supabase.from("stores") as unknown as StoresTable;
    const { data, error } = await storesTable
      .update({
        store_name: storeName,
        display_name: displayName,
        logo_url: cleanText(body.logoUrl, 1000),
        frame_url: cleanText(body.frameUrl, 1000),
        theme_color: themeColor,
        sns_display_name: cleanText(body.snsDisplayName, 120),
        instagram_account: cleanText(body.instagramAccount, 120),
        default_hashtags: cleanText(body.defaultHashtags, 500),
        address: cleanText(body.address, 300),
        phone: cleanText(body.phone, 80),
        business_hours_note: cleanText(body.businessHoursNote, 300),
        is_active: Boolean(body.isActive),
        sort_order: cleanNumber(body.sortOrder),
        notes: cleanText(body.notes, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, store_name, display_name, logo_url, frame_url, theme_color, sns_display_name, instagram_account, default_hashtags, address, phone, business_hours_note, is_active, sort_order, notes"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { message: "店舗マスタを更新できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ store: data as UpdatedStoreRow });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "店舗マスタを更新できませんでした。" },
      { status: 500 }
    );
  }
}
