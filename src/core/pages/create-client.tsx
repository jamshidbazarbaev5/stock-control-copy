import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { type Client, useCreateClient } from '../api/client';
import {useGetStores}  from '../api/store.ts'
import { ResourceForm } from '../helpers/ResourceForm';

export default function CreateClient() {
  const navigate = useNavigate();
  const createClient = useCreateClient();
  const { t } = useTranslation();
  const [clientType, setClientType] = useState<'Физ.лицо' | 'Юр.лицо' | 'Магазин'>('Физ.лицо');

  // Custom mask for +998 phone numbers, no spaces
  const formatUzPhone = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    digits = digits.slice(0, 9);
    return '+998' + digits;
  };

  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];

  const commonFields = [
    {
      name: 'type',
      label: t('forms.client_type'),
      type: 'select' as const,
      placeholder: t('placeholders.select_client_type'),
      required: true,
      options: [
        { value: 'Физ.лицо', label: t('client.individual') },
        { value: 'Юр.лицо', label: t('client.corporate') },
        { value: 'Магазин', label: t('client.store') || 'Магазин' },
      ],
      onChange: (value: 'Физ.лицо' | 'Юр.лицо' | 'Магазин') => setClientType(value),
    },
    {
      name: 'name',
      label: clientType === 'Юр.лицо' || clientType === 'Магазин' ? t('forms.company_name') : t('forms.name'),
      type: 'text' as const,
      placeholder: clientType === 'Юр.лицо' || clientType === 'Магазин' ? t('placeholders.enter_company_name') : t('placeholders.enter_name'),
      required: true,
    },
    {
      name: 'phone_number',
      label: t('forms.phone'),
      type: 'text' as const,
      placeholder: '+998970953905',
      required: true,
      onChange: (value: string) => formatUzPhone(value),
      maxLength: 13,
      inputMode: 'numeric',
      autoComplete: 'tel',
    },
    {
      name: 'address',
      label: t('forms.address'),
      type: 'text' as const,
      placeholder: t('placeholders.enter_address'),
      required: true,
    },
  ];

  const corporateFields = [
    {
      name: 'ceo_name',
      label: t('forms.ceo_name'),
      type: 'text' as const,
      placeholder: t('placeholders.enter_ceo_name'),
      required: true,
    },
  ];

  const storeFields = [
    {
      name: 'linked_store',
      label: t('forms.linked_store'),
      type: 'select' as const,
      placeholder: t('placeholders.select_store'),
      required: true,
      options: stores.map(store => ({
        value: store.id?.toString() || '',
        label: store.name,
      })),
    },
  ];

  const handleSubmit = async (data: Client) => {
    try {
      // @ts-ignore
      await createClient.mutateAsync(data);
      toast.success(t('messages.success.created', { item: t('navigation.clients') }));
      navigate('/clients');
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ResourceForm<Client>
        fields={
          clientType === 'Юр.лицо'
            ? [...commonFields, ...corporateFields]
            : clientType === 'Магазин'
              ? [...commonFields, ...storeFields]
              : commonFields
        }
        onSubmit={handleSubmit}
        isSubmitting={createClient.isPending}
        title={t('common.create') + ' ' + t('navigation.clients')}
      />
    </div>
  );
}