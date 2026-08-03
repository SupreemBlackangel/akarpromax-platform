import mysql from "mysql2/promise";
const conn = await mysql.createConnection({ host: "localhost", port: 3306, user: "root", password: "root", database: "akarpromax", charset: "utf8mb4" });
await conn.query("DELETE FROM ad_impressions");
await conn.query("DELETE FROM ad_clicks");
await conn.query("DELETE FROM ad_conversions");
await conn.query("DELETE FROM ad_daily_statistics");
await conn.query("DELETE FROM ad_campaigns WHERE internal_name = 'E2E Villa Ad'");
console.log("cleaned (incl E2E campaign)");
await conn.end();
