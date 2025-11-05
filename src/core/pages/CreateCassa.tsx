import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import { type Cassa, useCreateCassa } from "@/core/api/cassa";
import { useGetStores, type Store } from '../api/store';

const categoryFields = (t: any, stores: { id?: number; name: string; }[] = []) => [
    {
        name: 'name',
        label: t('forms.cassa_name'),
        type: 'text',
        placeholder: t('placeholders.enter_name'),
        required: true,
    },
    {
        name: 'store_write',
        label: t('forms.store'),
        type: 'select',
        required: true,
        options: stores.map(store => ({
            value: store.id?.toString() || '',
            label: store.name,
        })),
    },
];

export default function CreateCassaPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { mutate: createCassa, isPending: isCreating } = useCreateCassa();
    const { data: storesData } = useGetStores({});

    const stores = Array.isArray(storesData) ? storesData : (storesData?.results || []); 
    const fields = categoryFields(t, stores as Store[]);

    const handleSubmit = (data: Partial<Cassa>) => {
        const formData = {
            ...data,
            store: typeof data.store_write === 'string' ? parseInt(data.store_write, 10) : data.store_write
        };
        createCassa(formData as Cassa, {
            onSuccess: () => {
                toast.success(t('messages.success.created', { item: t('navigation.cassa') }));
                navigate('/cassas');
            },
        });
    };

    return (
        <div className="container mx-auto py-6">


            <div>
                <ResourceForm
                    fields={fields}
                    onSubmit={handleSubmit}
                    defaultValues={{}}
                    isSubmitting={isCreating}
                    title={t('common.create')}
                />
            </div>
        </div>
    );
}