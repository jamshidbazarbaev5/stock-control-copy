import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetStockEntries, useGetStocks, usePayStockDebt } from '../api/stock';
import { useGetStores } from '../api/store';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, DollarSign, History, Edit, MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Наличные');
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [paymentComment, setPaymentComment] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  
  // Fetch supplier details
  const { data: supplierData } = useQuery<any>({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/${id}/`);
      return response.data;
    },
  });

  // Fetch stock entries for this supplierp
  const { data: stockEntriesData, isLoading: isLoadingEntries } = useGetStockEntries({
    params: { supplier: id },
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

  const handlePaymentClick = (entry: any) => {
    setSelectedEntry(entry);
    setPaymentAmount('');
    setPaymentType('Наличные');
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

    if (amount > Number(selectedEntry.remaining_debt)) {
      toast.error(t('validation.amount_exceeds_remainder'));
      return;
    }

    payStockDebt.mutate(
      {
        stock_entry: selectedEntry.id,
        amount,
        payment_type: paymentType,
        comment: paymentComment,
        ...(paymentType === "Валюта" && exchangeRate && {
          rate_at_payment: Number(exchangeRate),
        }),
      },
      {
        onSuccess: () => {
          toast.success(t('common.payment_successful'));
          setPaymentDialogOpen(false);
          setSelectedEntry(null);
          setPaymentAmount('');
          setPaymentComment('');
          setExchangeRate('');
        },
       
      }
    );
  };

  // Fetch stock details for an expanded entry

  const toggleEntry = (entryId: number) => {
    if (expandedEntry === entryId) {
      setExpandedEntry(null);
    } else {
      setExpandedEntry(entryId);
    }
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

  const getCurrencySymbol = () => {
    return supplierData?.balance_type === 'USD' ? '$' : t('common.uzs');
  };

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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {stockEntries[0]?.supplier.name || t('navigation.suppliers')} - {t('common.stock_entries')}
        </h1>
      </div>

      {stockEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('common.no_data')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stockEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="cursor-pointer" onClick={() => toggleEntry(entry.id)}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {t('common.date')}: {formatDate(entry.date_of_arrived)}
                    </CardTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('table.store')}:</span>{' '}
                        <span className="font-medium">{entry.store.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common.total_amount')}:</span>{' '}
                        <span className="font-medium">{formatNumber(entry.total_amount)} {getCurrencySymbol()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common.stock_count')}:</span>{' '}
                        <span className="font-medium">{entry.stock_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common.debt_status')}:</span>{' '}
                        <span
                          className={`font-medium ${
                            !entry.is_debt
                              ? 'text-green-500'
                              : entry.is_paid
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {!entry.is_debt
                            ? t('common.paid3') // Not for debt
                            : entry.is_paid
                            ? t('common.paid') // Debt paid
                            : t('common.unpaid')}
                        </span>
                      </div>
                      {entry.rate_at_purchase && (
                        <div>
                          <span className="text-muted-foreground">{t('common.exchange_rate')}:</span>{' '}
                          <span className="font-medium text-blue-600">{formatNumber(entry.rate_at_purchase)}</span>
                        </div>
                      )}
                    </div>
                    {entry.is_debt && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                        {entry.amount_of_debt && Number(entry.amount_of_debt) > 0 && (
                          <div>
                            <span className="text-muted-foreground">{t('common.amount_of_debt')}:</span>{' '}
                            <span className="font-medium text-red-500">{Number(entry.amount_of_debt).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getCurrencySymbol()}</span>
                          </div>
                        )}
                        {entry.advance_of_debt && (
                          <div>
                            <span className="text-muted-foreground">{t('common.advance_payment')}:</span>{' '}
                            <span className="font-medium text-green-500">{formatNumber(entry.advance_of_debt)} {getCurrencySymbol()}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">{t('dashboard.total_paid')}:</span>{' '}
                          <span className="font-medium text-blue-500">{formatNumber(entry.total_paid)} {getCurrencySymbol()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('dashboard.remaining_debt')}:</span>{' '}
                          <span className="font-medium text-orange-500">{formatNumber(entry.remaining_debt)} {getCurrencySymbol()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative" style={{ position: 'static' }}>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                          setOpenDropdown(openDropdown === entry.id ? null : entry.id);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openDropdown === entry.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdown(null)}
                          />
                          <div className="fixed w-48 bg-white rounded-md shadow-lg z-20 border" style={{ top: dropdownPosition?.top, right: dropdownPosition?.right }}>
                            <Link
                              to={`/suppliers/${id}/stock-entries/${entry.id}/edit`}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(null);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('common.edit')}
                            </Link>
                            {entry.is_debt && (
                              <>
                                <Link
                                  to={`/suppliers/${id}/stock-entries/${entry.id}/payments`}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <History className="h-4 w-4 mr-2" />
                                  {t('common.payment_history')}
                                </Link>
                                {Number(entry.remaining_debt) > 0 && (
                                  <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      handlePaymentClick(entry);
                                    }}
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    {t('common.pay_debt')}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                      {expandedEntry === entry.id ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedEntry === entry.id && (
                <CardContent>
                  <StockDetailsAccordion stockEntryId={entry.id} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.pay_debt')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedEntry && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('common.total_amount')}:</span>
                  <span className="font-medium">{formatNumber(selectedEntry.total_amount)} {getCurrencySymbol()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('dashboard.total_paid')}:</span>
                  <span className="font-medium text-blue-500">{formatNumber(selectedEntry.total_paid)} {getCurrencySymbol()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('dashboard.remaining_debt')}:</span>
                  <span className="font-medium text-orange-500">{formatNumber(selectedEntry.remaining_debt)} {getCurrencySymbol()}</span>
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

            {paymentType === "Валюта" && (
              <div className="space-y-2">
                <Label htmlFor="exchange-rate">{t('common.exchange_rate') || 'Exchange Rate'} *</Label>
                <Input
                  id="exchange-rate"
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder={t('placeholders.enter_exchange_rate') || 'Enter exchange rate'}
                />
              </div>
            )}

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
                max={selectedEntry?.remaining_debt}
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
                onClick={() => setPaymentDialogOpen(false)}
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{t('common.stock_items')}</h3>
        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {stocks.length} {stocks.length === 1 ? t('common.item') : t('common.items')}
        </span>
      </div>
      
      <div className="grid gap-3">
        {stocks.map((stock, index) => (
          <Card key={stock.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Product Name Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {t('common.product')} #{index + 1}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-gray-900 break-words">
                      {stock.product?.product_name || 'N/A'}
                    </h4>
                  </div>
                </div>

                {/* Main Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Quantity */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium mb-1">{t('common.quantity')}</p>
                    <p className="font-bold text-sm text-gray-900">
                      {formatNumber(stock.quantity || 0)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {stock.purchase_unit?.short_name || ''}
                    </p>
                  </div>

                  {/* Currency */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium mb-1">{t('common.currency')}</p>
                    <p className="font-bold text-sm text-gray-900">
                      {stock.currency?.short_name || 'UZS'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {stock.currency?.name || ''}
                    </p>
                  </div>

                  {/* Total Price */}
                  <div className="bg-blue-50 p-3 rounded-lg md:col-span-1 col-span-2">
                    <p className="text-xs text-blue-600 font-medium mb-1">{t('common.total_price')} (UZS)</p>
                    <p className="font-bold text-lg text-blue-700">
                      {formatNumber(stock.total_price_in_uz || 0)}
                    </p>
                  </div>
                </div>

                {/* Exchange Rate at Purchase */}
                {stock.rate_at_purchase && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-green-600 font-medium">
                        {t('common.exchange_rate') || 'Exchange Rate at Purchase'}
                      </p>
                      <p className="font-bold text-green-700">
                        {formatNumber(stock.rate_at_purchase)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Additional Details - More Prices */}
                {/* <div className="border-t pt-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {stock.price_per_unit_currency && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">{t('common.price_per_unit')}</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {formatNumber(stock.price_per_unit_currency)}
                        </p>
                      </div>
                    )}
                    {stock.price_per_unit_uz && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">{t('common.price_per_unit')} (UZS)</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {formatNumber(stock.price_per_unit_uz)}
                        </p>
                      </div>
                    )}
                    {stock.base_unit_in_uzs && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">{t('common.base_unit')} (UZS)</p>
                        <p className="font-semibold text-gray-900 text-sm">
                          {formatNumber(stock.base_unit_in_uzs)}
                        </p>
                      </div>
                    )}
                  </div>
                </div> */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
