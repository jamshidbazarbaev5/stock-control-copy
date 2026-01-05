import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Vehicle } from '../api/vehicle';
import { useCreateVehicle } from '../api/vehicle';
import { useTranslation } from 'react-i18next';
import { ResourceForm } from '../helpers/ResourceForm';

export default function CreateVehicle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createVehicle = useCreateVehicle();

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
      await createVehicle.mutateAsync(data);
      toast.success(t('messages.success.created', { item: t('navigation.vehicles') }));
      navigate('/vehicles');
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.vehicles') }));
    }
  };

  return (
    <div className="container py-8 px-4">
      <ResourceForm
        fields={fields}
        onSubmit={handleSubmit}
        title={t('common.create')}
        isSubmitting={createVehicle.isPending}
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
