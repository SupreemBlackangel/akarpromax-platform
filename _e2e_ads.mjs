import mysql from "mysql2/promise";
const conn = await mysql.createConnection({ host: "localhost", port: 3306, user: "root", password: "root", database: "akarpromax", charset: "utf8mb4" });
const [rows] = await conn.query("SELECT internal_name, countries, cities, languages, devices, section_scopes, page_types, placements, target_all_countries, start_at, end_at, priority, weight, media_url, mobile_media_url, tablet_media_url, target_url FROM ad_campaigns WHERE internal_name='حملة الهيرو الرئيسية'");
console.log(JSON.stringify(rows[0], null, 1));
await conn.end();
