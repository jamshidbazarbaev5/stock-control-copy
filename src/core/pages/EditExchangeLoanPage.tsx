import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useGetExchangeLoan, useUpdateExchangeLoan } from '../api/exchange-loan';
import { useCreateExchangeLoanPayment } from '../api/exchange-loan-payment';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState, useMemo } from 'react';


export default function EditExchangeLoanPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutate: updateExchangeLoan, isPending: isUpdating } = useUpdateExchangeLoan();
  const { data: exchangeLoan, isLoading } = useGetExchangeLoan(Number(id));
  const createPayment = useCreateExchangeLoanPayment(Number(id));
  
  const [notes, setNotes] = useState<string>('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [localIsPaid, setLocalIsPaid] = useState<boolean | undefined>(undefined);

  // Update notes when exchangeLoan is loaded
  useMemo(() => {
    if (exchangeLoan?.notes) {
      setNotes(exchangeLoan.notes);
    }
  }, [exchangeLoan]);

  const handleUpdateNotes = () => {
    if (!id) return;
    
    updateExchangeLoan({ notes, id: Number(id) } as any, {
      onSuccess: () => {
        toast.success(t('messages.success.updated', { item: t('navigation.exchange_loans') }));
        queryClient.invalidateQueries({ queryKey: ['exchange-loans', Number(id)] });
      },
    });
  };

  const handlePaymentSubmit = async () => {
    if (!id || !paymentAmount) {
      toast.error(t('validation.fill_all_required_fields'));
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('validation.amount_must_be_positive'));
      return;
    }

    const remainingBalance = typeof exchangeLoan?.remaining_balance === 'string' 
      ? parseFloat(exchangeLoan.remaining_balance) 
      : (exchangeLoan?.remaining_balance || 0);
    
    const currencyRate = typeof exchangeLoan?.currency_rate === 'string'
      ? parseFloat(exchangeLoan.currency_rate)
      : (exchangeLoan?.currency_rate || 1);

    const maxPayableAmount = remainingBalance * currencyRate;

    if (amount > maxPayableAmount) {
      toast.error(t('validation.amount_exceeds_remainder'));
      return;
    }

    try {
      await createPayment.mutateAsync({
        amount: amount,
        notes: paymentNotes || undefined,
      });
      
      toast.success(t('common.payment_successful'));
      
      // Update local state
      const newRemainingBalance = remainingBalance - (amount / currencyRate);
      const isPaid = newRemainingBalance <= 0;
      setLocalIsPaid(isPaid);
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['exchange-loans', Number(id)] });
      
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (error) {
      console.error('Error making payment:', error);
      toast.error(t('common.payment_failed'));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!exchangeLoan) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Exchange loan not found</div>
      </div>
    );
  }

  const formatCurrency = (amount: number | string) => {
    return Number(amount).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const remainingBalance = typeof exchangeLoan.remaining_balance === 'string'
    ? parseFloat(exchangeLoan.remaining_balance)
    : (exchangeLoan.remaining_balance || 0);

  const currencyRate = typeof exchangeLoan.currency_rate === 'string'
    ? parseFloat(exchangeLoan.currency_rate)
    : (exchangeLoan.currency_rate || 1);

  const totalAmount = typeof exchangeLoan.total_amount === 'string'
    ? parseFloat(exchangeLoan.total_amount)
    : (exchangeLoan.total_amount || 0);

  const depositAmount = typeof exchangeLoan.deposit_amount === 'string'
    ? parseFloat(exchangeLoan.deposit_amount)
    : (exchangeLoan.deposit_amount || 0);

  const payableAmount = remainingBalance * currencyRate;
  const isPaid = localIsPaid !== undefined ? localIsPaid : exchangeLoan.is_paid;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('common.edit')} {t('navigation.exchange_loans')}</h1>
        <p className="text-muted-foreground">
          {t('pages.exchange_loans.edit_description')}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Badge */}
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('common.status')}</h2>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                isPaid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isPaid ? t('common.paid') : t('common.unpaid')}
            </span>
          </div>
        </Card>

        {/* Loan Details - Read Only */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('forms.loan_details')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-500">{t('forms.store')}</Label>
              <p className="text-lg font-medium">{exchangeLoan.store?.name || '-'}</p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.currency')}</Label>
              <p className="text-lg font-medium">
                {exchangeLoan.currency?.name} ({exchangeLoan.currency?.short_name})
              </p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.total_amount')}</Label>
              <p className="text-lg font-medium">
                {formatCurrency(totalAmount)} {exchangeLoan.currency?.short_name}
              </p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.currency_rate')}</Label>
              <p className="text-lg font-medium">{formatCurrency(currencyRate)} UZS</p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.deposit_amount')}</Label>
              <p className="text-lg font-medium">{formatCurrency(depositAmount)} UZS</p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.remaining_balance')}</Label>
              <p className="text-lg font-medium text-red-600">
                {formatCurrency(remainingBalance)} {exchangeLoan.currency?.short_name}
              </p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.payable_amount')}</Label>
              <p className="text-lg font-medium text-blue-600">
                {formatCurrency(payableAmount)} UZS
              </p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.due_date')}</Label>
              <p className="text-lg font-medium">{formatDate(exchangeLoan.due_date)}</p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.created_at')}</Label>
              <p className="text-lg font-medium">{formatDate(exchangeLoan.created_at || '')}</p>
            </div>
          </div>
        </Card>

        {/* Store Budget Details */}
        {exchangeLoan.store?.budgets && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t('forms.store_budgets')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exchangeLoan.store.budgets.map((budget) => (
                <div key={budget.id}>
                  <Label className="text-gray-500">{budget.budget_type}</Label>
                  <p className="text-lg font-medium">{formatCurrency(budget.amount)} UZS</p>
                </div>
              ))}
              <div>
                <Label className="text-gray-500">{t('forms.total_budget')}</Label>
                <p className="text-lg font-medium text-green-600">
                  {formatCurrency(exchangeLoan.store.budget)} UZS
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Editable Notes Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('forms.notes')}</h2>
          <div className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('placeholders.enter_notes')}
              rows={4}
            />
            <Button
              onClick={handleUpdateNotes}
              disabled={isUpdating}
            >
              {isUpdating ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </Card>

        {/* Payment Button */}
        {!isPaid && (
          <div className="flex justify-end">
            <Button
              onClick={() => setIsPaymentDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              {t('common.pay_debt')}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.pay_debt')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-500">{t('forms.remaining_balance')}</Label>
              <p className="text-lg font-medium">
                {formatCurrency(remainingBalance)} {exchangeLoan.currency?.short_name}
              </p>
            </div>
            <div>
              <Label className="text-gray-500">{t('forms.payable_amount')}</Label>
              <p className="text-lg font-medium text-blue-600">
                {formatCurrency(payableAmount)} UZS
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">{t('common.payment_amount')} (UZS)</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={t('common.enter_payment_amount')}
                max={payableAmount}
                required
              />
              <p className="text-sm text-gray-500">
                {t('common.max_amount')}: {formatCurrency(payableAmount)} UZS
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">{t('forms.notes')}</Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder={t('placeholders.enter_notes')}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handlePaymentSubmit}
                className="flex-1"
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || createPayment.isPending}
              >
                {createPayment.isPending ? t('common.processing') : t('common.pay')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
