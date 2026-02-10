// ============================================================
// 🔒 AUTH BYPASS: 로그인 기능 전체 주석 처리 (2026-02-10)
// Supabase 인증 없이 DB의 ADMIN 유저를 반환합니다.
// 복원하려면 아래 주석 블록의 원래 코드로 교체하세요.
// ============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// --- 원래 import (주석 처리됨) ---
// import { createClient } from "@/lib/supabase/server";
// --- 원래 import 끝 ---

const updateUserSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다.").optional(),
  email: z.string().email("올바른 이메일을 입력해주세요.").optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().url("올바른 URL을 입력해주세요.").nullable().optional(),
});

export async function GET() {
  // AUTH BYPASS: Supabase 인증 없이 DB에서 ADMIN 유저를 조회합니다.
  // --- 원래 supabase 인증 코드 (주석 처리됨) ---
  // const supabase = await createClient();
  // const {
  //   data: { user: authUser },
  // } = await supabase.auth.getUser();
  //
  // if (!authUser?.id) {
  //   return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  // }
  //
  // const user = await prisma.user.findUnique({
  //   where: { authId: authUser.id },
  //   ...
  // });
  // --- 원래 코드 끝 ---

  const user = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authId: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      role: true,
      baseRate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "사용자 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  // AUTH BYPASS: Supabase 인증 없이 ADMIN 유저를 업데이트합니다.
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    return NextResponse.json({ message: "인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "입력값이 올바르지 않습니다.",
        errors: parsed.error.flatten(),
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

  const user = await prisma.user.update({
    where: { id: adminUser.id },
    data: updateData,
    select: {
      id: true,
      authId: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      role: true,
      baseRate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ user });
}
