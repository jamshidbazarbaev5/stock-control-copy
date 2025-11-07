import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDeleteBudget, useGetBudgets } from '../api/budget';
import { ResourceTable } from '../helpers/ResourseTable';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CashInflowHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: budgetData, isLoading } = useGetBudgets({});
  const { mutate: deleteBuget } = useDeleteBudget();
  const budgets = Array.isArray(budgetData) ? budgetData : budgetData?.results || [];
  const handleDelete = (id: number) => {
    deleteBuget(id, {
      onSuccess: () => toast.success(t('messages.success.deleted', { item: t('navigation.categories') })),
      onError: () => toast.error(t('messages.error.delete', { item: t('navigation.categories') })),
    });
  };
  const columns = [
    {
      header: t('forms.store'),
      accessorKey: 'store_read.name',
      cell: (row: any) => row.store_read?.name || '-',
    },
    {
      header: t('forms.amount3'),
      accessorKey: 'amount',
      cell: (row: any) => (
        <div className="text-right font-medium">
          {Number(row.amount).toLocaleString()} {row.budget_type === 'Валюта' ? '$' : 'UZS'}
        </div>
      ),
    },
    {
      header: t('forms.cash_inflow_name'),
      accessorKey: 'cash_inflow_read.name',
      cell: (row: any) => row.cash_inflow_read?.name || '-',
    },
    {
      header: t('forms.comment'),
      accessorKey: 'comment',
      cell: (row: any) => row.comment || '-',
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('forms.history')}</h1>
        <Button onClick={() => navigate('/add-money')}>{t('forms.add_money')}</Button>
      </div>

      <ResourceTable
        columns={columns}
        data={budgets}
        isLoading={isLoading}
        onDelete={handleDelete}
      />
    </div>
  );
}