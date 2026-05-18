import { useState, useMemo, Fragment, type JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../api/api";
import {
  useCreateDebtPayment,
  useDeleteDebtPayment,
  type ClientDebtsDetailedResponse,
  type ClientPaymentsDetailedNewResponse,
  type DetailedDebt,
  debtApi,
} from "../api/debt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResourceForm } from "../helpers/ResourceForm";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Search,
  LayoutList,
  LayoutGrid,
  Columns,
  CreditCard,
  Package,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import "./DebtDetailsPage.css";

// ============ HELPERS ============
const MONTHS_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_FULL = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function fmt(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!num && num !== 0) return "0";
  return Math.abs(Math.round(num)).toLocaleString("ru-RU");
}

function fmtDecimal(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!num && num !== 0) return "0";
  const s = Math.abs(num).toFixed(2);
  const [int, dec] = s.split(".");
  return parseInt(int).toLocaleString("ru-RU") + (dec !== "00" ? "." + dec : "");
}

function fmtQuantity(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!num && num !== 0) return "0";
  // Remove trailing zeros after decimal point
  return parseFloat(num.toFixed(4)).toString();
}

function fmtDate(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
}

function fmtTime(d: string): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function getMonthKey(d: string): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(d: string): string {
  const dt = new Date(d);
  return `${MONTHS_FULL[dt.getMonth()]} ${dt.getFullYear()}`;
}

function getShortMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTHS_RU[parseInt(m) - 1]} ${y}`;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { open: "Открыт", overdue: "Просрочен", closed: "Закрыт" };
  return map[s] || s;
}

function methodCls(m: string): string {
  const map: Record<string, string> = {
    "Наличные": "m-cash",
    "Карта": "m-card",
    "Click": "m-click",
    "Payme": "m-click",
    "Валюта": "m-currency",
    "Перечисление": "m-card",
    "UzumNasiya": "m-click",
  };
  return map[m] || "";
}

function pluralPayments(n: number): string {
  const mod = n % 10;
  const mod100 = n % 100;
  if (mod === 1 && mod100 !== 11) return `${n} платёж`;
  if (mod >= 2 && mod <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} платежа`;
  return `${n} платежей`;
}

function getPaymentProgress(debt: DetailedDebt): number {
  const totalUzs = parseFloat(debt.total_amount_uzs) || 0;
  const totalUsd = parseFloat(debt.total_amount_usd) || 0;
  const remUzs = parseFloat(debt.remainder_uzs) || 0;
  const remUsd = parseFloat(debt.remainder_usd) || 0;
  if (totalUsd > 0) {
    const paid = totalUsd - remUsd;
    return totalUsd > 0 ? Math.min(100, Math.round((paid / totalUsd) * 100)) : 0;
  }
  const paid = totalUzs - remUzs;
  return totalUzs > 0 ? Math.min(100, Math.round((paid / totalUzs) * 100)) : 0;
}

function initials(name: string): string {
  return name.split(" ").map(w => w.charAt(0)).join("").substring(0, 2).toUpperCase();
}

function groupByMonth<T>(items: T[], dateGetter: (item: T) => string): Array<{ month: string; label: string; items: T[] }> {
  const groups: Record<string, T[]> = {};
  const order: string[] = [];
  for (const item of items) {
    const key = getMonthKey(dateGetter(item));
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(item);
  }
  return order.map(key => ({
    month: key,
    label: getMonthLabel(groups[key][0] ? dateGetter(groups[key][0]) : ""),
    items: groups[key],
  }));
}

