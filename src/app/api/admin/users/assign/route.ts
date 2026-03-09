import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
    try {
        const requester = await getAuthUser();
        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch all users with role STAR, including pending submission count
        const keyUsers = await prisma.user.findMany({
            where: { role: "STAR" },
            select: {
                id: true,
                name: true,
                chineseName: true,
                email: true,
                avatarUrl: true,
                managerId: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        submissions: { where: { status: "PENDING" } },
                    },
                },
            },
        });

        // Transform data to include count
        const starsWithCount = keyUsers.map((user) => ({
            ...user,
            pendingSubmissionCount: user._count.submissions,
            _count: undefined,
        }));

        // Fetch all active admins (potential managers)
        const admins = await prisma.user.findMany({
            where: { role: "ADMIN" },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
            },
        });

        return NextResponse.json({
            data: {
                currentUser: requester,
                stars: starsWithCount,
                admins: admins,
            },
        });
    } catch (err: unknown) {
        console.error("Assign API (GET) - Error:", err);
        const message = err instanceof Error ? err.message : "Internal Server Error";
        return NextResponse.json(
            { error: "Internal Server Error", details: message },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const requester = await getAuthUser();
        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { starId, managerId } = body;

        if (!starId) {
            return NextResponse.json({ error: "Missing starId" }, { status: 400 });
        }

        // Verify the star exists
        const star = await prisma.user.findUnique({
            where: { id: starId },
        });

        if (!star) {
            return NextResponse.json(
                { error: "Star user not found" },
                { status: 404 }
            );
        }

        // Verify the manager exists if provided
        if (managerId) {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
            });

            if (!manager) {
                return NextResponse.json(
                    { error: "Manager user not found" },
                    { status: 404 }
                );
            }
            if (manager.role !== "ADMIN") {
                return NextResponse.json(
                    { error: "Manager must be an admin" },
                    { status: 400 }
                );
            }
        }

        // Security: Cannot touch if assigned to another admin
        const currentManagerId = star.managerId;
        if (currentManagerId && currentManagerId !== requester.id) {
            return NextResponse.json(
                { error: "Cannot modify users assigned to other managers" },
                { status: 403 }
            );
        }

        // Security: If assigning, must assign to self
        if (managerId && managerId !== requester.id) {
            return NextResponse.json(
                { error: "Can only assign to yourself" },
                { status: 403 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: starId },
            data: { managerId: managerId ?? null },
            include: {
                manager: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return NextResponse.json({ data: updatedUser });
    } catch (err: unknown) {
        console.error("Assign API (PATCH) - Error:", err);
        const message = err instanceof Error ? err.message : "Internal Server Error";
        return NextResponse.json(
            { error: "Internal Server Error", details: message },
            { status: 500 }
        );
    }
}
