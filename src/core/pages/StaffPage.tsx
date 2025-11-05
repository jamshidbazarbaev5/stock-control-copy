import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  type Staff,
  useGetStaffs,
  useUpdateStaff,
  useDeleteStaff,
} from '../api/staff';
import { useGetStores } from '../api/store';
import { ResourceTable } from '../helpers/ResourseTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResourceForm } from '../helpers/ResourceForm';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGetUsers } from '../api/user';

interface StaffFormData {
  is_active: string | boolean;  // Can be string from form or boolean from API
  store: number | string;  // Can be string from form or number from API
  user: number | string;   // Can be string from form or number from API
}

export default function StaffPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const { t } = useTranslation();
    const navigate = useNavigate();
  // Fetch data
  const { data: staffData, isLoading } = useGetStaffs({});
  const { data: storesData } = useGetStores({});
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  // Transform data for the table
  const staffs = Array.isArray(staffData) ? staffData : staffData?.results || [];
  const totalCount = Array.isArray(staffData) ? staffData.length : staffData?.count || 0;

  // Get stores for the form
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const storeOptions = stores.map(store => ({
    value: store.id,
    label: store.name,
  }));

  const columns = [
    {
      header: t('forms.name'),
      accessorKey: 'user_read',
      cell: (staff: Staff) => staff.user_read?.name || '-',
    },
    {
      header: t('forms.phone_number'),
      accessorKey: 'user_read',
      cell: (staff: Staff) => staff.user_read?.phone_number || '-',
    },
    {
      header: t('forms.role'),
      accessorKey: 'user_read',
      cell: (staff: Staff) => staff.user_read?.role || '-',
    },
    {
      header: t('forms.store'),
      accessorKey: 'store_read',
      cell: (staff: Staff) => staff.store_read?.name || '-',
    },
    {
      header: t('forms.status'),
      accessorKey: 'is_active',
      cell: (staff: Staff) => (
        <span className={staff.is_active ? 'text-green-600' : 'text-red-600'}>
          {staff.is_active ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
    {
      header: t('forms.date_joined'),
      accessorKey: 'date_joined',
      cell: (staff: Staff) => new Date(staff.date_joined).toLocaleDateString(),
    },
  ];

  const { data: usersData } = useGetUsers({});
  const users = Array.isArray(usersData) ? usersData : usersData?.results || [];
  const userOptions = users.map(user => ({
    value: user.id,
    label: `${user.name} (${user.phone_number})`
  }));

  const staffFields = [
    {
      name: 'user',
      label: t('forms.user'),
      type: 'select',
      placeholder: t('placeholders.select_user'),
      required: true,
      options: userOptions
    },
    {
      name: 'store',
      label: t('forms.store'),
      type: 'select',
      placeholder: t('placeholders.select_store'),
      required: true,
      options: storeOptions,
    },
    {
      name: 'is_active',
      label: t('forms.status'),
      type: 'select',
      placeholder: t('placeholders.select_status'),
      required: true,
      options: [
        { value: true, label: t('common.active') },
        { value: false, label: t('common.inactive') },
      ],
    },
  ];

  const handleEdit = (staff: Staff) => {
    if (!staff.user_read?.id || !staff.store_read?.id) {
      toast.error(t('messages.error.invalid_data'));
      return;
    }
    
    // Prepare form data with the exact fields our form needs
    const formData = {
      user: staff.user_read.id,
      store: staff.store_read.id,
      is_active: staff.is_active,  // Keep as boolean
      id: staff.id,
      date_joined: staff.date_joined,
    };

    setEditingStaff(formData);
    setIsFormOpen(true);
  };

  const handleUpdateSubmit = async (data: StaffFormData) => {
    if (!editingStaff) return;

    try {
      // Convert string values to numbers and remove the mixed-type properties
      const store = typeof data.store === 'string' ? parseInt(data.store) : data.store;
      const user = typeof data.user === 'string' ? parseInt(data.user) : data.user;
      
      await updateStaff.mutateAsync({
        ...editingStaff,
        store_write: store,
        user_write: user,
        is_active: Boolean(data.is_active),
      });
      toast.success(t('messages.success.updated', { item: t('navigation.staff') }));
      setIsFormOpen(false);
      setEditingStaff(null);
    } catch (error) {
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteStaff.mutateAsync(id);
      toast.success(t('messages.success.deleted', { item: t('navigation.staff') }));
    } catch (error) {
      toast.error(t('messages.error.delete', { item: t('navigation.staff') }));
      console.error('Failed to delete staff:', error);
    }
  };

  return (
    <div className="container py-8 px-4">
         <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('navigation.staff')}</h1>
        <Button onClick={() => navigate('/create-staff')}>{t('common.create')} </Button>
      </div>
      <ResourceTable<Staff>
        data={staffs}
        columns={columns}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        totalCount={totalCount}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.edit') + ' ' + t('navigation.staff')}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            fields={staffFields}
            onSubmit={handleUpdateSubmit}
            isSubmitting={updateStaff.isPending}
            defaultValues={editingStaff || {}}
            title=''
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
