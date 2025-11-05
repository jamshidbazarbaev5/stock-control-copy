import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import { type ExpenseName, useGetExpenseNames, useUpdateExpenseName, useDeleteExpenseName } from '../api/expense-name';
import { ResourceTable } from '../helpers/ResourseTable';

const expenseNameFields = (t: any) => [
  {
    name: 'name',
    label: t('forms.expense_name'),
    type: 'text',
    placeholder: t('placeholders.enter_name'),
    required: true,
  },
];

export default function ExpenseNamesPage() {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpenseName, setSelectedExpenseName] = useState<ExpenseName | null>(null);
    const navigate = useNavigate();
  const { data: expenseNamesData, isLoading } = useGetExpenseNames({});
  const updateExpenseName = useUpdateExpenseName();
  const deleteExpenseName = useDeleteExpenseName();

  const expenseNames = Array.isArray(expenseNamesData) ? expenseNamesData : expenseNamesData?.results || [];

  const columns = [
    {
      header: t('forms.name'),
      accessorKey: 'name',
    },
  ];

  const handleEdit = (expenseName: ExpenseName) => {
    setSelectedExpenseName(expenseName);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpenseName.mutateAsync(id);
      toast.success(t('messages.success.expense_name_deleted'));
    } catch (error) {
      toast.error(t('messages.error.expense_name_delete'));
      console.error('Failed to delete expense name:', error);
    }
  };

  const handleEditSubmit = async (data: ExpenseName) => {
    if (!selectedExpenseName?.id) return;

    try {
      await updateExpenseName.mutateAsync({ ...data, id: selectedExpenseName.id });
      toast.success(t('messages.success.expense_name_updated'));
      setIsEditModalOpen(false);
      setSelectedExpenseName(null);
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8">
      <ResourceTable
        columns={columns}
        data={expenseNames}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        onAdd={() => navigate('/create-expense-name')}
        // addLabel={t('buttons.add_expense_name')}
        // title={t('pages.expense_names')}
      />

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <ResourceForm
            fields={expenseNameFields(t)}
            onSubmit={handleEditSubmit}
            defaultValues={selectedExpenseName || {}}
            isSubmitting={updateExpenseName.isPending}
            title={t('forms.edit_expense_name')}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}