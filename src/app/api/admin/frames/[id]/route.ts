import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_ACTIVE_FRAMES_PER_STORE = 3;

type UpdateFrameRequest = {
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

  if (!frameName || !frameUrl) {
    return NextResponse.json({ message: "枠名と枠画像URLを入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: currentFrame, error: currentError } = await supabase
      .from("store_frames")
      .select("id, store_id")
      .eq("id", id)
      .maybeSingle();

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
      await supabase.from("store_frames").update({ is_default: false }).eq("store_id", currentFrame.store_id).neq("id", id);
    }

    const { data, error } = await supabase
      .from("store_frames")
      .update({
        frame_name: frameName,
        frame_url: frameUrl,
        is_default: isDefault,
        is_active: isActive,
        sort_order: cleanNumber(body.sortOrder),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, store_id, frame_name, frame_url, is_default, is_active, sort_order, created_at, updated_at")
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
