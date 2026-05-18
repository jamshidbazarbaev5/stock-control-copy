import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetStockEntries, useGetStocks, usePayStockDebt } from '../api/stock';
import { useGetStores } from '../api/store';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, History, Edit, Package, CheckCircle2, AlertCircle, MoreVertical, RotateCcw, ClipboardList, CreditCard, FileText, Calendar, MessageSquare, ArrowLeft } from 'lucide-react';
import '../../expanded-row-dark.css';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSupplierPayments, type SupplierPaymentFilters } from '../api/stock-debt-payment';
import { ResourceTable } from '../helpers/ResourseTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Наличные');
  const [debtCurrency, setDebtCurrency] = useState<'USD' | 'UZS'>('UZS');
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [paymentComment, setPaymentComment] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'entries' | 'payments'>('entries');

  // Payment tab filters
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentDateAfter, setPaymentDateAfter] = useState<string>('');
  const [paymentDateBefore, setPaymentDateBefore] = useState<string>('');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('');
  const [filterStockEntry, setFilterStockEntry] = useState<string>('');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState<string>("all");

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnEntry, setReturnEntry] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<{ stock_id: number; quantity: string; product_name: string; max_quantity: number }[]>([]);
  const [returnNote, setReturnNote] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Supplier payments query
  const paymentFilters: SupplierPaymentFilters = {
    page: paymentsPage,
    payment_date_after: paymentDateAfter || undefined,
    payment_date_before: paymentDateBefore || undefined,
    payment_type: filterPaymentType || undefined,
    stock_entry: filterStockEntry || undefined,
  };
  const { data: supplierPaymentsData, isLoading: isLoadingPayments } = useGetSupplierPayments(
    id || '',
    paymentFilters,
  );
  

  // Fetch stock entries for this supplier
  const { data: stockEntriesData, isLoading: isLoadingEntries } = useGetStockEntries({
    params: { 
      supplier: id, 
      page: currentPage,
      store: selectedStore === "all" ? undefined : selectedStore,
      date_of_arrived_gte: startDate || undefined,
      date_of_arrived_lte: endDate || undefined,
      is_unpaid: showUnpaidOnly === "unpaid" ? "true" : undefined,
    },
  });
  const { data: currentUser } = useCurrentUser();
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  const payStockDebt = usePayStockDebt();

  const { data: currencyRates } = useQuery<Array<{ rate: string }>>({
    queryKey: ['currency-rates'],
    queryFn: async () => {
      const response = await api.get('/currency/rates/');
      return response.data;
    },
    enabled: paymentType === "Валюта",
  });

  useEffect(() => {
    if (currencyRates && currencyRates.length > 0 && paymentType === "Валюта" && !exchangeRate) {
      setExchangeRate(currencyRates[0].rate);
    }
  }, [currencyRates, paymentType]);
  
  const currentBudget = selectedStoreId ? 
    stores.find(s => s.id === selectedStoreId)?.budgets?.find(b => b.budget_type === paymentType)?.amount || "0" 
    : "0";

  const stockEntries = stockEntriesData?.results || [];
  const totalCount = stockEntriesData?.count || 0;

  const handleResetFilters = () => {
    setSelectedStore("all");
    setStartDate("");
    setEndDate("");
    setShowUnpaidOnly("all");
    setCurrentPage(1);
  };

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

  const handlePaymentSubmit = () => {
    if (!selectedEntry || !paymentAmount) {
      toast.error(t('common.enter_payment_amount'));
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
        onError: (error: any) => {
          toast.error(error?.message || t('common.payment_failed'));
          // Invalidate queries even on error to ensure data consistency
          queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
          queryClient.invalidateQueries({ queryKey: ['stores'] });
        }
      }
    );

  };

  // Handle return click - fetch stock entry details with stocks
  const handleReturnClick = async (entry: any) => {
    try {
      // Fetch full stock entry details with stocks
      const response = await api.get(`/items/stock-entries/${entry.id}/`);
      const entryWithStocks = response.data;

      setReturnEntry(entryWithStocks);
      // Initialize return items from stocks
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

  // Handle return submit
  const handleReturnSubmit = async () => {
    if (!returnEntry) return;

    // Filter items with quantity > 0
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

    // Validate quantities
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
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      window.location.reload();
    } catch (error: any) {
      console.error('Error submitting return:', error);
      toast.error(error?.response?.data?.message || 'Ошибка при оформлении возврата');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Fetch stock details for an expanded entry

  const formatCurrency = (amount: string | number | undefined) => {
    return new Intl.NumberFormat('ru-RU').format(Number(amount));
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

  const handleRowClick = (row: any) => {
    if (row.id === expandedRowId) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(row.id || null);
    }
  };

  const renderExpandedRow = (entry: any) => {
    return (
      <div className="bg-gray-50 border-t border-gray-200">
        <StockDetailsAccordion stockEntryId={entry.id} />
      </div>
    );
  };

  const columns = [
    {
      header: t('common.date'),
      accessorKey: 'date_of_arrived',
      cell: (row: any) => formatDate(row.date_of_arrived),
    },
    {
      header: t('table.store'),
      accessorKey: 'store',
      cell: (row: any) => row.store?.name || '-',
    },
    {
      header: t('common.total_amount') + ' (UZS)',
      accessorKey: 'total_amount_uzs',
      cell: (row: any) => (
        <span className="font-medium text-emerald-600">
          {formatCurrency(row.total_amount_uzs || 0)} UZS
        </span>
      ),
    },
    {
      header: t('common.total_amount') + ' (USD)',
      accessorKey: 'total_amount_usd',
      cell: (row: any) => (
        <span className="font-medium text-emerald-600">
          {formatCurrency(row.total_amount_usd || 0)} USD
        </span>
      ),
    },
    {
      header: t('common.stock_count'),
      accessorKey: 'stock_count',
      cell: (row: any) => (
        <div className="inline-flex items-center gap-1">
          <Package className="h-4 w-4 text-blue-600" />
          <span>{row.stock_count}</span>
        </div>
      ),
    },
    {
      header: t('common.debt_status'),
      accessorKey: 'is_debt',
      cell: (row: any) => (
        <div>
          {row.use_supplier_balance ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              <CheckCircle2 className="h-3 w-3" />
              с баланса
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                !row.is_debt
                  ? 'bg-emerald-100 text-emerald-700'
                  : row.is_paid
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {!row.is_debt ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : row.is_paid ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {!row.is_debt ? t('common.paid3') : row.is_paid ? t('common.paid') : t('common.unpaid')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('dashboard.remaining_debt') + ' (UZS)',
      accessorKey: 'remaining_debt_uzs',
      cell: (row: any) => (
        <span className="font-medium text-orange-600">
          {formatCurrency(row.remaining_debt_uzs || 0)} UZS
        </span>
      ),
    },
    {
      header: t('dashboard.remaining_debt') + ' (USD)',
      accessorKey: 'remaining_debt_usd',
      cell: (row: any) => (
        <span className="font-medium text-orange-600">
          {formatCurrency(row.remaining_debt_usd || 0)} USD
        </span>
      ),
    },
    {
      header: t('common.actions'),
      accessorKey: 'actions',
      cell: (row: any) => (
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
                navigate(`/suppliers/${id}/stock-entries/${row.id}/edit`);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleReturnClick(row);
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Возврат
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/suppliers/${id}/stock-entries/${row.id}/returns`);
              }}
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              История возвратов
            </DropdownMenuItem>
            {row.is_debt && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/suppliers/${id}/stock-entries/${row.id}/payments`);
                  }}
                >
                  <History className="w-4 h-4 mr-2" />
                  {t('common.payment_history')}
                </DropdownMenuItem>
                {(Number(row.remaining_debt_uzs || 0) > 0 || Number(row.remaining_debt_usd || 0) > 0) && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePaymentClick(row);
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
      ),
    },
  ];

  const paymentTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      'Наличные': t('payment_types.cash') || 'Наличные',
      'Карта': t('payment_types.card') || 'Карта',
      'Click': 'Click',
      'Перечисление': t('payment.per') || 'Перечисление',
      'Валюта': t('common.currency') || 'Валюта',
    };
    return map[type] || type;
  };

  const handleResetPaymentFilters = () => {
    setPaymentDateAfter('');
    setPaymentDateBefore('');
    setFilterPaymentType('');
    setFilterStockEntry('');
    setPaymentsPage(1);
  };

  const supplierPayments = supplierPaymentsData?.results || [];
  const totalPaymentsCount = supplierPaymentsData?.count || 0;
  const totalPaymentPages = supplierPaymentsData?.total_pages || 1;

  // Compute summary stats for payments
  const totalPaidUzs = supplierPayments.reduce((sum, p) => sum + (p.amount_in_uzs || 0), 0);
  const totalPaidUsd = supplierPayments.reduce((sum, p) => sum + (p.amount_in_usd || 0), 0);

  return (
    <div className="container mx-auto py-4 sm:py-6 md:py-8 px-2 sm:px-4">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: t('navigation.suppliers') || "Поставщики", href: "/suppliers" },
          { label: stockEntries[0]?.supplier.name || t('navigation.suppliers') },
        ]}
      />

      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">
          {stockEntries[0]?.supplier.name || t('navigation.suppliers')}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('entries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'entries'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          {t('common.stock_entries') || 'Поступления'}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'payments'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {t('navigation.payments') || 'Платежи'}
          {totalPaymentsCount > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
              {totalPaymentsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'entries' ? (
        <>
          {/* Filters */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base sm:text-lg font-medium">
                {t("common.filters")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="w-auto"
              >
                {t("common.reset") || "Сбросить"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUser?.is_superuser && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("forms.store")}</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                  >
                    <option value="all">{t("forms.all_stores")}</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id?.toString()}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("forms.start_date")}</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("forms.end_date")}</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.debt_status")}</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={showUnpaidOnly}
                  onChange={(e) => setShowUnpaidOnly(e.target.value)}
                >
                  <option value="all">{t("common.all")}</option>
                  <option value="unpaid">{t("common.unpaid_only") || "Только неоплаченные"}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg mb-4 sm:mb-6">
            <Card className="overflow-x-auto">
              <div className="min-w-[320px] sm:min-w-[800px]">
                <ResourceTable
                  data={stockEntries}
                  columns={columns}
                  isLoading={isLoadingEntries}
                  totalCount={totalCount}
                  pageSize={30}
                  currentPage={currentPage}
                  onPageChange={(newPage) => setCurrentPage(newPage)}
                  expandedRowRenderer={(row: any) => renderExpandedRow(row)}
                  onRowClick={(row: any) => handleRowClick(row)}
                />
              </div>
            </Card>
          </div>
        </>
      ) : (
        /* ===== PAYMENTS TAB ===== */
        <div className="space-y-4">
          {/* Payment Filters */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base sm:text-lg font-medium">
                {t("common.filters")}
              </h2>
              <Button variant="outline" size="sm" onClick={handleResetPaymentFilters}>
                {t("common.reset") || "Сбросить"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("forms.start_date") || "Дата от"}</label>
                <Input
                  type="date"
                  value={paymentDateAfter}
                  onChange={(e) => { setPaymentDateAfter(e.target.value); setPaymentsPage(1); }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("forms.end_date") || "Дата до"}</label>
                <Input
                  type="date"
                  value={paymentDateBefore}
                  onChange={(e) => { setPaymentDateBefore(e.target.value); setPaymentsPage(1); }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("forms.payment_method") || "Способ оплаты"}</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={filterPaymentType}
                  onChange={(e) => { setFilterPaymentType(e.target.value); setPaymentsPage(1); }}
                >
                  <option value="">{t("common.all") || "Все"}</option>
                  <option value="Наличные">{t("payment_types.cash") || "Наличные"}</option>
                  <option value="Карта">{t("payment_types.card") || "Карта"}</option>
                  <option value="Click">Click</option>
                  <option value="Перечисление">{t("payment.per") || "Перечисление"}</option>
                  <option value="Валюта">{t("common.currency") || "Валюта"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.stock_entry_id") || "ID поступления"}</label>
                <Input
                  type="number"
                  placeholder={t("common.stock_entry_id") || "ID поступления"}
                  value={filterStockEntry}
                  onChange={(e) => { setFilterStockEntry(e.target.value); setPaymentsPage(1); }}
                />
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="text-xs text-muted-foreground mb-1">{t("forms.total_payments") || "Всего платежей"}</div>
              <div className="text-xl font-bold text-emerald-600">{totalPaymentsCount}</div>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="text-xs text-muted-foreground mb-1">{t("common.total") || "Итого"} (UZS)</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(totalPaidUzs)}</div>
            </Card>
            <Card className="p-4 border-l-4 border-l-violet-500">
              <div className="text-xs text-muted-foreground mb-1">{t("common.total") || "Итого"} (USD)</div>
              <div className="text-xl font-bold text-violet-600">{formatNumber(totalPaidUsd)}</div>
            </Card>
          </div>

          {/* Payments Table */}
          {isLoadingPayments ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : supplierPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CreditCard className="w-14 h-14 mb-4 opacity-30" />
              <p className="text-lg font-medium">{t("forms.no_payments") || "Платежей не найдено"}</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{t("forms.payment_date") || "Дата"}</span>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{t("common.stock_entry_id") || "Поступление"}</span>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        {t("forms.store") || "Магазин"}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center justify-end gap-1"><DollarSign className="w-3.5 h-3.5" />{t("forms.amount") || "Сумма"}</span>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        {t("forms.amount") || "Сумма"} (UZS)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        {t("forms.amount") || "Сумма"} (USD)
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />{t("forms.payment_method") || "Тип"}</span>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        {t("common.exchange_rate") || "Курс"}
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{t("common.comment") || "Комментарий"}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPayments.map((payment, idx) => (
                      <tr
                        key={payment.id}
                        className={`border-b transition-colors hover:bg-muted/30 ${
                          idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium">
                            {new Date(payment.payment_date).toLocaleDateString('ru-RU', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleTimeString('ru-RU', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            #{payment.stock_entry?.id}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {payment.stock_entry?.store_name || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(payment.amount)} {payment.currency_short_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-medium text-blue-600">
                            {formatCurrency(payment.amount_in_uzs)} UZS
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-medium text-violet-600">
                            {formatNumber(payment.amount_in_usd)} $
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {paymentTypeLabel(payment.payment_type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">
                          {payment.rate_at_payment ? formatCurrency(payment.rate_at_payment) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-[200px] truncate text-sm text-muted-foreground" title={payment.comment || ''}>
                            {payment.comment || '—'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 border-t-2">
                      <td colSpan={3} className="py-3 px-4 font-semibold text-right">
                        {t("common.total") || "Итого"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">—</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">
                        {formatCurrency(totalPaidUzs)} UZS
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-violet-600">
                        {formatNumber(totalPaidUsd)} $
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {totalPaymentPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <span className="text-sm text-muted-foreground">
                    {t("common.page") || "Стр."} {paymentsPage} / {totalPaymentPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paymentsPage <= 1}
                      onClick={() => setPaymentsPage(p => p - 1)}
                    >
                      {t("common.previous") || "Назад"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paymentsPage >= totalPaymentPages}
                      onClick={() => setPaymentsPage(p => p + 1)}
                    >
                      {t("common.next") || "Далее"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Dialog is being closed (clicked outside or ESC pressed)
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

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Возврат товара поставщику</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Entry Info */}
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

            {/* Stock Items Table */}
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

            {/* Note */}
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

            {/* Actions */}
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

    </div>
  );
}

// Separate component for stock details to use hooks properly
function StockDetailsAccordion({ stockEntryId }: { stockEntryId: number }) {
  const { t } = useTranslation();
  const { data: stocksData, isLoading } = useGetStocks({
    params: { stock_entry: stockEntryId },
  });

  const stocks = stocksData?.results || [];

  const formatNumber = (value: string | number) => {
    return Number(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        {t('common.no_stock_items')}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">{t('common.product_name')}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">{t('common.quantity')}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">{t('common.currency')}</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">{t('common.total_price')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stocks.map((stock:any, index) => (
              <tr key={stock.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                  {index + 1}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                  {stock.product?.product_name || 'N/A'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(stock.quantity_for_history || 0)} {stock.product?.base_unit_name || ''}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                  {stock.currency?.short_name || 'UZS'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-emerald-600">
                  {formatNumber(
                    stock.currency?.short_name === 'UZS'
                      ? (stock.total_price_in_uz || 0)
                      : (stock.total_price_in_currency || 0)
                  )} {stock.currency?.short_name || 'UZS'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
