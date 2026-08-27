#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const workbookArg = process.argv[2];
const workbook = workbookArg
  ? resolve(workbookArg)
  : resolve(readdirSync(process.cwd()).find((name) => name.toLowerCase().endsWith(".xlsx")) || "");

if (!workbook) throw new Error("Không tìm thấy file .xlsx. Truyền đường dẫn: npm run db:import -- file.xlsx");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");

const python = process.platform === "win32" ? "python" : "python3";
const raw = execFileSync(python, [resolve("scripts/parse_workbook.py"), workbook], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const payload = JSON.parse(raw);
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function upsertInBatches(table, rows, size = 400) {
  for (let index = 0; index < rows.length; index += size) {
    const batch = rows.slice(index, index + size);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`${table}, dòng ${index + 1}-${index + batch.length}: ${error.message}`);
  }
}

async function ensureAdmin() {
  const email = process.env.IMPORT_ADMIN_EMAIL;
  const password = process.env.IMPORT_ADMIN_PASSWORD;
  if (!email || !password) return "Bỏ qua tạo admin (chưa có IMPORT_ADMIN_EMAIL/PASSWORD).";
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  if (data.users.some((user) => user.email?.toLowerCase() === email.toLowerCase())) return `Admin đã tồn tại: ${email}`;
  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: process.env.IMPORT_ADMIN_NAME || "Quản trị Hà Hoà", role: "admin" },
  });
  if (createError) throw createError;
  return `Đã tạo admin: ${email}`;
}

console.log("Đang nhập khách hàng…");
await upsertInBatches("customers", payload.customers);
console.log("Đang nhập khoản nợ…");
await upsertInBatches("debts", payload.debts);
console.log("Đang nhập thanh toán…");
await upsertInBatches("payments", payload.payments);
console.log(await ensureAdmin());
console.log(JSON.stringify(payload.stats, null, 2));
