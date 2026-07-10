import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type StoreRow = {
  id: string;
  store_code: string;
  store_name: string;
  display_name: string;
  login_code: string;
  logo_url: string | null;
  frame_url: string | null;
  theme_color: string | null;
  sns_display_name: string | null;
  instagram_account: string | null;
  default_hashtags: string | null;
  address: string | null;
  phone: string | null;
  business_hours_note: string | null;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  asset_count: number;
};

type StoreWithAssetCountRow = Omit<StoreRow, "asset_count"> & {
  assets: Array<{ count: number }>;
};

type StoreAssetType = "logo" | "frame";

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type StoreCodeRow = {
  id: string;
  store_code: string;
};

type StoreUpdateQuery = {
  eq: (column: string, value: unknown) => {
    select: (columns: string) => {
      single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
    };
  };
};

type StoresMutationTable = {
  update: (values: Record<string, unknown>) => StoreUpdateQuery;
};

type FrameUpdateQuery = {
  eq: (column: string, value: unknown) => FrameUpdateQuery;
  select: (columns: string) => {
    single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
  };
};

type FramesMutationTable = {
  update: (values: Record<string, unknown>) => FrameUpdateQuery;
};

const STORE_ASSET_BUCKET = "store-assets";
const MAX_STORE_ASSET_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

function formatSupabaseError(error: SupabaseLikeError) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" / ");
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getAssetType(value: string): StoreAssetType | null {
  return value === "logo" || value === "frame" ? value : null;
}

function sanitizeStoreCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9_-]/g, "_") || "store";
}

async function removeUploadedFile(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  storagePath: string
) {
  const { error } = await supabase.storage.from(STORE_ASSET_BUCKET).remove([storagePath]);
  return error;
}

function withCleanupDetail(error: SupabaseLikeError, cleanupError: SupabaseLikeError | null) {
  const detail = formatSupabaseError(error);
  return cleanupError
    ? `${detail} / アップロード済みファイルの削除にも失敗しました: ${formatSupabaseError(cleanupError)}`
    : detail;
}

export async function GET(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("stores")
      .select(
        "id, store_code, store_name, display_name, login_code, logo_url, frame_url, theme_color, sns_display_name, instagram_account, default_hashtags, address, phone, business_hours_note, is_active, sort_order, notes, assets(count)"
      )
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { message: "店舗マスタを取得できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    const stores = ((data ?? []) as StoreWithAssetCountRow[]).map(({ assets, ...store }) => ({
      ...store,
      asset_count: assets[0]?.count ?? 0,
    }));

    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "店舗マスタを取得できませんでした。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "アップロード内容を読み取れませんでした。" }, { status: 400 });
  }

  const storeId = cleanText(formData.get("storeId"), 80);
  const frameId = cleanText(formData.get("frameId"), 80);
  const assetType = getAssetType(cleanText(formData.get("assetType"), 20));
  const file = formData.get("file");

  if (!storeId || !assetType || !(file instanceof File)) {
    return NextResponse.json({ message: "店舗、画像種類、画像ファイルを選択してください。" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ message: "画像は PNG / JPEG / WebP / SVG を選択してください。" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_STORE_ASSET_BYTES) {
    return NextResponse.json({ message: "画像サイズは2MB以下にしてください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, store_code")
      .eq("id", storeId)
      .maybeSingle();
    const store = storeData as StoreCodeRow | null;

    if (storeError) {
      return NextResponse.json(
        { message: "店舗情報を確認できませんでした。", detail: formatSupabaseError(storeError) },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json({ message: "店舗が見つかりませんでした。" }, { status: 404 });
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type) ?? "bin";
    const storeCode = sanitizeStoreCode(store.store_code);
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
    const storagePath =
      assetType === "logo"
        ? `stores/${storeCode}/logo-${stamp}.${extension}`
        : `stores/${storeCode}/frames/frame-${stamp}.${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(STORE_ASSET_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { message: "画像をStorageへ保存できませんでした。", detail: uploadError.message },
        { status: 500 }
      );
    }

    const { data: currentStoreData, error: currentStoreError } = await supabase
      .from("stores")
      .select("id")
      .eq("id", store.id)
      .maybeSingle();

    if (currentStoreError || !currentStoreData) {
      const cleanupError = await removeUploadedFile(supabase, storagePath);
      const originalError = currentStoreError ?? { message: "店舗が削除されています。" };
      return NextResponse.json(
        {
          message: "店舗が削除されたため、アップロードした画像を破棄しました。",
          detail: withCleanupDetail(originalError, cleanupError),
        },
        { status: currentStoreError ? 500 : 409 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORE_ASSET_BUCKET)
      .getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    if (assetType === "logo") {
      const storesTable = supabase.from("stores") as unknown as StoresMutationTable;
      const { data, error } = await storesTable
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", store.id)
        .select("id, logo_url")
        .single();

      if (error) {
        const cleanupError = await removeUploadedFile(supabase, storagePath);
        return NextResponse.json(
          { message: "ロゴURLを店舗へ保存できませんでした。", detail: withCleanupDetail(error, cleanupError) },
          { status: 500 }
        );
      }

      return NextResponse.json({ publicUrl, storagePath, store: data });
    }

    if (frameId) {
      const framesTable = supabase.from("store_frames") as unknown as FramesMutationTable;
      const { data, error } = await framesTable
        .update({ frame_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", frameId)
        .eq("store_id", store.id)
        .select(
          "id, store_id, frame_name, frame_url, is_default, sort_order, date_enabled, date_x, date_y, date_font_size, date_color, created_at, updated_at"
        )
        .single();

      if (error) {
        const cleanupError = await removeUploadedFile(supabase, storagePath);
        return NextResponse.json(
          { message: "枠URLを保存できませんでした。", detail: withCleanupDetail(error, cleanupError) },
          { status: 500 }
        );
      }

      return NextResponse.json({ publicUrl, storagePath, frame: data });
    }

    return NextResponse.json({ publicUrl, storagePath });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "画像をアップロードできませんでした。" },
      { status: 500 }
    );
  }
}
