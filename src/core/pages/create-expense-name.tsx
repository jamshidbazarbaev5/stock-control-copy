import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ExpenseName, useCreateExpenseName } from '../api/expense-name';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function CreateExpenseName() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createExpenseName = useCreateExpenseName();
  const [name, setName] = useState('');
  const [reduceFromBudget, setReduceFromBudget] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createExpenseName.mutateAsync({ name, reduce_from_budget: reduceFromBudget } as ExpenseName);
      toast.success(t('messages.success.expense_name_created'));
      navigate('/expense-name');
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">{t('pages.create_expense_name')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">{t('forms.expense_name')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('placeholders.enter_name')}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reduce_from_budget"
            checked={reduceFromBudget}
            onChange={(e) => setReduceFromBudget(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <Label htmlFor="reduce_from_budget" className="cursor-pointer font-normal">
            {t('forms.reduce_from_budget') || 'Вычитать из бюджета'}
          </Label>
        </div>

        <Button type="submit" disabled={createExpenseName.isPending}>
          {t('buttons.save')}
        </Button>
      </form>
    </div>
  );
}
