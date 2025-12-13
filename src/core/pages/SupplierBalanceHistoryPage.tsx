import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet, DollarSign, Calendar, CreditCard, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Budget {
  id: number;
  budget_type: string;
  amount: string;
}

interface StoreRead {
  id: number;
  budgets: Budget[];
  name: string;
  address: string;
  phone_number: string;
  budget: string;
  created_at: string;
  is_main: boolean;
  color: string;
  parent_store: number | null;
}

interface BalanceHistoryItem {
  id: number;
  supplier: number;
  amount: string;
  payment_method: string;
  exchange_rate: string;
  created_at: string;
  store: number;
  store_read: StoreRead;
}

interface BalanceHistoryResponse {
  links: {
    first: string | null;
    last: string | null;
    next: string | null;
    previous: string | null;
  };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: BalanceHistoryItem[];
  count: number;
}

interface Supplier {
  id: number;
  name: string;
  phone_number: string;
  total_debt: string;
  total_paid: string;
  remaining_debt: string;
  balance: string;
  balance_in_usd: string;
  debt_grows_with_currency: boolean;
  balance_type: string;
}

export default function SupplierBalanceHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: supplierData } = useQuery<Supplier>({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const response = await api.get(`/suppliers/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data, isLoading } = useQuery<BalanceHistoryResponse>({
    queryKey: ['supplier-balance-history', id, currentPage],
    queryFn: async () => {
      const response = await api.get(`/suppliers/balance?supplier=${id}&page=${currentPage}`);
      return response.data;
    },
    enabled: !!id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
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

  if (isLoading) {
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
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/suppliers/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {t('supplier.balance_history')}
          </h1>
        </div>
      </div>

      {!data || data.results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {data.results.map((item, index) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/50 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">
                        {formatDate(item.created_at)}
                      </CardTitle>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      #{data.count - (data.current_page - 1) * data.page_size - index}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block mb-1">
                          {t('common.amount')}
                        </span>
                        <p className="font-bold text-xl text-green-600">
                          {formatNumber(item.amount)} {item.payment_method === 'Валюта' ? '$' : t('common.uzs')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block mb-1">
                          {t('common.payment_method')}
                        </span>
                        <p className="font-semibold text-lg">{item.payment_method}</p>
                      </div>
                    </div>
                    {item.exchange_rate && Number(item.exchange_rate) > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground block mb-1">
                            {t('common.exchange_rate')}
                          </span>
                          <p className="font-semibold text-lg">{formatNumber(item.exchange_rate)}</p>
                        </div>
                      </div>
                    )}
                    {supplierData?.balance_type === 'USD' && item.exchange_rate && Number(item.exchange_rate) > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                          <DollarSign className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground block mb-1">
                            БАЛАНС В $
                          </span>
                          <p className="font-bold text-lg text-red-600">
                            ${formatNumber(Number(item.amount) / Number(item.exchange_rate))}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Store className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block mb-1">
                          {t('forms.store')}
                        </span>
                        <p className="font-semibold text-lg">{item.store_read?.name || item.store}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                {t('common.previous')}
              </Button>
              {data.page_range?.map((page: number) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(page)}
                  size="sm"
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= data.total_pages}
              >
                {t('common.next')}
              </Button>
            </div>
          )}

          {/* Summary */}
          <Card className="mt-6 bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t('supplier.summary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-4 rounded-lg shadow-sm">
                  <span className="text-sm text-muted-foreground block mb-2">
                    {t('supplier.total_transactions')}
                  </span>
                  <p className="font-bold text-2xl text-primary">{data.count}</p>
                </div>
                <div className="bg-card p-4 rounded-lg shadow-sm">
                  <span className="text-sm text-muted-foreground block mb-2">
                    {t('supplier.current_page')}
                  </span>
                  <p className="font-bold text-2xl text-primary">{data.current_page}</p>
                </div>
                <div className="bg-card p-4 rounded-lg shadow-sm">
                  <span className="text-sm text-muted-foreground block mb-2">
                    {t('supplier.total_pages')}
                  </span>
                  <p className="font-bold text-2xl text-primary">{data.total_pages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
