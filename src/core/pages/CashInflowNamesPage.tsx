import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetCashInflowNames, type CashInflowName, useCreateCashInflowName, useUpdateCashInflowName, useDeleteCashInflowName } from '../api/cash-inflow-name';
import { ResourceForm } from '../helpers/ResourceForm';
import { ResourceTable } from '../helpers/ResourseTable';

export default function CashInflowNamesPage() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCashFlowName, setSelectedCashFlowName] = useState<CashInflowName | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: cashInflowNamesData, isLoading } = useGetCashInflowNames({});
  const createCashFlowName = useCreateCashInflowName();
  const updateCashFlowName = useUpdateCashInflowName();
  const deleteCashFlowName = useDeleteCashInflowName();

  const cashInflowNames = Array.isArray(cashInflowNamesData) ? cashInflowNamesData : cashInflowNamesData?.results || [];

  const columns = [
    {
      accessorKey: 'name',
      header: t('forms.name'),
    }
  ];

  const fields = [
    {
      name: 'name',
      label: t('forms.name'),
      type: 'text',
      placeholder: t('placeholders.enter_name'),
      required: true,
    },
  ];

  const handleCreateSubmit = async (data: CashInflowName) => {
    try {
      await createCashFlowName.mutateAsync(data);
      toast.success(t('messages.success.created', { item: t('navigation.cash_inflow_name') }));
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.cash_inflow_name') }));
      console.error('Failed to create cash inflow name:', error);
    }
  };

  const handleUpdate = async (data: Partial<CashInflowName>) => {
    if (!selectedCashFlowName?.id) return;

    try {
      const updateData: CashInflowName = {
        id: selectedCashFlowName.id,
        name: data.name || ''
      };
      
      await updateCashFlowName.mutateAsync(updateData);
      toast.success(t('messages.success.updated', { item: t('navigation.cash_inflow_name') }));
      setSelectedCashFlowName(null);
    } catch (error) {
      toast.error(t('messages.error.update', { item: t('navigation.cash_inflow_name') }));
      console.error('Failed to update cash inflow name:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCashFlowName.mutateAsync(id);
      toast.success(t('messages.success.deleted', { item: t('navigation.cash_inflow_name') }));
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('navigation.cash_inflow_names')}</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>{t('common.create')}</Button>
      </div>

      <ResourceTable
        columns={columns}
        data={cashInflowNames}
        isLoading={isLoading}
        onEdit={setSelectedCashFlowName}
        onDelete={handleDelete}
        pageSize={pageSize}
        totalCount={Array.isArray(cashInflowNamesData) ? cashInflowNames.length : cashInflowNamesData?.count || 0}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('forms.create_cash_inflow_name')}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            fields={fields}
            onSubmit={handleCreateSubmit}
            isSubmitting={createCashFlowName.isPending}
            title={t('forms.create_cash_inflow_name')}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCashFlowName} onOpenChange={() => setSelectedCashFlowName(null)}>
        <DialogContent>
          {selectedCashFlowName && (
            <ResourceForm<CashInflowName>
              fields={fields}
              onSubmit={handleUpdate}
              defaultValues={selectedCashFlowName}
              isSubmitting={updateCashFlowName.isPending}
              title={t('common.edit') + ' ' + t('navigation.cash_inflow_name')}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
