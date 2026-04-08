import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateDriver } from '../api/driver';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function CreateDriver() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createDriver = useCreateDriver();
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    try {
      await createDriver.mutateAsync({ full_name: fullName } as any);
      toast.success(t('messages.success.created', { item: t('navigation.drivers') }));
      navigate('/drivers');
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.drivers') }));
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">{t('common.create')} {t('forms.full_name')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="full_name">{t('forms.full_name')}</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('placeholders.enter_full_name')}
            required
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/drivers')}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={createDriver.isPending}>
            {t('buttons.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
