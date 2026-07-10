import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FINAL_IMAGE_BUCKET = "final-images";
const MAX_BASE64_LENGTH = 8_000_000;

type SaveAssetRequest = {
  storeId?: unknown;
  staffId?: unknown;
  finalImageDataUrl?: unknown;
  frameUrl?: unknown;
  printedAt?: unknown;
  shortCaption?: unknown;
};

type StoreAssetRow = {
  id: string;
  store_code: string;
  display_name: string;
  logo_url: string | null;
  frame_url: string | null;
  theme_color: string | null;
  print_template_type: string;
  timezone: string;
};

type StaffAssetRow = {
  id: string;
  store_id: string;
  display_name: string;
};

type StoreFrameAssetRow = {
  frame_url: string;
};

type LatestAssetSequenceRow = {
  sequence_number: number;
};

type InsertedAssetRow = {
  id: string;
  manage_code: string;
  final_processed_url: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type AssetSelectQuery = {
  eq: (column: string, value: unknown) => AssetSelectQuery;
  order: (column: string, options?: { ascending?: boolean }) => AssetSelectQuery;
  limit: (count: number) => Promise<{ data: unknown[] | null; error: SupabaseLikeError | null }>;
};

type AssetInsertQuery = {
  select: (columns: string) => {
    single: () => Promise<{ data: unknown; error: SupabaseLikeError | null }>;
  };
};

type AssetsTable = {
  select: (columns: string) => AssetSelectQuery;
  insert: (values: Record<string, unknown>) => AssetInsertQuery;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return {
    year,
    month,
    day,
    dateLabel: `${year}-${month}-${day}`,
  };
}

function parseJpegDataUrl(value: string) {
  const match = value.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  if (match[1].length > MAX_BASE64_LENGTH) return null;

  return Buffer.from(match[1], "base64");
}

function formatSupabaseError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  const parts = [error.code, error.message, error.details, error.hint].filter(Boolean);
  return parts.join(" / ");
}

