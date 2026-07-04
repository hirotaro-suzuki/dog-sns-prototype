import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["draft", "ready", "posted", "hold", "archived"]);

type UpdateDraftRequest = {
  status?: unknown;
  postCaption?: unknown;
  hashtags?: unknown;
  plannedPostDate?: unknown;
  manusNote?: unknown;
  postedUrl?: unknown;
  postedAt?: unknown;
  isFinalChecked?: unknown;
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

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "invalid";
}

function cleanDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid" : date.toISOString();
}

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const { id } = await context.params;
  let body: UpdateDraftRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "更新内容を読み取れませんでした。" }, { status: 400 });
  }

  const status = requiredText(body.status, 20);
  const plannedPostDate = cleanDate(body.plannedPostDate);
  const postedAt = cleanDateTime(body.postedAt);

  if (!ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ message: "投稿状態を確認してください。" }, { status: 400 });
  }

  if (plannedPostDate === "invalid") {
    return NextResponse.json({ message: "投稿候補日は YYYY-MM-DD で入力してください。" }, { status: 400 });
  }

  if (postedAt === "invalid") {
    return NextResponse.json({ message: "投稿済み日時を確認してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sns_post_drafts")
      .update({
        status,
        post_caption: cleanText(body.postCaption, 2200),
        hashtags: cleanText(body.hashtags, 500),
        planned_post_date: plannedPostDate,
        manus_note: cleanText(body.manusNote, 1000),
        posted_url: cleanText(body.postedUrl, 1000),
        posted_at: postedAt,
        is_final_checked: Boolean(body.isFinalChecked),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, asset_id, store_id, status, post_caption, hashtags, planned_post_date, manus_note, posted_url, posted_at, is_final_checked, created_at, updated_at, assets(id, manage_code, store_display_name, staff_display_name, captured_at, final_processed_url, description)"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { message: "投稿素材を更新できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "投稿素材を更新できませんでした。" },
      { status: 500 }
    );
  }
}
