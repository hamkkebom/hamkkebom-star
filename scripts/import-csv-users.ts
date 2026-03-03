import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const csvData = [
    { name: "강희선", phone: "01055586656", idNumber: "821117-2148614", bankName: "국민은행", bankAccount: "281901-04-019675", email: "jjangna35@naver.com" },
    { name: "곽용희", phone: "010-3463-5919", idNumber: "760228-2406327", bankName: "카카오뱅크", bankAccount: "3333-12-2484556", email: "changjak4042@gmail.com" },
    { name: "김남원", phone: "010-7133-3420", idNumber: "811006-1223529", bankName: "카카오뱅크", bankAccount: "3333-05-0510356", email: "kkknw@hanmail.net" },
    { name: "김보라", phone: "010-2600-6675", idNumber: "820218-2006031", bankName: "우리은행", bankAccount: "1002-736-010814", email: "usozukii@gmail.com" },
    { name: "김소영", phone: "010-3231-7834", idNumber: "790316-2030032", bankName: "케이뱅크", bankAccount: "100-167-070117", email: "demainlook@gmail.com" },
    { name: "김애경", phone: "010-3393-1225", idNumber: "691001-2000411", bankName: "카카오뱅크", bankAccount: "3333-24-0574738", email: "gooddair04@gmail.com" },
    { name: "김예솔", phone: "010-7770-3749", idNumber: "921210-2352215", bankName: "신한은행", bankAccount: "110-356-226870", email: "1210yesol@gmail.com" },
    { name: "김용수", phone: "010-2949-1466", idNumber: "740608-1105426", bankName: "하나은행", bankAccount: "410-910489-78907", email: "ysmercury@gmail.com" },
    { name: "김윤석", phone: "010-6268-3022", idNumber: "960706-1009812", bankName: "신한은행", bankAccount: "110-445-137148", email: "gkgk2102@naver.com" },
    { name: "김지민", phone: "010-7129-0231", idNumber: "880329-2075210", bankName: "우리은행", bankAccount: "467-08-161596", email: "1mediclip@gmail.com" },
    { name: "김지은", phone: "010-7294-2707", idNumber: "840628-2001111", bankName: "신한은행", bankAccount: "110-303-305538", email: "kimpro.j37@gmail.com" },
    { name: "김지은", phone: "010-3780-1401", idNumber: "010207-4025627", bankName: "국민은행", bankAccount: "757102-04-242665", email: "kje010207@gmail.com" },
    { name: "김찬수", phone: "01080309173", idNumber: "820807-1326611", bankName: "카카오뱅크", bankAccount: "3333-05-1590122", email: "kim.cs@cacadew.com" },
    { name: "김현우", phone: "010-8644-6802", idNumber: "050204-3179213", bankName: "신한은행", bankAccount: "110-577-137216", email: "funtimes0522@gmail.com" },
    { name: "문상원", phone: "010-4586-3253", idNumber: "820201-1560812", bankName: "국민은행", bankAccount: "527802-01-277711", email: "moongsipapa@gmail.com" },
    { name: "문정민", phone: "010-5247-6784", idNumber: "950518-2041813", bankName: "우리은행", bankAccount: "1002-065-977301", email: "jjjgghh@naver.com" },
    { name: "박건우", phone: "010-2893-5825", idNumber: "031129-3080218", bankName: "카카오뱅크", bankAccount: "3333-23-4435226", email: "joeypark1129@naver.com" },
    { name: "박성희", phone: "010-5466-2884", idNumber: "630523-2068914", bankName: "우리은행", bankAccount: "1002-265-383986", email: "lulury@naver.com" },
    { name: "박종찬", phone: "010-5597-3377", idNumber: "870422-1006017", bankName: "토스뱅크", bankAccount: "1000-0068-7398", email: "modoo@modooweb.co.kr" },
    { name: "박주연", phone: "010-6710-4769", idNumber: "840505-2231038", bankName: "우리은행", bankAccount: "309-110225-02-001", email: "keep.alive.box@gmail.com" },
    { name: "박준용", phone: "010-5416-6877", idNumber: "", bankName: "", bankAccount: "", email: "syfoot@gmail.com" },
    { name: "방지훈", phone: "010-8250-2776", idNumber: "890722-1636718", bankName: "국민은행", bankAccount: "91082502776", email: "wlgns2776@gmail.com" },
    { name: "백한수", phone: "010-7475-1225", idNumber: "660904-1068722", bankName: "우리은행", bankAccount: "823-123588-02-001", email: "gooddair04@gmail.com" },
    { name: "심현석", phone: "010-9958-9496", idNumber: "800723-1122320", bankName: "신한은행", bankAccount: "110-247-915220", email: "mavericx@naver.com" },
    { name: "양현진", phone: "010-8942-0630", idNumber: "810630-2080336", bankName: "국민은행", bankAccount: "439202-01-235416", email: "jini-hoya@naver.com" },
    { name: "엄용철", phone: "010-3632-9677", idNumber: "710803-1474529", bankName: "농협은행", bankAccount: "351-1296-6701-83", email: "witheee@gmail.com" },
    { name: "윤종석", phone: "01041687498", idNumber: "810302-1030618", bankName: "국민은행", bankAccount: "538801-01-120667", email: "innovantjs@gmail.com" },
    { name: "이다혜", phone: "010-7212-6683", idNumber: "961005-2249912", bankName: "신한은행", bankAccount: "110-432-498161", email: "salleeee.kr@gmail.com" },
    { name: "이두혁", phone: "010-6713-1181", idNumber: "830920-1102138", bankName: "국민은행", bankAccount: "053602-04-288200", email: "kt37031181@gmail.com" },
    { name: "이승태", phone: "010-6737-8803", idNumber: "880310-1017626", bankName: "국민은행", bankAccount: "044201-04-188622", email: "taeluckys@gmail.com" },
    { name: "이예린", phone: "010-6685-6562", idNumber: "870411-2188029", bankName: "기업은행", bankAccount: "010-6685-6562", email: "gngplusofficial@gmail.com" },
    { name: "이용주", phone: "010-2749-0552", idNumber: "911006-1169313", bankName: "신한은행", bankAccount: "110-316-093960", email: "dydrkfl678@naver.com" },
    { name: "이인선", phone: "", idNumber: "780508-2528818", bankName: "농협은행", bankAccount: "211012-56-091597", email: "mkku057@gmail.com" },
    { name: "이혜원", phone: "010-9292-8275", idNumber: "910210-2251212", bankName: "국민은행", bankAccount: "207302-04-169140", email: "lhw2010@naver.com" },
    { name: "차은규", phone: "010-8670-4959", idNumber: "880331-1095128", bankName: "신한은행", bankAccount: "110-237-246032", email: "besteunkyu@naver.com" },
    { name: "최석진", phone: "010-4846-9867", idNumber: "811022-1332916", bankName: "신한은행", bankAccount: "110-508-640963", email: "choisj8110@naver.com" },
    { name: "최종일", phone: "010-9581-0530", idNumber: "860530-1063116", bankName: "국민은행", bankAccount: "479002-01-245288", email: "k777007@gmail.com" },
    { name: "하윤나", phone: "010-9574-8180", idNumber: "840818-2890417", bankName: "케이뱅크", bankAccount: "100-231-668741", email: "hynpresident@gmail.com" },
];

