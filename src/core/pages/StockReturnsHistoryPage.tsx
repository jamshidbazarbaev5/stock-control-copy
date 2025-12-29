import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StockReturnsHistoryPage() {
  const { supplierId, stockEntryId } = useParams<{ supplierId: string; stockEntryId: string }>();
  const navigate = useNavigate();

  // Fetch returns history
  const { data: returnsHistory, isLoading } = useQuery({
    queryKey: ['stock-returns', stockEntryId],
    queryFn: async () => {
      const response = await api.get(`/items/stock-returns/?stock_entry_id=${stockEntryId}`);
      return response.data || [];
    },
    enabled: !!stockEntryId,
  });

  // Fetch stock entry details
  const { data: stockEntry } = useQuery({
    queryKey: ['stock-entry', stockEntryId],
    queryFn: async () => {
      const response = await api.get(`/items/stock-entries/${stockEntryId}/`);
      return response.data;
    },
    enabled: !!stockEntryId,
  });

  const formatCurrency = (amount: string | number | undefined) => {
    return new Intl.NumberFormat('ru-RU').format(Number(amount || 0));
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
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
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/suppliers/${supplierId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">История возвратов</h1>
          {stockEntry && (
            <p className="text-sm text-muted-foreground">
              {stockEntry.supplier?.name} - {formatDate(stockEntry.date_of_arrived)}
            </p>
          )}
        </div>
      </div>

      {/* Stock Entry Info Card */}
      {stockEntry && (
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Поставщик</div>
              <div className="font-medium">{stockEntry.supplier?.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Магазин</div>
              <div className="font-medium">{stockEntry.store?.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Общая сумма (UZS)</div>
              <div className="font-medium text-emerald-600">{formatCurrency(stockEntry.total_amount_uzs)} UZS</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Общая сумма (USD)</div>
              <div className="font-medium text-emerald-600">{formatCurrency(stockEntry.total_amount_usd)} USD</div>
            </div>
          </div>
        </Card>
      )}

      {/* Returns List */}
      {!returnsHistory || returnsHistory.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Возвраты не найдены</p>
            <p className="text-sm">Для этой поставки еще не было возвратов</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {returnsHistory.map((returnItem: any) => (
            <Card key={returnItem.id} className="p-4 sm:p-6">
              {/* Return Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div className="space-y-1">
                  <div className="text-lg font-semibold">Возврат #{returnItem.id}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(returnItem.created_at)}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-lg font-semibold text-orange-600">
                    {formatCurrency(returnItem.total_return_uzs)} UZS
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(returnItem.total_return_usd)} USD
                  </div>
                </div>
              </div>

              {/* Return Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-3 bg-muted rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Поставщик:</span>{' '}
                  <span className="font-medium">{returnItem.supplier_name}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Магазин:</span>{' '}
                  <span className="font-medium">{returnItem.store_name}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Создал:</span>{' '}
                  <span className="font-medium">{returnItem.created_by_name}</span>
                </div>
                {returnItem.note && (
                  <div className="col-span-full">
                    <span className="text-sm text-muted-foreground">Комментарий:</span>{' '}
                    <span>{returnItem.note}</span>
                  </div>
                )}
              </div>

              {/* Return Items Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-100 ">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Товар</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 ">Кол-во</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 ">Сумма (UZS)</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Сумма (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {returnItem.items?.map((item: any, index: number) => (
                      <tr key={item.id} className="">
                        <td className="px-3 py-3 text-sm text-gray-600">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 ">
                          {item.stock_product_name}
                        </td>
                        <td className="px-3 py-3 text-sm text-right text-gray-600 ">
                          {item.quantity_returned}
                        </td>
                        <td className="px-3 py-3 text-sm text-right font-medium text-orange-600">
                          {formatCurrency(item.return_amount_uzs)}
                        </td>
                        <td className="px-3 py-3 text-sm text-right font-medium text-orange-600">
                          {formatCurrency(item.return_amount_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
