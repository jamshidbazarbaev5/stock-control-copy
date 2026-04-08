import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateVehicle } from '../api/vehicle';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function CreateVehicle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createVehicle = useCreateVehicle();
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createVehicle.mutateAsync({ name } as any);
      toast.success(t('messages.success.created', { item: t('navigation.vehicles') }));
      navigate('/vehicles');
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.vehicles') }));
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">{t('common.create')} {t('forms.vehicle')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">{t('forms.vehicle')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('placeholders.enter_vehicle_name')}
            required
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/vehicles')}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="flex-1" disabled={createVehicle.isPending}>
            {t('buttons.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
