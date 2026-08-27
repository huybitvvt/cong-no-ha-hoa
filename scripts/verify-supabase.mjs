#!/usr/bin/env node

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Thiếu URL hoặc service-role key trong .env.local");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function count(table) {
  const { count: value, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return value || 0;
}

async function overview() {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("debt_overview").select("amount,paid_amount,returned_amount,remaining_amount,status").range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows.reduce((summary, row) => {
    summary.total_debt += Number(row.amount);
    summary.total_paid += Number(row.paid_amount);
    summary.total_returned += Number(row.returned_amount);
    summary.remaining += Number(row.remaining_amount);
    summary.status[row.status] = (summary.status[row.status] || 0) + 1;
    return summary;
  }, { total_debt: 0, total_paid: 0, total_returned: 0, remaining: 0, status: {} });
}

console.log(JSON.stringify({
  target: new URL(url).host,
  customers: await count("customers"),
  debts: await count("debts"),
  payments: await count("payments"),
  returns: await count("returns"),
  overview: await overview(),
}, null, 2));
