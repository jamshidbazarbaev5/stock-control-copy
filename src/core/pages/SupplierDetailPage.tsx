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
import { DollarSign, History, Edit, Package, CheckCircle2, AlertCircle, MoreVertical, RotateCcw, ClipboardList } from 'lucide-react';
import '../../expanded-row-dark.css';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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

  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnEntry, setReturnEntry] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<{ stock_id: number; quantity: string; product_name: string; max_quantity: number }[]>([]);
  const [returnNote, setReturnNote] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  

  // Fetch stock entries for this supplier
  const { data: stockEntriesData, isLoading: isLoadingEntries } = useGetStockEntries({
    params: { supplier: id, page: currentPage },
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

  if (isLoadingEntries) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 md:py-8 px-2 sm:px-4">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">
          {stockEntries[0]?.supplier.name || t('navigation.suppliers')} - {t('common.stock_entries')}
        </h1>
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
                onChange={(e) => setExchangeRate(e.target.value)}
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
            {stocks.map((stock, index) => (
              <tr key={stock.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                  {index + 1}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                  {stock.product?.product_name || 'N/A'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(stock.quantity_for_history || 0)} {stock.purchase_unit?.short_name || ''}
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
