import { useNavigate } from 'react-router-dom';
import { ResourceForm } from '../helpers/ResourceForm';
import { toast } from 'sonner';
import type { LabelSize } from '../api/label-size';
import { useCreateLabelSize } from '../api/label-size';
import { useTranslation } from 'react-i18next';

const labelSizeFields = [
    {
        name: 'width',
        label: 'forms.width',
        type: 'number',
        placeholder: 'placeholders.enter_width',
        required: true,
    },
    {
        name: 'height',
        label: 'forms.height',
        type: 'number',
        placeholder: 'placeholders.enter_height',
        required: true,
    },
];

export default function CreateLabelSize() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const createLabelSize = useCreateLabelSize();
    const fields = labelSizeFields;

    const handleSubmit = async (data: LabelSize) => {
        try {
            await createLabelSize.mutateAsync(data);
            toast.success(t('messages.success.created', { item: t('navigation.labelSizes') }));
            navigate('/label-sizes');
        } catch (error) {
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <ResourceForm<LabelSize>
                fields={fields.map(field => ({
                    ...field,
                    label: t(field.label),
                    placeholder: t(field.placeholder)
                }))}
                onSubmit={handleSubmit}
                isSubmitting={createLabelSize.isPending}
                title={t('common.create')}
            />
        </div>
    );
}
