import Airtable from "airtable";

const AIRTABLE_PAT = "patF9b1oNmih2XLHy.00c1c79b30101d8b89f32fdbe105c75ba8ce40e11420d980471b971aac4bcf5c";
const AIRTABLE_BASE_ID = "apphD72afHxR1xby6";

Airtable.configure({ apiKey: AIRTABLE_PAT });
const base = Airtable.base(AIRTABLE_BASE_ID);

async function main() {
  const records = await new Promise<any[]>((resolve, reject) => {
    base("tbl5H5heGupAwaPGn")
      .select({ maxRecords: 1 })
      .firstPage((err: any, recs: any) => {
        if (err) reject(err);
        else resolve(recs || []);
      });
  });

  const r = records[0];
  const fieldNames = Object.keys(r.fields);
  
  // 필드 1개씩 출력
  for (let i = 0; i < fieldNames.length; i++) {
    const key = fieldNames[i];
    const val = r.fields[key];
    const isArr = Array.isArray(val);
    const hasUrl = isArr && val.length > 0 && val[0]?.url;
    const type = val === null || val === undefined ? "null" : isArr ? `Array[${val.length}]` : typeof val;
    const marker = hasUrl ? " <<< ATTACHMENT" : "";
    
    console.log(`[${i+1}/${fieldNames.length}] ${key} (${type})${marker}`);
    
    if (hasUrl) {
      console.log(`    filename: ${val[0].filename}`);
      console.log(`    type: ${val[0].type}`);
      console.log(`    size: ${val[0].size}`);
    }
  }

  // Submissions 필드 목록
  console.log("\n--- Submissions 필드 ---");
  const subs = await new Promise<any[]>((resolve, reject) => {
    base("tbl4vQM9wT0qhikDL")
      .select({ maxRecords: 1 })
      .firstPage((err: any, recs: any) => {
        if (err) reject(err);
        else resolve(recs || []);
      });
  });

  const sf = Object.keys(subs[0].fields);
  for (let i = 0; i < sf.length; i++) {
    const key = sf[i];
    const val = subs[0].fields[key];
    const isArr = Array.isArray(val);
    const hasUrl = isArr && val.length > 0 && val[0]?.url;
    const type = val === null || val === undefined ? "null" : isArr ? `Array[${val.length}]` : typeof val;
    const marker = hasUrl ? " <<< ATTACHMENT" : "";
    console.log(`[${i+1}/${sf.length}] ${key} (${type})${marker}`);
    if (hasUrl) {
      console.log(`    filename: ${val[0].filename}`);
      console.log(`    type: ${val[0].type}`);
      console.log(`    size: ${val[0].size}`);
    }
  }
}

main().catch(console.error);
