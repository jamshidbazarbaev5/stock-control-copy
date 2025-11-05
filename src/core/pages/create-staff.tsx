import { useNavigate } from 'react-router-dom';
import { ResourceForm } from '../helpers/ResourceForm';
import type { Staff } from '../api/staff';
import { useCreateStaff } from '../api/staff';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useGetStores } from '../api/store';
import { useGetUsers } from '../api/user';

const staffFields = (t: any, stores: any[], users: any[]) => [
  {
    name: 'user',
    label: t('forms.user'),
    type: 'select',
    placeholder: t('placeholders.select_user'),
    required: true,
    options: users.map(user => ({
      value: user.id,
      label: `${user.name} (${user.phone_number})`
    }))
  },
  {
    name: 'store',
    label: t('forms.store'),
    type: 'select',
    placeholder: t('placeholders.select_store'),
    required: true,
    options: stores.map(store => ({
      value: store.id,
      label: store.name
    }))
  },
  {
    name: 'is_active',
    label: t('forms.status'),
    type: 'select',
    defaultValue: true,
    options: [
      { value: true, label: t('common.active') },
      { value: false, label: t('common.inactive') }
    ]
  },
];

export default function CreateStaff() {
  const navigate = useNavigate();
  const createStaff = useCreateStaff();
  const { t } = useTranslation();
  const { data: storesData } = useGetStores();
  const { data: usersData } = useGetUsers();
  const stores = Array.isArray(storesData) ? storesData : (storesData?.results || []);
  const users = Array.isArray(usersData) ? usersData : (usersData?.results || []);

  const handleSubmit = async (data: Staff) => {
    try {
      await createStaff.mutateAsync(data);
      toast.success(t('messages.success.created', { item: t('table.staff') }));
      navigate('/staff');
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ResourceForm<Staff>
        fields={staffFields(t, stores, users)}
        onSubmit={handleSubmit}
        isSubmitting={createStaff.isPending}
        title={t('common.create') + ' ' + t('table.staff')}
      />
    </div>
  );
}