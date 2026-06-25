import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AdminStoreRow = {
  id: string;
  store_code: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
};

type AdminAssetRow = {
  id: string;
  manage_code: string;
  store_id: string;
  store_code: string;
  store_display_name: string;
  staff_display_name: string | null;
  captured_at: string;
  captured_date: string;
  final_processed_url: string;
  description: string | null;
  status: "ready" | "archived";
  hidden_at: string | null;
  hidden_reason: string | null;
  saved_at: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type AssetQuery = {
  in: (column: string, values: string[]) => AssetQuery;
  gte: (column: string, value: string) => AssetQuery;
  lte: (column: string, value: string) => AssetQuery;
  neq: (column: string, value: string) => AssetQuery;
  order: (column: string, options?: { ascending?: boolean }) => AssetQuery;
  limit: (count: number) => Promise<{ data: unknown[] | null; error: SupabaseLikeError | null }>;
};

type AssetsTable = {
  select: (columns: string) => AssetQuery;
};

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function splitIds(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

export async function GET(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const storeIds = splitIds(url.searchParams.get("storeIds"));
  const dateFrom = url.searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = url.searchParams.get("dateTo")?.trim() ?? "";
  const includeArchived = url.searchParams.get("includeArchived") === "true";

  if ((dateFrom && !isDateString(dateFrom)) || (dateTo && !isDateString(dateTo))) {
    return NextResponse.json({ message: "日付の形式を確認してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, store_code, display_name, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (storeError) {
      return NextResponse.json(
        { message: "店舗一覧を取得できませんでした。", detail: formatSupabaseError(storeError) },
        { status: 500 }
      );
    }

    const assetsTable = supabase.from("assets") as unknown as AssetsTable;
    let query = assetsTable
      .select(
        "id, manage_code, store_id, store_code, store_display_name, staff_display_name, captured_at, captured_date, final_processed_url, description, status, hidden_at, hidden_reason, saved_at"
      )
      .order("captured_at", { ascending: false });

    if (storeIds.length > 0) query = query.in("store_id", storeIds);
    if (dateFrom) query = query.gte("captured_date", dateFrom);
    if (dateTo) query = query.lte("captured_date", dateTo);
    if (!includeArchived) query = query.neq("status", "archived");

    const { data: assetData, error: assetError } = await query.limit(120);

    if (assetError) {
      return NextResponse.json(
        { message: "写真一覧を取得できませんでした。", detail: formatSupabaseError(assetError) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      stores: (storeData ?? []) as AdminStoreRow[],
      assets: (assetData ?? []) as AdminAssetRow[],
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "本部メンテナンス情報を取得できませんでした。" },
      { status: 500 }
    );
  }
}
