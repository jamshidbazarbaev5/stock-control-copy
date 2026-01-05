import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Driver } from '../api/driver';
import { useCreateDriver } from '../api/driver';
import { useTranslation } from 'react-i18next';
import { ResourceForm } from '../helpers/ResourceForm';

export default function CreateDriver() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createDriver = useCreateDriver();

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
      await createDriver.mutateAsync(data);
      toast.success(t('messages.success.created', { item: t('navigation.drivers') }));
      navigate('/drivers');
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.drivers') }));
    }
  };

  return (
    <div className="container py-8 px-4">
      <ResourceForm
        fields={fields}
        onSubmit={handleSubmit}
        title={t('common.create')}
        isSubmitting={createDriver.isPending}
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
