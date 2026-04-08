import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResourceForm } from '@/core/helpers/ResourceForm';
import { useTranslation } from 'react-i18next';
import { useGetStores } from '@/core/api/store';

interface CreateLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sponsorId: number | null;
  onCreate: (data: { total_amount: number; currency: string; due_date: string; sponsor_write: number; payment_type: string; store?: number }) => Promise<void>;
}

export function CreateLoanModal({ open, onOpenChange, sponsorId, onCreate }: CreateLoanModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  const fields = [
    {
      name: 'store',
      label: t('forms.store'),
      type: 'select',
      required: true,
      options: stores.map(s => ({ value: s.id, label: s.name })).filter(o => o.value),
      placeholder: t('placeholders.select_store'),
    },
    {
      name: 'total_amount',
      label: t('forms.amount'),
      type: 'number',
      required: true,
      placeholder: t('forms.amount'),
    },

    {
      name: 'payment_type',
      label: t('forms.payment_method'),
      type: 'select',
      required: true,
      options: [
        { value: 'Наличные', label: t('forms.cash') },
        { value: 'Карта', label: t('forms.card') },
        { value: 'Click', label: t('forms.click') },
        { value: 'Перечисление', label: t('forms.transfer') },
        { value: 'Валюта', label: t('forms.rate') },
      ],
      placeholder: t('placeholders.select_payment_method'),
    },
    {
      name: 'due_date',
      label: t('forms.due_date'),
      type: 'date',
      required: true,
      placeholder: t('forms.due_date'),
      inputMode: 'date',
    },
  ];

  const handleSubmit = async (data: any) => {
    if (!sponsorId) return;
    setLoading(true);
    try {
      await onCreate({ ...data, sponsor_write: sponsorId });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Создать займ')}</DialogTitle>
        </DialogHeader>
        <ResourceForm
          fields={fields}
          onSubmit={handleSubmit}
          isSubmitting={loading}
          hideSubmitButton={false}
        >

        </ResourceForm>
      </DialogContent>
    </Dialog>
  );
}
