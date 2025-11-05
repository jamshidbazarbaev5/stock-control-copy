import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceForm } from '../helpers/ResourceForm';
import { useGetBudget, useUpdateBudget } from '../api/budget';
import { useGetStores } from '../api/store';
import { useGetCashInflowNames } from '../api/cash-inflow-name';
import { toast } from 'sonner';

interface EditMoneyFormData {
  store: number;
  amount: number;
  comment?: string;
  cash_inflow_name: number;
}

export default function EditMoney() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: budget } = useGetBudget(Number(id));
  const updateBudget = useUpdateBudget();
  const { data: storesData } = useGetStores({});
  const { data: cashInflowNamesData } = useGetCashInflowNames({});

  // Prepare options for select inputs
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const cashInflowNames = Array.isArray(cashInflowNamesData) ? cashInflowNamesData : cashInflowNamesData?.results || [];

  if (!budget) {
    return null;
  }

  const fields = [
    {
      name: 'store',
      label: t('forms.store'),
      type: 'select',
      placeholder: t('placeholders.select_store'),
      required: true,
      options: stores.map(store => ({ value: store.id, label: store.name }))
    },
    {
      name: 'cash_inflow_name',
      label: t('forms.cash_inflow_name'),
      type: 'select',
      placeholder: t('placeholders.select_cash_inflow_name'),
      required: true,
      options: cashInflowNames.map(name => ({ value: name.id, label: name.name }))
    },
    {
      name: 'amount',
      label: t('forms.amount'),
      type: 'number',
      placeholder: t('placeholders.enter_amount'),
      required: true,
      validation: {
        min: {
          value: 0.01,
          message: t('validation.amount_must_be_positive')
        }
      }
    },
    {
      name: 'comment',
      label: t('forms.comment'),
      type: 'text',
      placeholder: t('placeholders.enter_comment'),
      required: false,
    }
  ];

  const defaultValues = {
    store: budget.store_read?.id,
    amount: budget.amount,
    comment: budget.comment,
    cash_inflow_name: budget.cash_inflow_read?.id,
  };

  const handleSubmit = async (data: EditMoneyFormData) => {
    try {
      await updateBudget.mutateAsync({
        id: Number(id),
        store: typeof data.store === 'string' ? parseInt(data.store, 10) : data.store,
        cash_inflow_name: typeof data.cash_inflow_name === 'string' ? parseInt(data.cash_inflow_name, 10) : data.cash_inflow_name,
        amount: data.amount,
        comment: data.comment

      });
      toast.success(t('messages.success.money_updated'));
      navigate('/finance');
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('common.edit')} {t('forms.add_money')}</h1>
      </div>
      
      <ResourceForm<EditMoneyFormData>
        fields={fields}
        onSubmit={handleSubmit}
        isSubmitting={updateBudget.isPending}
        defaultValues={defaultValues}
      />
    </div>
  );
}
