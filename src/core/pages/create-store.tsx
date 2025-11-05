import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceForm } from '../helpers/ResourceForm';
import type { Store } from '../api/store';
import { useCreateStore, useGetStores } from '../api/store';
import { useGetUsers } from '../api/user';
import { toast } from 'sonner';

const storeFields = (t: (key: string) => string) => [
  {
    name: 'name',
    label: t('forms.store_name'),
    type: 'text',
    placeholder: t('placeholders.enter_name'),
    required: true,
  },
  {
    name: 'address',
    label: t('forms.address'),
    type: 'text',
    placeholder: t('placeholders.enter_address'),
    required: true,
  },
  {
    name: 'phone_number',
    label: t('forms.phone'),
    type: 'text',
    placeholder: t('placeholders.enter_phone'),
    required: true,
  },
  {
    name: 'is_main',
    label: t('forms.is_main_store'),
    type: 'select',
    placeholder: t('placeholders.select_store_type'),
    required: true,
    options: [
      { value: true, label: t('common.yes') },
      { value: false, label: t('common.no') },
    ],
  },
  {
    name: 'parent_store',
    label: t('forms.parent_store'),
    type: 'select',
    placeholder: t('placeholders.select_store'),
    required: false,
  },
  {
    name: 'color',
    label: t('forms.color'),
    type: 'color', // Use a color input for hex palette
    placeholder: '#000000',
    required: true,
  },
];

export default function CreateStore() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createStore = useCreateStore();
  const { data: usersData } = useGetUsers({});
  const { data: storesData } = useGetStores({});

  // Prepare options for select inputs
  const users = Array.isArray(usersData) ? usersData : usersData?.results || [];
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  // Update field options with dynamic data
  const fields = storeFields(t).map(field => {
    if (field.name === 'owner') {
      return {
        ...field,
        options: users.map(user => ({ value: user.id, label: user.name }))
      };
    }
    if (field.name === 'parent_store') {
      return {
        ...field,
        options: stores.map(store => ({ value: store.id, label: store.name }))
      };
    }
    return field;
  });

  const handleSubmit = async (data: Store) => {
    try {
      // Convert string values to proper types
      const formattedData = {
        ...data,
        color: data.color, // Ensure color is sent as hex
        owner: typeof data.owner === 'string' ? parseInt(data.owner, 10) : data.owner,
        parent_store: data.parent_store 
          ? (typeof data.parent_store === 'string' 
            ? parseInt(data.parent_store, 10) 
            : data.parent_store)
          : undefined,
      };

      await createStore.mutateAsync(formattedData);
      toast.success(t('messages.success.created', { item: t('navigation.stores') }));
      navigate('/stores');
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ResourceForm<Store>
        fields={fields}
        onSubmit={handleSubmit}
        isSubmitting={createStore.isPending}
        title={t('common.create') + ' ' + t('navigation.stores').toLowerCase()}
      />
    </div>
  );
}