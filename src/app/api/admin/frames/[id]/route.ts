import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_ACTIVE_FRAMES_PER_STORE = 3;
const FRAME_SELECT_COLUMNS =
  "id, store_id, frame_name, frame_url, is_default, is_active, sort_order, date_enabled, date_x, date_y, date_font_size, date_color, created_at, updated_at";

type UpdateFrameRequest = {
  frameName?: unknown;
  frameUrl?: unknown;
  isDefault?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  dateEnabled?: unknown;
  dateX?: unknown;
  dateY?: unknown;
  dateFontSize?: unknown;
  dateColor?: unknown;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type CurrentFrameRow = {
  id: string;
  store_id: string;
  is_active?: boolean;
};

type FrameUpdateQuery = {
  eq: (column: string, value: unknown) => FrameUpdateQuery;
  neq: (column: string, value: unknown) => FrameUpdateQuery;
  select: (columns: string) => {
    single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
  };
};

type FrameDeleteQuery = {
  eq: (column: string, value: unknown) => Promise<{ error: SupabaseLikeError | null }>;
};

type StoreFramesMutationTable = {
  update: (values: Record<string, unknown>) => FrameUpdateQuery;
  delete: () => FrameDeleteQuery;
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

function cleanRangeNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function cleanDateColor(value: unknown) {
  const color = cleanText(value, 16);
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#ffffff";
}

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const { id } = await context.params;
  let body: UpdateFrameRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "更新内容を読み取れませんでした。" }, { status: 400 });
  }

  const frameName = cleanText(body.frameName, 80);
  const frameUrl = cleanText(body.frameUrl, 1000);
  const isActive = Boolean(body.isActive);
  const isDefault = Boolean(body.isDefault) && isActive;
  const dateEnabled = body.dateEnabled === undefined ? true : Boolean(body.dateEnabled);

  if (!frameName || !frameUrl) {
    return NextResponse.json({ message: "枠名と枠画像URLを入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const framesTable = supabase.from("store_frames") as unknown as StoreFramesMutationTable;
    const { data: currentFrameData, error: currentError } = await supabase
      .from("store_frames")
      .select("id, store_id")
      .eq("id", id)
      .maybeSingle();
    const currentFrame = currentFrameData as CurrentFrameRow | null;

    if (currentError) {
      return NextResponse.json(
        { message: "枠を確認できませんでした。", detail: formatSupabaseError(currentError) },
        { status: 500 }
      );
    }

    if (!currentFrame) {
      return NextResponse.json({ message: "枠が見つかりませんでした。" }, { status: 404 });
    }

    if (isActive) {
      const { data: activeFrames, error: countError } = await supabase
        .from("store_frames")
        .select("id")
        .eq("store_id", currentFrame.store_id)
        .eq("is_active", true)
        .neq("id", id)
        .limit(MAX_ACTIVE_FRAMES_PER_STORE);

      if (countError) {
        return NextResponse.json(
          { message: "有効な枠数を確認できませんでした。", detail: formatSupabaseError(countError) },
          { status: 500 }
        );
      }

      if ((activeFrames ?? []).length >= MAX_ACTIVE_FRAMES_PER_STORE) {
        return NextResponse.json({ message: "有効な枠は1店舗につき最大3件までです。" }, { status: 400 });
      }
    }

    if (isDefault) {
      await framesTable.update({ is_default: false }).eq("store_id", currentFrame.store_id).neq("id", id);
    }

    const { data, error } = await framesTable
      .update({
        frame_name: frameName,
        frame_url: frameUrl,
        is_default: isDefault,
        is_active: isActive,
        sort_order: cleanNumber(body.sortOrder),
        date_enabled: dateEnabled,
        date_x: cleanRangeNumber(body.dateX, 1030, 0, 1270),
        date_y: cleanRangeNumber(body.dateY, 82, 0, 890),
        date_font_size: cleanRangeNumber(body.dateFontSize, 38, 12, 96),
        date_color: cleanDateColor(body.dateColor),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(FRAME_SELECT_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json(
        { message: "枠を更新できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ frame: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "枠を更新できませんでした。" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const { id } = await context.params;

  try {
    const supabase = createServerSupabaseClient();
    const framesTable = supabase.from("store_frames") as unknown as StoreFramesMutationTable;
    const { data: currentFrameData, error: currentError } = await supabase
      .from("store_frames")
      .select("id, store_id, is_active")
      .eq("id", id)
      .maybeSingle();
    const currentFrame = currentFrameData as CurrentFrameRow | null;

    if (currentError) {
      return NextResponse.json(
        { message: "枠を確認できませんでした。", detail: formatSupabaseError(currentError) },
        { status: 500 }
      );
    }

    if (!currentFrame) {
      return NextResponse.json({ message: "枠が見つかりませんでした。" }, { status: 404 });
    }

    if (currentFrame.is_active) {
      return NextResponse.json({ message: "有効な枠は削除できません。先に停止して保存してください。" }, { status: 400 });
    }

    const { error } = await framesTable.delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { message: "枠を削除できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ deletedFrameId: id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "枠を削除できませんでした。" },
      { status: 500 }
    );
  }
}
