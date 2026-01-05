import { ResourceForm } from '../helpers/ResourceForm';
import { useTranslation } from 'react-i18next';
import { fetchVehicleDetails, useUpdateVehicle } from '../api/vehicle';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Vehicle } from '../api/vehicle';

export default function EditVehicle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const updateVehicle = useUpdateVehicle();
  const [initialValues, setInitialValues] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVehicle() {
      setLoading(true);
      try {
        const vehicle = await fetchVehicleDetails(parseInt(id!));
        setInitialValues(vehicle);
      } catch (e) {
        toast.error(t('messages.error.not_found', { item: t('navigation.vehicles') }));
        navigate('/vehicles');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadVehicle();
    }
  }, [id, t, navigate]);

  const fields = [
    {
      name: 'name',
      label: t('forms.vehicle'),
      type: 'text',
      placeholder: t('placeholders.enter_vehicle_name'),
      required: true,
    },
  ];

  const handleSubmit = async (data: Vehicle) => {
    try {
      await updateVehicle.mutateAsync({ ...data, id: parseInt(id!) });
      toast.success(t('messages.success.updated', { item: t('navigation.vehicles') }));
      navigate('/vehicles');
    } catch (e) {
      toast.error(t('messages.error.update', { item: t('navigation.vehicles') }));
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
        isSubmitting={updateVehicle.isPending}
      >
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/vehicles')}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </ResourceForm>
    </div>
  );
}
