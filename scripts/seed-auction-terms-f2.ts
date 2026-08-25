import postgres from "postgres";
import { createHash } from "node:crypto";

const url = process.env.DATABASE_URL ?? "";
const client = postgres(url, { ssl: "require", prepare: false });

const sellerContentAr =
  "أوافق على طرح العقار في المزاد وفق بياناته المعتمدة، وعلى اعتماد نتيجة المزاد وفق نوعه وسياسة المنصة، وأقر بصحة صفتي في التصرف أو التنظيم. " +
  "يلتزم البائع بأمانة ببيع العقار لأعلى مزايد بالسعر الفائز، وعدم التراجع عن التعهد بعد اعتماده.";

const sellerContentEn =
  "I approve offering the property through the auction according to its approved data and the platform auction policy. " +
  "The seller pledges in good faith to sell the property to the highest bidder at the winning price and not to retract after accepting terms.";

const sellerContentHash = createHash("sha256").update(sellerContentAr).digest("hex");

const bidderContentAr =
  "أوافق على شروط المزايدة، وأن المزايدة المقدمة مني ملزمة وفق نوع المزاد وسياسة المنصة، وأن السعر والوقت المعتمدين هما المسجلان من خادم المنصة.";
const bidderContentEn =
  "I accept the bidding terms and acknowledge that server-recorded price and time are authoritative.";
const bidderContentHash = createHash("sha256").update(bidderContentAr).digest("hex");

const sellerRows = await client`SELECT id FROM auction_terms WHERE role = 'seller' AND version = '2026-08-f2' LIMIT 1`;
if (sellerRows.length === 0) {
  await client`INSERT INTO auction_terms (role, version, content_ar, content_en, content_hash, is_active)
    VALUES ('seller', '2026-08-f2', ${sellerContentAr}, ${sellerContentEn}, ${sellerContentHash}, true)`;
} else {
  await client`UPDATE auction_terms SET content_ar = ${sellerContentAr}, content_en = ${sellerContentEn}, content_hash = ${sellerContentHash}, is_active = true
    WHERE role = 'seller' AND version = '2026-08-f2'`;
}

const bidderRows = await client`SELECT id FROM auction_terms WHERE role = 'bidder' AND version = '2026-08-f2' LIMIT 1`;
if (bidderRows.length === 0) {
  await client`INSERT INTO auction_terms (role, version, content_ar, content_en, content_hash, is_active)
    VALUES ('bidder', '2026-08-f2', ${bidderContentAr}, ${bidderContentEn}, ${bidderContentHash}, true)`;
} else {
  await client`UPDATE auction_terms SET content_ar = ${bidderContentAr}, content_en = ${bidderContentEn}, content_hash = ${bidderContentHash}, is_active = true
    WHERE role = 'bidder' AND version = '2026-08-f2'`;
}

await client`UPDATE auction_terms SET is_active = false WHERE version = '2026-08-f1'`;

console.log("Seeded auction_terms version 2026-08-f2 (seller with pledge + bidder)");
await client.end();
