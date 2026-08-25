import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

import * as schema from "@/db/mysql/schema";

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;
  const url =
    process.env.MYSQL_URL ??
    "mysql://root:root@localhost:3306/akarpromax?charset=utf8mb4";
  pool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
  return pool;
}

export function getMySqlDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}

export async function closeMySqlPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
