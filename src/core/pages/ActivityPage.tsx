import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResourceTable } from '../helpers/ResourseTable';
import {
  useGetActivity,
  type ActivityTab,
  type ActivitySale,
  type ActivityExpense,
  type ActivityDebtPayment,
  type TotalWithPayments,
} from '../api/activity';
import { useGetStores } from '../api/store';
import { useGetClients } from '../api/client';
import { useGetExpenseNames } from '../api/expense-name';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { shiftsApi } from '../api/shift';
import {
  SmartphoneNfc,
  Printer,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Wallet,
  DollarSign,
  Landmark,
  TrendingDown,
} from 'lucide-react';
import {
  saleReceiptService,
  type SaleData,
} from '@/services/saleReceiptService';

const formatCurrency = (amount: string | number | undefined) => {
  return new Intl.NumberFormat('ru-RU').format(Number(amount));
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '-';
  }
};

const PaymentIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'Наличные':
      return <Wallet className="h-4 w-4 text-green-600" />;
    case 'Карта':
      return <CreditCard className="h-4 w-4 text-blue-600" />;
    case 'Click':
      return <SmartphoneNfc className="h-4 w-4 text-purple-600" />;
    case 'Перечисление':
      return <Landmark className="h-4 w-4 text-orange-500" />;
    case 'Валюта':
      return <DollarSign className="h-4 w-4 text-yellow-600" />;
    default:
      return null;
  }
};

interface SummaryCardProps {
  title: string;
  totals: TotalWithPayments | undefined;
  debtTotal?: number;
  variant?: 'sales' | 'expenses' | 'debt' | 'default';
}



const SummaryCard = ({
                       title,
                       totals,
                       debtTotal,
                       variant = 'default',
                     }: SummaryCardProps) => {
  if (!totals) return null;

  // Modern styling configuration
  const themes = {
    sales: {
      wrapper: 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/30 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.2)]',
      gradient: 'from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800',
      iconBox: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
      mainText: 'text-slate-800 dark:text-emerald-50',
      subText: 'text-emerald-600/80 dark:text-emerald-400/80',
      badge: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/30',
      divider: 'border-emerald-100/50 dark:border-emerald-800/30',
      itemRow: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
      MainIcon: Wallet,
    },
    expenses: {
      wrapper: 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900/30 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(244,63,94,0.2)]',
      gradient: 'from-rose-50 to-white dark:from-rose-900/20 dark:to-slate-800',
      iconBox: 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400',
      mainText: 'text-slate-800 dark:text-rose-50',
      subText: 'text-rose-600/80 dark:text-rose-400/80',
      badge: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/30',
      divider: 'border-rose-100/50 dark:border-rose-800/30',
      itemRow: 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10',
      MainIcon: TrendingDown,
    },
    debt: {
      wrapper: 'bg-white dark:bg-slate-800 border-violet-100 dark:border-violet-900/30 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.2)]',
      gradient: 'from-violet-50 to-white dark:from-violet-900/20 dark:to-slate-800',
      iconBox: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400',
      mainText: 'text-slate-800 dark:text-violet-50',
      subText: 'text-violet-600/80 dark:text-violet-400/80',
      badge: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/30',
      divider: 'border-violet-100/50 dark:border-violet-800/30',
      itemRow: 'hover:bg-violet-50/50 dark:hover:bg-violet-900/10',
      MainIcon: Landmark,
    },
    default: {
      wrapper: 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(148,163,184,0.2)]',
      gradient: 'from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      iconBox: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      mainText: 'text-slate-800 dark:text-slate-100',
      subText: 'text-slate-500 dark:text-slate-400',
      badge: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      divider: 'border-slate-100 dark:border-slate-700',
      itemRow: 'hover:bg-slate-50 dark:hover:bg-slate-800',
      MainIcon: DollarSign,
    },
  };

  const theme = themes[variant] || themes.default;
  const Icon = theme.MainIcon;

  return (
      <div
          className={`
        group relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out
        flex flex-col h-full
        ${theme.wrapper}
        hover:-translate-y-1
      `}
      >
        {/* Background Gradient Effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-50`} />

        {/* Content Container */}
        <div className="relative p-5 flex flex-col h-full z-10">

          {/* Header Section */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${theme.iconBox} shadow-sm ring-1 ring-inset ring-black/5`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {title}
                </h3>
                {debtTotal !== undefined && debtTotal > 0 && (
                    <div className={`
                  mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border
                  ${theme.badge}
                `}>
                      Долг: {formatCurrency(debtTotal)}
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Total Section */}
          <div className="mb-6">
            <div className={`text-3xl font-bold tracking-tight ${theme.mainText} tabular-nums`}>
              {formatCurrency(totals.total)}
            </div>
            {totals.total_in_currency > 0 && (
                <div className={`text-sm font-medium mt-1 flex items-center gap-1.5 ${theme.subText}`}>
                  <span className="opacity-70">USD:</span>
                  <span className="tabular-nums">
                ${totals.total_in_currency.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </span>
                </div>
            )}
          </div>

          {/* Divider */}
          <div className={`border-t border-dashed w-full ${theme.divider} mb-4`} />

          {/* Breakdown Section */}
          <div className="flex-grow flex flex-col gap-2">
            {Object.entries(totals.by_payment_type).map(([method, amount]) => (
                <div
                    key={method}
                    className={`
                flex items-center justify-between p-2 rounded-lg transition-colors duration-200
                ${theme.itemRow}
              `}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md ${theme.wrapper} border-0 ring-1 ring-inset ring-slate-900/5 dark:ring-white/10`}>
                      <PaymentIcon method={method} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">
                  {method}
                </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {formatCurrency(amount)}
              </span>
                </div>
            ))}

            {/* Empty State if no breakdown */}
            {Object.keys(totals.by_payment_type).length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Нет данных по методам оплаты
                </div>
            )}
          </div>
        </div>
      </div>
  );
};



