import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_ACTIVE_FRAMES_PER_STORE = 3;

type CreateFrameRequest = {
  storeId?: unknown;
  frameName?: unknown;
  frameUrl?: unknown;
  isDefault?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type FrameMutationSelect = {
  select: (columns: string) => {
    single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
  };
};

type FrameUpdateQuery = {
  eq: (column: string, value: unknown) => FrameUpdateQuery;
};

type StoreFramesMutationTable = {
  insert: (values: Record<string, unknown>) => FrameMutationSelect;
  update: (values: Record<string, unknown>) => FrameUpdateQuery;
};

function cleanText(value: unknown, maxLength: number) {
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

async function countActiveFrames(supabase: ReturnType<typeof createServerSupabaseClient>, storeId: string) {
  const { data, error } = await supabase
    .from("store_frames")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .limit(MAX_ACTIVE_FRAMES_PER_STORE + 1);

  if (error) throw new Error(formatSupabaseError(error));
  return (data ?? []).length;
}

export async function GET(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const storeId = cleanText(url.searchParams.get("storeId"), 80);

  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("store_frames")
      .select("id, store_id, frame_name, frame_url, is_default, is_active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("frame_name", { ascending: true });

    if (storeId) query = query.eq("store_id", storeId);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { message: "枠一覧を取得できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ frames: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "枠一覧を取得できませんでした。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  let body: CreateFrameRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "登録内容を読み取れませんでした。" }, { status: 400 });
  }

  const storeId = cleanText(body.storeId, 80);
  const frameName = cleanText(body.frameName, 80);
  const frameUrl = cleanText(body.frameUrl, 1000);
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  const isDefault = Boolean(body.isDefault) && isActive;

  if (!storeId || !frameName || !frameUrl) {
    return NextResponse.json({ message: "店舗、枠名、枠画像URLを入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const framesTable = supabase.from("store_frames") as unknown as StoreFramesMutationTable;

    if (isActive) {
      const activeFrameCount = await countActiveFrames(supabase, storeId);
      if (activeFrameCount >= MAX_ACTIVE_FRAMES_PER_STORE) {
        return NextResponse.json({ message: "有効な枠は1店舗につき最大3件までです。" }, { status: 400 });
      }
    }

    if (isDefault) {
      await framesTable.update({ is_default: false }).eq("store_id", storeId);
    }

    const { data, error } = await framesTable
      .insert({
        store_id: storeId,
        frame_name: frameName,
        frame_url: frameUrl,
        is_default: isDefault,
        is_active: isActive,
        sort_order: cleanNumber(body.sortOrder),
      })
      .select("id, store_id, frame_name, frame_url, is_default, is_active, sort_order, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { message: "枠を追加できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ frame: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "枠を追加できませんでした。" },
      { status: 500 }
    );
  }
}
