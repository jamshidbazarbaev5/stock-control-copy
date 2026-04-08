import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchLoans, type Loan } from '../api/loan';
import { fetchLoanTotalsByCurrency, type LoanTotalsByCurrency } from '../api/loan-totals';
import { fetchLoanPaymentsByLoan } from '../api/loanpaymentByLoan';
import { createLoanPayment } from '../api/loanpaymentCreate';
// import { useGetCurrencies } from '../api/currency';
import { ResourceTable } from '../helpers/ResourseTable';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import { FaTimes, FaRegMoneyBillAlt, FaRegListAlt, FaArrowLeft } from 'react-icons/fa';
import { useGetStores } from '../api/store';

export default function SponsorLoansPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [payModalLoan, setPayModalLoan] = useState<Loan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [currencyTab, setCurrencyTab] = useState<'UZS' | 'USD'>('UZS');
  const [loanTotals, setLoanTotals] = useState<LoanTotalsByCurrency[]>([]);
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  // const { data: currenciesData } = useGetCurrencies({});
  // const currencies = Array.isArray(currenciesData) ? currenciesData : currenciesData?.results || [];
  const [selectedPayStoreId, setSelectedPayStoreId] = useState<number | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState<string>('Наличные');
  const [selectedCurrencyType, setSelectedCurrencyType] = useState<string>('UZS');

  const getStoreBudget = () => {
    if (!selectedPayStoreId) return 0;
    const store = stores.find((s: any) => s.id === selectedPayStoreId);
    if (!store?.budgets) return 0;
    const budget = store.budgets.find((b: any) => b.budget_type === selectedPayMethod);
    return budget ? parseFloat(budget.amount) : 0;
  };

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
  }

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [loansData, totalsData] = await Promise.all([
        fetchLoans(Number(id), currencyTab, activeTab === 'paid' ? true : activeTab === 'unpaid' ? false : undefined),
        fetchLoanTotalsByCurrency(Number(id))
      ]);
      setLoans(loansData);
      setLoanTotals(totalsData);
    } catch (error) {
      toast.error(t('Failed to fetch loans'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t, activeTab, currencyTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayLoan = async (data: any) => {
    if (!id || !payModalLoan) return;
    setIsSubmitting(true);
    try {
      const paymentData = {
        ...data,
        loan: payModalLoan.id,
        currency_type: selectedCurrencyType,
        rate: data.rate ? Number(data.rate) : undefined
      };
      await createLoanPayment(Number(id), payModalLoan.id, paymentData);
      toast.success(t('Платеж успешно добавлен'));
      setPayModalLoan(null);
      // Re-fetch all data to get updated remainder, totals, and overpayment_unused
      fetchData();
    } catch {
      toast.error(t('Ошибка при добавлении платежа'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Store payments for all loans in a map: {loanId: payments[]}
  const [paymentsMap, setPaymentsMap] = useState<Record<string, any[]>>({});
  const [_isPaymentsLoading, setIsPaymentsLoading] = useState(false);

  useEffect(() => {
    if (!id || loans.length === 0) return;
    setIsPaymentsLoading(true);
    // Fetch payments for all loans in parallel
    Promise.all(
      loans.map(loan => fetchLoanPaymentsByLoan(String(id), String(loan.id)))
    ).then(results => {
      const map: Record<string, any[]> = {};
      loans.forEach((loan, idx) => {
        map[String(loan.id)] = results[idx] || [];
      });
      setPaymentsMap(map);
    }).finally(() => setIsPaymentsLoading(false));
  }, [id, loans]);

  // Helper to get payment summary for a loan
  const getPaymentSummary = (loan: Loan) => {
    const payments = paymentsMap[String(loan.id)] || [];
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;
    return {
      totalPaid,
      lastPaymentDate: lastPayment ? formatDate(lastPayment.paid_at) : '-'
    };
  };

  const loanColumns = [
    { header: t('forms.remainder'), accessorKey: 'remainder' },
    { header: t('forms.date'), accessorKey: (row: Loan) => formatDate(row.created_at) },
    { header: t('forms.due_date'), accessorKey: 'due_date' },
    { header: t('forms.status'), accessorKey: (row: Loan) => row.is_paid ? t('common.paid') : t('common.unpaid') },
    {
      header: t('forms.overpayment_unused') || 'Overpayment',
      accessorKey: (row: Loan) => Number(row.overpayment_unused) > 0 ? (
        <span className="text-green-600 font-bold">{row.overpayment_unused}</span>
      ) : row.overpayment_unused
    },
    {
      header: t('Платежи'),
      accessorKey: (row: Loan) => {
        const summary = getPaymentSummary(row);
        return (
          <div>
            <div>{t('Всего оплачено')}: <span className="font-bold">{summary.totalPaid} {row.currency}</span></div>
            <div>{t('Последний платеж')}: <span>{summary.lastPaymentDate}</span></div>
          </div>
        );
      }
    },
  ];

  return (
    <div className="container py-8 px-4">
      <button
        onClick={() => navigate('/sponsors')}
        className="flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FaArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>
      {loanTotals.map((total) => (
          <div key={total.currency} className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-lg font-bold mb-4">{t('Займы')} ({total.currency})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600">{t('Общая сумма займов')}</div>
                <div className="text-2xl font-bold text-blue-700">{total.total_loan.toLocaleString()}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600">{t('Оплачено')}</div>
                <div className="text-2xl font-bold text-green-700">{total.total_paid.toLocaleString()}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-red-600">{t('Неоплачено')}</div>
                <div className="text-2xl font-bold text-red-700">{total.total_unpaid.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      <h3 className="text-lg font-bold mb-2">
        {t('Займы')}
      </h3>
      <div className="flex gap-2 mb-4">
        <button
          className={`rounded-full px-5 py-2 shadow transition-colors duration-150 font-bold border-2 focus:outline-none ${currencyTab === 'UZS' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
          onClick={() => setCurrencyTab('UZS')}
        >
          UZS
        </button>
        <button
          className={`rounded-full px-5 py-2 shadow transition-colors duration-150 font-bold border-2 focus:outline-none ${currencyTab === 'USD' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
          onClick={() => setCurrencyTab('USD')}
        >
          USD
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          className={`rounded-full px-4 py-2 shadow transition-colors duration-150 font-semibold border-2 focus:outline-none ${activeTab === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
          onClick={() => setActiveTab('all')}
        >
          {t('Все')}
        </button>
        <button
          className={`rounded-full px-4 py-2 shadow transition-colors duration-150 font-semibold border-2 focus:outline-none ${activeTab === 'unpaid' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
          onClick={() => setActiveTab('unpaid')}
        >
          {t('Неоплаченные')}
        </button>
        <button
          className={`rounded-full px-4 py-2 shadow transition-colors duration-150 font-semibold border-2 focus:outline-none ${activeTab === 'paid' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
          onClick={() => setActiveTab('paid')}
        >
          {t('Оплаченные')}
        </button>
      </div>
      <ResourceTable<Loan>
        data={loans}
        columns={loanColumns}
        isLoading={isLoading}
        totalCount={loans.length}
        actions={(loan) => (
          <div className="flex gap-2">
            <button
              className="btn btn-primary flex items-center justify-center"
              title={t('Оплатить')}
              onClick={() => { 
                setPayModalLoan(loan); 
                setSelectedPayStoreId(null); 
                setSelectedPayMethod('Наличные');
                setSelectedCurrencyType('UZS');
              }}
            >
              <FaRegMoneyBillAlt className="w-5 h-5 mr-2" />
              {t('Оплатить')}
            </button>
            <button
              className="btn btn-secondary flex items-center justify-center"
              title={t('Платежи')}
              onClick={() => navigate(`/sponsors/${id}/loans/${loan.id}/payments`)}
            >
              <FaRegListAlt className="w-5 h-5 mr-2" />
              {t('Платежи')}
            </button>
          </div>
        )}
      />
      {payModalLoan && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-bold flex items-center gap-2">
                <FaRegMoneyBillAlt className="w-6 h-6 text-indigo-600" />
                {t('Оплатить займ')}
              </h4>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setPayModalLoan(null)}
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('forms.remainder')}:</span>
                <span className="font-bold">{payModalLoan.remainder} {payModalLoan.currency}</span>
              </div>
            </div>
            <ResourceForm
              fields={[
                { name: 'store', label: t('forms.store'), type: 'select', required: true, options: stores.map(s => ({ value: s.id, label: s.name })).filter(o => o.value), placeholder: t('placeholders.select_store'), onChange: (value: string) => setSelectedPayStoreId(parseInt(value, 10)) },
                { name: 'payment_method', label: t('forms.payment_method'), type: 'select', required: true, options: [
                  { value: 'Наличные', label: t('forms.cash') },
                  { value: 'Карта', label: t('forms.card') },
                  { value: 'Click', label: 'Click' },
                  { value: 'Перечисление', label: t('payment.per') },
                   { value: 'Валюта', label: t('currency_modal.currency') },
                ], 
                onChange: (value: string) => setSelectedPayMethod(value) },

                { name: 'amount', label: `${t('forms.amount')} (${t('table.budget')}: ${getStoreBudget().toLocaleString()} ${selectedPayMethod === 'Валюта' ? '$' : 'UZS'})`, type: 'number', required: true },
                { name: 'rate', label: t('forms.currency_rate'), type: 'number', required: false, placeholder: t('placeholders.enter_currency_rate') },
                { name: 'notes', label: t('forms.notes'), type: 'textarea' },
              ]}
              onSubmit={handlePayLoan}
              isSubmitting={isSubmitting}
              hideSubmitButton={false}
            />
            <button
              className="mt-4 w-full py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center font-medium"
              onClick={() => setPayModalLoan(null)}
            >
              <FaTimes className="w-4 h-4 mr-2" />
              {t('Закрыть')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
