import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetStockHistory } from '../api/stock';
import { formatDate } from '../helpers/formatDate';

export default function StockPriceHistoryPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch stock history data from new endpoint
  const { data: stockHistory, isLoading } = useGetStockHistory(id ? parseInt(id) : 0);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  if (!stockHistory) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{t('common.no_history')}</div>
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('ru-RU').format(Number(amount));
  };


  return (
    <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('stock.price_history') || 'Stock History'}</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {stockHistory.product.product_name} {stockHistory.stock_name ? `(${stockHistory.stock_name})` : ''}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            {formatDate(stockHistory.stock_entry.date_of_arrived)}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/stocks')} size="sm">
          {t('common.back')}
        </Button>
      </div>

      {/* Product & Store Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium opacity-75 mb-2">{t('table.product')}</h3>
            <p className="text-lg sm:text-2xl font-bold">{stockHistory.product.product_name}</p>
            <div className="mt-3">
              <p className="text-xs opacity-75">{t('table.store')}</p>
              <p className="text-sm sm:text-lg font-medium">{stockHistory.store.name}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium opacity-75 mb-2">{t('table.supplier')}</h3>
            <p className="text-lg sm:text-2xl font-bold">{stockHistory.stock_entry?.supplier?.name}</p>
            <div className="mt-3">
              <p className="text-xs opacity-75">Статус долга</p>
              <p className="text-sm sm:text-lg font-medium">
                {stockHistory.stock_entry.is_paid ? 'Оплачено' : stockHistory.stock_entry.is_debt ? 'Долг' : 'Нет долга'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium opacity-75 mb-2">Количество</h3>
            <p className="text-lg sm:text-2xl font-bold">{stockHistory.quantity}</p>
            <div className="mt-3">
              <p className="text-xs opacity-75">Единица закупки</p>
              <p className="text-sm sm:text-lg font-medium">
                {stockHistory.purchase_unit_quantity} {stockHistory.purchase_unit.short_name}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Information */}
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Информация о ценах</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Цена за единицу ({stockHistory.currency.short_name})</h3>
              <p className="text-xl sm:text-2xl font-semibold text-blue-600">
                {formatCurrency(stockHistory.price_per_unit_currency)} {stockHistory.currency.short_name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Общая цена ({stockHistory.currency.short_name})</h3>
              <p className="text-xl sm:text-2xl font-semibold text-indigo-600">
                {formatCurrency(stockHistory.total_price_in_currency)} {stockHistory.currency.short_name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Цена за базовую единицу (UZS)</h3>
              <p className="text-xl sm:text-2xl font-semibold text-green-600">
                {formatCurrency(stockHistory.base_unit_in_uzs)} UZS
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Общая цена (UZS)</h3>
              <p className="text-xl sm:text-2xl font-semibold text-emerald-600">
                {formatCurrency(stockHistory.total_price_in_uz)} UZS
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Data Summary */}
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Сводка по складу</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Общее количество</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stockHistory.stock_data.total_quantity}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Переработано</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{stockHistory.stock_data.total_recycled_quantity}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Перемещено</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stockHistory.stock_data.total_transferred_quantity}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Финансовая сводка</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs sm:text-sm font-medium opacity-75 mb-2">Общие затраты</h3>
              <p className="text-xl sm:text-3xl font-bold">
                {formatCurrency(stockHistory.stock_data.total_cost)} UZS
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs sm:text-sm font-medium opacity-75 mb-2">Общие продажи</h3>
              <p className="text-xl sm:text-3xl font-bold">
                {formatCurrency(stockHistory.stock_data.total_sales)} UZS
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-xs sm:text-sm font-medium opacity-75 mb-2">Общая прибыль</h3>
              <p className="text-xl sm:text-3xl font-bold">
                {formatCurrency(stockHistory.stock_data.total_profit)} UZS
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Current Stock Details */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4">Текущий склад</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Количество</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{stockHistory.stock_data.current_stock.quantity}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Продано</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{stockHistory.stock_data.current_stock.sold_quantity}</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Продажи</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(stockHistory.stock_data.current_stock.total_sales)} UZS
              </p>
            </CardContent>
          </Card>

          <Card className="bg-violet-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-violet-600">
                {formatCurrency(stockHistory.stock_data.current_stock.profit)} UZS
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Entry Debt Info */}
      {stockHistory.stock_entry.is_debt && (
        <div className="mt-6">
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>⚠️</span>
                Информация о долге
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Сумма долга:</p>
                  <p className="text-xl font-bold text-amber-700">
                    {formatCurrency(stockHistory.stock_entry.amount_of_debt)} UZS
                  </p>
                </div>
                {stockHistory.stock_entry.total_paid && (
                  <div>
                    <p className="text-gray-600">Оплачено:</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(stockHistory.stock_entry.total_paid)} UZS
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Остаток долга:</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(stockHistory.stock_entry.remaining_debt)} UZS
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