export default function ActivityPage() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();

  // Active tab state
  const [activeTab, setActiveTab] = useState<ActivityTab>('sales');

  // Shared filters (apply to all tabs)
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sales-specific filters
  const [salesClient, setSalesClient] = useState<string>('all');
  const [salesWorker, setSalesWorker] = useState<string>('all');
  const [salesProduct, setSalesProduct] = useState<string>('');
  const [salesOnCredit, setSalesOnCredit] = useState<string>('all');
  const [salesShiftId, setSalesShiftId] = useState<string>('all');

  // Expenses-specific filters
  const [expensesPaymentType, setExpensesPaymentType] = useState<string>('all');
  const [expensesExpenseName, setExpensesExpenseName] = useState<string>('all');

  // Debt payments-specific filters
  const [debtPaymentsClient, setDebtPaymentsClient] = useState<string>('all');

  // Pagination states for each tab
  const [salesPage, setSalesPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const [debtPaymentsPage, setDebtPaymentsPage] = useState(1);

  // Fetch dropdown data
  const { data: storesData } = useGetStores({});
  const { data: clientsData } = useGetClients({});
  const { data: expenseNamesData } = useGetExpenseNames({});
  const { data: usersData } = useQuery({
    queryKey: ['users', {}],
    queryFn: async () => {
      const response = await api.get('users/');
      return response.data;
    },
    enabled: currentUser?.role !== 'Продавец',
  });
  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await shiftsApi.getAll();
      return response.data;
    },
    enabled: currentUser?.role !== 'Продавец',
  });

  // Extract data arrays
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const clients = Array.isArray(clientsData) ? clientsData : clientsData?.results || [];
  const expenseNames = Array.isArray(expenseNamesData) ? expenseNamesData : expenseNamesData?.results || [];
  const users = Array.isArray(usersData) ? usersData : usersData?.results || [];
  const shifts = shiftsData?.results || [];

  // Build params based on active tab
  const getCurrentParams = () => {
    const baseParams = {
      tab: activeTab,
      store: selectedStore,
      start_date: startDate,
      end_date: endDate,
    };

    if (activeTab === 'sales') {
      return {
        ...baseParams,
        page: salesPage,
        client: salesClient,
        worker: salesWorker,
        product: salesProduct,
        on_credit: salesOnCredit !== 'all' ? salesOnCredit === 'true' : undefined,
        shift_id: salesShiftId,
      };
    } else if (activeTab === 'expenses') {
      return {
        ...baseParams,
        page: expensesPage,
        payment_type: expensesPaymentType,
        expense_name: expensesExpenseName,
      };
    } else {
      return {
        ...baseParams,
        page: debtPaymentsPage,
        client: debtPaymentsClient,
      };
    }
  };

  // Fetch activity data
  const { data: activityData, isLoading } = useGetActivity(getCurrentParams());

  // Reset page to 1 when filters change
  useEffect(() => {
    if (activeTab === 'sales') {
      setSalesPage(1);
    } else if (activeTab === 'expenses') {
      setExpensesPage(1);
    } else {
      setDebtPaymentsPage(1);
    }
  }, [
    selectedStore,
    startDate,
    endDate,
    salesClient,
    salesWorker,
    salesProduct,
    salesOnCredit,
    salesShiftId,
    expensesPaymentType,
    expensesExpenseName,
    debtPaymentsClient,
  ]);


  // Sales columns
  const salesColumns = [
    {
      header: 'ID продажи',
      accessorKey: 'sale_id',
      cell: (row: ActivitySale) => row.sale_id || '-',
    },
    {
      header: t('table.store'),
      accessorKey: 'store_read',
      cell: (row: ActivitySale) => row.store_read?.name || '-',
    },
    {
      header: 'Работник',
      accessorKey: 'worker_read',
      cell: (row: ActivitySale) => row.worker_read?.name || '-',
    },
    {
      header: t('table.payment_method'),
      accessorKey: 'sale_payments',
      cell: (row: ActivitySale) => (
        <div className="flex flex-col items-center gap-1">
          {row.sale_debt ? (
            <div className="flex items-center gap-1 text-xs justify-center">
              {row.sale_debt.deposit_payment_method === 'Наличные' && (
                <Wallet className="h-4 w-4 text-green-600" />
              )}
              {row.sale_debt.deposit_payment_method === 'Карта' && (
                <CreditCard className="h-4 w-4 text-blue-600" />
              )}
              {row.sale_debt.deposit_payment_method === 'Click' && (
                <SmartphoneNfc className="h-4 w-4 text-purple-600" />
              )}
              {row.sale_debt.deposit_payment_method === 'Перечисление' && (
                <Landmark className="h-4 w-4 text-orange-500" />
              )}
              {row.sale_debt.deposit_payment_method === 'Валюта' && (
                <DollarSign className="h-4 w-4 text-yellow-600" />
              )}
              <span className="whitespace-nowrap">
                Аванс: {formatCurrency(row.sale_debt.deposit || '0')}
              </span>
            </div>
          ) : (
            row?.sale_payments?.map((payment: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-1 text-xs justify-center"
              >
                {payment.payment_method === 'Наличные' && (
                  <Wallet className="h-4 w-4 text-green-600" />
                )}
                {payment.payment_method === 'Карта' && (
                  <CreditCard className="h-4 w-4 text-blue-600" />
                )}
                {payment.payment_method === 'Click' && (
                  <SmartphoneNfc className="h-4 w-4 text-purple-600" />
                )}
                {payment.payment_method === 'Перечисление' && (
                  <Landmark className="h-4 w-4 text-orange-500" />
                )}
                {payment.payment_method === 'Валюта' && (
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                )}
                <span>{payment.payment_method}</span>
                <span className="font-medium">{formatCurrency(payment.amount)}</span>
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      header: 'Общая сумма',
      accessorKey: 'total_amount',
      cell: (row: ActivitySale) => formatCurrency(row.total_amount),
    },
    {
      header: 'Скидка',
      accessorKey: 'discount_amount',
      cell: (row: ActivitySale) => formatCurrency(row.discount_amount) ,
    },
    {
      header: 'Чистая прибыль',
      accessorKey: 'total_pure_revenue',
      cell: (row: ActivitySale) => formatCurrency(row.total_pure_revenue),
    },
    {
      header: 'Статус',
      accessorKey: 'on_credit',
      cell: (row: ActivitySale) => (
        <div className="flex flex-col gap-1">
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              row.on_credit
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {row.on_credit ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {row.on_credit ? 'В долг' : 'Оплачено'}
          </div>
        </div>
      ),
    },
    {
      header: 'Дата продажи',
      accessorKey: 'sold_date',
      cell: (row: ActivitySale) => formatDate(row.sold_date),
    },
    {
      header: t('common.actions'),
      accessorKey: 'actions',
      cell: (row: ActivitySale) => (
        <div className="flex items-center gap-2">
          {currentUser?.is_mobile_user === false && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePrintReceipt(row);
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              {t('common.print')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Expenses columns
  const expensesColumns = [
    {
      header: t('forms.store'),
      accessorKey: 'store_read.name',
      cell: (row: ActivityExpense) => row.store_read?.name || '-',
    },
    {
      header: t('forms.expense_name'),
      accessorKey: 'expense_name_read.name',
      cell: (row: ActivityExpense) => row.expense_name_read?.name || '-',
    },
    {
      header: t('forms.amount3'),
      accessorKey: 'amount',
      cell: (row: ActivityExpense) => (
        <div className="text-center font-medium">
          {formatCurrency(row.amount)} {row.payment_type === 'Валюта' ? '$' : ''}
        </div>
      ),
    },
    {
      header: 'Способ оплаты',
      accessorKey: 'payment_type',
      cell: (row: ActivityExpense) => row.payment_type || '-',
    },
    {
      header: t('forms.date'),
      accessorKey: 'date',
      cell: (row: ActivityExpense) => formatDate(row.date),
    },
    {
      header: t('forms.comment'),
      accessorKey: 'comment',
      cell: (row: ActivityExpense) => row.comment || '-',
    },
  ];

  // Debt payments columns
  const debtPaymentsColumns = [
    {
      header: 'Клиент',
      accessorKey: 'client_name',
      cell: (row: ActivityDebtPayment) => row.client_name || '-',
    },
    {
      header: 'Магазин',
      accessorKey: 'store_name',
      cell: (row: ActivityDebtPayment) => row.store_name || '-',
    },
    {
      header: 'Работник',
      accessorKey: 'worker_name',
      cell: (row: ActivityDebtPayment) => row.worker_name || '-',
    },
    {
      header: 'Сумма',
      accessorKey: 'amount',
      cell: (row: ActivityDebtPayment) => formatCurrency(row.amount),
    },
    {
      header: 'Способ оплаты',
      accessorKey: 'payment_method',
      cell: (row: ActivityDebtPayment) => row.payment_method || '-',
    },
    {
      header: 'Курс USD',
      accessorKey: 'usd_rate_at_payment',
      cell: (row: ActivityDebtPayment) => formatCurrency(row.usd_rate_at_payment),
    },
    {
      header: 'Дата оплаты',
      accessorKey: 'paid_at',
      cell: (row: ActivityDebtPayment) => formatDate(row.paid_at),
    },
  ];

  const handleClearFilters = () => {
    setSelectedStore('all');
    setStartDate('');
    setEndDate('');
    setSalesClient('all');
    setSalesWorker('all');
    setSalesProduct('');
    setSalesOnCredit('all');
    setSalesShiftId('all');
    setExpensesPaymentType('all');
    setExpensesExpenseName('all');
    setDebtPaymentsClient('all');
    setSalesPage(1);
    setExpensesPage(1);
    setDebtPaymentsPage(1);
  };

  const handlePrintReceipt = async (sale: ActivitySale) => {
    try {
      console.log('🖨️ Printing sale receipt manually...');
      const printResult = await saleReceiptService.printWithFallback(
        sale as unknown as SaleData,
      );
      saleReceiptService.showPrintNotification(printResult);
      console.log('🖨️ Receipt print result:', printResult);
    } catch (printError) {
      console.error('❌ Receipt printing failed:', printError);
      saleReceiptService.showPrintNotification({
        success: false,
        method: 'failed',
        message: 'Не удалось напечатать чек',
        error:
          printError instanceof Error ? printError.message : 'Unknown error',
      });
    }
  };


  const renderExpandedSaleRow = (row: ActivitySale) => {
    const hasItems = row.sale_items?.length > 0;
    const hasRefunds = (row.sale_refunds?.length ?? 0) > 0;

    if (!hasItems && !hasRefunds) {
      return (
        <div className="p-4 text-center text-gray-500">
          {t('messages.no_items_found')}
        </div>
      );
    }

    return (
      <div className="p-2 space-y-3">
        {/* Comment Section */}
        {row.comment && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
              💬 Комментарий
            </h3>
            <div className="dark:bg-expanded-row-dark bg-blue-50 p-3 rounded border-l-4 border-blue-400">
              <p className="text-sm text-gray-700">{row.comment}</p>
            </div>
          </div>
        )}

        {/* Worker Information Section */}
        {row.worker_read && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
              👤 Продавец
            </h3>
            <div className="space-y-1">
              <div className="dark:bg-expanded-row-dark bg-gray-50 p-2 rounded border-l-4 border-purple-400">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium">Имя:</span>
                    <p className="font-medium text-gray-700 text-sm break-words">
                      {row.worker_read.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Телефон:</span>
                    <p className="font-medium text-gray-700 text-sm break-words">
                      {row.worker_read.phone_number}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Роль:</span>
                    <p className="font-medium text-gray-700 text-sm break-words">
                      {row.worker_read.role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sale Items Section */}
        {hasItems && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
              {t('common.sale_items')}
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {row.sale_items.length}
              </span>
            </h3>
            <div className="space-y-1">
              {row.sale_items.map((item, index) => (
                <div
                  key={index}
                  className="dark:bg-expanded-row-dark bg-gray-50 p-2 rounded border-l-4 border-blue-400"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
                    <div className="sm:col-span-1">
                      <span className="text-gray-500 font-medium text-xs">
                        #{item.id}
                      </span>
                    </div>
                    <div className="sm:col-span-1 md:col-span-2">
                      <span className="font-medium text-gray-800 text-xs sm:text-sm break-words">
                        {item.stock_name
                          ? `${item.product_read?.product_name} (${item.stock_name})`
                          : item.product_read?.product_name || '-'}
                      </span>
                    </div>
                    <div className="sm:col-span-1">
                      <span className="font-medium text-gray-700 text-xs">
                        {parseFloat(item.quantity).toString()}
                      </span>
                    </div>
                    <div className="sm:col-span-1">
                      <span className="font-semibold text-emerald-600 text-xs sm:text-sm">
                        {formatCurrency(item?.price_per_unit)}
                      </span>
                    </div>
                  </div>
                  {row.sale_debt && (
                    <div className="mt-1 pt-1 border-t border-gray-200">
                      <div className="flex gap-3 text-xs">
                        <span
                          className="hover:underline cursor-pointer text-blue-600"
                          onClick={() => {
                            if (row.client) {
                              navigate(`/debts/${row.client}`);
                            }
                          }}
                        >
                          Клиент в долге
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sale Refunds Section */}
        {hasRefunds && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
              <span className="text-red-600">🔄 Возвраты</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {row.sale_refunds?.length ?? 0}
              </span>
            </h3>
          </div>
        )}
      </div>
    );
  };

  const getCurrentPage = () => {
    if (activeTab === 'sales') return salesPage;
    if (activeTab === 'expenses') return expensesPage;
    return debtPaymentsPage;
  };

  const setCurrentPage = (page: number) => {
    if (activeTab === 'sales') setSalesPage(page);
    else if (activeTab === 'expenses') setExpensesPage(page);
    else setDebtPaymentsPage(page);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Отчёт</h1>
        <Button onClick={handleClearFilters} variant="outline">
          Очистить все фильтры
        </Button>
      </div>

      {/* Shared Filters */}
      <Card className="p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3">Общие фильтры</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentUser?.is_superuser && (
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.select_store')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all_stores')}</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={String(store.id)}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Дата начала"
          />

          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="Дата окончания"
          />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActivityTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Продажи</TabsTrigger>
          <TabsTrigger value="expenses">Расходы</TabsTrigger>
          <TabsTrigger value="debt_payments">Оплаты долгов</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales">
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3">Фильтры продаж</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={salesClient} onValueChange={setSalesClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все клиенты</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentUser?.role !== 'Продавец' && (
                <Select value={salesWorker} onValueChange={setSalesWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите работника" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все работники</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input
                type="text"
                value={salesProduct}
                onChange={(e) => setSalesProduct(e.target.value)}
                placeholder="Название товара"
              />

              <Select value={salesOnCredit} onValueChange={setSalesOnCredit}>
                <SelectTrigger>
                  <SelectValue placeholder="Статус оплаты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="true">В долг</SelectItem>
                  <SelectItem value="false">Оплачено</SelectItem>
                </SelectContent>
              </Select>

              {currentUser?.role !== 'Продавец' && (
                <Select value={salesShiftId} onValueChange={setSalesShiftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите смену" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все смены</SelectItem>
                    {shifts.map((shift: any) => (
                      <SelectItem key={shift.id} value={String(shift.id)}>
                        Смена #{shift.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>

          <ResourceTable
            columns={salesColumns}
            data={(activityData?.results || []) as ActivitySale[]}
            isLoading={isLoading}
            currentPage={getCurrentPage()}
            onPageChange={setCurrentPage}
            totalCount={activityData?.total_pages ? activityData.total_pages * (activityData.page_size || 30) : 0}
            pageSize={activityData?.page_size || 30}
            expandedRowRenderer={(row: ActivitySale) => renderExpandedSaleRow(row)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard
              title="На странице"
              totals={activityData?.page_totals}
              debtTotal={activityData?.page_totals?.debt_total}
              variant="sales"
            />
            <SummaryCard
              title="Продажи (Общее)"
              totals={activityData?.overall_totals?.sales_total}
              debtTotal={activityData?.overall_totals?.debt_total}
              variant="sales"
            />
            <SummaryCard
              title="Расходы (Общее)"
              totals={activityData?.overall_totals?.expenses_total}
              variant="expenses"
            />
            <SummaryCard
              title="Оплаты долгов (Общее)"
              totals={activityData?.overall_totals?.debt_payments_total}
              variant="debt"
            />  
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3">Фильтры расходов</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={expensesPaymentType}
                onValueChange={setExpensesPaymentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.select_payment_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all_payment_types')}</SelectItem>
                  <SelectItem value="Наличные">{t('payment_types.cash')}</SelectItem>
                  <SelectItem value="Карта">{t('payment_types.card')}</SelectItem>
                  <SelectItem value="Валюта">{t('forms.rate')}</SelectItem>
                  <SelectItem value="Click">{t('payment_types.click')}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={expensesExpenseName}
                onValueChange={setExpensesExpenseName}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.select_expense_name')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all_expense_names')}</SelectItem>
                  {expenseNames.map((expenseName) => (
                    <SelectItem key={expenseName.id} value={String(expenseName.id)}>
                      {expenseName.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <ResourceTable
            columns={expensesColumns}
            data={(activityData?.results || []) as ActivityExpense[]}
            isLoading={isLoading}
            currentPage={getCurrentPage()}
            onPageChange={setCurrentPage}
            totalCount={activityData?.total_pages ? activityData.total_pages * (activityData.page_size || 30) : 0}
            pageSize={activityData?.page_size || 30}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard
              title="На странице"
              totals={activityData?.page_totals}
              variant="expenses"
            />
            <SummaryCard
              title="Общий итог за все время"
              totals={activityData?.overall_totals?.expenses_total}
              variant="expenses"
            />
          </div>
        </TabsContent>

        {/* Debt Payments Tab */}
        <TabsContent value="debt_payments">
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3">Фильтры оплат долгов</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={debtPaymentsClient} onValueChange={setDebtPaymentsClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все клиенты</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <ResourceTable
            columns={debtPaymentsColumns}
            data={(activityData?.results || []) as ActivityDebtPayment[]}
            isLoading={isLoading}
            currentPage={getCurrentPage()}
            onPageChange={setCurrentPage}
            totalCount={activityData?.total_pages ? activityData.total_pages * (activityData.page_size || 30) : 0}
            pageSize={activityData?.page_size || 30}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard
              title="На странице"
              totals={activityData?.page_totals}
              variant="debt"
            />
            <SummaryCard
              title="Общий итог за все время"
              totals={activityData?.overall_totals?.debt_payments_total}
              variant="debt"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Remaining Totals Block */}
      {activityData?.overall_totals?.remaining && (
        <Card className="mt-6 p-4 border-2 border-blue-300 bg-white dark:bg-gray-900 dark:border-blue-700">
          <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">
            Остаток
          </h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-left">
              <div className="text-sm text-gray-500 dark:text-gray-400">Общий остаток</div>
              <div className={`text-2xl font-bold ${activityData.overall_totals.remaining.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(activityData.overall_totals.remaining.total)}
              </div>
              {activityData.overall_totals.remaining.total_in_currency !== 0 && (
                <div className={`text-sm font-semibold ${activityData.overall_totals.remaining.total_in_currency >= 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                  $ {activityData.overall_totals.remaining.total_in_currency.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(activityData.overall_totals.remaining.by_payment_type).map(([method, amount]) => (
                <div
                  key={method}
                  className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                    <PaymentIcon method={method} />
                    {method}
                  </div>
                  <span className={`font-semibold text-sm ${amount >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600'}`}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
  