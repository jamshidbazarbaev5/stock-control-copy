import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Category } from '../api/category';
import { useCreateCategory } from '../api/category';
import { useGetAttributes } from '../api/attribute';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function CreateCategory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createCategory = useCreateCategory();
  const { data: attributes, isLoading: attributesLoading } = useGetAttributes();
  
  const [categoryName, setCategoryName] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]);

  const handleAttributeChange = (attributeId: number, checked: boolean) => {
    if (checked) {
      setSelectedAttributes(prev => [...prev, attributeId]);
    } else {
      setSelectedAttributes(prev => prev.filter(id => id !== attributeId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      toast.error(t('messages.error.required_field', { field: t('forms.category_name') }));
      return;
    }

    try {
      const categoryData: Category = {
        category_name: categoryName,
        attributes: selectedAttributes.length > 0 ? selectedAttributes : undefined,
      };
      
      await createCategory.mutateAsync(categoryData);
      toast.success(t('messages.success.created', { item: t('navigation.categories') }));
      navigate('/categories');
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.categories') }));
      console.error('Failed to create category:', error);
    }
  };

  return (
    <div >
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('common.create')} {t('navigation.categories')}</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category_name">{t('forms.category_name')} *</Label>
            <Input
              id="category_name"
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={t('placeholders.enter_name')}
              required
            />
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">{t('forms.attributes')}</Label>
            {attributesLoading ? (
              <div className="text-sm text-gray-500">{t('common.loading')}...</div>
            ) : attributes && attributes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attributes.map((attribute) => (
                  <div key={attribute.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`attribute-${attribute.id}`}
                      checked={selectedAttributes.includes(attribute.id!)}
                      onCheckedChange={(checked) => 
                        handleAttributeChange(attribute.id!, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`attribute-${attribute.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {attribute.translations?.ru || attribute.name} 
                      <span className="text-gray-500 ml-1">({attribute.field_type})</span>
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">{t('messages.no_data')}</div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={createCategory.isPending}
              className="flex-1"
            >
              {createCategory.isPending ? t('common.creating') : t('common.create')}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/categories')}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
