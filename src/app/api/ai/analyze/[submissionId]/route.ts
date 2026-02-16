import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ submissionId: string }> };

export async function GET(_request: Request, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const { submissionId } = await params;

    // 권한 확인 (STAR는 본인 제출물만)
    if (user.role === "STAR") {
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            select: { starId: true },
        });

        if (!submission || submission.starId !== user.id) {
            return NextResponse.json(
                { error: { code: "FORBIDDEN", message: "본인의 제출물만 조회할 수 있습니다." } },
                { status: 403 }
            );
        }
    }

    const analysis = await prisma.aiAnalysis.findUnique({
        where: { submissionId },
    });

    return NextResponse.json({ data: analysis });
}
