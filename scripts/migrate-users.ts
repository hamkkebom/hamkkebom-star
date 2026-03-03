import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const csvFilePath = path.join(process.cwd(), "public", "Table 1-Grid view.csv");
    const fileContent = fs.readFileSync(csvFilePath, "utf-8");

    // Parse CSV
    // Columns: 이름,휴대번호,주민번호,은행명,은행계좌,이메일,신분증,통장사본,제출일
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`총 ${records.length}개의 행을 읽었습니다.`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const record of records) {
        const name = record["이름"];
        let phone: string | null = record["휴대번호"] || null;
        const idNumber = record["주민번호"] || null;
        const bankName = record["은행명"] || null;
        const bankAccount = record["은행계좌"] || null;
        const email = record["이메일"] || null;

        if (!name) continue;

        const findCondition: any = { name };

        // Find the user by name
        const users = await prisma.user.findMany({
            where: findCondition,
        });

        if (users.length === 0) {
            console.log(`[SKIP] 사용자를 찾을 수 없음: ${name} (이메일: ${email || 'N/A'})`);
            notFoundCount++;
            continue;
        }

        // If multiple users found with the same name, we try to match by email if possible
        let targetUser = users[0];
        if (users.length > 1 && email) {
            const matchedByEmail = users.find((u) => u.email === email);
            if (matchedByEmail) {
                targetUser = matchedByEmail;
            }
        }

        // Phone format clean up
        if (phone) {
            // e.g., 010-1234-5678 or 01012345678 -> 010-1234-5678
            phone = phone.replace(/[^0-9]/g, "");
            if (phone.length === 11) {
                phone = `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
            }
        }

        await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                idNumber: idNumber || targetUser.idNumber,
                bankName: bankName || targetUser.bankName,
                bankAccount: bankAccount || targetUser.bankAccount,
                ...(phone && { phone }),
            },
        });

        console.log(`[OK] 업데이트 완료: ${name} (${targetUser.email})`);
        updatedCount++;
    }

    console.log(`\n=============================`);
    console.log(`마이그레이션 완료`);
    console.log(`업데이트 성공: ${updatedCount}명`);
    console.log(`찾을 수 없는 사용자: ${notFoundCount}명`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
