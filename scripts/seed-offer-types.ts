import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";
const client = postgres(url, { ssl: "require" });

const seed = [
  { code: 'SALE', nameAr: 'بيع', nameEn: 'Sale', allowDirect: true, allowAuction: true, allowFixedAuction: true, allowOpenAuction: true, contractTemplateType: 'SALE' },
  { code: 'RENT', nameAr: 'إيجار', nameEn: 'Rent', allowDirect: true, allowAuction: true, allowFixedAuction: true, allowOpenAuction: true, contractTemplateType: 'LEASE' },
  { code: 'TAQBEEL', nameAr: 'تقبيل', nameEn: 'Taqbeel', allowDirect: true, allowAuction: true, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'TAQBEEL' },
  { code: 'FARAGH', nameAr: 'فروغ', nameEn: 'Faragh', allowDirect: true, allowAuction: false, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'FARAGH' },
  { code: 'INVESTMENT', nameAr: 'استثمار', nameEn: 'Investment', allowDirect: true, allowAuction: true, allowFixedAuction: true, allowOpenAuction: true, contractTemplateType: 'INVESTMENT' },
  { code: 'ASSIGNMENT', nameAr: 'تنازل', nameEn: 'Assignment', allowDirect: true, allowAuction: false, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'ASSIGNMENT' },
  { code: 'USUFRUCT', nameAr: 'حق انتفاع', nameEn: 'Usufruct', allowDirect: true, allowAuction: true, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'USUFRUCT' },
  { code: 'LEASE_TO_OWN', nameAr: 'إيجار منتهي بالتملك', nameEn: 'Lease to Own', allowDirect: true, allowAuction: false, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'LEASE_TO_OWN' },
  { code: 'EXCHANGE', nameAr: 'مقايضة', nameEn: 'Exchange', allowDirect: true, allowAuction: false, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'EXCHANGE' },
  { code: 'PARTNERSHIP', nameAr: 'شراكة', nameEn: 'Partnership', allowDirect: true, allowAuction: true, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'PARTNERSHIP' },
  { code: 'SHARE_SALE', nameAr: 'بيع حصة', nameEn: 'Share Sale', allowDirect: true, allowAuction: false, allowFixedAuction: false, allowOpenAuction: false, contractTemplateType: 'SHARE_SALE' },
];

async function main() {
  for (const item of seed) {
    const existing = await client`select id from property_offer_types where code = ${item.code}`;
    if (existing.length === 0) {
      await client`insert into property_offer_types (code, name_ar, name_en, allow_direct, allow_auction, allow_fixed_auction, allow_open_auction, contract_template_type, display_order) values (${item.code}, ${item.nameAr}, ${item.nameEn}, ${item.allowDirect}, ${item.allowAuction}, ${item.allowFixedAuction}, ${item.allowOpenAuction}, ${item.contractTemplateType}, 0)`;
    }
  }
  const rows = await client`select code, name_ar, name_en from property_offer_types order by code`;
  console.log("seeded:", rows.length);
  console.log(rows.map((r) => `${r.code}: ${r.name_ar}`).join("\n"));
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
