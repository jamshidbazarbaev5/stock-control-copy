import { ResourceForm } from '../helpers/ResourceForm';
import { useTranslation } from 'react-i18next';
import { fetchDriverDetails, useUpdateDriver } from '../api/driver';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Driver } from '../api/driver';

export default function EditDriver() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const updateDriver = useUpdateDriver();
  const [initialValues, setInitialValues] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDriver() {
      setLoading(true);
      try {
        const driver = await fetchDriverDetails(parseInt(id!));
        setInitialValues(driver);
      } catch (e) {
        toast.error(t('messages.error.not_found', { item: t('navigation.drivers') }));
        navigate('/drivers');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadDriver();
    }
  }, [id, t, navigate]);

  const fields = [
    {
      name: 'full_name',
      label: t('forms.full_name'),
      type: 'text',
      placeholder: t('placeholders.enter_full_name'),
      required: true,
    },
  ];

  const handleSubmit = async (data: Driver) => {
    try {
      await updateDriver.mutateAsync({ ...data, id: parseInt(id!) });
      toast.success(t('messages.success.updated', { item: t('navigation.drivers') }));
      navigate('/drivers');
    } catch (e) {
      toast.error(t('messages.error.update', { item: t('navigation.drivers') }));
    }
  };

  if (loading || !initialValues) {
    return <div className="container py-8 px-4">{t('common.loading')}</div>;
  }

  return (
    <div className="container py-8 px-4">
      <ResourceForm
        fields={fields}
        onSubmit={handleSubmit}
        title={t('common.edit')}
        defaultValues={initialValues}
        isSubmitting={updateDriver.isPending}
      >
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/drivers')}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </ResourceForm>
    </div>
  );
}
