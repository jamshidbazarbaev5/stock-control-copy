import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceTable } from '../helpers/ResourseTable';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import { type LabelSize, useGetLabelSizes, useUpdateLabelSize } from '../api/label-size';

const labelSizeFields = (t: any) => [
    {
        name: 'width',
        label: t('forms.width'),
        type: 'number',
        placeholder: t('placeholders.enter_width'),
        required: true,
    },
    {
        name: 'height',
        label: t('forms.height'),
        type: 'number',
        placeholder: t('placeholders.enter_height'),
        required: true,
    },
];

const columns = (t: any) => [
    {
        header: t('forms.width'),
        accessorKey: 'width',
    },
    {
        header: t('forms.height'),
        accessorKey: 'height',
    },
];

export default function LabelSizesPage() {
    const navigate = useNavigate();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLabelSize, setEditingLabelSize] = useState<LabelSize | null>(null);
//   const [searchTerm] = useState('');
    const { t } = useTranslation();

    const { data: labelSizesData, isLoading } = useGetLabelSizes({
        params: {}
    });

    const fields = labelSizeFields(t);

    // Get the label sizes array from the response
    const labelSizes = (Array.isArray(labelSizesData) ? labelSizesData : []) as LabelSize[];

    const { mutate: updateLabelSize, isPending: isUpdating } = useUpdateLabelSize();

    const handleEdit = (labelSize: LabelSize) => {
        setEditingLabelSize(labelSize);
        setIsFormOpen(true);
    };

    const handleUpdateSubmit = (data: Partial<LabelSize>) => {
        if (!editingLabelSize?.id) return;

        updateLabelSize(
            { ...data, id: editingLabelSize.id } as LabelSize,
            {
                onSuccess: () => {
                    toast.success(t('messages.success.updated', { item: t('navigation.labelSizes') }));
                    setIsFormOpen(false);
                    setEditingLabelSize(null);
                },
            }
        );
    };


    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t('navigation.labelSizes')}</h1>
            </div>

            <ResourceTable
                data={labelSizes}
                columns={columns(t)}
                isLoading={isLoading}
                onEdit={handleEdit}
                onAdd={() => navigate('/create-label-size')}
                totalCount={labelSizes.length}
                pageSize={30}
                currentPage={1}
                onPageChange={() => {}}
            />

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <ResourceForm
                        fields={fields}
                        onSubmit={handleUpdateSubmit}
                        defaultValues={editingLabelSize || {}}
                        isSubmitting={isUpdating}
                        title={t('messages.edit')}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
