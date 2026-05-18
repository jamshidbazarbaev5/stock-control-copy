import { useState, useMemo, Fragment, type JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../api/api";
import {
  type SupplierDebtsDetailedResponse,
  type SupplierPaymentsDetailedResponse,
  type SupplierDetailedDebt,
  useDeleteStockPayment,
} from "../api/stock-debt-payment";
import { usePayStockDebt } from "../api/stock";
import { useGetStores } from "../api/store";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  MoreVertical,
  Edit,
  RotateCcw,
  ClipboardList,
  History,
  DollarSign,
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
  const map: Record<string, string> = { open: "Открыт", closed: "Закрыт" };
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

function getPaymentProgress(debt: SupplierDetailedDebt): number {
  const totalUzs = parseFloat(debt.total_amount_uzs) || 0;
  const totalUsd = parseFloat(debt.total_amount_usd) || 0;
  const remUzs = parseFloat(debt.remaining_debt_uzs) || 0;
  const remUsd = parseFloat(debt.remaining_debt_usd) || 0;
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
export default function SupplierDebtDetailsPage() {
  const { id: supplierId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Restore last active view from localStorage
  const [activeView, setActiveView] = useState<"ledger" | "cards" | "split" | "payments">(() => {
    const saved = localStorage.getItem(`supplierDebtDetailsView_${supplierId}`);
    return (saved as any) || "cards";
  });
  const [debtsStatus, setDebtsStatus] = useState("all");
  const [debtsSearch, setDebtsSearch] = useState("");
  const [debtsDateFrom, setDebtsDateFrom] = useState("");
  const [debtsDateTo, setDebtsDateTo] = useState("");
  const [debtsPage, setDebtsPage] = useState(1);
  const [paymentsMethod, setPaymentsMethod] = useState("all");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsDateFrom, setPaymentsDateFrom] = useState("");
  const [paymentsDateTo, setPaymentsDateTo] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());
  const [selectedSplitId, setSelectedSplitId] = useState<number | null>(null);
  const [itemsModal, setItemsModal] = useState<SupplierDetailedDebt | null>(null);
  const [itemsModalDebtId, setItemsModalDebtId] = useState<number | null>(null);

  // New state for SupplierDetailPage features
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Наличные');
  const [debtCurrency, setDebtCurrency] = useState<'USD' | 'UZS'>('UZS');
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [paymentComment, setPaymentComment] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnEntry, setReturnEntry] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<{ stock_id: number; quantity: string; product_name: string; max_quantity: number }[]>([]);
  const [returnNote, setReturnNote] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Delete payment dialog state
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);

  // Hooks
  const { data: currentUser } = useCurrentUser();
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const payStockDebt = usePayStockDebt();
  const deleteStockPayment = useDeleteStockPayment();

  // Fetch items for modal when itemsModalDebtId is set
  const { data: itemsDataFromApi, isLoading: itemsLoadingFromApi } = useQuery({
    queryKey: ["supplierDebtItems", itemsModalDebtId],
    queryFn: async () => {
      const response = await api.get(`stock_debt_payment/stock-entries/${itemsModalDebtId}/items/`);
      return response.data;
    },
    enabled: !!itemsModalDebtId && !itemsModal,
  });

  // ======== API QUERIES ========
  const { data: debtsData, isLoading: debtsLoading } = useQuery<SupplierDebtsDetailedResponse>({
    queryKey: ["supplierDebtsDetailed", supplierId, debtsPage, debtsStatus, debtsDateFrom, debtsDateTo, debtsSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ page: debtsPage.toString() });
      if (debtsStatus !== "all") p.append("status", debtsStatus);
      if (debtsDateFrom) p.append("date_from", debtsDateFrom);
      if (debtsDateTo) p.append("date_to", debtsDateTo);
      if (debtsSearch) p.append("search", debtsSearch);
      const res = await api.get(`stock_debt_payment/suppliers/${supplierId}/debts/?${p}`);
      return res.data;
    },
    enabled: !!supplierId,
  });

  const { data: paymentsData } = useQuery<SupplierPaymentsDetailedResponse>({
    queryKey: ["supplierPaymentsDetailed", supplierId, paymentsPage, paymentsMethod, paymentsDateFrom, paymentsDateTo, paymentsSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ page: paymentsPage.toString() });
      if (paymentsMethod !== "all") p.append("payment_type", paymentsMethod);
      if (paymentsDateFrom) p.append("date_from", paymentsDateFrom);
      if (paymentsDateTo) p.append("date_to", paymentsDateTo);
      if (paymentsSearch) p.append("search", paymentsSearch);
      const res = await api.get(`stock_debt_payment/suppliers/${supplierId}/payments/?${p}`);
      return res.data;
    },
    enabled: !!supplierId,
  });

  // Currency rates query for payment dialog
  const { data: currencyRates } = useQuery<Array<{ rate: string }>>({
    queryKey: ['currency-rates'],
    queryFn: async () => {
      const response = await api.get('/currency/rates/');
      return response.data;
    },
    enabled: paymentType === "Валюта",
  });

  // Set exchange rate when currency rates are loaded
  if (currencyRates && currencyRates.length > 0 && paymentType === "Валюта" && !exchangeRate) {
    setExchangeRate(currencyRates[0].rate);
  }

  const currentBudget = selectedStoreId ? 
    stores.find(s => s.id === selectedStoreId)?.budgets?.find(b => b.budget_type === paymentType)?.amount || "0" 
    : "0";

  const supplier = debtsData?.supplier || paymentsData?.supplier;
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
      const key = getMonthKey(p.payment_date);
      byMonth[key] = (byMonth[key] || 0) + (p.amount_in_uzs || parseFloat(p.amount) || 0);
    }
    const entries = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    const max = Math.max(...entries.map(e => e[1]), 1);
    return entries.map(([k, v]) => ({ label: getShortMonthLabel(k), amount: v, pct: Math.round((v / max) * 100) }));
  }, [allPayments]);

  const toggleCard = (id: number) => {
    setExpandedCards(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const togglePaymentRow = (id: number) => {
    setExpandedPayments(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  // Handler for payment click from SupplierDetailPage
  const handlePaymentClick = (entry: any) => {
    setSelectedEntry(entry);
    setPaymentAmount('');
    setPaymentType('Наличные');
    setDebtCurrency('UZS');
    setSelectedStoreId(currentUser?.is_superuser ? null : (currentUser?.store_read?.id || null));
    setPaymentComment('');
    setExchangeRate('');
    setPaymentDialogOpen(true);
  };

  // Handler for payment submit from SupplierDetailPage
  const handlePaymentSubmit = () => {
    if (!selectedEntry || !paymentAmount) {
      toast.error(t('common.enter_payment_amount'));
      return;
    }

    if (!selectedStoreId) {
      toast.error(t('common.select_store') || 'Выберите магазин');
      return;
    }

    const amount = Number(paymentAmount);
    if (amount <= 0) {
      toast.error(t('validation.amount_must_be_positive'));
      return;
    }

    payStockDebt.mutate(
      {
        stock_entry: selectedEntry.id,
        amount,
        payment_type: paymentType,
        debt_currency: debtCurrency,
        comment: paymentComment,
        store: selectedStoreId,
        ...(exchangeRate && {
          rate_at_payment: Number(exchangeRate),
        }),
      },
      {
        onSuccess: () => {
          toast.success(t('common.payment_successful'));
          setPaymentDialogOpen(false);
          window.location.reload();
        },
       
      }
    );
  };

  // Handler for return click from SupplierDetailPage
  const handleReturnClick = async (entry: any) => {
    try {
      const response = await api.get(`/items/stock-entries/${entry.id}/`);
      const entryWithStocks = response.data;

      setReturnEntry(entryWithStocks);
      const items = (entryWithStocks.stocks || []).map((stock: any) => ({
        stock_id: stock.id,
        quantity: '',
        product_name: stock.product?.product_name || 'N/A',
        max_quantity: parseFloat(stock.quantity || 0),
      }));
      setReturnItems(items);
      setReturnNote('');
      setReturnDialogOpen(true);
    } catch (error) {
      console.error('Error fetching stock entry details:', error);
      toast.error('Ошибка при загрузке данных');
    }
  };

  // Handler for return submit from SupplierDetailPage
  const handleReturnSubmit = async () => {
    if (!returnEntry) return;

    const itemsToReturn = returnItems
      .filter(item => parseFloat(item.quantity) > 0)
      .map(item => ({
        stock_id: item.stock_id,
        quantity: parseFloat(item.quantity),
      }));

    if (itemsToReturn.length === 0) {
      toast.error('Укажите количество для возврата');
      return;
    }

    for (const item of returnItems) {
      const qty = parseFloat(item.quantity);
      if (qty > 0 && qty > item.max_quantity) {
        toast.error(`Количество для "${item.product_name}" превышает доступное (${item.max_quantity})`);
        return;
      }
    }

    setIsSubmittingReturn(true);
    try {
      await api.post('/items/stock-returns/', {
        stock_entry_id: returnEntry.id,
        items: itemsToReturn,
        note: returnNote || undefined,
      });

      toast.success('Возврат успешно оформлен');
      setReturnDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['supplierDebtsDetailed'] });
      queryClient.invalidateQueries({ queryKey: ['supplierPaymentsDetailed'] });
    } catch (error: any) {
      console.error('Error submitting return:', error);
      toast.error(error?.response?.data?.message || 'Ошибка при оформлении возврата');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Handler for delete payment
  const handleDeletePaymentClick = (payment: any) => {
    setPaymentToDelete(payment);
    setDeletePaymentDialogOpen(true);
  };

  const handleDeletePaymentConfirm = () => {
    if (!paymentToDelete) return;

    deleteStockPayment.mutate(
      { paymentId: paymentToDelete.id },
      {
        onSuccess: () => {
          toast.success(t('common.payment_deleted') || 'Платеж удален');
          setDeletePaymentDialogOpen(false);
          setPaymentToDelete(null);
          // Reload the page to refresh all data
          window.location.reload();
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || t('common.error_deleting_payment') || 'Ошибка при удалении платежа');
        },
      }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (value: string | number) => {
    return Number(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ======== RENDER: SUPPLIER CARD ========
  const renderSupplierCard = () => {
    if (!supplier) return null;
    const rem = debtsData?.totals?.remainder_by_currency || {};
    return (
      <div className="client-card">
        <div className="avatar">{initials(supplier.name)}</div>
        <div className="client-info">
          <div className="client-name">{supplier.name}</div>
          <div className="client-meta">
            {supplier.phone && <span>{supplier.phone}</span>}
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
                  {cur === "USD" ? "$" : ""}{fmt(val)}
                  <span className="currency">{cur === "USD" ? "" : " сум"}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ======== VIEW SWITCHER ========
  const views: [string, string, JSX.Element][] = [
    ["ledger", "Книга", <LayoutList key="l" />],
    ["cards", "Карточки", <LayoutGrid key="c" />],
    ["split", "Разделение", <Columns key="s" />],
    ["payments", "Платежи", <CreditCard key="p" />],
  ];
  const renderViewSwitcher = () => (
    <div className="view-switcher">
      {views.map(([key, label, icon]) => (
        <button key={key} className={activeView === key ? "active" : ""} onClick={() => {
          const newView = key as any;
          setActiveView(newView);
          localStorage.setItem(`supplierDebtDetailsView_${supplierId}`, newView);
        }}>
          {icon} {label}
        </button>
      ))}
    </div>
  );

  // ======== DEBTS TOOLBAR ========
  const renderDebtsToolbar = () => (
    <div className="toolbar">
      <div className="tabs">
        {[
          { key: "all", label: "Все", count: counts?.all },
          { key: "open", label: "Открытые", count: counts?.open },
          { key: "closed", label: "Закрытые", count: counts?.closed },
        ].map(t => (
          <button key={t.key} className={`tab ${debtsStatus === t.key ? "active" : ""}`} onClick={() => { setDebtsStatus(t.key); setDebtsPage(1); }}>
            {t.label}
            {t.count !== undefined && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="toolbar-spacer" />
      <div className="dd-search">
        <Search />
        <input placeholder="Поиск..." value={debtsSearch} onChange={e => { setDebtsSearch(e.target.value); setDebtsPage(1); }} />
        {debtsSearch && (
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setDebtsSearch("")}>
            <X style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="date" value={debtsDateFrom} onChange={e => { setDebtsDateFrom(e.target.value); setDebtsPage(1); }} className="period-btn" />
        <input type="date" value={debtsDateTo} onChange={e => { setDebtsDateTo(e.target.value); setDebtsPage(1); }} className="period-btn" />
      </div>
    </div>
  );

  // ======== PAGINATION ========
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

  // ======== BADGE ========
  const renderBadge = (status: string) => {
    const cls = status === "closed" ? "badge-closed" : "badge-open";
    return <span className={`badge ${cls}`}>{statusLabel(status)}</span>;
  };

  // ======== VIEW: LEDGER ========
  const renderLedger = () => {
    type LedgerRow =
      | { type: "month"; label: string }
      | { type: "debt"; debt: SupplierDetailedDebt }
      | { type: "payment"; debt: SupplierDetailedDebt; payment: SupplierDetailedDebt["payments"][0] };
    const rows: LedgerRow[] = [];
    const monthGroups = groupByMonth(debts, d => d.date_of_arrived);
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
                  <th>Примечание</th>
                  <th className="right">Сумма</th>
                  <th className="right">Остаток (UZS)</th>
                  <th className="right">Остаток (USD)</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Нет данных</td></tr>
                )}
                {rows.map((row, i) => {
                  if (row.type === "month") {
                    return <tr key={`m-${i}`} className="month-divider"><td colSpan={8}>{row.label}</td></tr>;
                  }
                  if (row.type === "debt") {
                    const d = row.debt;
                    const hasUsd = parseFloat(d.total_amount_usd) > 0;
                    return (
                      <tr key={`d-${d.id}`} className={`row-sale ${d.status === "closed" ? "row-closed" : ""}`} style={{ cursor: "pointer" }}>
                        <td className="tabular">{fmtDate(d.date_of_arrived)}</td>
                        <td>
                          <span className="op-name">{d.is_manual ? "Ручной долг" : "Долг"}</span>
                          <span 
                            className="sale-id"
                            style={{ cursor: "pointer", textDecoration: "underline", color: "var(--info)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemsModalDebtId(d.id);
                            }}
                          >
                            #{d.id}
                          </span>
                          <span className="badge-inline">{renderBadge(d.status)}</span>
                        </td>
                        <td>{d.store_name || "—"}</td>
                        <td style={{ color: "var(--text-secondary)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.note || "—"}</td>
                        <td className="right amount-positive">
                          {hasUsd ? `$${fmtDecimal(d.total_amount_usd)}` : `${fmt(d.total_amount_uzs)} сум`}
                          {hasUsd && parseFloat(d.total_amount_uzs) > 0 && <div className="currency-conversion">≈ {fmt(d.total_amount_uzs)} сум</div>}
                        </td>
                        <td className="right">
                          <span style={{ color: parseFloat(d.remaining_debt_uzs) > 0 ? "var(--danger)" : "var(--success)", fontWeight: 500 }}>
                            {fmt(d.remaining_debt_uzs)} сум
                          </span>
                        </td>
                        <td className="right">
                          <span style={{ color: parseFloat(d.remaining_debt_usd) > 0 ? "var(--danger)" : "var(--success)", fontWeight: 500 }}>
                            {parseFloat(d.remaining_debt_usd) > 0 ? `$${fmtDecimal(d.remaining_debt_usd)}` : "—"}
                          </span>
                        </td>
                        <td>{renderBadge(d.status)}</td>
                      </tr>
                    );
                  }
                  if (row.type === "payment") {
                    const p = row.payment;
                    return (
                      <tr key={`p-${p.id}-${i}`} className="row-payment">
                        <td className="tabular">{fmtDate(p.payment_date)}</td>
                        <td>
                          <span className="op-name">Оплата</span>
                          <span className="sale-id">{p.payment_type}</span>
                        </td>
                        <td className="text-muted">—</td>
                        <td className="text-muted">{p.comment || "—"}</td>
                        <td className="right amount-negative">
                          −{p.debt_currency === "USD" ? `$${fmtDecimal(p.amount_in_usd || p.amount)}` : `${fmt(p.amount)} сум`}
                        </td>
                        <td className="right text-muted">—</td>
                        <td className="right text-muted">—</td>
                        <td>
                          {p.closes_debt && <span className="effect-badge effect-closed">Закрыл</span>}
                        </td>
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
    const monthGroups = groupByMonth(debts, d => d.date_of_arrived);
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
                const dt = new Date(debt.date_of_arrived);

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
                          <span 
                            className="sale-id"
                            style={{ cursor: "pointer", textDecoration: "underline", color: "var(--info)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemsModalDebtId(debt.id);
                            }}
                          >
                            #{debt.id}
                          </span>
                          {renderBadge(debt.status)}
                        </div>
                        <div className="card-meta-line">
                          {debt.store_name && <span>{debt.store_name}</span>}
                          {debt.items_count > 0 && <><span className="dot">·</span><span>{debt.items_count} поз.</span></>}
                          {debt.payments.length > 0 && <><span className="dot">·</span><span>{pluralPayments(debt.payments.length)}</span></>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="card-amounts">
                          <div className="card-total">
                            {hasUsd ? `$${fmtDecimal(debt.total_amount_usd)}` : `${fmt(debt.total_amount_uzs)} сум`}
                          </div>
                          <div className={`card-remainder ${(parseFloat(debt.remaining_debt_uzs) > 0 || parseFloat(debt.remaining_debt_usd) > 0) ? "has-debt" : ""}`}>
                            ост: {fmt(debt.remaining_debt_uzs)} сум
                            {parseFloat(debt.remaining_debt_usd) > 0 && (
                              <> / ${fmtDecimal(debt.remaining_debt_usd)}</>
                            )}
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
                            <div className="info-cell-label">Курс USD</div>
                            <div className="info-cell-value">{debt.rate_at_purchase ? fmt(debt.rate_at_purchase) : "—"}</div>
                          </div>
                          <div>
                            <div className="info-cell-label">Прогресс</div>
                            <div className="info-cell-value">{progress}%</div>
                          </div>
                        </div>

                        {debt.note && (
                          <div className="card-section">
                            <div className="card-section-title">Примечание</div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                              {debt.note}
                            </div>
                          </div>
                        )}

                        {debt.payments.length > 0 && (
                          <div className="card-section">
                            <div className="card-section-title">История платежей ({debt.payments.length})</div>
                            {debt.payments.map(p => (
                              <div key={p.id} className="timeline-row">
                                <span className="timeline-date">{fmtDate(p.payment_date)}</span>
                                <span className="timeline-label">
                                  <span className={`method-tag ${methodCls(p.payment_type)}`}>{p.payment_type}</span>
                                  {p.comment && (
                                    <span style={{ marginLeft: 8, color: "var(--text-tertiary)", fontSize: 11, fontStyle: "italic" }}>
                                      · {p.comment}
                                    </span>
                                  )}
                                </span>
                                <span className="timeline-amount negative">
                                  −{p.debt_currency === "USD" ? `$${fmtDecimal(p.amount_in_usd || p.amount)}` : `${fmt(p.amount)} сум`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {debt.items.length > 0 && (
                          <div className="card-section">
                            <div className="card-section-title">
                              <span>Товары ({debt.items.length})</span>
                              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setItemsModal(debt)}>
                                <Package style={{ width: 12, height: 12 }} /> Подробнее
                              </button>
                            </div>
                            {debt.items.slice(0, 3).map(item => (
                              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                                <span>{item.name} <span style={{ color: "var(--text-tertiary)" }}>× {fmtQuantity(item.qty)} {item.unit}</span></span>
                                <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                                  {parseFloat(item.subtotal_usd) > 0 ? `$${fmtDecimal(item.subtotal_usd)}` : `${fmtDecimal(item.subtotal_uzs)} сум`}
                                </span>
                              </div>
                            ))}
                            {debt.items.length > 3 && (
                              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>...и ещё {debt.items.length - 3}</div>
                            )}
                          </div>
                        )}

                        <div className="card-section" style={{ display: "flex", gap: 8 }}>
                          {debt.status !== "closed" && (
                            <button className="btn" onClick={() => handlePaymentClick(debt)}>
                              <CreditCard /> Принять оплату
                            </button>
                          )}
                          {debt.items.length > 0 && (
                            <button className="btn btn-secondary" onClick={() => setItemsModal(debt)}>
                              <Package /> Товары
                            </button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/suppliers/${supplierId}/stock-entries/${debt.id}/edit`);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReturnClick(debt);
                                }}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Возврат
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/suppliers/${supplierId}/stock-entries/${debt.id}/returns`);
                                }}
                              >
                                <ClipboardList className="w-4 h-4 mr-2" />
                                История возвратов
                              </DropdownMenuItem>
                              {debt.status !== "closed" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/suppliers/${supplierId}/stock-entries/${debt.id}/payments`);
                                    }}
                                  >
                                    <History className="w-4 h-4 mr-2" />
                                    {t('common.payment_history')}
                                  </DropdownMenuItem>
                                  {(Number(debt.remaining_debt_uzs || 0) > 0 || Number(debt.remaining_debt_usd || 0) > 0) && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePaymentClick(debt);
                                      }}
                                    >
                                      <DollarSign className="w-4 h-4 mr-2" />
                                      {t('common.pay_debt')}
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    const monthGroups = groupByMonth(debts, d => d.date_of_arrived);
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
                      <div key={d.id} className={`split-item ${det?.id === d.id ? "selected" : ""}`} onClick={() => setSelectedSplitId(d.id)}>
                        <div className={`status-dot ${d.status}`} />
                        <div>
                          <div className="split-item-title">
                            <span className="split-item-date">{fmtDate(d.date_of_arrived)}</span>
                            <span className="split-item-id">#{d.id}</span>
                          </div>
                          <div className="split-item-meta">{d.store_name || "—"}</div>
                        </div>
                        <div className="split-item-amounts">
                          <div className="split-item-total">{hasUsd ? `$${fmtDecimal(d.total_amount_usd)}` : fmt(d.total_amount_uzs)}</div>
                          <div className={`split-item-rem ${(parseFloat(d.remaining_debt_uzs) > 0 || parseFloat(d.remaining_debt_usd) > 0) ? "has-debt" : ""}`}>
                            ост: {hasUsd ? `$${fmtDecimal(d.remaining_debt_usd)}` : fmt(d.remaining_debt_uzs)}
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
                        #{det.id}
                      </span>
                      {renderBadge(det.status)}
                    </div>
                    <div className="detail-meta">{det.store_name} · {fmtDate(det.date_of_arrived)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {det.status !== "closed" && (
                      <button className="btn" onClick={() => handlePaymentClick(det)}>
                        <CreditCard /> Оплата
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/suppliers/${supplierId}/stock-entries/${det.id}/edit`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t('common.edit') || 'Редактировать'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleReturnClick(det)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Возврат
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/suppliers/${supplierId}/stock-entries/${det.id}/returns`)}
                        >
                          <ClipboardList className="w-4 h-4 mr-2" />
                          История возвратов
                        </DropdownMenuItem>
                        {det.is_debt && (
                          <DropdownMenuItem
                            onClick={() => navigate(`/suppliers/${supplierId}/stock-entries/${det.id}/payments`)}
                          >
                            <History className="w-4 h-4 mr-2" />
                            {t('common.payment_history') || 'История платежей'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                    <div className={`detail-stat-value ${parseFloat(det.remaining_debt_uzs) > 0 ? "dd-danger" : "dd-success"}`}>{fmt(det.remaining_debt_uzs)}</div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat-label">Остаток (USD)</div>
                    <div className={`detail-stat-value ${parseFloat(det.remaining_debt_usd) > 0 ? "dd-danger" : "dd-success"}`}>
                      {parseFloat(det.remaining_debt_usd) > 0 ? `$${fmtDecimal(det.remaining_debt_usd)}` : "—"}
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
                      <div style={{ color: "var(--text-secondary)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmtDate(det.date_of_arrived)}</div>
                      <div style={{ fontSize: 13 }}>Поступление #{det.id}</div>
                      <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: 13 }}>
                        {parseFloat(det.total_amount_usd) > 0 ? `$${fmtDecimal(det.total_amount_usd)}` : `${fmt(det.total_amount_uzs)} сум`}
                      </div>
                    </div>
                    {det.payments.map(p => (
                      <div key={p.id} className="timeline-event">
                        <div className={`timeline-marker ${p.closes_debt ? "closing" : "payment"}`} />
                        <div style={{ color: "var(--text-secondary)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmtDate(p.payment_date)}</div>
                        <div style={{ fontSize: 13 }}>
                          <span className={`method-tag ${methodCls(p.payment_type)}`}>{p.payment_type}</span>
                          {p.comment && (
                            <div style={{ marginTop: 4, color: "var(--text-tertiary)", fontSize: 11, fontStyle: "italic" }}>
                              {p.comment}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: 13, color: "var(--success)" }}>
                          −{p.debt_currency === "USD" ? `$${fmtDecimal(p.amount_in_usd || p.amount)}` : `${fmt(p.amount)} сум`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {det.items.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title"><span>Товары ({det.items.length})</span></div>
                    {det.items.map(item => (
                      <div key={item.id} className="detail-item-row">
                        <span className="name">{item.name}</span>
                        <span className="qty">{fmtQuantity(item.qty)} {item.unit}</span>
                        <span className="price">{parseFloat(item.price_usd) > 0 ? `$${fmtDecimal(item.price_usd)}` : fmtDecimal(item.price_uzs)}</span>
                        <span className="sub">{parseFloat(item.subtotal_usd) > 0 ? `$${fmtDecimal(item.subtotal_usd)}` : fmtDecimal(item.subtotal_uzs)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="detail-section">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 13 }}>
                    <div>
                      <div style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Аванс (UZS)</div>
                      <div style={{ fontWeight: 500 }}>{parseFloat(det.advance_uzs) > 0 ? `${fmt(det.advance_uzs)} сум` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Аванс (USD)</div>
                      <div style={{ fontWeight: 500 }}>{parseFloat(det.advance_usd) > 0 ? `$${fmtDecimal(det.advance_usd)}` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Курс USD</div>
                      <div style={{ fontWeight: 500 }}>{det.rate_at_purchase ? `${fmt(det.rate_at_purchase)} сум` : "—"}</div>
                    </div>
                  </div>
                </div>

                {det.note && (
                  <div className="detail-section">
                    <div className="detail-section-title">Примечание</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {det.note}
                    </div>
                  </div>
                )}
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
    const methods = totals?.by_payment_type || {};
    const methodKeys = ["all", ...Object.keys(methods)];
    const filteredPayments = paymentsMethod === "all"
      ? allPayments
      : allPayments.filter(p => p.payment_type === paymentsMethod);

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
              <input placeholder="Поиск..." value={paymentsSearch} onChange={e => { setPaymentsSearch(e.target.value); setPaymentsPage(1); }} />
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
                <button key={k} className={`tab ${paymentsMethod === k ? "active" : ""}`} onClick={() => { setPaymentsMethod(k); setPaymentsPage(1); }}>
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
                  <th>Эффект</th>
                  <th style={{ width: 80 }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Нет платежей</td></tr>
                )}
                {filteredPayments.map((p, idx) => {
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
                            <span className="date-main">{fmtDate(p.payment_date)}</span>
                            <span className="date-time">{fmtTime(p.payment_date)}</span>
                          </div>
                        </td>
                        <td className="right" style={{ fontWeight: 500, color: "var(--success)" }}>
                          {p.debt_currency === "USD" ? `$${fmtDecimal(p.amount_in_usd || p.amount)}` : `${fmt(p.amount)} сум`}
                          {p.amount_in_uzs && p.debt_currency === "USD" && <div className="currency-conversion">≈ {fmt(p.amount_in_uzs)} сум</div>}
                        </td>
                        <td><span className={`method-tag ${methodCls(p.payment_type)}`}>{p.payment_type}</span></td>
                        <td>
                          <div className="applied-to">
                            <span 
                              className="applied-to-id"
                              style={{ cursor: "pointer", textDecoration: "underline" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemsModalDebtId(p.stock_entry.id);
                              }}
                            >
                              Долг #{p.stock_entry.id}
                            </span>
                            <span className="applied-to-meta">{p.stock_entry.store_name}</span>
                          </div>
                        </td>
                        <td>
                          {p.closes_debt ? (
                            <span className="effect-badge effect-closed">Закрыл</span>
                          ) : (
                            <span className="effect-badge effect-partial">Частично</span>
                          )}
                        </td>
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePaymentClick(p);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="w-4 h-4 mr-2" />
                                {t('common.delete') || 'Удалить'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      {isExp && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div className="payment-detail">
                              <div className="payment-detail-grid">
                                <div>
                                  <div className="detail-field-label">Сумма платежа</div>
                                  <div className="detail-field-value tabular-val">{p.debt_currency === "USD" ? `$${fmtDecimal(p.amount_in_usd || p.amount)}` : `${fmt(p.amount)} сум`}</div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Сумма в UZS</div>
                                  <div className="detail-field-value tabular-val">{p.amount_in_uzs ? `${fmt(p.amount_in_uzs)} сум` : "—"}</div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Курс USD</div>
                                  <div className="detail-field-value tabular-val">{p.rate_at_payment ? fmt(p.rate_at_payment) : "—"}</div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Валюта долга</div>
                                  <div className="detail-field-value">{p.debt_currency}</div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Остаток долга (UZS)</div>
                                  <div className="detail-field-value tabular-val" style={{ color: parseFloat(p.stock_entry.remaining_debt_uzs) > 0 ? "var(--danger)" : "var(--success)" }}>
                                    {fmt(p.stock_entry.remaining_debt_uzs)} сум
                                  </div>
                                </div>
                                <div>
                                  <div className="detail-field-label">Остаток долга (USD)</div>
                                  <div className="detail-field-value tabular-val" style={{ color: parseFloat(p.stock_entry.remaining_debt_usd) > 0 ? "var(--danger)" : "var(--success)" }}>
                                    {parseFloat(p.stock_entry.remaining_debt_usd) > 0 ? `$${fmtDecimal(p.stock_entry.remaining_debt_usd)}` : "—"}
                                  </div>
                                </div>
                                {p.comment && (
                                  <div>
                                    <div className="detail-field-label">Комментарий</div>
                                    <div className="detail-field-value">{p.comment}</div>
                                  </div>
                                )}
                                <div>
                                  <div className="detail-field-label">Товаров в долге</div>
                                  <div className="detail-field-value">{p.stock_entry.items_count}</div>
                                </div>
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

    // const debt = itemsModal || { id: itemsDataFromApi?.stock_entry_id };
    const items = itemsModal?.items || itemsDataFromApi?.results || [];
    const hasUsd = items.some((i: any) => parseFloat(i.subtotal_usd || 0) > 0);
    const total = hasUsd
      ? items.reduce((s: number, i: any) => s + parseFloat(i.subtotal_usd || 0), 0)
      : items.reduce((s: number, i: any) => s + parseFloat(i.subtotal_uzs || 0), 0);

    return (
      <div className="modal-backdrop" onClick={() => { setItemsModal(null); setItemsModalDebtId(null); }}>
        <div className="dd-modal" onClick={e => e.stopPropagation()}>
          <div className="dd-modal-header">
            <div>
              <div className="dd-modal-title">Товары — Долг #{debtId}</div>
              {itemsModal && <div className="dd-modal-subtitle">{itemsModal.store_name} · {fmtDate(itemsModal.date_of_arrived)}</div>}
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
                      <td className="right">{hasUsd ? `$${fmtDecimal(item.price_usd || 0)}` : fmtDecimal(item.price_uzs || 0)}</td>
                      <td className="right" style={{ fontWeight: 500 }}>{hasUsd ? `$${fmtDecimal(item.subtotal_usd || 0)}` : fmtDecimal(item.subtotal_uzs || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right" }}>Итого</td>
                    <td className="right">{hasUsd ? `$${fmtDecimal(total)}` : `${fmtDecimal(total)} сум`}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

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

      {renderSupplierCard()}
      {renderViewSwitcher()}

      {activeView === "ledger" && renderLedger()}
      {activeView === "cards" && renderCards()}
      {activeView === "split" && renderSplit()}
      {activeView === "payments" && renderPayments()}

      {renderItemsModal()}

      {/* Enhanced Payment Dialog from SupplierDetailPage */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          window.location.reload();
        }
        setPaymentDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.pay_debt')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="debt-currency">{t('common.currency')}</Label>
              <select
                id="debt-currency"
                className="w-full px-3 py-2 border rounded-md"
                value={debtCurrency}
                onChange={(e) => setDebtCurrency(e.target.value as 'USD' | 'UZS')}
              >
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {selectedEntry && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('dashboard.remaining_debt')} ({debtCurrency}):</span>
                  <span className="font-medium text-orange-500">
                    {formatNumber(debtCurrency === 'UZS' ? selectedEntry.remaining_debt_uzs || 0 : selectedEntry.remaining_debt_usd || 0)} {debtCurrency}
                  </span>
                </div>
              </div>
            )}

            {currentUser?.is_superuser && (
              <div className="space-y-2">
                <Label htmlFor="store-select">{t('forms.store')}</Label>
                <select
                  id="store-select"
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">{t('placeholders.select_store')}</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payment-type">{t('forms.payment_method')}</Label>
              <select
                id="payment-type"
                className="w-full px-3 py-2 border rounded-md"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="Наличные">{t('payment_types.cash')}</option>
                <option value="Карта">{t('payment_types.card')}</option>
                <option value="Click">{t('payment_types.click')}</option>
                <option value="Перечисление">{t('payment.per')}</option>
                <option value="Валюта">Валюта</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchange-rate">{t('common.exchange_rate') || 'Exchange Rate'}</Label>
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only up to 5 digits (before decimal point)
                  const integerPart = value.split('.')[0];
                  if (integerPart.length <= 5) {
                    setExchangeRate(value);
                  }
                }}
                placeholder="12200"
              />
            </div>

            {selectedStoreId && (
              <div className="p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Баланс ({paymentType}): </span>
                <span className="font-semibold">{parseFloat(currentBudget).toLocaleString()} UZS</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payment-amount">{t('common.payment_amount')}</Label>
              <Input
                id="payment-amount"
                type="number"
                placeholder={t('common.enter_payment_amount')}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-comment">{t('common.comment')}</Label>
              <Textarea
                id="payment-comment"
                placeholder={t('common.enter_comment')}
                value={paymentComment}
                onChange={(e) => setPaymentComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentDialogOpen(false);
                  window.location.reload();
                }}
                disabled={payStockDebt.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handlePaymentSubmit}
                disabled={payStockDebt.isPending}
              >
                {payStockDebt.isPending ? t('common.processing') : t('common.pay')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Dialog from SupplierDetailPage */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Возврат товара поставщику</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {returnEntry && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Поставщик:</span>
                  <span className="font-medium">{returnEntry.supplier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Магазин:</span>
                  <span className="font-medium">{returnEntry.store?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Дата поступления:</span>
                  <span className="font-medium">{formatDate(returnEntry.date_of_arrived)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Товары для возврата</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Товар</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Доступно</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Кол-во возврата</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returnItems.map((item, index) => (
                      <tr key={item.stock_id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                          {item.product_name}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                          {item.max_quantity}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Input
                            type="number"
                            min="0"
                            max={item.max_quantity}
                            placeholder="0"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...returnItems];
                              newItems[index].quantity = e.target.value;
                              setReturnItems(newItems);
                            }}
                            className="w-24"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-note">Комментарий (необязательно)</Label>
              <Textarea
                id="return-note"
                placeholder="Введите комментарий..."
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReturnDialogOpen(false)}
                disabled={isSubmittingReturn}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleReturnSubmit}
                disabled={isSubmittingReturn}
              >
                {isSubmittingReturn ? 'Оформление...' : 'Оформить возврат'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation Dialog */}
      <Dialog open={deletePaymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Dialog is being closed (clicked outside or ESC pressed)
          window.location.reload();
        }
        setDeletePaymentDialogOpen(open);
      }}>
        <DialogContent>
         
          <div className="space-y-4 py-4">
           
            {paymentToDelete && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('forms.amount') || 'Сумма'}:</span>
                  <span className="font-medium">
                    {paymentToDelete.debt_currency === "USD" 
                      ? `$${fmtDecimal(paymentToDelete.amount_in_usd || paymentToDelete.amount)}` 
                      : `${fmt(paymentToDelete.amount)} сум`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('forms.payment_method') || 'Способ оплаты'}:</span>
                  <span className="font-medium">{paymentToDelete.payment_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('forms.payment_date') || 'Дата'}:</span>
                  <span className="font-medium">{fmtDate(paymentToDelete.payment_date)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeletePaymentDialogOpen(false);
                  window.location.reload();
                }}
                disabled={deleteStockPayment.isPending}
              >
                {t('common.cancel') || 'Отмена'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePaymentConfirm}
                disabled={deleteStockPayment.isPending}
              >
                {deleteStockPayment.isPending ? (t('common.deleting') || 'Удаление...') : (t('common.delete') || 'Удалить')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
