import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import { useCreateLoanSponsor } from '../api/loansponsor';
import type { LoanSponsor } from '../api/loansponsor';
import { useGetSponsors } from '../api/sponsors';

export default function CreateLoanSponsor() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { mutate: createLoanSponsor, isPending } = useCreateLoanSponsor();
  const { data: sponsorsData } = useGetSponsors({});
  const sponsors = Array.isArray(sponsorsData) ? sponsorsData : (sponsorsData ? [sponsorsData] : []);

  const CURRENCY_CHOICES = [
    { value: 'Доллар', label: 'Доллар' },
    { value: 'Сум', label: 'Сум' },
    { value: 'Рубль', label: 'Рубль' },
    { value: 'Тенге', label: 'Тенге' },
  ];

  const fields = [
    {
      name: 'sponsor_write',
      label: t('forms.sponsor'),
      type: 'select',
      required: true,
      options: sponsors.map((s: any) => ({ value: s.id, label: s.name })),
      placeholder: t('placeholders.select_sponsor'),
    },
    {
      name: 'total_amount',
      label: t('forms.total_amount'),
      type: 'number',
      required: true,
      placeholder: t('placeholders.enter_amount'),
    },
    {
      name: 'currency',
      label: t('forms.currency'),
      type: 'select',
      required: true,
      options: CURRENCY_CHOICES,
      placeholder: t('placeholders.select_currency'),
    },
    {
      name: 'due_date',
      label: t('forms.due_date'),
      type: 'date',
      required: true,
      placeholder: t('placeholders.enter_due_date'),
    },
  ];

  const handleSubmit = (data: Partial<LoanSponsor>) => {
    createLoanSponsor(data as LoanSponsor, {
      onSuccess: () => {
        toast.success(t('messages.success.created', { item: t('navigation.loansponsors') }));
        navigate('/loans');
      },
    });
  };

  return (
    <div className="">
      {/* <h1 className="text-2xl font-bold mb-6">{t('messages.create')} {t('navigation.loansponsors')}</h1> */}
      <ResourceForm
        fields={fields}
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        title={t('messages.create')}
      />
    </div>
  );
}
