import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const updateUserSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다.").optional(),
  email: z.string().email("올바른 이메일을 입력해주세요.").optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
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
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "사용자 정보를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: user });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "사용자 정보를 찾을 수 없습니다." } },
      { status: 404 }
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
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: updatedUser });
}
