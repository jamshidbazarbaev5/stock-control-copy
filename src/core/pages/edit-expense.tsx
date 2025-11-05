import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ResourceForm } from '../helpers/ResourceForm';
import { useGetExpense, useUpdateExpense } from '../api/expense';
import { useGetStores } from '../api/store';
import { useGetExpenseNames } from '../api/expense-name';

export default function EditExpensePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const updateExpense = useUpdateExpense();
  const { data: expense } = useGetExpense(Number(id));
  const { data: storesData } = useGetStores({});
  const { data: expenseNamesData } = useGetExpenseNames({});

  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const expenseNames = Array.isArray(expenseNamesData) ? expenseNamesData : expenseNamesData?.results || [];

  const fields = [
    {
      name: 'store_write',
      label: t('forms.store'),
      type: 'select',
      placeholder: t('forms.select_store'),
      required: true,
      options: stores.map((store) => ({
        value: store.id,
        label: store.name,
      })),
    },
    {
      name: 'expense_name_write',
      label: t('forms.expense_name'),
      type: 'select',
      placeholder: t('forms.select_expense_name'),
      required: true,
      options: expenseNames.map((name) => ({
        value: name.id,
        label: name.name,
      })),
    },
    {
      name: 'amount',
      label: t('forms.amount'),
      type: 'number',
      placeholder: t('forms.enter_amount'),
      required: true,
    },
    {
      name: 'payment_method',
      label: t('forms.payment_method'),
      type: 'select',
      placeholder: t('forms.select_payment_method'),
      required: true,
      options: [
        { value: 'Наличные', label: t('forms.cash') },
        { value: 'Карта', label: t('forms.card') },
        { value: 'Click', label: t('forms.click') },
      ],
    },
    {
      name: 'comment',
      label: t('forms.comment'),
      type: 'textarea',
      placeholder: t('forms.enter_comment'),
    },
  ];

  // Define a type for the form data to match the field names
  interface EditExpenseFormData {
    store_write: number;
    expense_name_write: number;
    amount: string;
    payment_method: string;
    comment?: string;
  }

  const handleSubmit = async (data: EditExpenseFormData) => {
    const translatedData = {
      store: data.store_write,
      expense_name: data.expense_name_write,
      amount: data.amount,
      payment_method: data.payment_method,
      comment: data.comment,
    };
    try {
      await updateExpense.mutateAsync({
        id: Number(id),
        ...translatedData,
      });
      toast.success(t('messages.success.expense_updated'));
      navigate('/expense');
    } catch (error) {
    }
  };

  if (!expense) {
    return null;
  }

  const defaultValues = {
    store_write: expense.store_read?.id,
    expense_name_write: expense.expense_name_read?.id,
    amount: expense.amount,
    payment_method: expense.payment_method,
    comment: expense.comment
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('common.edit')} {t('navigation.expense')}</h1>
      </div>
      
      <ResourceForm
        fields={fields}
        onSubmit={handleSubmit}
        isSubmitting={updateExpense.isPending}
        defaultValues={defaultValues}
      />
    </div>
  );
}
