import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyStorePin } from "@/lib/storePin";
import type { StoreSession } from "@/types/storeSession";

export const runtime = "nodejs";

const MAX_SESSION_FRAMES = 3;
const MIN_DEMO_FRAMES = 3;

const DEMO_FRAME_DEFINITIONS = [
  {
    frame_name: "標準グリーン",
    frame_path: "/test-assets/frame-standard-green.svg",
    sort_order: 10,
  },
  {
    frame_name: "季節ピンク",
    frame_path: "/test-assets/frame-season-pink.svg",
    sort_order: 20,
  },
  {
    frame_name: "イベントゴールド",
    frame_path: "/test-assets/frame-event-gold.svg",
    sort_order: 30,
  },
];

type StoreLoginRequest = {
  loginCode?: unknown;
  pin?: unknown;
};

type StoreLoginRow = {
  id: string;
  store_code: string;
  store_name: string;
  display_name: string;
  pin_hash: string;
  logo_url: string | null;
  frame_url: string | null;
  theme_color: string | null;
  print_template_type: string;
  timezone: string;
  sns_display_name: string | null;
  instagram_account: string | null;
  default_hashtags: string | null;
};

type StaffLoginRow = {
  id: string;
  staff_code: string;
  display_name: string;
  role_label: string | null;
  can_approve_sns: boolean;
};

type StoreFrameLoginRow = {
  id: string;
  frame_name: string;
  frame_url: string;
  is_default: boolean;
};

type StoreFramesMutationTable = {
  insert: (values: Array<Record<string, unknown>>) => Promise<{
    error: { code?: string; message?: string; details?: string; hint?: string } | null;
  }>;
};

function normalizeLoginCode(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePin(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatSupabaseError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  const parts = [error.code, error.message, error.details, error.hint].filter(Boolean);
  return parts.join(" / ");
}

function isDemoStore(storeCode: string) {
  return storeCode.startsWith("DEMO_");
}

function getPublicUrl(request: Request, path: string) {
  return new URL(path, new URL(request.url).origin).toString();
}

async function ensureDemoFrames(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  request: Request,
  store: StoreLoginRow,
  currentFrames: StoreFrameLoginRow[]
) {
  if (!isDemoStore(store.store_code) || currentFrames.length >= MIN_DEMO_FRAMES) return null;

  const currentFrameUrls = new Set(currentFrames.map((frame) => frame.frame_url));
  const rows = DEMO_FRAME_DEFINITIONS.map((frame) => ({
    store_id: store.id,
    frame_name: frame.frame_name,
    frame_url: getPublicUrl(request, frame.frame_path),
    is_default: false,
    is_active: true,
    sort_order: frame.sort_order,
  })).filter((frame) => !currentFrameUrls.has(frame.frame_url));

  if (rows.length === 0) return null;

  const framesTable = supabase.from("store_frames") as unknown as StoreFramesMutationTable;
  const { error } = await framesTable.insert(rows);
  return error;
}

export async function POST(request: Request) {
  let body: StoreLoginRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "ログイン情報を読み取れませんでした。" }, { status: 400 });
  }

  const loginCode = normalizeLoginCode(body.loginCode);
  const pin = normalizePin(body.pin);

  if (!loginCode || !pin) {
    return NextResponse.json({ message: "店舗コードとPINを入力してください。" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select(
        "id, store_code, store_name, display_name, pin_hash, logo_url, frame_url, theme_color, print_template_type, timezone, sns_display_name, instagram_account, default_hashtags"
      )
      .eq("login_code", loginCode)
      .eq("is_active", true)
      .maybeSingle();
    const store = storeData as StoreLoginRow | null;

    if (storeError) {
      return NextResponse.json(
        {
          message: "店舗情報を確認できませんでした。",
          detail: formatSupabaseError(storeError),
        },
        { status: 500 }
      );
    }

    if (!store || !verifyStorePin(pin, store.pin_hash)) {
      return NextResponse.json({ message: "店舗コードまたはPINが違います。" }, { status: 401 });
    }

    const { data: staffData, error: staffError } = await supabase
      .from("staff_members")
      .select("id, staff_code, display_name, role_label, can_approve_sns")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });
    const staffMembers = (staffData ?? []) as StaffLoginRow[];

    if (staffError) {
      return NextResponse.json(
        {
          message: "担当者一覧を確認できませんでした。",
          detail: formatSupabaseError(staffError),
        },
        { status: 500 }
      );
    }

    const { data: frameData, error: frameError } = await supabase
      .from("store_frames")
      .select("id, frame_name, frame_url, is_default")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("frame_name", { ascending: true })
      .limit(MAX_SESSION_FRAMES);
    let frames = (frameData ?? []) as StoreFrameLoginRow[];

    if (frameError) {
      return NextResponse.json(
        {
          message: "店舗フレームを確認できませんでした。",
          detail: formatSupabaseError(frameError),
        },
        { status: 500 }
      );
    }

    const setupFrameError = await ensureDemoFrames(supabase, request, store, frames);
    if (setupFrameError) {
      return NextResponse.json(
        {
          message: "テスト用の枠を準備できませんでした。",
          detail: formatSupabaseError(setupFrameError),
        },
        { status: 500 }
      );
    }

    if (isDemoStore(store.store_code) && frames.length < MIN_DEMO_FRAMES) {
      const { data: refreshedFrameData, error: refreshedFrameError } = await supabase
        .from("store_frames")
        .select("id, frame_name, frame_url, is_default")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("frame_name", { ascending: true })
        .limit(MAX_SESSION_FRAMES);

      if (refreshedFrameError) {
        return NextResponse.json(
          {
            message: "テスト用の枠を確認できませんでした。",
            detail: formatSupabaseError(refreshedFrameError),
          },
          { status: 500 }
        );
      }

      frames = (refreshedFrameData ?? []) as StoreFrameLoginRow[];
    }

    const session: StoreSession = {
      store: {
        id: store.id,
        storeCode: store.store_code,
        storeName: store.store_name,
        displayName: store.display_name,
        logoUrl: store.logo_url,
        frameUrl: frames[0]?.frame_url ?? store.frame_url,
        frames: frames.map((frame) => ({
          id: frame.id,
          frameName: frame.frame_name,
          frameUrl: frame.frame_url,
          isDefault: frame.is_default,
        })),
        themeColor: store.theme_color,
        printTemplateType: store.print_template_type,
        timezone: store.timezone,
        snsDisplayName: store.sns_display_name,
        instagramAccount: store.instagram_account,
        defaultHashtags: store.default_hashtags,
      },
      staffMembers: staffMembers.map((staff) => ({
        id: staff.id,
        staffCode: staff.staff_code,
        displayName: staff.display_name,
        roleLabel: staff.role_label,
        canApproveSns: staff.can_approve_sns,
      })),
      loggedInAt: new Date().toISOString(),
    };

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "店舗ログインを処理できませんでした。",
      },
      { status: 500 }
    );
  }
}
