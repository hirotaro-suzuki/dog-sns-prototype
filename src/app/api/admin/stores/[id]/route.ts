import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UpdateStoreRequest = {
  storeName?: unknown;
  displayName?: unknown;
  logoUrl?: unknown;
  frameUrl?: unknown;
  themeColor?: unknown;
  snsDisplayName?: unknown;
  instagramAccount?: unknown;
  defaultHashtags?: unknown;
  address?: unknown;
  phone?: unknown;
  businessHoursNote?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  notes?: unknown;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type UpdatedStoreRow = {
  id: string;
  store_name: string;
  display_name: string;
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
};

type StoreUpdateQuery = {
  eq: (column: string, value: string) => {
    select: (columns: string) => {
      single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
    };
  };
};

type StoresTable = {
  update: (values: Record<string, unknown>) => StoreUpdateQuery;
};

type CurrentStoreRow = {
  id: string;
  store_code: string;
  display_name: string;
  is_active: boolean;
};

type StorageListItem = {
  id?: string | null;
  name: string;
};

type StoreCodeRow = {
  id: string;
  store_code: string;
};

const STORE_ASSET_BUCKET = "store-assets";
const STORAGE_PAGE_SIZE = 100;

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

function sanitizeStoreCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9_-]/g, "_") || "store";
}

async function listStorageFiles(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  prefix: string
): Promise<{ paths: string[]; error: SupabaseLikeError | null }> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(STORE_ASSET_BUCKET)
      .list(prefix, { limit: STORAGE_PAGE_SIZE, offset });

    if (error) return { paths: [], error };

    const items = (data ?? []) as StorageListItem[];
    for (const item of items) {
      const itemPath = `${prefix}/${item.name}`;
      if (item.id) {
        paths.push(itemPath);
        continue;
      }

      const nested = await listStorageFiles(supabase, itemPath);
      if (nested.error) return { paths: [], error: nested.error };
      paths.push(...nested.paths);
    }

    if (items.length < STORAGE_PAGE_SIZE) break;
    offset += STORAGE_PAGE_SIZE;
  }

  return { paths, error: null };
}

