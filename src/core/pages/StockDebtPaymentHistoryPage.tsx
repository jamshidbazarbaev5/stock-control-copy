import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetStockEntryPayments } from '../api/stock-debt-payment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  TrendingUp,
  DollarSign,
  Receipt
} from 'lucide-react';
import { ResourceTable } from '../helpers/ResourseTable';

export default function StockDebtPaymentHistoryPage() {
  const { stockEntryId } = useParams<{ stockEntryId: string }>();
  const { t } = useTranslation();
  
  const { data: paymentsData, isLoading, error } = useGetStockEntryPayments(stockEntryId || '');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  const getPaymentTypeColor = (paymentType: string) => {
    switch (paymentType) {
      case 'Наличные':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Карта':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Click':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Перечисление':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Валюта':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const payments = paymentsData?.results || [];
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  const columns = [
    {
      header: t('common.payment_type'),
      accessorKey: 'payment_type' as keyof typeof payments[0],
      cell: (row: typeof payments[0]) => (
        <Badge 
          variant="outline" 
          className={`${getPaymentTypeColor(row.payment_type)} border`}
        >
          {row.payment_type}
        </Badge>
      ),
    },
    {
      header: t('common.amount'),
      accessorKey: 'amount' as keyof typeof payments[0],
      cell: (row: typeof payments[0]) => (
        <div className="font-semibold text-primary">
          {row.payment_type === 'Валюта' 
            ? `${formatNumber(row.amount)} ${row.debt_currency || 'USD'}`
            : `${formatNumber(row.amount)} ${t('common.uzs')}`}
        </div>
      ),
    },
    {
      header: t('common.payment_date'),
      accessorKey: 'payment_date' as keyof typeof payments[0],
      cell: (row: typeof payments[0]) => formatDate(row.payment_date),
    },
    {
      header: t('common.comment'),
      accessorKey: 'comment' as keyof typeof payments[0],
      cell: (row: typeof payments[0]) => (
        <div className="max-w-xs truncate" title={row.comment || ''}>
          {row.comment || '-'}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/suppliers`}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{t('common.payment_history')}</h1>
        </div>
        
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('common.error_loading_data')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/suppliers`}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('common.payment_history')}</h1>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('dashboard.total_paid')}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(totalPaid)} {t('common.uzs')}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('common.total_payments')}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {paymentsData?.count || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('common.average_payment')}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {payments.length > 0 ? formatNumber(totalPaid / payments.length) : '0.00'} {t('common.uzs')}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <ResourceTable
        data={payments}
        columns={columns}
        isLoading={isLoading}
        totalCount={paymentsData?.count || 0}
        currentPage={paymentsData?.current_page || 1}
        pageSize={paymentsData?.page_size || 30}
      />
    </div>
  );
}