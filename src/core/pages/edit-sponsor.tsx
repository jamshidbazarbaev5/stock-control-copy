import { ResourceForm } from '../helpers/ResourceForm';
import { useTranslation } from 'react-i18next';
import { fetchSponsors, updateSponsor } from '../api/sponsors';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function EditSponsorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [initialValues, setInitialValues] = useState<{ name: string; phone_number: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSponsor() {
      setLoading(true);
      try {
        const sponsors = await fetchSponsors();
        const sponsor = sponsors.find(s => s.id === Number(id));
        if (sponsor) {
          setInitialValues({ name: sponsor.name, phone_number: sponsor.phone_number });
        } else {
          toast.error(t('messages.error.not_found', { item: t('navigation.sponsors') }));
          navigate('/sponsors');
        }
      } catch (e) {
        toast.error('Failed to load sponsor');
        navigate('/sponsors');
      } finally {
        setLoading(false);
      }
    }
    loadSponsor();
  }, [id, t, navigate]);

  const fields = [
    { name: 'name', label: t('forms.name'), type: 'text', required: true },
    { name: 'phone_number', label: t('forms.phone'), type: 'text', required: true },
  ];

  const handleSubmit = async (data: { name: string; phone_number: string }) => {
    try {
      await updateSponsor(Number(id), data);
      toast.success(t('messages.success.updated', { item: t('navigation.sponsors') }));
      navigate('/sponsors');
    } catch (e) {
    }
  };

  if (loading || !initialValues) return <div className="container py-8 px-4">{t('common.loading')}</div>;

  return (
    <div className="container py-8 px-4">
      <ResourceForm
        fields={fields}
        onSubmit={handleSubmit}
        title={t('common.edit')}
        defaultValues={initialValues}
      />
    </div>
  );
}
