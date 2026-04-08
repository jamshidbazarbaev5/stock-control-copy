import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetLoanPaymentsByLoan } from '../api/loanpaymentByLoan';
import { ResourceTable } from '../helpers/ResourseTable';

// Optionally import Loan type if needed for details
import { fetchLoans, type Loan } from '../api/loan';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function LoanPaymentsPage() {
  const { id: sponsorId, loanId } = useParams<{ id: string; loanId: string; currency: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: payments = [], isLoading } = useGetLoanPaymentsByLoan(sponsorId, loanId);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [isLoanLoading, setIsLoanLoading] = useState(false);

  useEffect(() => {
    if (!sponsorId || !loanId) return;
    setIsLoanLoading(true);
    fetchLoans(Number(sponsorId), '')
      .then((loans) => {
        const found = loans.find((l: Loan) => String(l.id) === String(loanId));
        setLoan(found || null);
      })
      .finally(() => setIsLoanLoading(false));
  }, [sponsorId, loanId]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  return (
    <div className="container py-8 px-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back')}
      </Button>

      <h3 className="text-lg font-bold mb-2">{t('Платежи по займу')} #{loanId}</h3>
      {isLoanLoading ? (
        <div>{t('Загрузка информации о займе...')}</div>
      ) : loan ? (
        <div className="mb-4 p-4 bg-gray-50 rounded shadow">
          <div><b>{t('forms.total_amount')}:</b> {loan.total_amount} {loan.currency}</div>
          <div><b>{t('forms.remainder')}:</b> {loan.remainder} {loan.currency}</div>
          <div><b>{t('forms.overpayment_unused')}:</b> {loan.overpayment_unused} {loan.currency}</div>
          <div><b>{t('forms.due_date')}:</b> {loan.due_date}</div>
          <div><b>{t('forms.status')}:</b> {loan.is_paid ? t('common.paid') : t('common.unpaid')}</div>
          {loan.sponsor_read && (
            <div><b>{t('Спонсор')}:</b> {loan.sponsor_read.name} ({loan.sponsor_read.phone_number})</div>
          )}
        </div>
      ) : (
        <div className="mb-4 text-red-600">{t('Займ не найден')}</div>
      )}
      <ResourceTable
        data={payments}
        columns={[
          { header: t('forms.amount'), accessorKey: (row) => `${row.amount} ${loan?.currency || ''}` },
          { header: t('forms.payment_method'), accessorKey: 'payment_method' },
          { header: t('forms.notes'), accessorKey: 'notes' },
          { header: t('forms.paid_at'), accessorKey: (row) => formatDate(row.paid_at) },
        ]}
        isLoading={isLoading}
        totalCount={payments.length}
      />
    </div>
  );
}