export async function POST(request: Request) {
  let body: SaveAssetRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "保存する画像情報を読み取れませんでした。" }, { status: 400 });
  }

  const storeId = normalizeString(body.storeId);
  const staffId = normalizeString(body.staffId);
  const finalImageDataUrl = normalizeString(body.finalImageDataUrl);
  const requestedFrameUrl = normalizeString(body.frameUrl);
  const printedAt = normalizeString(body.printedAt);
  const shortCaption = normalizeString(body.shortCaption).slice(0, 40);

  if (!storeId || !staffId || !finalImageDataUrl) {
    return NextResponse.json(
      { message: "店舗、担当者、完成画像が不足しています。" },
      { status: 400 }
    );
  }

  const imageBuffer = parseJpegDataUrl(finalImageDataUrl);
  if (!imageBuffer) {
    return NextResponse.json(
      { message: "完成画像の形式を確認できませんでした。" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, store_code, display_name, logo_url, frame_url, theme_color, print_template_type, timezone")
      .eq("id", storeId)
      .eq("is_active", true)
      .maybeSingle();
    const store = storeData as StoreAssetRow | null;

    if (storeError) {
      return NextResponse.json(
        { message: "店舗情報を確認できませんでした。", detail: formatSupabaseError(storeError) },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json({ message: "保存対象の店舗を確認できませんでした。" }, { status: 404 });
    }

    const { data: staffData, error: staffError } = await supabase
      .from("staff_members")
      .select("id, store_id, display_name")
      .eq("id", staffId)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .maybeSingle();
    const staff = staffData as StaffAssetRow | null;

    if (staffError) {
      return NextResponse.json(
        { message: "担当者情報を確認できませんでした。", detail: formatSupabaseError(staffError) },
        { status: 500 }
      );
    }

    if (!staff) {
      return NextResponse.json({ message: "保存対象の担当者を確認できませんでした。" }, { status: 404 });
    }

    let frameUrlSnapshot = store.frame_url;
    if (requestedFrameUrl && requestedFrameUrl !== store.frame_url) {
      const { data: frameData, error: frameError } = await supabase
        .from("store_frames")
        .select("frame_url")
        .eq("store_id", store.id)
        .eq("frame_url", requestedFrameUrl)
        .maybeSingle();
      const frame = frameData as StoreFrameAssetRow | null;

      if (frameError) {
        return NextResponse.json(
          { message: "使用した枠を確認できませんでした。", detail: formatSupabaseError(frameError) },
          { status: 500 }
        );
      }

      if (!frame) {
        return NextResponse.json({ message: "使用した枠が店舗設定と一致しません。" }, { status: 400 });
      }

      frameUrlSnapshot = frame.frame_url;
    }

    const now = new Date();
    const capturedAt = now.toISOString();
    const confirmedAt = capturedAt;
    const printedAtValue = printedAt || null;
    const { year, month, day, dateLabel } = getDateParts(now, store.timezone || "Asia/Tokyo");
    const assetsTable = supabase.from("assets") as unknown as AssetsTable;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { data: latestRows, error: latestError } = await assetsTable
        .select("sequence_number")
        .eq("store_id", store.id)
        .eq("captured_date", dateLabel)
        .order("sequence_number", { ascending: false })
        .limit(1);

      if (latestError) {
        return NextResponse.json(
          { message: "保存番号を確認できませんでした。", detail: formatSupabaseError(latestError) },
          { status: 500 }
        );
      }

      const typedLatestRows = (latestRows ?? []) as LatestAssetSequenceRow[];
      const latestSequence = typedLatestRows[0]?.sequence_number ?? 0;
      const sequenceNumber = latestSequence + attempt;
      const sequenceLabel = String(sequenceNumber).padStart(3, "0");
      const manageCode = `${store.store_code}-${year}${month}${day}-${sequenceLabel}`;
      const storagePath = `${store.store_code}/${year}/${month}/${day}/${manageCode}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(FINAL_IMAGE_BUCKET)
        .upload(storagePath, imageBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        if (attempt < 3 && uploadError.message.toLowerCase().includes("already exists")) {
          continue;
        }

        return NextResponse.json(
          { message: "完成画像をStorageへ保存できませんでした。", detail: uploadError.message },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(FINAL_IMAGE_BUCKET)
        .getPublicUrl(storagePath);

      const { data: insertedData, error: insertError } = await assetsTable
        .insert({
          manage_code: manageCode,
          store_id: store.id,
          store_code: store.store_code,
          store_display_name: store.display_name,
          staff_id: staff.id,
          staff_display_name: staff.display_name,
          captured_at: capturedAt,
          captured_date: dateLabel,
          sequence_number: sequenceNumber,
          sns_consent: true,
          mosaic_required: false,
          final_processed_url: publicUrlData.publicUrl,
          final_storage_bucket: FINAL_IMAGE_BUCKET,
          final_storage_path: storagePath,
          short_caption: shortCaption || null,
          frame_url_snapshot: frameUrlSnapshot,
          logo_url_snapshot: store.logo_url,
          theme_color_snapshot: store.theme_color,
          print_template_type_snapshot: store.print_template_type,
          printed_at: printedAtValue,
          consent_confirmed_at: confirmedAt,
          status: "ready",
          saved_at: capturedAt,
        })
        .select("id, manage_code, final_processed_url")
        .single();

      if (insertError) {
        await supabase.storage.from(FINAL_IMAGE_BUCKET).remove([storagePath]);

        if (attempt < 3 && insertError.code === "23505") {
          continue;
        }

        return NextResponse.json(
          { message: "完成画像のDB登録に失敗しました。", detail: formatSupabaseError(insertError) },
          { status: 500 }
        );
      }

      const inserted = insertedData as InsertedAssetRow;

      return NextResponse.json({
        id: inserted.id,
        manageCode: inserted.manage_code,
        finalProcessedUrl: inserted.final_processed_url,
      });
    }

    return NextResponse.json(
      { message: "保存番号が重複しました。もう一度保存してください。" },
      { status: 409 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "完成画像を保存できませんでした。",
      },
      { status: 500 }
    );
  }
}
