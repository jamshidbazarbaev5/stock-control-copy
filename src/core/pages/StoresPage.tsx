import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import { type Store, useGetStores, useUpdateStore, useDeleteStore } from '../api/store';
import { useGetUsers } from '../api/user';
import { Button } from '@/components/ui/button';
import { Building2, Phone, MapPin, Plus, Pencil, Trash2, Store as StoreIcon, ArrowLeft, ArrowRight, DollarSign } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface StoreFormData {
  id?: number;
  name: string;
  address: string;
  phone_number: string;
  budget: string;
  is_main: boolean;
  parent_store: string;
  color: string; // hex color
}

const storeFields = (t: (key: string) => string) => [
  {
    name: 'name',
    label: t('forms.store_name'),
    type: 'text',
    placeholder: t('placeholders.enter_name'),
    required: true,
  },
  {
    name: 'address',
    label: t('forms.address'),
    type: 'text',
    placeholder: t('placeholders.enter_address'),
    required: true,
  },
  {
    name: 'phone_number',
    label: t('forms.phone'),
    type: 'text',
    placeholder: t('placeholders.enter_phone'),
    required: true,
  },
  {
    name: 'is_main',
    label: t('forms.is_main_store'),
    type: 'select',
    placeholder: t('placeholders.select_store_type'),
    required: true,
    options: [
      { value: true, label: t('common.yes') },
      { value: false, label: t('common.no') },
    ],
  },
  {
    name: 'parent_store',
    label: t('forms.parent_store'),
    type: 'select',
    placeholder: t('placeholders.select_store'),
    required: false,
    options: [], // Will be populated with stores
  },
  {
    name: 'color',
    label: t('forms.color'),
    type: 'color',
    placeholder: '#000000',
    required: true,
  },
];

export default function StoresPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreFormData | null>(null);

  const { data: storesData, isLoading } = useGetStores({
    params: {
      page: page,
      page_size: 10,
      ordering: '-created_at',
    },
  });
  
  const { data: usersData } = useGetUsers({});
  // Get all stores for parent store dropdown
  const { data: allStoresData } = useGetStores({});

  // Handle both array and object response formats
  const results = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const totalCount = Array.isArray(storesData) ? storesData.length : storesData?.count || 0;

  const stores = results.map((store, index) => ({
    ...store,
    displayId: (page - 1) * 10 + index + 1,
  }));

  // Prepare options for select inputs
  const users = Array.isArray(usersData) ? usersData : usersData?.results || [];
  const allStores = Array.isArray(allStoresData) ? allStoresData : allStoresData?.results || [];

  // Update field options with dynamic data
  const fields = storeFields(t).map(field => {
    if (field.name === 'owner') {
      return {
        ...field,
        options: users.map(user => ({ value: String(user?.id ?? ''), label: user.name }))
      };
    }
    if (field.name === 'parent_store') {
      return {
        ...field,
        options: [
          { value: '0', label: t('common.no') },
          ...allStores.map(store => ({ value: String(store?.id ?? ''), label: store.name }))
        ]
      };
    }
    return field;
  });

  const { mutate: updateStore, isPending: isUpdating } = useUpdateStore();
  const { mutate: deleteStore } = useDeleteStore();

  const handleEdit = (store: Store) => {
    const formattedStore: StoreFormData = {
      ...store,
      color: store.color || '#000000',
      is_main: store.is_main,
      parent_store: store.parent_store?.toString() ?? '0',
    };
    setEditingStore(formattedStore);
    setIsFormOpen(true);
  };

  const handleUpdateSubmit = (data: StoreFormData) => {
    if (!editingStore?.id) return;

    const formattedData = {
      ...data,
      color: data.color,
      id: editingStore.id,
      parent_store: data.parent_store === '0' ? null : parseInt(data.parent_store, 10),
      is_main: data.is_main === true || data.is_main.toString() === 'true'
    };

    updateStore(
      formattedData as Store,
      {
        onSuccess: () => {
          toast.success(t('messages.success.updated', { item: t('navigation.stores') }));
          setIsFormOpen(false);
          setEditingStore(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteStore(id, {
      onSuccess: () => toast.success(t('messages.success.deleted', { item: t('navigation.stores') })),
      onError: () => toast.error(t('messages.error.delete', { item: t('navigation.stores') })),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto py-8 px-4 bg-white dark:bg-card">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('navigation.stores')}</h1>
            <p className="text-gray-500">{t('common.total')}: {totalCount}</p>
          </div>
          <Button 
            onClick={() => navigate('/create-store')} 
            className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('common.create')}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store:any) => (
                <Card 
                  key={store.id} 
                  className="bg-white dark:bg-card shadow-md hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]">
                      <span className="inline-block w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: store.color || '#000' }}></span>
                      <StoreIcon className="h-5 w-5 text-primary" />
                      {store.name}
                    </CardTitle>
                    {store.is_main && (
                      <span className="absolute bottom-13 right-4 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {t('common.main_store')}
                      </span>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="h-4 w-4 text-primary/60" />
                      <span className="text-sm">{store.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Phone className="h-4 w-4 text-primary/60" />
                      <span className="text-sm">{store.phone_number}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Building2 className="h-4 w-4 text-primary/60" />
                      <span className="text-sm">{store.is_main ? t('common.yes') : t('common.no')}</span>
                    </div>
                    
                    {/* Budget Breakdown */}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-primary/60" />
                        <span className="text-sm font-semibold text-gray-700">{t('forms.store_budgets')}</span>
                      </div>
                      {store.budgets && store.budgets.length > 0 ? (
                        <div className="space-y-1 ml-6">
                          {store.budgets.map((budget:any) => (
                            <div key={budget.id} className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">{budget.budget_type}:</span>
                              <span className="font-medium">{Number(budget.amount).toLocaleString()} {budget.budget_type === 'Валюта' ? '$' : 'UZS'}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center text-sm font-semibold border-t pt-1 mt-1">
                            <span className="text-gray-700">{t('forms.total_budget')}:</span>
                            <span className="text-green-600">{Number(store.budget).toLocaleString()} UZS</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 ml-6">
                          {Number(store.budget).toLocaleString()} UZS
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(store)}
                      className="hover:bg-primary/5 hover:text-primary flex items-center gap-1"
                    >
                      <Pencil className="h-4 w-4" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(store.id || 0)}
                      className="hover:bg-red-50 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('common.delete')}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-2 hover:bg-primary/5 hover:text-primary disabled:hover:bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.previous')}
              </Button>
              <span className="text-sm px-4 py-2 bg-gray-50 rounded-md">
                {t('common.page')} {page} {t('common.of')} {Math.ceil(totalCount / 10)}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalCount / 10)}
                className="flex items-center gap-2 hover:bg-primary/5 hover:text-primary disabled:hover:bg-transparent"
              >
                {t('common.next')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogDescription className="mb-4">
              {/* {t('messages.edit', { item: t('navigation.stores').toLowerCase() })} */}
            </DialogDescription>
            <ResourceForm
              fields={fields}
              onSubmit={handleUpdateSubmit}
              defaultValues={editingStore || undefined}
              isSubmitting={isUpdating}
              title={t('common.edit') + ' ' + t('navigation.stores').toLowerCase()}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}