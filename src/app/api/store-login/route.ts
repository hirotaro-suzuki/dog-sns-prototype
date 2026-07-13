import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyStorePin } from "@/lib/storePin";
import { MAX_FRAMES_PER_STORE } from "@/lib/frameLimits";
import type { StoreSession } from "@/types/storeSession";

export const runtime = "nodejs";

const MAX_SESSION_FRAMES = MAX_FRAMES_PER_STORE;
const FRAME_SELECT_COLUMNS =
  "id, frame_name, frame_url, is_default, date_enabled, date_x, date_y, date_font_size, date_color";

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
};

type StoreFrameLoginRow = {
  id: string;
  frame_name: string;
  frame_url: string;
  is_default: boolean;
  date_enabled: boolean;
  date_x: number;
  date_y: number;
  date_font_size: number;
  date_color: string;
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
      .select("id, staff_code, display_name")
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
      .select(FRAME_SELECT_COLUMNS)
      .eq("store_id", store.id)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("frame_name", { ascending: true })
      .limit(MAX_SESSION_FRAMES);
    const frames = (frameData ?? []) as StoreFrameLoginRow[];

    if (frameError) {
      return NextResponse.json(
        {
          message: "店舗フレームを確認できませんでした。",
          detail: formatSupabaseError(frameError),
        },
        { status: 500 }
      );
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
          dateEnabled: frame.date_enabled,
          dateX: frame.date_x,
          dateY: frame.date_y,
          dateFontSize: frame.date_font_size,
          dateColor: frame.date_color,
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