async function main() {
    const client = await pool.connect();
    let updated = 0;
    let notFound = 0;
    let skipped = 0;
    let errored = 0;

    try {
        for (const row of csvData) {
            const email = row.email.trim().split(/\s+/)[0];

            try {
                const sets: string[] = [];
                const values: any[] = [];
                let idx = 1;

                if (row.phone) { sets.push(`phone = $${idx++}`); values.push(row.phone); }
                if (row.idNumber) { sets.push(`"idNumber" = $${idx++}`); values.push(row.idNumber); }
                if (row.bankName) { sets.push(`"bankName" = $${idx++}`); values.push(row.bankName.trim()); }
                if (row.bankAccount) { sets.push(`"bankAccount" = $${idx++}`); values.push(row.bankAccount); }

                if (sets.length === 0) {
                    console.log(`SKIP: ${row.name} (${email})`);
                    skipped++;
                    continue;
                }

                sets.push(`"updatedAt" = NOW()`);
                values.push(email);

                const sql = `UPDATE users SET ${sets.join(", ")} WHERE email = $${idx}`;
                const result = await client.query(sql, values);

                if (result.rowCount === 0) {
                    // 이메일 매칭 실패 → 이름으로 재시도
                    const nameValues = [...values.slice(0, -1), row.name];
                    const nameSql = `UPDATE users SET ${sets.join(", ")} WHERE name = $${idx}`;
                    const nameResult = await client.query(nameSql, nameValues);

                    if (nameResult.rowCount === 0) {
                        console.log(`NOT FOUND: ${row.name} (${email})`);
                        notFound++;
                    } else {
                        console.log(`UPDATED (by name): ${row.name} (${nameResult.rowCount} rows)`);
                        updated++;
                    }
                } else {
                    console.log(`UPDATED: ${row.name} (${email})`);
                    updated++;
                }
            } catch (e: any) {
                console.log(`ERROR: ${row.name} (${email}) -> ${e.message?.substring(0, 120)}`);
                errored++;
            }
        }
    } finally {
        client.release();
        await pool.end();
    }

    console.log(`\n--- Result ---`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Not Found: ${notFound}`);
    console.log(`Errors: ${errored}`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
