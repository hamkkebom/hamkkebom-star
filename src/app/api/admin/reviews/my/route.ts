import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requester = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { id: true, role: true },
        });

        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 담당하는 STAR의 대기중/리뷰중 제출 조회
        const submissions = await prisma.submission.findMany({
            where: {
                star: {
                    managerId: requester.id
                },
                status: {
                    in: ["PENDING", "IN_REVIEW"],
                },
            },
            select: {
                id: true,
                version: true,
                versionTitle: true,
                status: true,
                createdAt: true,
                streamUid: true,
                thumbnailUrl: true,
                star: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                    }
                },
                video: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        thumbnailUrl: true,
                        streamUid: true,
                    }
                },
                assignment: {
                    select: {
                        request: {
                            select: { title: true }
                        }
                    }
                },
                _count: {
                    select: { feedbacks: true }
                },
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json({ data: submissions });

    } catch (err) {
        console.error("Fetch My Reviews Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
