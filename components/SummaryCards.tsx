import { ArrowDownToLine, Banknote, RotateCcw, TriangleAlert, WalletCards } from "lucide-react";
import { money } from "@/lib/format";

interface Props {
  debt: number;
  paid: number;
  returned: number;
  remaining: number;
  overdueCount: number;
}

export function SummaryCards({ debt, paid, returned, remaining, overdueCount }: Props) {
  return (
    <section className="summary-grid" aria-label="Tổng quan công nợ">
      <article className="summary-card">
        <div className="summary-icon indigo"><WalletCards size={21} /></div>
        <div><span>Tổng tiền nợ</span><strong>{money.format(debt)}</strong></div>
      </article>
      <article className="summary-card">
        <div className="summary-icon blue"><ArrowDownToLine size={21} /></div>
        <div><span>Đã thanh toán</span><strong>{money.format(paid)}</strong></div>
      </article>
      <article className="summary-card">
        <div className="summary-icon amber"><RotateCcw size={21} /></div>
        <div><span>Hàng thu hồi</span><strong>{money.format(returned)}</strong></div>
      </article>
      <article className="summary-card emphasis">
        <div className="summary-icon green"><Banknote size={21} /></div>
        <div><span>Công nợ còn lại</span><strong>{money.format(remaining)}</strong></div>
        {overdueCount > 0 && <small><TriangleAlert size={13} /> {overdueCount} khoản quá hạn</small>}
      </article>
    </section>
  );
}
