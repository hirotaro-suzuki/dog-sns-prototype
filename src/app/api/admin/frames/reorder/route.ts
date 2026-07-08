import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MAX_FRAMES_PER_STORE } from "@/lib/frameLimits";

export const runtime = "nodejs";

const FRAME_SELECT_COLUMNS =
  "id, store_id, frame_name, frame_url, is_default, sort_order, date_enabled, date_x, date_y, date_font_size, date_color, created_at, updated_at";

type ReorderFramesRequest = {
  storeId?: unknown;
  frameIds?: unknown;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type FrameRow = {
  id: string;
};

type FrameUpdateQuery = {
  eq: (column: string, value: unknown) => FrameUpdateQuery;
} & Promise<{ error: SupabaseLikeError | null }>;

type StoreFramesMutationTable = {
  update: (values: Record<string, unknown>) => FrameUpdateQuery;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

function parseFrameIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0 || value.length > MAX_FRAMES_PER_STORE) return null;

  const ids = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (ids.some((id) => !id)) return null;
  if (new Set(ids).size !== ids.length) return null;

  return ids;
}

export async function POST(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  let body: ReorderFramesRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "並び替え内容を読み取れませんでした。" }, { status: 400 });
  }

  const storeId = cleanText(body.storeId, 80);
  const frameIds = parseFrameIds(body.frameIds);

  if (!storeId || !frameIds) {
    return NextResponse.json({ message: "並び替え対象の枠を確認できませんでした。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const framesTable = supabase.from("store_frames") as unknown as StoreFramesMutationTable;

    const { data: existingFramesData, error: existingError } = await supabase
      .from("store_frames")
      .select("id")
      .eq("store_id", storeId);

    if (existingError) {
      return NextResponse.json(
        { message: "枠一覧を確認できませんでした。", detail: formatSupabaseError(existingError) },
        { status: 500 }
      );
    }

    const existingIds = ((existingFramesData ?? []) as FrameRow[]).map((frame) => frame.id);
    const existingIdSet = new Set(existingIds);
    const requestIdSet = new Set(frameIds);
    const isExactMatch =
      existingIds.length === frameIds.length &&
      existingIds.every((id) => requestIdSet.has(id)) &&
      frameIds.every((id) => existingIdSet.has(id));

    if (!isExactMatch) {
      return NextResponse.json(
        { message: "並び替え対象がその店舗の現在の枠と一致しません。画面を更新してもう一度お試しください。" },
        { status: 400 }
      );
    }

    await framesTable.update({ is_default: false }).eq("store_id", storeId);

    for (let index = 0; index < frameIds.length; index += 1) {
      const { error } = await framesTable
        .update({ sort_order: index * 10, updated_at: new Date().toISOString() })
        .eq("id", frameIds[index])
        .eq("store_id", storeId);

      if (error) {
        return NextResponse.json(
          { message: "並び順を更新できませんでした。", detail: formatSupabaseError(error) },
          { status: 500 }
        );
      }
    }

    const { error: defaultError } = await framesTable
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", frameIds[0])
      .eq("store_id", storeId);

    if (defaultError) {
      return NextResponse.json(
        { message: "標準枠を更新できませんでした。", detail: formatSupabaseError(defaultError) },
        { status: 500 }
      );
    }

    const { data: framesData, error: framesError } = await supabase
      .from("store_frames")
      .select(FRAME_SELECT_COLUMNS)
      .eq("store_id", storeId)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("frame_name", { ascending: true });

    if (framesError) {
      return NextResponse.json(
        { message: "枠一覧を取得できませんでした。", detail: formatSupabaseError(framesError) },
        { status: 500 }
      );
    }

    return NextResponse.json({ frames: framesData ?? [] });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "並び替えできませんでした。" },
      { status: 500 }
    );
  }
}
