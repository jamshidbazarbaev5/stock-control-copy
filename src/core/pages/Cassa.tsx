import { useState,  } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceTable } from '../helpers/ResourseTable';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import {type Cassa, useGetCassas, useUpdateCassa} from "@/core/api/cassa.ts";

const categoryFields = (t: any) => [
    {
        name: 'name',
        label: t('forms.cassa_name'),
        type: 'text',
        placeholder: t('placeholders.enter_name'),
        required: true,
    },

];

const columns = (t:any) => [
    // {
    //   header: 'table.number',
    //   accessorKey: 'displayId',
    // },
    {
        header: t('forms.cassa_name'),
        accessorKey: 'name',
    },
    {
        header: t('forms.store'),
        accessorKey: (row:any) => row.store?.name,
    },
];


export default function CassasPage() {
    const navigate = useNavigate();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCassa, setEditingCassa] = useState<Cassa | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { t } = useTranslation();
    const { data: casassData, isLoading } = useGetCassas({
        params: {
            category_name: searchTerm
        }
    });

    const fields = categoryFields(t);


    // @ts-ignore
    const enhancedCassas = casassData?.results.map((cassa: Cassa, index: number) => ({
        ...cassa,
        displayId: index + 1
    }));

    const { mutate: updateCassa, isPending: isUpdating } = useUpdateCassa();
    // const { mutate: deleteCategory } = useDeleteCategory();

    const handleEdit = ( cassa: Cassa) => {

        setEditingCassa(cassa);
        setIsFormOpen(true);
    };

    const handleUpdateSubmit = (data: Partial<Cassa>) => {
        if (!editingCassa?.id) return;

        updateCassa(
            { ...data, id: editingCassa.id } as Cassa,
            {
                onSuccess: () => {
                    toast.success(t('messages.success.updated', { item: t('navigation.categories') }));
                    setIsFormOpen(false);
                    setEditingCassa(null);
                },
            }
        );
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
                <h1 className="text-2xl font-bold">{t('navigation.cassa')}</h1>
                {/* <Button onClick={() => navigate('/create-recycling')}>
          {t('common.create')} {t('navigation.recyclings')}
        </Button> */}
            </div>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder={t('placeholders.search_cassa')}
                    className="w-full p-2 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <ResourceTable
                data={enhancedCassas}
                columns={columns(t)}
                isLoading={isLoading}
                onEdit={handleEdit}
                // onDelete={handleDelete}
                onAdd={() => navigate('/create-cassa')}
                totalCount={enhancedCassas?.length}
                pageSize={30}
                currentPage={1}
                onPageChange={() => {}}
            />

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <ResourceForm
                        fields={fields.map(field => ({
                            ...field,
                            // label: t(field.label),
                            // placeholder: t(field.placeholder)
                        }))}
                        onSubmit={handleUpdateSubmit}
                        defaultValues={editingCassa || {}}
                        isSubmitting={isUpdating}
                        title={t('messages.edit',)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