// ============ MAIN COMPONENT ============
export default function DebtDetailsPage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Restore last active view from localStorage
  const [activeView, setActiveView] = useState<"ledger" | "cards" | "split" | "payments">(() => {
    const saved = localStorage.getItem(`debtDetailsView_${clientId}`);
    return (saved as any) || "cards";
  });

  // Debts filters
  const [debtsStatus, setDebtsStatus] = useState("all");
  const [debtsSearch, setDebtsSearch] = useState("");
  const [debtsDateFrom, setDebtsDateFrom] = useState("");
  const [debtsDateTo, setDebtsDateTo] = useState("");
  const [debtsPage, setDebtsPage] = useState(1);

  // Payments filters
  const [paymentsMethod, setPaymentsMethod] = useState("all");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsDateFrom, setPaymentsDateFrom] = useState("");
  const [paymentsDateTo, setPaymentsDateTo] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);

  // UI state
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());
  const [selectedSplitId, setSelectedSplitId] = useState<number | null>(null);
  const [itemsModal, setItemsModal] = useState<DetailedDebt | null>(null);
  const [itemsModalDebtId, setItemsModalDebtId] = useState<number | null>(null);
  const [paymentDebtId, setPaymentDebtId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  // ======== API QUERIES ========
  const { data: debtsData, isLoading: debtsLoading } = useQuery<ClientDebtsDetailedResponse>({
    queryKey: ["clientDebtsDetailed", clientId, debtsPage, debtsStatus, debtsDateFrom, debtsDateTo, debtsSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ page: debtsPage.toString() });
      if (debtsStatus !== "all") p.append("status", debtsStatus);
      if (debtsDateFrom) p.append("date_from", debtsDateFrom);
      if (debtsDateTo) p.append("date_to", debtsDateTo);
      if (debtsSearch) p.append("search", debtsSearch);
      const res = await api.get(`debts/clients/${clientId}/debts/detailed/?${p}`);
      return res.data;
    },
    enabled: !!clientId,
  });

  const { data: paymentsData, isLoading: _paymentsLoading } = useQuery<ClientPaymentsDetailedNewResponse>({
    queryKey: ["clientPaymentsDetailedNew", clientId, paymentsPage, paymentsMethod, paymentsDateFrom, paymentsDateTo, paymentsSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ page: paymentsPage.toString() });
      if (paymentsMethod !== "all") p.append("method", paymentsMethod);
      if (paymentsDateFrom) p.append("date_from", paymentsDateFrom);
      if (paymentsDateTo) p.append("date_to", paymentsDateTo);
      if (paymentsSearch) p.append("search", paymentsSearch);
      const res = await api.get(`debts/clients/${clientId}/payments/detailed/?${p}`);
      return res.data;
    },
    enabled: !!clientId,
  });

  const createPayment = useCreateDebtPayment();
  const deletePayment = useDeleteDebtPayment();

  // Fetch items for modal when itemsModalDebtId is set
  const { data: itemsDataFromApi, isLoading: itemsLoadingFromApi } = useQuery({
    queryKey: ["debtItems", itemsModalDebtId],
    queryFn: () => debtApi.getDebtItems(itemsModalDebtId!),
    enabled: !!itemsModalDebtId,
  });

  // ======== DERIVED DATA ========
  const client = debtsData?.client || paymentsData?.client;
  const counts = debtsData?.totals?.counts;
  const debts = debtsData?.results || [];
  const allPayments = paymentsData?.results || [];

  const selectedDebt = useMemo(() => {
    if (!selectedSplitId && debts.length) return debts[0];
    return debts.find(d => d.id === selectedSplitId) || null;
  }, [selectedSplitId, debts]);

  const monthlyChart = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const p of allPayments) {
      const key = getMonthKey(p.paid_at);
      byMonth[key] = (byMonth[key] || 0) + (p.amount_in_uzs || parseFloat(p.amount) || 0);
    }
    const entries = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    const max = Math.max(...entries.map(e => e[1]), 1);
    return entries.map(([k, v]) => ({
      label: getShortMonthLabel(k),
      amount: v,
      pct: Math.round((v / max) * 100),
    }));
  }, [allPayments]);

  // ======== HANDLERS ========
  const toggleCard = (id: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const togglePaymentRow = (id: number) => {
    setExpandedPayments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePaymentSubmit = async (data: any) => {
    if (!paymentDebtId) return;
    try {
      await createPayment.mutateAsync({ debt: paymentDebtId, ...data });
      queryClient.invalidateQueries({ queryKey: ["clientDebtsDetailed"] });
      queryClient.invalidateQueries({ queryKey: ["clientPaymentsDetailedNew"] });
      toast.success("Платеж создан");
      setPaymentDebtId(null);
    } catch {
      toast.error("Ошибка создания платежа");
    }
  };

  const handleDeletePayment = async (debtId: number, paymentId: number) => {
    if (!confirm("Вы уверены, что хотите удалить этот платеж?")) return;
    
    try {
      await deletePayment.mutateAsync({ debtId, paymentId });
      queryClient.invalidateQueries({ queryKey: ["clientDebtsDetailed"] });
      queryClient.invalidateQueries({ queryKey: ["clientPaymentsDetailedNew"] });
      toast.success("Платеж удален");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Ошибка удаления платежа");
    }
  };

  // ======== RENDER: CLIENT CARD ========
  const renderClientCard = () => {
    if (!client) return null;
    const rem = debtsData?.totals?.remainder_by_currency || {};
    return (
      <div className="client-card">
        <div className="avatar">{initials(client.name)}</div>
        <div className="client-info">
          <div className="client-name">{client.name}</div>
          <div className="client-meta">
            {(client as any).phone && <span>{(client as any).phone}</span>}
            {(client as any).type && <><span className="dot">·</span><span>{(client as any).type}</span></>}
            {(client as any).last_purchase_date && (
              <><span className="dot">·</span><span>Посл. покупка: {fmtDate((client as any).last_purchase_date)}</span></>
            )}
          </div>
        </div>
        <div className="balance">
          <div className="balance-label">Остаток долга</div>
          {Object.keys(rem).length === 0 ? (
            <div className="balance-amount" style={{ color: "var(--text-tertiary)" }}>0<span className="currency">сум</span></div>
          ) : (
            Object.entries(rem).map(([cur, val]) => (
              <div key={cur} className="balance-line">
                <span className="balance-amount">
                  {cur === "USD" ? "$" : ""}{cur === "USD" ? fmtDecimal(val) : fmt(val)}
                  <span className="currency">{cur === "USD" ? "" : " сум"}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ======== RENDER: VIEW SWITCHER ========
  const views: [string, string, JSX.Element][] = [
    ["ledger", "Книга", <LayoutList key="l" />],
    ["cards", "Карточки", <LayoutGrid key="c" />],
    ["split", "Разделение", <Columns key="s" />],
    ["payments", "Платежи", <CreditCard key="p" />],
  ];

  const renderViewSwitcher = () => (
    <div className="view-switcher">
      {views.map(([key, label, icon]) => (
        <button
          key={key}
          className={activeView === key ? "active" : ""}
          onClick={() => {
            const newView = key as any;
            setActiveView(newView);
            localStorage.setItem(`debtDetailsView_${clientId}`, newView);
          }}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );

  // ======== RENDER: DEBTS TOOLBAR ========
  const renderDebtsToolbar = () => (
    <div className="toolbar">
      <div className="tabs">
        {[
          { key: "all", label: "Все", count: counts?.all },
          { key: "open", label: "Открытые", count: counts?.open },
          { key: "overdue", label: "Просроченные", count: counts?.overdue, cls: "danger" },
          { key: "closed", label: "Закрытые", count: counts?.closed },
        ].map(t => (
          <button
            key={t.key}
            className={`tab ${debtsStatus === t.key ? "active" : ""} ${t.cls || ""}`}
            onClick={() => { setDebtsStatus(t.key); setDebtsPage(1); }}
          >
            {t.label}
            {t.count !== undefined && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="toolbar-spacer" />
      <div className="dd-search">
        <Search />
        <input
          placeholder="Поиск..."
          value={debtsSearch}
          onChange={e => { setDebtsSearch(e.target.value); setDebtsPage(1); }}
        />
        {debtsSearch && (
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setDebtsSearch("")}>
            <X style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="date"
          value={debtsDateFrom}
          onChange={e => { setDebtsDateFrom(e.target.value); setDebtsPage(1); }}
          className="period-btn"
        />
        <input
          type="date"
          value={debtsDateTo}
          onChange={e => { setDebtsDateTo(e.target.value); setDebtsPage(1); }}
          className="period-btn"
        />
      </div>
    </div>
  );

  // ======== RENDER: PAGINATION ========
  const renderPagination = (page: number, totalPages: number, count: number, setPage: (p: number) => void) => {
    if (!totalPages || totalPages <= 1) return null;
    return (
      <div className="pagination">
        <span className="pagination-info">Показано {Math.min(20, count)} из {count}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: "6px 12px" }}>Назад</button>
          <span style={{ padding: "7px 12px", fontSize: 13, color: "var(--text-secondary)" }}>{page} / {totalPages}</span>
          <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: "6px 12px" }}>Далее</button>
        </div>
      </div>
    );
  };

  // ======== RENDER: BADGE ========
  const renderBadge = (status: string, daysOverdue?: number) => {
    const cls = status === "overdue" ? "badge-overdue" : status === "closed" ? "badge-closed" : "badge-open";
    return (
      <span className={`badge ${cls}`}>
        {statusLabel(status)}
        {status === "overdue" && daysOverdue ? ` · ${daysOverdue}д` : ""}
      </span>
    );
  };

  // ======== VIEW: LEDGER ========
  const renderLedger = () => {
    type LedgerRow =
      | { type: "month"; label: string }
      | { type: "debt"; debt: DetailedDebt }
      | { type: "payment"; debt: DetailedDebt; payment: DetailedDebt["payments"][0] };
    const rows: LedgerRow[] = [];
    const monthGroups = groupByMonth(debts, d => d.created_at);
    for (const g of monthGroups) {
      rows.push({ type: "month", label: g.label });
      for (const debt of g.items) {
        rows.push({ type: "debt", debt });
        for (const p of debt.payments) {
          rows.push({ type: "payment", debt, payment: p });
        }
      }
    }

    return (
      <>
        {renderDebtsToolbar()}
        <div className="ledger-wrap">
          <div className="table-scroll">
            <table className="ledger">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Дата</th>
                  <th>Операция</th>
                  <th>Магазин</th>
                  <th>Продавец</th>
                  <th className="right">Сумма</th>
                  <th className="right">Остаток</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Нет данных</td></tr>
                )}
                {rows.map((row, i) => {
                  if (row.type === "month") {
                    return <tr key={`m-${i}`} className="month-divider"><td colSpan={7}>{row.label}</td></tr>;
                  }
                  if (row.type === "debt") {
                    const d = row.debt;
                    const hasUsd = parseFloat(d.total_amount_usd) > 0;
                    return (
                      <tr
                        key={`d-${d.id}`}
                        className={`row-sale ${d.status === "closed" ? "row-closed" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="tabular">{fmtDate(d.created_at)}</td>
                        <td>
                          <span className="op-name">Долг</span>
                          <span 
                            className="sale-id"
                            style={{ cursor: "pointer", textDecoration: "underline", color: "var(--info)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemsModalDebtId(d.id);
                            }}
                          >
                            {d.sale_id ? `№${d.sale_id}` : `#${d.id}`}
                          </span>
                          <span className="badge-inline">{renderBadge(d.status, d.days_overdue)}</span>
                        </td>
                        <td>{d.store_name || "—"}</td>
                        <td>{d.seller_name || "—"}</td>
                        <td className="right amount-positive">
                          {hasUsd ? `$${fmtDecimal(d.total_amount_usd)}` : `${fmt(d.total_amount_uzs)} сум`}
                          {hasUsd && parseFloat(d.total_amount_uzs) > 0 && (
                            <div className="currency-conversion">≈ {fmt(d.total_amount_uzs)} сум</div>
                          )}
                        </td>
                        <td className="right">
                          {hasUsd ? (
                            <span style={{ color: parseFloat(d.remainder_usd) > 0 ? "var(--danger)" : "var(--success)", fontWeight: 500 }}>
                              ${fmtDecimal(d.remainder_usd)}
                            </span>
                          ) : (
                            <span style={{ color: parseFloat(d.remainder_uzs) > 0 ? "var(--danger)" : "var(--success)", fontWeight: 500 }}>
                              {fmt(d.remainder_uzs)} сум
                            </span>
                          )}
                        </td>
                        <td>{renderBadge(d.status)}</td>
                      </tr>
                    );
                  }
                  if (row.type === "payment") {
                    const p = row.payment;
                    return (
                      <tr key={`p-${p.id}-${i}`} className="row-payment">
                        <td className="tabular">{fmtDate(p.paid_at)}</td>
                        <td>
                          <span className="op-name">Оплата</span>
                          <span className="sale-id">{p.method}</span>
                        </td>
                        <td className="text-muted">—</td>
                        <td>{p.worker_name || "—"}</td>
                        <td className="right amount-negative">
                          −{p.currency === "USD" ? `$${fmtDecimal(p.amount)}` : `${fmt(p.amount)} сум`}
                        </td>
                        <td className="right text-muted">—</td>
                        <td><span className={`method-tag ${methodCls(p.method)}`}>{p.method}</span></td>
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>
          {renderPagination(debtsPage, debtsData?.total_pages || 1, debtsData?.count || 0, setDebtsPage)}
        </div>
      </>
    );
  };

  // ======== VIEW: CARDS ========
  const renderCards = () => {
    const monthGroups = groupByMonth(debts, d => d.created_at);
    return (
      <>
        {renderDebtsToolbar()}
        <div className="cards-list">
          {monthGroups.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-tertiary)" }}>Нет данных</div>
          )}
          {monthGroups.map(g => (
            <div key={g.month}>
              <div className="month-header">{g.label}</div>
              {g.items.map(debt => {
                const isExpanded = expandedCards.has(debt.id);
                const hasUsd = parseFloat(debt.total_amount_usd) > 0;
                const progress = getPaymentProgress(debt);
                const dt = new Date(debt.created_at);

                return (
                  <div key={debt.id} className={`card card-${debt.status} ${isExpanded ? "expanded" : ""}`}>
                    <div className="card-header" onClick={() => toggleCard(debt.id)}>
                      <div className="card-date">
                        <div className="day">{dt.getDate()}</div>
                        <div className="month-short">{MONTHS_RU[dt.getMonth()]}</div>
                      </div>
                      <div className="card-info">
                        <div className="card-title">
                          {debt.is_manual ? "Ручной долг" : "Долг"}
                          {debt.sale_id && (
                            <span 
                              className="sale-id"
                              style={{ cursor: "pointer", textDecoration: "underline", color: "var(--info)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemsModalDebtId(debt.id);
                              }}
                            >
                              №{debt.sale_id}
                            </span>
                          )}
                          {renderBadge(debt.status, debt.days_overdue)}
                        </div>
                        <div className="card-meta-line">
                          {debt.store_name && <span>{debt.store_name}</span>}
                          {debt.seller_name && <><span className="dot">·</span><span>{debt.seller_name}</span></>}
                          {debt.items_count > 0 && <><span className="dot">·</span><span>{debt.items_count} поз.</span></>}
                          {debt.payments.length > 0 && <><span className="dot">·</span><span>{pluralPayments(debt.payments.length)}</span></>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="card-amounts">
                          <div className="card-total">
                            {hasUsd ? `$${fmtDecimal(debt.total_amount_usd)}` : `${fmt(debt.total_amount_uzs)} сум`}
                          </div>
                          <div className={`card-remainder ${(parseFloat(debt.remainder_uzs) > 0 || parseFloat(debt.remainder_usd) > 0) ? "has-debt" : ""}`}>
                            ост: {hasUsd ? `$${fmtDecimal(debt.remainder_usd)}` : `${fmt(debt.remainder_uzs)} сум`}
                          </div>
                        </div>
                        <ChevronRight className="chevron" style={{ width: 18, height: 18 }} />
                      </div>
                    </div>
                    <div className="card-progress">
                      <div className="card-progress-fill" style={{ width: `${progress}%` }} />
                    </div>

                    {isExpanded && (
                      <div className="card-body">
                        <div className="card-info-grid">
                          <div>
                            <div className="info-cell-label">Сумма (UZS)</div>
                            <div className="info-cell-value">{fmt(debt.total_amount_uzs)}</div>
                          </div>
                          <div>
                            <div className="info-cell-label">Сумма (USD)</div>
                            <div className="info-cell-value">{parseFloat(debt.total_amount_usd) > 0 ? `$${fmtDecimal(debt.total_amount_usd)}` : "—"}</div>
                          </div>
                          <div>
                            <div className="info-cell-label">Срок</div>
                            <div className="info-cell-value">{fmtDate(debt.due_date)}</div>
                          </div>
                          <div>
                            <div className="info-cell-label">Курс USD</div>
                            <div className="info-cell-value">{debt.usd_rate_at_creation ? fmt(debt.usd_rate_at_creation) : "—"}</div>
                          </div>
                        </div>

                        {debt.payments.length > 0 && (
                          <div className="card-section">
                            <div className="card-section-title">История платежей ({debt.payments.length})</div>
                            {debt.payments.map(p => (
                              <div key={p.id} className="timeline-row">
                                <span className="timeline-date">{fmtDate(p.paid_at)}</span>
                                <span className="timeline-label">
                                  <span className={`method-tag ${methodCls(p.method)}`}>{p.method}</span>
                                  <span style={{ marginLeft: 8, color: "var(--text-secondary)", fontSize: 12 }}>{p.worker_name}</span>
                                  {p.comment && (
                                    <span style={{ marginLeft: 8, color: "var(--text-tertiary)", fontSize: 11, fontStyle: "italic" }}>
                                      · {p.comment}
                                    </span>
                                  )}
                                </span>
                                <span className="timeline-amount negative">
                                  −{p.currency === "USD" ? `$${fmtDecimal(p.amount)}` : `${fmt(p.amount)} сум`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {debt.items.length > 0 && (
                          <div className="card-section">
                            <div className="card-section-title">
                              <span>Товары ({debt.items.length})</span>
                              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => { setItemsModal(debt); setItemsModalDebtId(debt.id); }}>
                                <Package style={{ width: 12, height: 12 }} /> Подробнее
                              </button>
                            </div>
                            {debt.items.slice(0, 3).map(item => (
                              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                                <span>{item.name} <span style={{ color: "var(--text-tertiary)" }}>× {fmtQuantity(item.qty)} {item.unit}</span></span>
                                <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{fmt(item.subtotal)} сум</span>
                              </div>
                            ))}
                            {debt.items.length > 3 && (
                              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>...и ещё {debt.items.length - 3}</div>
                            )}
                          </div>
                        )}

                        <div className="card-section" style={{ display: "flex", gap: 8 }}>
                          {debt.status !== "closed" && (
                            <button className="btn" onClick={() => setPaymentDebtId(debt.id)}>
                              <CreditCard /> Принять оплату
                            </button>
                          )}
                          {debt.items.length > 0 && (
                            <button className="btn btn-secondary" onClick={() => { setItemsModal(debt); setItemsModalDebtId(debt.id); }}>
                              <Package /> Товары
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {renderPagination(debtsPage, debtsData?.total_pages || 1, debtsData?.count || 0, setDebtsPage)}
        </div>
      </>
    );
  };

  // ======== VIEW: SPLIT ========
  const renderSplit = () => {
    const monthGroups = groupByMonth(debts, d => d.created_at);
    const det = selectedDebt;

    return (
      <>
        {renderDebtsToolbar()}
        <div className="split">
          <div className="split-list-wrap">
            <div className="split-list">
              {monthGroups.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>Нет данных</div>
              )}
              {monthGroups.map(g => (
                <div key={g.month}>
                  <div className="split-month">{g.label}</div>
                  {g.items.map(d => {
                    const hasUsd = parseFloat(d.total_amount_usd) > 0;
                    return (
                      <div
                        key={d.id}
                        className={`split-item ${det?.id === d.id ? "selected" : ""}`}
                        onClick={() => setSelectedSplitId(d.id)}
                      >
                        <div className={`status-dot ${d.status}`} />
                        <div>
                          <div className="split-item-title">
                            <span className="split-item-date">{fmtDate(d.created_at)}</span>
                            <span className="split-item-id">{d.sale_id ? `№${d.sale_id}` : `#${d.id}`}</span>
                          </div>
                          <div className={`split-item-meta ${d.status === "overdue" ? "overdue" : ""}`}>
                            {d.store_name || "—"}
                            {d.status === "overdue" && ` · ${d.days_overdue}д просрочки`}
                          </div>
                        </div>
                        <div className="split-item-amounts">
                          <div className="split-item-total">{hasUsd ? `$${fmtDecimal(d.total_amount_usd)}` : fmt(d.total_amount_uzs)}</div>
                          <div className={`split-item-rem ${(parseFloat(d.remainder_uzs) > 0 || parseFloat(d.remainder_usd) > 0) ? "has-debt" : ""}`}>
                            ост: {hasUsd ? `$${fmtDecimal(d.remainder_usd)}` : fmt(d.remainder_uzs)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {renderPagination(debtsPage, debtsData?.total_pages || 1, debtsData?.count || 0, setDebtsPage)}
          </div>

          <div className="split-detail-wrap">
            {det ? (
              <>
                <div className="detail-header">
                  <div>
                    <div className="detail-title">
                      {det.is_manual ? "Ручной долг" : "Долг"} 
                      <span 
                        style={{ cursor: "pointer", textDecoration: "underline", color: "var(--info)", fontFamily: "var(--font-mono)", fontSize: "16px" }}
                        onClick={() => setItemsModalDebtId(det.id)}
                      >
                        {det.sale_id && `№${det.sale_id}`}
                      </span>
                      {renderBadge(det.status, det.days_overdue)}
                    </div>
                    <div className="detail-meta">
                      {det.store_name}{det.seller_name && ` · ${det.seller_name}`} · {fmtDate(det.created_at)}
                    </div>
                  </div>
                  {det.status !== "closed" && (
                    <button className="btn" onClick={() => setPaymentDebtId(det.id)}>
                      <CreditCard /> Оплата
                    </button>
                  )}
                </div>

                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="detail-stat-label">Сумма (UZS)</div>
                    <div className="detail-stat-value">{fmt(det.total_amount_uzs)}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat-label">Сумма (USD)</div>
                    <div className="detail-stat-value">{parseFloat(det.total_amount_usd) > 0 ? `$${fmtDecimal(det.total_amount_usd)}` : "—"}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat-label">Остаток (UZS)</div>
                    <div className={`detail-stat-value ${parseFloat(det.remainder_uzs) > 0 ? "dd-danger" : "dd-success"}`}>{fmt(det.remainder_uzs)}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat-label">Остаток (USD)</div>
                    <div className={`detail-stat-value ${parseFloat(det.remainder_usd) > 0 ? "dd-danger" : "dd-success"}`}>
                      {parseFloat(det.remainder_usd) > 0 ? `$${fmtDecimal(det.remainder_usd)}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">
                    <span>Хронология</span>
                    <span style={{ fontWeight: 400 }}>{pluralPayments(det.payments.length)}</span>
                  </div>
                  <div className="detail-timeline" style={{ position: "relative" }}>
                    {det.payments.length > 0 && <div className="timeline-line" />}
                    <div className="timeline-event">
                      <div className="timeline-marker sale" />
                      <div style={{ color: "var(--text-secondary)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmtDate(det.created_at)}</div>
                      <div style={{ fontSize: 13 }}>Продажа {det.sale_id && `№${det.sale_id}`}</div>
                      <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: 13 }}>
                        {parseFloat(det.total_amount_usd) > 0 ? `$${fmtDecimal(det.total_amount_usd)}` : `${fmt(det.total_amount_uzs)} сум`}
                      </div>
                    </div>
                    {det.payments.map(p => (
                      <div key={p.id} className="timeline-event">
                        <div className={`timeline-marker ${p.closes_debt ? "closing" : "payment"}`} />
                        <div style={{ color: "var(--text-secondary)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmtDate(p.paid_at)}</div>
                        <div style={{ fontSize: 13 }}>
                          <span className={`method-tag ${methodCls(p.method)}`}>{p.method}</span>
                          <span style={{ marginLeft: 8, color: "var(--text-secondary)", fontSize: 12 }}>{p.worker_name}</span>
                          {p.comment && (
                            <div style={{ marginTop: 4, color: "var(--text-tertiary)", fontSize: 11, fontStyle: "italic" }}>
                              {p.comment}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: 13, color: "var(--success)" }}>
                          −{p.currency === "USD" ? `$${fmtDecimal(p.amount)}` : `${fmt(p.amount)} сум`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {det.items.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <span>Товары ({det.items.length})</span>
                    </div>
                    {det.items.map(item => (
                      <div key={item.id} className="detail-item-row">
                        <span className="name">{item.name}</span>
                        <span className="qty">{fmtQuantity(item.qty)} {item.unit}</span>
                        <span className="price">{fmtDecimal(item.price)}</span>
                        <span className="sub">{fmtDecimal(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="detail-section">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 13 }}>
                    <div>
                      <div style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Задаток</div>
                      <div style={{ fontWeight: 500 }}>{parseFloat(det.deposit) > 0 ? `${fmt(det.deposit)} (${det.deposit_payment_method})` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Курс USD</div>
                      <div style={{ fontWeight: 500 }}>{det.usd_rate_at_creation ? `${fmt(det.usd_rate_at_creation)} сум` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Срок оплаты</div>
                      <div style={{ fontWeight: 500 }}>{fmtDate(det.due_date)}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)" }}>Выберите долг из списка</div>
            )}
          </div>
        </div>
      </>
    );
  };

  // ======== VIEW: PAYMENTS ========
  const renderPayments = () => {
    const totals = paymentsData?.totals;
    const methods = totals?.by_method || {};
    const methodKeys = ["all", ...Object.keys(methods)];
    const filteredPayments = paymentsMethod === "all"
      ? allPayments
      : allPayments.filter(p => p.method === paymentsMethod);

    return (
      <>
        <div className="section-header">
          <div>
            <div className="section-title">Платежи</div>
            <div className="section-subtitle">
              Всего: {totals?.payment_count || 0}
              {totals?.paid_by_currency && Object.entries(totals.paid_by_currency).map(([cur, val]) => (
                <span key={cur} style={{ marginLeft: 12 }}>
                  {cur === "USD" ? `$${fmtDecimal(val)}` : `${fmt(val)} сум`}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="dd-search">
              <Search />
              <input
                placeholder="Поиск..."
                value={paymentsSearch}
                onChange={e => { setPaymentsSearch(e.target.value); setPaymentsPage(1); }}
              />
              {paymentsSearch && (
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setPaymentsSearch("")}>
                  <X style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" value={paymentsDateFrom} onChange={e => { setPaymentsDateFrom(e.target.value); setPaymentsPage(1); }} className="period-btn" />
              <input type="date" value={paymentsDateTo} onChange={e => { setPaymentsDateTo(e.target.value); setPaymentsPage(1); }} className="period-btn" />
            </div>
          </div>
        </div>

        {monthlyChart.length > 0 && (
          <div className="quiet-chart">
            <div className="quiet-chart-label">По месяцам</div>
            {monthlyChart.map((m, i) => (
              <div key={i} className="month-row">
                <div className="month-row-label">{m.label}</div>
                <div className="month-row-bar-wrap">
                  <div className="month-row-bar" style={{ width: `${m.pct}%` }} />
                </div>
                <div className={`month-row-amount ${m.amount === 0 ? "zero" : ""}`}>{fmt(m.amount)} сум</div>
              </div>
            ))}
          </div>
        )}

        <div className="toolbar">
          <div className="tabs">
            {methodKeys.map(k => {
              const info = k === "all" ? null : methods[k];
              const label = k === "all" ? "Все" : k;
              const count = k === "all" ? (totals?.payment_count || 0) : (info?.count || 0);
              return (
                <button
                  key={k}
                  className={`tab ${paymentsMethod === k ? "active" : ""}`}
                  onClick={() => { setPaymentsMethod(k); setPaymentsPage(1); }}
                >
                  {label}
                  <span className="count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ledger-wrap">
          <div className="table-scroll">
            <table className="ledger">
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
                  <th style={{ width: 90 }}>Дата</th>
                  <th className="right">Сумма</th>
                  <th>Способ</th>
                  <th>Долг</th>
                  <th>Сотрудник</th>
                  <th>Эффект</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Нет платежей</td></tr>
                )}
                {filteredPayments.map((p:any, idx) => {
                  const isExp = expandedPayments.has(p.id);
                  return (
                    <Fragment key={p.id}>
                      <tr
                        className={`payment-row ${isExp ? "expanded" : ""}`}
                        onClick={() => togglePaymentRow(p.id)}
                        style={{ background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-soft)" }}
                      >
                        <td>
                          <span className="row-chevron">
                            <ChevronDown style={{ width: 14, height: 14, transition: "transform 0.2s", transform: isExp ? "rotate(180deg)" : "rotate(0)" }} />
                          </span>
                        </td>
                        <td>
                          <div className="date-with-time">
                            <span className="date-main">{fmtDate(p.paid_at)}</span>
                            <span className="date-time">{fmtTime(p.paid_at)}</span>
                          </div>
                        </td>
                        <td className="right" style={{ fontWeight: 500, color: "var(--success)" }}>
                          {p.currency === "USD" ? `$${fmtDecimal(p.amount)}` : `${fmt(p.amount)} сум`}
                          {p.amount_in_uzs && p.currency === "USD" && (
                            <div className="currency-conversion">≈ {fmt(p.amount_in_uzs)} сум</div>
                          )}
                        </td>
                        <td><span className={`method-tag ${methodCls(p.method)}`}>{p.method}</span></td>
                        <td>
                          <div className="applied-to">
                            <span 
                              className="applied-to-id" 
                              style={{ cursor: "pointer", textDecoration: "underline" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemsModalDebtId(p.debt.id);
                              }}
                            >
                              {p.debt.sale_id ? `Продажа №${p.debt.sale_id}` : `Долг #${p.debt.id}`}
                            </span>
                            <span className="applied-to-meta">{p.debt.store_name} · срок {fmtDate(p.debt.due_date)}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>{p.worker_name || "—"}</td>
                        <td>
                          {p.closes_debt ? (
                            <span className="effect-badge effect-closed">Закрыл</span>
                          ) : (
                            <span className="effect-badge effect-partial">Частично</span>
                          )}
                        </td>
                      </tr>
                      {isExp && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div className="payment-detail">
                              <div className="payment-detail-grid">
                                <div>
                                  <div className="detail-field-label">Сумма платежа</div>
                                  <div className="detail-field-value tabular-val">
                                    {p.currency === "USD" ? `$${fmtDecimal(p.amount)}` : `${fmt(p.amount)} сум`}
                                  </div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Сумма в UZS</div>
                                  <div className="detail-field-value tabular-val">{p.amount_in_uzs ? `${fmt(p.amount_in_uzs)} сум` : "—"}</div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Курс USD</div>
                                  <div className="detail-field-value tabular-val">{p.usd_rate_at_payment ? fmt(p.usd_rate_at_payment) : "—"}</div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Валюта долга</div>
                                  <div className="detail-field-value">{p.target_debt_currency}</div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Остаток долга (UZS)</div>
                                  <div className="detail-field-value tabular-val" style={{ color: parseFloat(p.debt.remainder_uzs) > 0 ? "var(--danger)" : "var(--success)" }}>
                                    {fmt(p.debt.remainder_uzs)} сум
                                  </div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Остаток долга (USD)</div>
                                  <div className="detail-field-value tabular-val" style={{ color: parseFloat(p.debt.remainder_usd) > 0 ? "var(--danger)" : "var(--success)" }}>
                                    {parseFloat(p.debt.remainder_usd) > 0 ? `$${fmtDecimal(p.debt.remainder_usd)}` : "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Задаток</div>
                                  <div className="detail-field-value tabular-val">
                                    {parseFloat(p.debt.deposit) > 0 ? `${fmt(p.debt.deposit)} (${p.debt.deposit_payment_method})` : "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Товаров в долге</div>
                                  <div className="detail-field-value">{p.debt.items_count}</div>
                                </div>
                              </div>
                              {p.comment && (
                                <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--surface-soft)", borderRadius: "var(--radius)", fontSize: 13 }}>
                                  <div style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Комментарий</div>
                                  <div style={{ color: "var(--text)", fontStyle: "italic" }}>{p.comment}</div>
                                </div>
                              )}
                              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "6px 12px", fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePayment(p.debt.id, p.id);
                                  }}
                                  disabled={deletePayment.isPending}
                                >
                                  <Trash2 style={{ width: 14, height: 14 }} />
                                  {deletePayment.isPending ? "Удаление..." : "Удалить платеж"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderPagination(paymentsPage, paymentsData?.total_pages || 1, paymentsData?.count || 0, setPaymentsPage)}
        </div>
      </>
    );
  };

  // ======== ITEMS MODAL ========
  const renderItemsModal = () => {
    const debtId = itemsModalDebtId || itemsModal?.id;
    if (!debtId) return null;

    const items = itemsDataFromApi?.results || [];
    const total = items.reduce((s: number, i: any) => s + parseFloat(i.subtotal || 0), 0);
    const debt = itemsModal || { id: itemsDataFromApi?.debt_id, sale_id: itemsDataFromApi?.sale_id };

    return (
      <div className="modal-backdrop" onClick={() => { setItemsModal(null); setItemsModalDebtId(null); }}>
        <div className="dd-modal" onClick={e => e.stopPropagation()}>
          <div className="dd-modal-header">
            <div>
              <div className="dd-modal-title">
                Товары — {debt?.sale_id ? `Продажа №${debt.sale_id}` : `Долг #${debtId}`}
              </div>
              {itemsModal && <div className="dd-modal-subtitle">{itemsModal.store_name} · {fmtDate(itemsModal.created_at)}</div>}
            </div>
            <button className="dd-modal-close" onClick={() => { setItemsModal(null); setItemsModalDebtId(null); }}>×</button>
          </div>
          <div className="dd-modal-body">
            {itemsLoadingFromApi ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 className="dd-spinner" />
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>
                Нет товаров
              </div>
            ) : (
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Наименование</th>
                    <th className="right">Кол-во</th>
                    <th className="right">Цена</th>
                    <th className="right">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="name-cell">{item.name}</td>
                      <td className="right">{fmtQuantity(item.qty)} {item.unit}</td>
                      <td className="right">{fmtDecimal(item.price || 0)}</td>
                      <td className="right" style={{ fontWeight: 500 }}>{fmtDecimal(item.subtotal || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right" }}>Итого</td>
                    <td className="right">{fmtDecimal(total)} сум</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ======== PAYMENT DIALOG FIELDS ========
  const paymentFields = [
    {
      name: "target_debt_currency",
      label: "Валюта долга",
      type: "select",
      placeholder: "Выберите валюту",
      required: true,
      options: [
        { value: "UZS", label: "UZS" },
        { value: "USD", label: "USD" },
      ],
    },
    {
      name: "amount",
      label: selectedPaymentMethod === "Валюта" ? "Сумма (USD)" : "Сумма",
      type: "number",
      placeholder: "Введите сумму",
      required: true,
    },
    {
      name: "payment_method",
      label: "Способ оплаты",
      type: "select",
      placeholder: "Выберите способ",
      required: true,
      options: [
        { value: "Наличные", label: "Наличные" },
        { value: "Click", label: "Click" },
        { value: "Карта", label: "Карта" },
        { value: "Перечисление", label: "Перечисление" },
        { value: "Валюта", label: "Валюта" },
      ],
      onChange: (val: string) => setSelectedPaymentMethod(val),
    },
    {
      name: "usd_rate_at_payment",
      label: "Курс USD при оплате",
      type: "number",
      placeholder: "Введите курс",
      required: true,
    },
  ];

  // ======== LOADING STATE ========
  if (debtsLoading && !debtsData && !paymentsData) {
    return (
      <div className="dd" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Loader2 className="dd-spinner" />
      </div>
    );
  }

  // ======== MAIN RENDER ========
  return (
    <div className="dd">
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ padding: "6px 12px" }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Назад
        </button>
      </div>

      {renderClientCard()}
      {renderViewSwitcher()}

      {activeView === "ledger" && renderLedger()}
      {activeView === "cards" && renderCards()}
      {activeView === "split" && renderSplit()}
      {activeView === "payments" && renderPayments()}

      {renderItemsModal()}

      <Dialog open={!!paymentDebtId} onOpenChange={(open) => { if (!open) setPaymentDebtId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Принять оплату</DialogTitle>
          </DialogHeader>
          <ResourceForm
            fields={paymentFields}
            onSubmit={handlePaymentSubmit}
            isSubmitting={createPayment.isPending}
            title=""
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
