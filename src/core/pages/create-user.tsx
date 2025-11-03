import { useNavigate } from 'react-router-dom';
import { ResourceForm } from '../helpers/ResourceForm';
import { useTranslation } from 'react-i18next';
import { useGetStores } from '../api/store';
import { toast } from 'sonner';
import { useCreateUser } from '../api/user';

interface UserFormData {
  name: string;
  phone_number: string;
  role: string;
  password: string;
  store: number;
  can_view_quantity:boolean;
  
  is_active: boolean;
  is_mobile_user:boolean;
}

export default function CreateUser() {
  const navigate = useNavigate();
  const createStaff = useCreateUser();
  const { t } = useTranslation();
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  // Custom mask for +998 phone numbers, no spaces
  const formatUzPhone = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    digits = digits.slice(0, 9);
    return '+998' + digits;
  };

  const userFields = [
    {
      name: 'name',
      label: t('forms.name'),
      type: 'text',
      placeholder: t('placeholders.enter_name'),
      required: true,
    },
    {
      name: 'phone_number',
      label: t('forms.phone'),
      type: 'text',
      placeholder: '+998970953905',
      required: true,
      onChange: (value: string) => formatUzPhone(value),
      maxLength: 13,
      inputMode: 'numeric',
      autoComplete: 'tel',
    },
    {
      name: 'role',
      label: t('forms.role'),
      type: 'select',
      placeholder: t('placeholders.select_role'),
      required: true,
      options: [
        { value: 'Администратор', label: t('roles.admin') },
        { value: 'Продавец', label: t('roles.seller') },
      ],
    },
    {
      name: 'password',
      label: t('forms.password'),
      type: 'text',
      placeholder: t('placeholders.enter_password'),
      required: true,
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
      placeholder: t('placeholders.select_status'),
      required: true,
      defaultValue: true,
      options: [
        { value: true, label: t('common.active') },
        { value: false, label: t('common.inactive') },
      ],
    },
    {
      name: 'is_mobile_user',
      label: t('forms.is_mobile_user'),
      type: 'select',
      placeholder: t('placeholders.select_device'),
      required: true,
      defaultValue: true,
      options: [
        { value: true, label: t('common.mobile') },
        { value: false, label: t('common.desktop') },
      ],
    },
    {
      name: 'can_view_quantity',
      label: t('forms.can_view_quantity'),
      type: 'select',
      placeholder: t('placeholders.select_permission'),
      required: true,
      defaultValue: true,
      options: [
        { value: true, label: t('common.yes') },
        { value: false, label: t('common.no') },
      ],
    }
  ];

  const handleSubmit = async (data: UserFormData) => {
    try {
      // Transform the data to match the staff creation endpoint requirements
      const staffData = {
          name: data.name,
          phone_number: data.phone_number,
          role: data.role,
          password: data.password,
          is_mobile_user: data.is_mobile_user,
          can_view_quantity: data.can_view_quantity !== undefined ? Boolean(data.can_view_quantity) : true,
          store_write: Number(data.store),
          is_active: Boolean(data.is_active)
      };

      await createStaff.mutateAsync(staffData as any);
      toast.success(t('messages.success.created', { item: t('navigation.users') }));
      navigate('/users');
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.users') }));
      console.error('Failed to create user:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ResourceForm<UserFormData>
        fields={userFields}
        onSubmit={handleSubmit}
        isSubmitting={createStaff.isPending}
        title={t('common.create') + ' ' + t('navigation.users')}
      />
    </div>
  );
}