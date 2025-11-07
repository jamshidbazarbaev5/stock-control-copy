import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetStockEntryPayments } from '../api/stock-debt-payment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  MessageSquare, 
  TrendingUp,
  DollarSign,
  Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function StockDebtPaymentHistoryPage() {
  const { stockEntryId } = useParams<{ stockEntryId: string }>();
  const { t } = useTranslation();
  
  const { data: paymentsData, isLoading, error } = useGetStockEntryPayments(stockEntryId || '');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
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
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentTypeIcon = (paymentType: string) => {
    switch (paymentType) {
      case 'Наличные':
        return <DollarSign className="h-4 w-4" />;
      case 'Карта':
        return <CreditCard className="h-4 w-4" />;
      case 'Click':
        return <Receipt className="h-4 w-4" />;
      case 'Перечисление':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid gap-6 mb-6">
          <Skeleton className="h-32 w-full" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !paymentsData) {
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

  const payments = paymentsData.results || [];
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('common.total_payments')}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {paymentsData.count}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
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
        </motion.div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">{t('common.payment_details')}</h2>
        
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('common.no_payments')}
              </h3>
              <p className="text-muted-foreground">
                {t('common.no_payments_found')}
              </p>
            </CardContent>
          </Card>
        ) : (
          payments.map((payment, index) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        {getPaymentTypeIcon(payment.payment_type)}
                      </div>
                      {t('common.payment')} #{payment.id}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`${getPaymentTypeColor(payment.payment_type)} border`}
                    >
                      {payment.payment_type}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Amount */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t('common.amount')}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {payment.payment_type === 'Валюта' 
                          ? `${formatNumber(payment.amount)} $`
                          : `${formatNumber(payment.amount)} ${t('common.uzs')}`}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t('common.payment_date')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>

                  {/* Comment */}
                  {payment.comment && (
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-muted-foreground block mb-1">
                            {t('common.comment')}
                          </span>
                          <p className="text-sm bg-gray-50 p-3 rounded-lg">
                            {payment.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {paymentsData.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button variant="outline" size="sm" disabled={paymentsData.current_page === 1}>
            {t('common.previous')}
          </Button>
          
          <div className="flex items-center gap-1">
            {paymentsData.page_range.map((page) => (
              <Button
                key={page}
                variant={page === paymentsData.current_page ? "default" : "outline"}
                size="sm"
                className="w-10 h-10"
              >
                {page}
              </Button>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            disabled={paymentsData.current_page === paymentsData.total_pages}
          >
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  );
}