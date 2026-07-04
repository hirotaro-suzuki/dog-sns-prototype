import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CreateDraftRequest = {
  assetId?: unknown;
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
  const status = cleanText(url.searchParams.get("status"), 20);

  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("sns_post_drafts")
      .select(
        "id, asset_id, store_id, status, post_caption, hashtags, planned_post_date, manus_note, posted_url, posted_at, is_final_checked, created_at, updated_at, assets(id, manage_code, store_display_name, staff_display_name, captured_at, final_processed_url, description)"
      )
      .order("updated_at", { ascending: false })
      .limit(120);

    if (storeIds.length > 0) query = query.in("store_id", storeIds);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { message: "投稿素材を取得できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ drafts: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "投稿素材を取得できませんでした。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  let body: CreateDraftRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "登録内容を読み取れませんでした。" }, { status: 400 });
  }

  const assetId = cleanText(body.assetId, 80);
  if (!assetId) {
    return NextResponse.json({ message: "写真を選択してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("id, store_id, description, status")
      .eq("id", assetId)
      .maybeSingle();

    if (assetError) {
      return NextResponse.json(
        { message: "写真を確認できませんでした。", detail: formatSupabaseError(assetError) },
        { status: 500 }
      );
    }

    if (!asset || asset.status === "archived") {
      return NextResponse.json({ message: "投稿素材にできる写真が見つかりませんでした。" }, { status: 404 });
    }

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("default_hashtags")
      .eq("id", asset.store_id)
      .maybeSingle();

    if (storeError) {
      return NextResponse.json(
        { message: "店舗情報を確認できませんでした。", detail: formatSupabaseError(storeError) },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("sns_post_drafts")
      .insert({
        asset_id: asset.id,
        store_id: asset.store_id,
        status: "draft",
        post_caption: asset.description ?? null,
        hashtags: store?.default_hashtags ?? null,
      })
      .select(
        "id, asset_id, store_id, status, post_caption, hashtags, planned_post_date, manus_note, posted_url, posted_at, is_final_checked, created_at, updated_at, assets(id, manage_code, store_display_name, staff_display_name, captured_at, final_processed_url, description)"
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "この写真の投稿素材はすでに作成済みです。" }, { status: 409 });
      }

      return NextResponse.json(
        { message: "投稿素材を作成できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft: data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "投稿素材を作成できませんでした。" },
      { status: 500 }
    );
  }
}
