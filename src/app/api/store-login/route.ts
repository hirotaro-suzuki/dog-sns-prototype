import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyStorePin } from "@/lib/storePin";
import type { StoreSession } from "@/types/storeSession";

export const runtime = "nodejs";

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

function normalizeLoginCode(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePin(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
      return NextResponse.json({ message: "店舗情報を確認できませんでした。" }, { status: 500 });
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
      return NextResponse.json({ message: "担当者一覧を確認できませんでした。" }, { status: 500 });
    }

    const session: StoreSession = {
      store: {
        id: store.id,
        storeCode: store.store_code,
        storeName: store.store_name,
        displayName: store.display_name,
        logoUrl: store.logo_url,
        frameUrl: store.frame_url,
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
