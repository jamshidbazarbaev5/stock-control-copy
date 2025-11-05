import { useNavigate } from 'react-router-dom';
import { ResourceForm } from '../helpers/ResourceForm';
import { type ExpenseName, useCreateExpenseName } from '../api/expense-name';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const expenseNameFields = (t: any) => [
  {
    name: 'name',
    label: t('forms.expense_name'),
    type: 'text',
    placeholder: t('placeholders.enter_name'),
    required: true,
  },
];

export default function CreateExpenseName() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createExpenseName = useCreateExpenseName();

  const handleSubmit = async (data: ExpenseName) => {
    try {
      await createExpenseName.mutateAsync(data);
      toast.success(t('messages.success.expense_name_created'));
      navigate('/expense-name');
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8">
      <ResourceForm
        fields={expenseNameFields(t)}
        onSubmit={handleSubmit}
        isSubmitting={createExpenseName.isPending}
        title={t('pages.create_expense_name')}
      />
    </div>
  );
}