import { CalendarDays, Filter, RotateCcw, Search } from "lucide-react";
import type { DebtRow, Filters } from "@/lib/types";

interface Props {
  filters: Filters;
  rows: DebtRow[];
  onChange: (next: Filters) => void;
  onReset: () => void;
}

function unique(rows: DebtRow[], field: "customer_name" | "sales_person" | "delivery_person") {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "vi"));
}

export function FilterPanel({ filters, rows, onChange, onReset }: Props) {
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days === 1) {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (days > 1) {
      start.setDate(start.getDate() - days + 1);
    }
    const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    onChange({ ...filters, from: local(start), to: local(end) });
  };

  return (
    <section className="filter-card">
      <div className="filter-heading">
        <div><Filter size={18} /><strong>Bộ lọc dữ liệu</strong></div>
        <button className="text-button" type="button" onClick={onReset}><RotateCcw size={15} /> Đặt lại</button>
      </div>
      <div className="filter-grid">
        <label className="filter-search">
          <span>Tìm nhanh</span>
          <div className="input-icon"><Search size={17} /><input value={filters.search} onChange={(event) => set("search", event.target.value)} placeholder="Tên, SĐT, ghi chú…" /></div>
        </label>
        <label><span>Từ ngày</span><div className="input-icon"><CalendarDays size={17} /><input type="date" value={filters.from} onChange={(event) => set("from", event.target.value)} /></div></label>
        <label><span>Đến ngày</span><div className="input-icon"><CalendarDays size={17} /><input type="date" value={filters.to} onChange={(event) => set("to", event.target.value)} /></div></label>
        <label><span>Khách hàng</span><select value={filters.customer} onChange={(event) => set("customer", event.target.value)}><option value="">Tất cả khách hàng</option>{unique(rows, "customer_name").map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>NV kinh doanh</span><select value={filters.sales} onChange={(event) => set("sales", event.target.value)}><option value="">Tất cả nhân viên</option>{unique(rows, "sales_person").map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>NV giao hàng</span><select value={filters.delivery} onChange={(event) => set("delivery", event.target.value)}><option value="">Tất cả nhân viên</option>{unique(rows, "delivery_person").map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Trạng thái</span><select value={filters.status} onChange={(event) => set("status", event.target.value)}><option value="">Tất cả trạng thái</option><option value="open">Còn hạn</option><option value="due_soon">Sắp đến hạn</option><option value="overdue">Quá hạn</option><option value="paid">Đã tất toán</option></select></label>
      </div>
      <div className="date-presets"><span>Chọn nhanh:</span><button onClick={() => setPreset(0)}>Hôm nay</button><button onClick={() => setPreset(1)}>Hôm qua</button><button onClick={() => setPreset(7)}>7 ngày</button><button onClick={() => setPreset(30)}>30 ngày</button></div>
    </section>
  );
}