async function removeStorageFiles(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  paths: string[]
) {
  for (let index = 0; index < paths.length; index += STORAGE_PAGE_SIZE) {
    const chunk = paths.slice(index, index + STORAGE_PAGE_SIZE);
    const { error } = await supabase.storage.from(STORE_ASSET_BUCKET).remove(chunk);
    if (error) return error;
  }

  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminPin(request);
  if (authError) return authError;

  const { id } = await context.params;
  let body: UpdateStoreRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "更新内容を読み取れませんでした。" }, { status: 400 });
  }

  const storeName = requiredText(body.storeName, 120);
  const displayName = requiredText(body.displayName, 120);
  const themeColor = cleanText(body.themeColor, 7);

  if (!storeName || !displayName) {
    return NextResponse.json({ message: "店舗名と表示名を入力してください。" }, { status: 400 });
  }

  if (themeColor && !/^#[0-9A-Fa-f]{6}$/.test(themeColor)) {
    return NextResponse.json({ message: "テーマカラーは #176f62 のように入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const storesTable = supabase.from("stores") as unknown as StoresTable;
    const { data, error } = await storesTable
      .update({
        store_name: storeName,
        display_name: displayName,
        logo_url: cleanText(body.logoUrl, 1000),
        frame_url: cleanText(body.frameUrl, 1000),
        theme_color: themeColor,
        sns_display_name: cleanText(body.snsDisplayName, 120),
        instagram_account: cleanText(body.instagramAccount, 120),
        default_hashtags: cleanText(body.defaultHashtags, 500),
        address: cleanText(body.address, 300),
        phone: cleanText(body.phone, 80),
        business_hours_note: cleanText(body.businessHoursNote, 300),
        is_active: Boolean(body.isActive),
        sort_order: cleanNumber(body.sortOrder),
        notes: cleanText(body.notes, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, store_name, display_name, logo_url, frame_url, theme_color, sns_display_name, instagram_account, default_hashtags, address, phone, business_hours_note, is_active, sort_order, notes"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { message: "店舗マスタを更新できませんでした。", detail: formatSupabaseError(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ store: data as UpdatedStoreRow });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "店舗マスタを更新できませんでした。" },
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
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, store_code, display_name, is_active")
      .eq("id", id)
      .maybeSingle();
    const store = storeData as CurrentStoreRow | null;

    if (storeError) {
      return NextResponse.json(
        { message: "店舗情報を確認できませんでした。", detail: formatSupabaseError(storeError) },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json({ message: "店舗が見つかりませんでした。" }, { status: 404 });
    }

    if (store.is_active) {
      return NextResponse.json({ message: "稼働中の店舗は削除できません。先に停止して保存してください。" }, { status: 409 });
    }

    const { count: assetCount, error: assetCountError } = await supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id);

    if (assetCountError) {
      return NextResponse.json(
        { message: "店舗の保存写真件数を確認できませんでした。", detail: formatSupabaseError(assetCountError) },
        { status: 500 }
      );
    }

    if ((assetCount ?? 0) > 0) {
      return NextResponse.json(
        { message: `保存写真が${assetCount}件あるため店舗を削除できません。` },
        { status: 409 }
      );
    }

    const storagePrefix = `stores/${sanitizeStoreCode(store.store_code)}`;
    const { data: otherStoreData, error: otherStoreError } = await supabase
      .from("stores")
      .select("id, store_code")
      .neq("id", store.id);

    if (otherStoreError) {
      return NextResponse.json(
        { message: "店舗画像の保存先を確認できなかったため、店舗を削除しませんでした。", detail: formatSupabaseError(otherStoreError) },
        { status: 500 }
      );
    }

    const hasStoragePrefixCollision = ((otherStoreData ?? []) as StoreCodeRow[]).some(
      (otherStore) => sanitizeStoreCode(otherStore.store_code) === sanitizeStoreCode(store.store_code)
    );
    if (hasStoragePrefixCollision) {
      return NextResponse.json(
        { message: "他店舗と画像保存先が重複しているため、安全に店舗を削除できません。" },
        { status: 409 }
      );
    }

    const storageFiles = await listStorageFiles(supabase, storagePrefix);
    if (storageFiles.error) {
      return NextResponse.json(
        { message: "店舗画像を確認できなかったため、店舗を削除しませんでした。", detail: formatSupabaseError(storageFiles.error) },
        { status: 500 }
      );
    }

    const { data: deletedStoreData, error: deleteError } = await supabase
      .from("stores")
      .delete()
      .eq("id", store.id)
      .eq("is_active", false)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      if (deleteError.code === "23503") {
        return NextResponse.json(
          { message: "保存写真または関連データが追加されたため、店舗を削除できませんでした。" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "店舗を削除できませんでした。", detail: formatSupabaseError(deleteError) },
        { status: 500 }
      );
    }

    if (!deletedStoreData) {
      return NextResponse.json(
        { message: "店舗が再び稼働中になったため、削除しませんでした。" },
        { status: 409 }
      );
    }

    let storageWarning: string | null = null;
    const initialRemoveError = await removeStorageFiles(supabase, storageFiles.paths);
    if (initialRemoveError) {
      storageWarning = `店舗は削除しましたが、店舗画像の一部をStorageから削除できませんでした: ${formatSupabaseError(initialRemoveError)}`;
    }

    const remainingStorageFiles = await listStorageFiles(supabase, storagePrefix);
    if (remainingStorageFiles.error) {
      storageWarning = `店舗は削除しましたが、Storageの最終確認に失敗しました: ${formatSupabaseError(remainingStorageFiles.error)}`;
    } else {
      const finalRemoveError = await removeStorageFiles(supabase, remainingStorageFiles.paths);
      if (finalRemoveError) {
        storageWarning = `店舗は削除しましたが、Storageの最終削除に失敗しました: ${formatSupabaseError(finalRemoveError)}`;
      } else {
        storageWarning = null;
      }
    }

    return NextResponse.json({
      deletedStoreId: store.id,
      storageWarning,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "店舗を削除できませんでした。" },
      { status: 500 }
    );
  }
}
