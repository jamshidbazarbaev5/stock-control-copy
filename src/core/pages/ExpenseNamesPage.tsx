import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { type ExpenseName, useGetExpenseNames, useUpdateExpenseName, useDeleteExpenseName } from '../api/expense-name';
import { ResourceTable } from '../helpers/ResourseTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ExpenseNamesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExpenseName, setSelectedExpenseName] = useState<ExpenseName | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsOverallExpense, setEditIsOverallExpense] = useState(false);
  const [editReduceFromProfit, setEditReduceFromProfit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const { data: expenseNamesData, isLoading } = useGetExpenseNames({
    params: {
      page: currentPage,
      page_size: pageSize,
    },
  });
  const updateExpenseName = useUpdateExpenseName();
  const deleteExpenseName = useDeleteExpenseName();

  const expenseNames = Array.isArray(expenseNamesData) ? expenseNamesData : expenseNamesData?.results || [];
  const totalCount = Array.isArray(expenseNamesData) ? expenseNamesData.length : expenseNamesData?.count || 0;

  const columns = [
    {
      header: t('forms.name'),
      accessorKey: 'name',
    },
    {
      header: 'Общий расход',
      accessorKey: 'is_overall_expense',
      cell: (row: any) => (
        <span>{row.is_overall_expense ? '✓' : '—'}</span>
      ),
    },
    {
      header: 'Расход из прибыли',
      accessorKey: 'reduce_from_profit',
      cell: (row: any) => (
        <span>{row.reduce_from_profit ? '✓' : '—'}</span>
      ),
    },
  ];

  const handleEdit = (expenseName: ExpenseName) => {
    setSelectedExpenseName(expenseName);
    setEditName(expenseName.name);
    setEditIsOverallExpense((expenseName as any).is_overall_expense ?? false);
    setEditReduceFromProfit((expenseName as any).reduce_from_profit ?? false);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpenseName.mutateAsync(id);
      toast.success(t('messages.success.expense_name_deleted'));
    } catch (error) {
      toast.error(t('messages.error.expense_name_delete'));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseName?.id) return;
    try {
      await updateExpenseName.mutateAsync({
        id: selectedExpenseName.id,
        name: editName,
        is_overall_expense: editIsOverallExpense,
        reduce_from_profit: editReduceFromProfit,
      } as any);
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
        pageSize={pageSize}
        totalCount={totalCount}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('forms.edit_expense_name')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">{t('forms.expense_name')}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('placeholders.enter_name')}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-is_overall_expense"
                checked={editIsOverallExpense}
                onChange={(e) => setEditIsOverallExpense(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <Label htmlFor="edit-is_overall_expense" className="cursor-pointer font-normal">
                Общий расход
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-reduce_from_profit"
                checked={editReduceFromProfit}
                onChange={(e) => setEditReduceFromProfit(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <Label htmlFor="edit-reduce_from_profit" className="cursor-pointer font-normal">
                Расход из прибыли
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button type="submit" disabled={updateExpenseName.isPending}>
                {t('buttons.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
