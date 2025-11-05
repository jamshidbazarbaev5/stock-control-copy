import { useNavigate } from 'react-router-dom';
import { ResourceForm } from '../helpers/ResourceForm';
import type { Measurement } from '../api/measurement';
import { useCreateMeasurement } from '../api/measurement';
import { toast } from 'sonner';
import { useGetStores } from '../api/store';
import { useTranslation } from 'react-i18next';
import {t} from "i18next";

const measurementFields = [
  {
    name: 'measurement_name',
    label: 'Measurement Name',
    type: 'text',
    placeholder: 'Enter measurement name',
    required: true,
  },
  {
    name: 'short_name',
    label: 'Short  Name',
    type: 'text',
    placeholder: (t('forms.short_name') as string),
    required: true,
  },
];

export default function CreateMeasurement() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createMeasurement = useCreateMeasurement();
  const { data: storesData } = useGetStores();

  // Transform stores data into options for the select field
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const storeOptions = stores.map(store => ({
    value: store.id,
    label: store.name,
  }));

  // Update the store_write field options and add translations
  const fields = measurementFields.map(field => {
    if (field.name === 'store_write') {
      return { ...field, options: storeOptions };
    }
    // Add translations for field labels and placeholders
    return {
      ...field,
      label: t(`forms.${field.name}`),
      placeholder: t(`placeholders.enter_${field.name === 'measurement_name' ? 'name' : field.name}`),
    };
  });

  const handleSubmit = async (data: Measurement) => {
    try {
      const formattedData = {
        ...data,
      };

      await createMeasurement.mutateAsync(formattedData);
      toast.success(t('messages.success.created', { item: t('navigation.measurements') }));
      navigate('/measurements');
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ResourceForm<Measurement>
        fields={fields}
        onSubmit={handleSubmit}
        isSubmitting={createMeasurement.isPending}
        title={t('forms.measurement_name')}
      />
    </div>
  );
}