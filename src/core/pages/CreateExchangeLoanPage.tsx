import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateExchangeLoan, type CreateExchangeLoanDTO } from '../api/exchange-loan';
import { useGetStores as useGetStoresHook } from '../api/store';
import { useGetCurrencies as useGetCurrenciesHook } from '../api/currency';
import { ResourceForm } from '../helpers/ResourceForm';
import type { Store } from '../api/store';
import type { Currency } from '../api/currency';

const exchangeLoanFields = (t: any, stores: Store[], currencies: Currency[]) => [
  {
    name: 'lender_name',
    label: t('forms.lender_name') || 'Lender Name',
    type: 'text',
    placeholder: t('placeholders.enter_lender_name') || 'Enter lender name',
    required: true,
  },
  {
    name: 'store',
    label: t('forms.store'),
    type: 'select',
    required: true,
    options: stores.map(store => ({
      value: store.id,
      label: store.name,
    })),
  },
  {
    name: 'currency',
    label: t('forms.currency'),
    type: 'select',
    required: true,
    options: currencies.map(currency => ({
      value: currency.id,
      label: `${currency.name} (${currency.short_name})`,
    })),
  },
  {
    name: 'total_amount',
    label: t('forms.total_amount'),
    type: 'number',
    placeholder: t('placeholders.enter_total_amount'),
    required: true,
  },
  {
    name: 'currency_rate',
    label: t('forms.currency_rate'),
    type: 'number',
    placeholder: t('placeholders.enter_currency_rate'),
    required: true,
  },
  {
    name: 'deposit_amount',
    label: t('forms.deposit_amount'),
    type: 'number',
    placeholder: t('placeholders.enter_deposit_amount'),
    required: true,
  },
  {
    name: 'due_date',
    label: t('forms.due_date'),
    type: 'date',
    required: true,
  },
  {
    name: 'notes',
    label: t('forms.notes'),
    type: 'textarea',
    placeholder: t('placeholders.enter_notes'),
    required: false,
  },
];

export default function CreateExchangeLoanPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { mutate: createExchangeLoan, isPending: isCreating } = useCreateExchangeLoan();
  const { data: storesData } = useGetStoresHook({});
  const { data: currenciesData } = useGetCurrenciesHook({});

  const stores = Array.isArray(storesData) ? storesData : (storesData?.results || []);
  const currencies = Array.isArray(currenciesData) ? currenciesData : (currenciesData?.results || []);
  const fields = exchangeLoanFields(t, stores as Store[], currencies as Currency[]);

  const handleSubmit = (data: Partial<CreateExchangeLoanDTO>) => {
    const formData = {
      ...data,
      store: typeof data.store === 'string' ? parseInt(data.store, 10) : data.store,
      currency: typeof data.currency === 'string' ? parseInt(data.currency, 10) : data.currency,
      total_amount: typeof data.total_amount === 'string' ? parseFloat(data.total_amount) : data.total_amount,
      currency_rate: typeof data.currency_rate === 'string' ? parseFloat(data.currency_rate) : data.currency_rate,
      deposit_amount: typeof data.deposit_amount === 'string' ? parseFloat(data.deposit_amount) : data.deposit_amount,
    };
    
    createExchangeLoan(formData as any, {
      onSuccess: () => {
        toast.success(t('messages.success.created', { item: t('navigation.exchange_loans') }));
        navigate('/exchange-loans');
      },
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('common.create')} {t('navigation.exchange_loans')}</h1>
        <p className="text-muted-foreground">
          {t('pages.exchange_loans.create_description')}
        </p>
      </div>

      <div>
        <ResourceForm
          fields={fields}
          onSubmit={handleSubmit}
          defaultValues={{}}
          isSubmitting={isCreating}
          title={t('common.create')}
        />
      </div>
    </div>
  );
}
