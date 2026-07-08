import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UpdateStaffRequest = {
  displayName?: unknown;
  isActive?: unknown;
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

type StaffUpdateQuery = {
  eq: (column: string, value: string) => {
    select: (columns: string) => {
      single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
    };
  };
};

type StaffTable = {
  update: (values: Record<string, unknown>) => StaffUpdateQuery;
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const { id } = await context.params;
  let body: UpdateStaffRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "更新内容を読み取れませんでした。" }, { status: 400 });
  }

  const displayName = requiredText(body.displayName, 120);

  if (!displayName) {
    return NextResponse.json({ message: "担当者名を入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const staffTable = supabase.from("staff_members") as unknown as StaffTable;
    const { data, error } = await staffTable
      .update({
        display_name: displayName,
        is_active: Boolean(body.isActive),
        sort_order: cleanNumber(body.sortOrder),
        notes: cleanText(body.notes, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, store_id, staff_code, display_name, is_active, sort_order, notes")
      .single();

    if (error) {
      return NextResponse.json(
        { message: "担当者マスタを更新できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ staffMember: data as StaffRow });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "担当者マスタを更新できませんでした。" },
      { status: 500 }
    );
  }
}
