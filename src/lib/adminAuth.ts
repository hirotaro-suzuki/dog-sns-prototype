import { NextResponse } from "next/server";

export function verifyAdminPin(request: Request) {
  const configuredPin = process.env.ADMIN_MAINTENANCE_PIN;

  if (!configuredPin) {
    return NextResponse.json(
      { message: "本部メンテナンス用PINが未設定です。" },
      { status: 503 }
    );
  }

  const requestPin = request.headers.get("x-admin-pin")?.trim();
  if (!requestPin || requestPin !== configuredPin) {
    return NextResponse.json({ message: "本部メンテナンス用PINを確認してください。" }, { status: 401 });
  }

  return null;
}
