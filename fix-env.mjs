// Nuclear BOM cleanup for Vercel env vars
// This script:
// 1. Lists ALL env vars
// 2. Deletes ALL Supabase-related ones (across all targets)
// 3. Re-creates with byte-verified clean values

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const authJson = JSON.parse(readFileSync(join(homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json'), 'utf8'));
const token = authJson.token;
const PROJECT_ID = 'prj_XyBCP6VOdbHG1iedU40SYfuiEmdA';

// Clean values - each character verified
const CLEAN_URL = 'https://vxyzqymlnqxlcbqbrvip.supabase.co';
const CLEAN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eXpxeW1sbnF4bGNicWJydmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1OTY5MTAsImV4cCI6MjA4NDE3MjkxMH0.OsCqhBhBzyNg12SVGB37PV7KVUF24qPHV4gySeX5VWY';

// Verify no BOM/hidden chars
function verifyClean(name, value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 127 || code < 32) {
      console.error(`!!! HIDDEN CHAR in ${name} at index ${i}: charCode ${code}`);
      return false;
    }
  }
  console.log(`✅ ${name} is clean (${value.length} chars, first: "${value[0]}", last: "${value[value.length-1]}")`);
  return true;
}

verifyClean('URL', CLEAN_URL);
verifyClean('KEY', CLEAN_KEY);

async function main() {
  // 1. List ALL env vars
  const listRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const listData = await listRes.json();
  
  console.log('\n--- Current env vars ---');
  const supabaseVars = listData.envs?.filter(e => 
    e.key.includes('SUPABASE') || e.key.includes('supabase')
  ) || [];
  
  for (const v of supabaseVars) {
    console.log(`${v.key} (id: ${v.id}, target: ${v.target?.join(',')}, type: ${v.type})`);
  }
  
  // 2. Delete ALL Supabase-related env vars
  console.log('\n--- Deleting ALL Supabase env vars ---');
  for (const v of supabaseVars) {
    const delRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${v.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Deleted ${v.key} (${v.id}): ${delRes.status}`);
  }
  
  // 3. Re-create with CLEAN values for ALL targets
  console.log('\n--- Creating fresh env vars ---');
  
  const targets = ['production', 'preview', 'development'];
  
  // URL
  const urlRes = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: CLEAN_URL,
      type: 'encrypted',
      target: targets
    })
  });
  console.log(`Created NEXT_PUBLIC_SUPABASE_URL: ${urlRes.status}`);
  
  // KEY
  const keyRes = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      value: CLEAN_KEY,
      type: 'encrypted',
      target: targets
    })
  });
  console.log(`Created NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${keyRes.status}`);
  
  // 4. Verify by listing again
  const verifyRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const verifyData = await verifyRes.json();
  const supabaseAfter = verifyData.envs?.filter(e => e.key.includes('SUPABASE')) || [];
  
  console.log('\n--- After cleanup ---');
  for (const v of supabaseAfter) {
    console.log(`${v.key} (id: ${v.id}, target: ${v.target?.join(',')}, type: ${v.type})`);
  }
  
  console.log('\n✅ Done! Now trigger a fresh redeploy.');
}

main().catch(console.error);
