import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const csvFilePath = path.join(process.cwd(), "public", "Table 1-Grid view.csv");
        const fileContent = readFileSync(csvFilePath, "utf-8");

        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        const records = lines.slice(1).map(line => {
            const values = line.split(",");
            return {
                name: values[0]?.trim(),
                phone: values[1]?.trim(),
                idNumber: values[2]?.trim(),
                bankName: values[3]?.trim(),
                bankAccount: values[4]?.trim(),
            };
        });

        let updatedCount = 0;
        const results = [];

        for (const record of records) {
            if (!record.name) continue;

            const users = await prisma.user.findMany({
                where: { name: record.name },
            });

            if (users.length > 0) {
                for (const user of users) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            phone: record.phone || null,
                            idNumber: record.idNumber || null,
                            bankName: record.bankName || null,
                            bankAccount: record.bankAccount || null,
                        }
                    });
                    updatedCount++;
                }
                results.push(`Updated ${record.name}`);
            } else {
                results.push(`Not found ${record.name}`);
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            results
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
