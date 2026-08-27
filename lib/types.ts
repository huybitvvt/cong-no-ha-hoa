export type TabKey = "overview" | "debts" | "payments" | "returns";

export type DebtStatus = "paid" | "overdue" | "due_soon" | "open";

export interface DebtRow {
  id: string;
  customer_id: string;
  customer_code: string | null;
  customer_name: string;
  phone: string | null;
  address: string | null;
  region: string | null;
  amount: number;
  paid_amount: number;
  returned_amount: number;
  remaining_amount: number;
  order_date: string;
  due_days: number;
  due_date: string;
  sales_person: string | null;
  delivery_person: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  notes: string | null;
  status: DebtStatus;
  source_sheet: string | null;
  source_row: number | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  debt_id: string;
  amount: number;
  paid_at: string;
  notes: string | null;
  sales_person: string | null;
  delivery_person: string | null;
  created_at: string;
  debt?: {
    customer?: { name: string } | null;
    amount?: number;
    order_date?: string;
  } | null;
}

export interface ReturnRow {
  id: string;
  debt_id: string | null;
  customer_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  returned_at: string;
  notes: string | null;
  created_at: string;
  customer?: { name: string } | null;
}

export interface CustomerOption {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  region: string | null;
}

export interface AppSettings {
  max_debt: number;
  debt_terms: number[];
}

export interface Filters {
  from: string;
  to: string;
  customer: string;
  sales: string;
  delivery: string;
  region: string;
  search: string;
  status: string;
}

export const EMPTY_FILTERS: Filters = {
  from: "",
  to: "",
  customer: "",
  sales: "",
  delivery: "",
  region: "",
  search: "",
  status: "",
};
