import { ResourceForm } from '../helpers/ResourceForm';
import { useTranslation } from 'react-i18next';
import { createSponsor } from '../api/sponsors';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CreateSponsorPage() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const fields = [
    { name: 'name', label: t('forms.name'), type: 'text', required: true },
    { name: 'phone_number', label: t('forms.phone'), type: 'text', required: true },
  ];

  const handleSubmit = async (data: { name: string; phone_number: string }) => {
    try {
      await createSponsor(data);
      toast.success(t('messages.success.created', { item: t('navigation.sponsors') }));
      navigate('/sponsors');
      // Optionally redirect or reset form
    } catch (e) {
    }
  };

  return (
    <div className="container py-8 px-4">
      <ResourceForm
        fields={fields}
        onSubmit={handleSubmit}
        title={t('common.create')}
      />
    </div>
  );
}
