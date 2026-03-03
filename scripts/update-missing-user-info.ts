import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

async function main() {
    const csvFilePath = path.join(process.cwd(), "public", "Table 1-Grid view.csv");
    const fileContent = readFileSync(csvFilePath, "utf-8");

    // Custom simple CSV parser
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    const headers = lines[0].split(",");

    const records = lines.slice(1).map(line => {
        // Handling simple comma separation.
        // Assuming the first 5 columns don't have commas inside quotes.
        const values = line.split(",");
        return {
            "이름": values[0]?.trim(),
            "휴대번호": values[1]?.trim(),
            "주민번호": values[2]?.trim(),
            "은행명": values[3]?.trim(),
            "은행계좌": values[4]?.trim(),
        };
    });

    console.log(`총 ${records.length}개의 행을 읽었습니다.`);

    let updatedCount = 0;
    for (const record of records) {
        const name = record["이름"];
        const phone = record["휴대번호"];
        const idNumber = record["주민번호"];
        const bankName = record["은행명"];
        const bankAccount = record["은행계좌"];

        // find user by name to update
        if (!name) continue;

        const users = await prisma.user.findMany({
            where: { name: name },
        });

        if (users.length > 0) {
            // update all matching users
            for (const user of users) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        phone: phone || null,
                        idNumber: idNumber || null,
                        bankName: bankName || null,
                        bankAccount: bankAccount || null,
                    }
                });
                updatedCount++;
            }
            console.log(`✅ ${name} 업데이트 완료`);
        } else {
            console.log(`❌ DB에서 ${name} 회원을 찾을 수 없습니다.`);
        }
    }

    console.log(`\n데이터 업데이트 완료! (총 ${updatedCount}개 업데이트)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
