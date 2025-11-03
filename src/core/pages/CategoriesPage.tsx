import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceTable } from '../helpers/ResourseTable';
import { type Category, useGetCategories } from '../api/category';


const columns = (t: any) => [
  {
    header: t('forms.category_name'),
    accessorKey: 'category_name',
  },
  {
    header: t('forms.attributes'),
    accessorKey: 'attributes_read',
    cell: (row: any) => {
      const category = row;
      const attributesRead = category?.attributes_read || [];
      
      // Debug logging
      console.log('Category:', category?.category_name, 'Attributes:', attributesRead);
      
      if (!attributesRead || attributesRead.length === 0) {
        return <span className="text-gray-400">-</span>;
      }
      
      return (
        <div className="space-y-1">
          {attributesRead.map((attr: any, index: number) => (
            <div key={attr.id || index} className="text-sm">
              <span className="font-medium">
                {attr.translations?.ru || attr.name || 'Unknown'}
              </span>
              <span className="text-gray-500 ml-1">
                ({attr.field_type || 'unknown'})
              </span>
              {attr.field_type === 'choice' && attr.choices && attr.choices.length > 0 && (
                <div className="text-xs text-gray-400 ml-2">
                  [{attr.choices.join(', ')}]
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
  },
];

// Removed CategoryResponse type as we handle response dynamically

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { t } = useTranslation();
  const { data: categoriesData, isLoading } = useGetCategories({
    params: {
      category_name: searchTerm
    }
  });

    // Debug the raw API response
  console.log('Raw categoriesData:', categoriesData);

  // Get the categories array from the paginated response
  // Handle both direct array and paginated response formats
  let categories: Category[] = [];
  if (categoriesData) {
    if (Array.isArray(categoriesData)) {
      categories = categoriesData;
    } else if ((categoriesData as any).results) {
      categories = (categoriesData as any).results;
    } else {
      categories = [];
    }
  }
  
  // Debug the extracted categories
  console.log('Extracted categories:', categories);

  // Enhance categories with display ID
  const enhancedCategories = categories.map((category: Category, index: number) => ({
    ...category,
    displayId: index + 1
  }));

  const handleEdit = (category: Category) => {
    navigate(`/edit-category/${category.id}`);
  };

  // const handleDelete = (id: number) => {
  //   deleteCategory(id, {
  //     onSuccess: () => toast.success(t('messages.success.deleted', { item: t('navigation.categories') })),
  //     onError: () => toast.error(t('messages.error.delete', { item: t('navigation.categories') })),
  //   });
  // };

  return (
    <div className="container mx-auto py-6">
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('navigation.categories')}</h1>
        {/* <Button onClick={() => navigate('/create-recycling')}>
          {t('common.create')} {t('navigation.recyclings')}
        </Button> */}
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder={t('placeholders.search_category')}
          className="w-full p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <ResourceTable
        data={enhancedCategories}
        columns={columns(t)}
        isLoading={isLoading}
        onEdit={handleEdit}
        // onDelete={handleDelete}
        onAdd={() => navigate('/create-category')}
        totalCount={enhancedCategories.length}
        pageSize={30}
        currentPage={1}
        onPageChange={() => {}}
      />


    </div>
  );
}
