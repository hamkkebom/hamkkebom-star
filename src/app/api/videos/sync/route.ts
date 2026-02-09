import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";

export async function POST() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 동기화를 실행할 수 있습니다." } },
      { status: 403 }
    );
  }

  return NextResponse.json({
    data: {
      synced: 0,
      message: "Cloudflare Stream 연동이 아직 설정되지 않았습니다.",
    },
  });
}
