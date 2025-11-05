import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Wallet, Calendar, TrendingUp, Building2, DollarSign, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { useGetExchangeLoanCustom } from '../api/exchange-loan';
import { useGetExchangeLoanPayments, useCreateExchangeLoanPayment, type CreateExchangeLoanPaymentDTO, type ExchangeLoanPayment } from '../api/exchange-loan-payment';
import { formatDate } from '../helpers/formatDate';

export default function ExchangeLoanPaymentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: loan, isLoading: loanLoading, refetch: refetchLoan } = useGetExchangeLoanCustom(Number(id));
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = useGetExchangeLoanPayments(Number(id));
  const createPayment = useCreateExchangeLoanPayment(Number(id));

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t('validation.fill_all_required_fields'));
      return;
    }

    const paymentAmountNum = parseFloat(amount);
    const remaining = typeof loan?.remaining_balance === 'string' 
      ? parseFloat(loan.remaining_balance) 
      : loan?.remaining_balance || 0;

    const currencyRate = typeof loan?.currency_rate === 'string'
      ? parseFloat(loan.currency_rate)
      : loan?.currency_rate || 1;

    const maxPayableAmount = remaining * currencyRate;
    
    if (paymentAmountNum > maxPayableAmount) {
      toast.error(t('validation.amount_exceeds_remainder'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const paymentData: CreateExchangeLoanPaymentDTO = {
        amount: paymentAmountNum,
        notes: notes || undefined,
      };

      await createPayment.mutateAsync(paymentData);
      
      // Invalidate and refetch all related queries to get fresh data
      await queryClient.invalidateQueries({ queryKey: ['exchange-loan', Number(id)] });
      await queryClient.invalidateQueries({ queryKey: ['exchange-loans'] });
      await queryClient.invalidateQueries({ queryKey: ['exchange-loan-payments', Number(id)] });
      
      // Explicitly refetch loan and payment data
      await refetchLoan();
      await refetchPayments();
      
      toast.success(t('messages.success.payment_created'));
      setAmount('');
      setNotes('');
      setIsCreateModalOpen(false);
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setAmount('');
    setNotes('');
    setIsCreateModalOpen(false);
  };

  if (loanLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground">Loading loan details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="text-muted-foreground">Exchange loan not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remaining = typeof loan.remaining_balance === 'string' 
    ? parseFloat(loan.remaining_balance) 
    : loan.remaining_balance || 0;
  const total = typeof loan.total_amount === 'string' 
    ? parseFloat(loan.total_amount) 
    : loan.total_amount || 0;

  const paidAmount = total - remaining;
  const progressPercent = total > 0 ? (paidAmount / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Building2 className="h-4 w-4" />
                <span>{loan.store?.name || '-'}</span>
              </div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                {t('pages.exchange_loans.payment_dialog.title')}
              </h1>
              <p className="text-muted-foreground text-lg">
                {t('pages.exchange_loans.payment_dialog.loan_summary')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/exchange-loans')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
                disabled={loan.is_paid}
              >
                <Plus className="h-4 w-4" />
                {t('common.create_payment')}
              </Button>
            </div>
          </div>
        </div>

        {/* Loan Summary - Enhanced Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Amount Card */}
          <Card className="shadow-lg hover:shadow-xl transition-all bg-white text-slate-900 border border-blue-100 dark:border-none dark:bg-gradient-to-br dark:from-blue-500 dark:to-blue-600 dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 opacity-80 text-blue-600 dark:text-white" />
                <Badge variant="secondary" className="border border-blue-100 bg-blue-50 text-blue-700 dark:border-none dark:bg-white/20 dark:text-white">
                  {loan.currency?.short_name || 'USD'}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-white/90">{t('forms.total_amount')}</p>
                <p className="text-3xl font-bold">{total.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Remaining Balance Card */}
          <Card className="shadow-lg hover:shadow-xl transition-all bg-white text-slate-900 border border-orange-100 dark:border-none dark:bg-gradient-to-br dark:from-orange-500 dark:to-orange-600 dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-8 w-8 opacity-80 text-orange-600 dark:text-white" />
                <Badge 
                  variant="secondary" 
                  className={`${loan.is_paid 
                    ? 'border border-green-200 bg-green-50 text-green-700' 
                    : 'border border-amber-200 bg-amber-50 text-amber-700'
                  } dark:border-none ${loan.is_paid ? 'dark:bg-green-500/80 dark:text-white' : 'dark:bg-white/20 dark:text-white'}`}
                >
                  {loan.is_paid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-white/90">{t('forms.remaining_balance')}</p>
                <p className="text-3xl font-bold">{remaining.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Due Date Card */}
          <Card className="shadow-lg hover:shadow-xl transition-all bg-white text-slate-900 border border-purple-100 dark:border-none dark:bg-gradient-to-br dark:from-purple-500 dark:to-purple-600 dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-8 w-8 opacity-80 text-purple-600 dark:text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-white/90">{t('forms.due_date')}</p>
                <p className="text-2xl font-bold">{loan.due_date ? formatDate(loan.due_date) : '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Loan Amount in UZS Card */}
          <Card className="shadow-lg hover:shadow-xl transition-all bg-white text-slate-900 border border-emerald-100 dark:border-none dark:bg-gradient-to-br dark:from-emerald-500 dark:to-emerald-600 dark:text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 opacity-80 text-emerald-600 dark:text-white" />
                <Badge variant="secondary" className="border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-none dark:bg-white/20 dark:text-white">
                  UZS
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-white/90">Сумма к оплате</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const remainingVal = typeof loan.remaining_balance === 'number' ? loan.remaining_balance : parseFloat(String(loan.remaining_balance || '0'));
                    const rate = typeof loan.currency_rate === 'number' ? loan.currency_rate : parseFloat(String(loan.currency_rate || '1'));
                    return (remainingVal * rate).toLocaleString();
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Оплата
              </span>
              <Badge variant={loan.is_paid ? "default" : "secondary"} className="gap-1">
                {loan.is_paid ? (
                  <><CheckCircle2 className="h-3 w-3" /> {t('status.paid')}</>
                ) : (
                  <><Clock className="h-3 w-3" /> {t('status.unpaid')}</>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Оплачено: {paidAmount.toLocaleString()} {loan.currency?.short_name}</span>
                <span className="font-semibold">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>{total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {t('pages.exchange_loans.payment_dialog.payment_history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-muted-foreground">Loading payments...</p>
                </div>
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment: ExchangeLoanPayment, index: number) => (
                  <div 
                    key={payment.id} 
                    className="rounded-xl border border-gray-200 p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          #{payments.length - index}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-2xl font-bold text-slate-900">
                              {typeof payment.amount === 'number' 
                                ? payment.amount.toLocaleString() 
                                : payment.amount}
                            </span>
                            <Badge variant="outline" className="gap-1">
                              {loan.currency?.short_name || 'USD'}
                            </Badge>
                          </div>
                          {payment.notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground sm:text-right">
                        <Calendar className="h-4 w-4" />
                        <span>{payment.paid_at ? formatDate(payment.paid_at) : '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Wallet className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-muted-foreground">{t('messages.no_payments_found')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Payment Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('common.create_payment')}</DialogTitle>
            </DialogHeader>

            {/* Loan Summary */}
            <div className="space-y-4">
              <Card className="p-4 bg-gray-50">
                <div className="text-sm font-semibold text-gray-700 mb-3">{t('pages.exchange_loans.payment_dialog.loan_summary')}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('forms.store')}:</span>
                    <span className="font-medium">{loan.store?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('forms.total_amount')}:</span>
                    <span className="font-medium">
                      {typeof total === 'number' ? total.toLocaleString() : total} {loan.currency?.short_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('forms.remaining_balance')}:</span>
                    <span className="font-medium text-red-600">
                      {typeof remaining === 'number' ? remaining.toLocaleString() : remaining} {loan.currency?.short_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('forms.currency_rate')}:</span>
                    <span className="font-medium">
                      {(() => {
                        const rate = typeof loan.currency_rate === 'number' ? loan.currency_rate : parseFloat(String(loan.currency_rate || '1'));
                        return rate.toLocaleString();
                      })()} UZS
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-600 font-semibold">{t('forms.payable_amount')}:</span>
                    <span className="font-bold text-blue-600">
                      {(() => {
                        const remainingVal = typeof loan.remaining_balance === 'number' ? loan.remaining_balance : parseFloat(String(loan.remaining_balance || '0'));
                        const rate = typeof loan.currency_rate === 'number' ? loan.currency_rate : parseFloat(String(loan.currency_rate || '1'));
                        return (remainingVal * rate).toLocaleString();
                      })()} UZS
                    </span>
                  </div>
                </div>
              </Card>

              {loan.store?.budgets && (
                <Card className="p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3">{t('forms.store_budgets')}</div>
                  <div className="space-y-2 text-sm">
                    {loan.store.budgets.map((budget: any) => (
                      <div key={budget.id} className="flex justify-between">
                        <span className="text-gray-600">{budget.budget_type}:</span>
                        <span className="font-medium">{parseFloat(String(budget.amount)).toLocaleString()} UZS</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-600 font-semibold">{t('forms.total_budget')}:</span>
                      <span className="font-bold text-green-600">
                        {loan.store.budget ? parseFloat(String(loan.store.budget)).toLocaleString() : '0'} UZS
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePayment} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="amount">{t('forms.amount')} (UZS) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('placeholders.enter_amount')}
                  min="0"
                  max={(() => {
                    const remainingVal = typeof loan.remaining_balance === 'number' ? loan.remaining_balance : parseFloat(String(loan.remaining_balance || '0'));
                    const rate = typeof loan.currency_rate === 'number' ? loan.currency_rate : parseFloat(String(loan.currency_rate || '1'));
                    return remainingVal * rate;
                  })()}
                  step="0.01"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t('common.max_amount')}: {(() => {
                    const remainingVal = typeof loan.remaining_balance === 'number' ? loan.remaining_balance : parseFloat(String(loan.remaining_balance || '0'));
                    const rate = typeof loan.currency_rate === 'number' ? loan.currency_rate : parseFloat(String(loan.currency_rate || '1'));
                    return (remainingVal * rate).toLocaleString();
                  })()} UZS
                </p>
              </div>

              <div>
                <Label htmlFor="notes">{t('forms.notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('placeholders.enter_notes')}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('common.submitting') : t('common.create_payment')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
