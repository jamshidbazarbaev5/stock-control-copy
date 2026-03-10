import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { type ChargeType, useCreateChargeType } from '../api/charge-type';
import { ResourceForm } from '../helpers/ResourceForm';

const chargeTypeFields = (t: any) => [
  {
    name: 'name',
    label: t('forms.name'),
    type: 'text',
    placeholder: t('placeholders.enter_name'),
    required: true,
  },
];

export default function CreateChargeType() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createChargeType = useCreateChargeType();

  const fields = chargeTypeFields(t);

  const handleSubmit = async (data: ChargeType) => {
    try {
      await createChargeType.mutateAsync(data);
      toast.success(t('messages.success.created', { item: t('navigation.charge_types') }));
      navigate('/charge-types');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || t('messages.error.general'));
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ResourceForm<ChargeType>
        fields={fields}
        onSubmit={handleSubmit}
        isSubmitting={createChargeType.isPending}
        title={t('common.create') + ' ' + t('navigation.charge_types')}
      />
    </div>
  );
}
