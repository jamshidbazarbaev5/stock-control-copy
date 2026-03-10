import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ResourceTable } from '../helpers/ResourseTable';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import { type ChargeType, useGetChargeTypes, useDeleteChargeType, useUpdateChargeType, useCreateChargeType } from '../api/charge-type';

const chargeTypeFields = (t: any) => [
  {
    name: 'name',
    label: t('forms.name'),
    type: 'text',
    placeholder: t('placeholders.enter_name'),
    required: true,
  },
];

const columns = (t: any) => [
  {
    header: t('forms.name'),
    accessorKey: 'name',
  },
];

interface PaginatedResponse {
  links: {
    first: string | null;
    last: string | null;
    next: string | null;
    previous: string | null;
  };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: ChargeType[];
  count: number;
}

export default function ChargeTypesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChargeType, setEditingChargeType] = useState<ChargeType | null>(null);
  const [searchTerm, _setSearchTerm] = useState('');
  const { t } = useTranslation();

  const { data: chargeTypesData, isLoading } = useGetChargeTypes({
    params: {
      name: searchTerm,
    },
  });

  const deleteChargeType = useDeleteChargeType();
  const { mutate: updateChargeType, isPending: isUpdating } = useUpdateChargeType();
  const { mutate: createChargeType, isPending: isCreating } = useCreateChargeType();

  // Transform data for the table
  const chargeTypes = (chargeTypesData as PaginatedResponse)?.results || [];

  const fields = chargeTypeFields(t);

  const handleCreate = () => {
    setEditingChargeType(null);
    setIsFormOpen(true);
  };

  const handleEdit = (chargeType: ChargeType) => {
    setEditingChargeType(chargeType);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('messages.confirm_delete'))) {
      try {
        await deleteChargeType.mutateAsync(id);
        toast.success(t('messages.success.deleted'));
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || t('messages.error.general'));
      }
    }
  };

  const handleSubmit = (data: ChargeType) => {
    if (editingChargeType?.id) {
      updateChargeType(
        { id: editingChargeType.id, ...data },
        {
          onSuccess: () => {
            toast.success(t('messages.success.updated'));
            setIsFormOpen(false);
            setEditingChargeType(null);
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.detail || t('messages.error.general'));
          },
        }
      );
    } else {
      createChargeType(
        data,
        {
          onSuccess: () => {
            toast.success(t('messages.success.created', { item: t('navigation.charge_types') }));
            setIsFormOpen(false);
            setEditingChargeType(null);
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.detail || t('messages.error.general'));
          },
        }
      );
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingChargeType(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('navigation.charge_types')}</h1>
        <Button onClick={handleCreate}>{t('common.create')}</Button>
      </div>

      <ResourceTable
        columns={columns(t)}
        data={chargeTypes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent>
          <ResourceForm<ChargeType>
            fields={fields}
            onSubmit={handleSubmit}
            isSubmitting={editingChargeType?.id ? isUpdating : isCreating}
            title={editingChargeType ? t('messages.edit') : t('common.create')}
            defaultValues={editingChargeType || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
