import 'dotenv/config';
import postgres from 'postgres';

async function test(urlName: string, url?: string) {
  if (!url) { console.log(`❌ ${urlName} missing`); return; }
  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql`select now() as now`;
    console.log(`✅ ${urlName} ok:`, rows[0].now);
  } catch (e: any) {
    console.error(`❌ ${urlName} failed:`, e?.message || e);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function main() {
  await test('DIRECT_URL', process.env.DIRECT_URL);
  await test('DATABASE_URL', process.env.DATABASE_URL);
}

main();

