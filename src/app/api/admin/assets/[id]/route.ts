import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AssetReviewStatus = "new" | "candidate" | "hold" | "rejected";

type UpdateAssetRequest = {
  description?: unknown;
  shortCaption?: unknown;
  reviewStatus?: unknown;
  action?: unknown;
  hiddenReason?: unknown;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type AssetUpdateQuery = {
  eq: (column: string, value: string) => {
    select: (columns: string) => {
      single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
    };
  };
};

type AssetDeleteQuery = {
  eq: (column: string, value: unknown) => Promise<{ error: SupabaseLikeError | null }>;
};

type AssetsTable = {
  update: (values: Record<string, unknown>) => AssetUpdateQuery;
  delete: () => AssetDeleteQuery;
};

type UpdatedAssetRow = {
  id: string;
  description: string | null;
  short_caption: string | null;
  review_status: AssetReviewStatus;
  status: "ready" | "archived";
  hidden_at: string | null;
  hidden_reason: string | null;
};

type CurrentAssetRow = {
  id: string;
  final_storage_bucket: string;
  final_storage_path: string;
};

const REVIEW_STATUS_VALUES: AssetReviewStatus[] = ["new", "candidate", "hold", "rejected"];

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeRequiredLengthText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return { ok: true, value: "" };
  const text = value.trim();
  if (text.length > maxLength) return { ok: false, value: text };
  return { ok: true, value: text };
}

function getReviewStatus(value: unknown): AssetReviewStatus | null {
  if (typeof value !== "string") return null;
  return REVIEW_STATUS_VALUES.includes(value as AssetReviewStatus) ? (value as AssetReviewStatus) : null;
}

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const { id } = await context.params;
  let body: UpdateAssetRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "更新内容を読み取れませんでした。" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "update";
  const updateValues: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("description" in body) {
    const description = normalizeText(body.description, 500);
    updateValues.description = description || null;
  }

  if ("shortCaption" in body) {
    const shortCaption = normalizeRequiredLengthText(body.shortCaption, 40);
    if (!shortCaption.ok) {
      return NextResponse.json({ message: "一言メモは40文字以内で入力してください。" }, { status: 400 });
    }
    updateValues.short_caption = shortCaption.value || null;
  }

  if ("reviewStatus" in body) {
    const reviewStatus = getReviewStatus(body.reviewStatus);
    if (!reviewStatus) {
      return NextResponse.json({ message: "確認状態を確認してください。" }, { status: 400 });
    }
    updateValues.review_status = reviewStatus;
  }

  if (action === "archive") {
    updateValues.status = "archived";
    updateValues.hidden_at = new Date().toISOString();
    updateValues.hidden_reason = normalizeText(body.hiddenReason, 200) || null;
  } else if (action === "restore") {
    updateValues.status = "ready";
    updateValues.hidden_at = null;
    updateValues.hidden_reason = null;
  } else if (action !== "update") {
    return NextResponse.json({ message: "更新内容を確認してください。" }, { status: 400 });
  }

  if (Object.keys(updateValues).length === 1) {
    return NextResponse.json({ message: "変更内容がありません。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const assetsTable = supabase.from("assets") as unknown as AssetsTable;
    const { data, error } = await assetsTable
      .update(updateValues)
      .eq("id", id)
      .select("id, description, short_caption, review_status, status, hidden_at, hidden_reason")
      .single();

    if (error) {
      return NextResponse.json(
        { message: "写真情報を更新できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ asset: data as UpdatedAssetRow });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "写真情報を更新できませんでした。" },
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
    const assetsTable = supabase.from("assets") as unknown as AssetsTable;
    const { data: currentAssetData, error: currentError } = await supabase
      .from("assets")
      .select("id, final_storage_bucket, final_storage_path")
      .eq("id", id)
      .maybeSingle();
    const currentAsset = currentAssetData as CurrentAssetRow | null;

    if (currentError) {
      return NextResponse.json(
        { message: "写真を確認できませんでした。", detail: formatSupabaseError(currentError) },
        { status: 500 }
      );
    }

    if (!currentAsset) {
      return NextResponse.json({ message: "写真が見つかりませんでした。" }, { status: 404 });
    }

    if (currentAsset.final_storage_bucket && currentAsset.final_storage_path) {
      await supabase.storage.from(currentAsset.final_storage_bucket).remove([currentAsset.final_storage_path]);
    }

    const { error } = await assetsTable.delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { message: "写真を削除できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ deletedAssetId: id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "写真を削除できませんでした。" },
      { status: 500 }
    );
  }
}
