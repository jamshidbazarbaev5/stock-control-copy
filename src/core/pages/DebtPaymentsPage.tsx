import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useGetDebtPayments } from '../api/debt';
import { Card } from '@/components/ui/card';
import { DollarSign, Store, User2, Calendar, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DebtPaymentsPage() {
  const { t } = useTranslation();
  const { id: debtId } = useParams();
  const { data: payments, isLoading } = useGetDebtPayments(Number(debtId));

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: string | number) => {
    return Number(amount).toLocaleString();
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Click':
        return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'Карта':
        return <CreditCard className="w-5 h-5 text-purple-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-green-500" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-8">
        <DollarSign className="w-10 h-10 text-emerald-500" />
        {t('pages.debt_payments')}
      </h1>

      <div className="grid grid-cols-1 gap-4">
        {payments?.map((payment, index) => (
          <div
            key={payment.id}
            className="animate-in fade-in slide-in-from-bottom duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Payment Amount and Method */}
                <div className="flex items-start space-x-4">
                  {getPaymentMethodIcon(payment.payment_method)}
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(payment.amount)} {payment.payment_method === 'Валюта' ? '$' : 'UZS'}
                    </p>
                    <p className="text-sm text-gray-500">{payment.payment_method}</p>
                  </div>
                </div>

                {/* USD Rate at Payment */}
                <div className="flex items-start space-x-4">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-600">
                      {payment.usd_rate_at_payment ? `${formatCurrency(payment.usd_rate_at_payment)} UZS` : '-'}
                    </p>
                    <p className="text-sm text-gray-500">{t('forms.usd_rate_at_payment') || 'Курс USD'}</p>
                  </div>
                </div>

                {/* Worker Info */}
                <div className="flex items-start space-x-4">
                  <User2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{payment.worker_read.name}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Store className="w-4 h-4" />
                      <span>{payment?.worker_read?.store_read?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Date */}
                <div className="flex items-start space-x-4">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{formatDate(payment.paid_at)}</p>
                    <p className="text-sm text-gray-500">{t('forms.payment_date')}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}

        {payments?.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600">
              {t('common.no_payments')}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
