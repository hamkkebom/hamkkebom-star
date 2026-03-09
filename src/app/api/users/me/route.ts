import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

const updateUserSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다.").optional(),
  email: z.string().email("올바른 이메일을 입력해주세요.").optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ✅ getAuthUser() — React cache + 중복 호출 방지
    let user = await getAuthUser({ skipApprovalCheck: true });

    if (!user) {
      // 신규 유저: Supabase에서 authId로 자동 생성
      const supabase = await createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.id) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
          { status: 401 }
        );
      }

      const metadata: Record<string, unknown> =
        authUser.user_metadata && typeof authUser.user_metadata === "object"
          ? authUser.user_metadata
          : {};

      const name =
        (typeof metadata.name === "string" && metadata.name) ||
        (typeof metadata.full_name === "string" && metadata.full_name) ||
        (typeof metadata.nickname === "string" && metadata.nickname) ||
        authUser.email?.split("@")[0] ||
        "사용자";

      const phone = typeof metadata.phone === "string" ? metadata.phone : null;
      const chineseName =
        typeof metadata.chineseName === "string" ? metadata.chineseName : null;

      user = await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email ?? "",
          name,
          phone,
          chineseName,
        },
      });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("[/api/users/me] GET failed:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthUser({ skipApprovalCheck: true });

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  const updateData = {
    ...parsed.data,
    phone: parsed.data.phone?.trim() ? parsed.data.phone : null,
  };

  if (typeof updateData.name === "string") {
    updateData.name = updateData.name.trim();
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      authId: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isApproved: true,
      baseRate: true,
      bankName: true,
      bankAccount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: updatedUser });
}
