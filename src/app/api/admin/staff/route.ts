import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CreateStaffRequest = {
  storeId?: unknown;
  displayName?: unknown;
  sortOrder?: unknown;
  notes?: unknown;
};

type StaffRow = {
  id: string;
  store_id: string;
  staff_code: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
};

type StaffInsertQuery = {
  select: (columns: string) => {
    single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
  };
};

type StaffTable = {
  insert: (values: Record<string, unknown>) => StaffInsertQuery;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
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

function generateInternalStaffCode() {
  return `staff-${Date.now()}`;
}

export async function GET(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId")?.trim() ?? "";

  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("staff_members")
      .select("id, store_id, staff_code, display_name, is_active, sort_order, notes")
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (storeId) query = query.eq("store_id", storeId);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { message: "担当者マスタを取得できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff: (data ?? []) as StaffRow[] });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "担当者マスタを取得できませんでした。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  let body: CreateStaffRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "登録内容を読み取れませんでした。" }, { status: 400 });
  }

  const storeId = requiredText(body.storeId, 80);
  const displayName = requiredText(body.displayName, 120);

  if (!storeId || !displayName) {
    return NextResponse.json({ message: "店舗、担当者名を入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const staffTable = supabase.from("staff_members") as unknown as StaffTable;
    const { data, error } = await staffTable
      .insert({
        store_id: storeId,
        staff_code: generateInternalStaffCode(),
        display_name: displayName,
        is_active: true,
        sort_order: cleanNumber(body.sortOrder),
        notes: cleanText(body.notes, 500),
      })
      .select("id, store_id, staff_code, display_name, is_active, sort_order, notes")
      .single();

    if (error) {
      return NextResponse.json(
        { message: "担当者を追加できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ staffMember: data as StaffRow });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "担当者を追加できませんでした。" },
      { status: 500 }
    );
  }
}
