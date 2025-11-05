import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useGetLabelSizes } from '../api/label-size';
import { printBarcode } from '../api/print-barcode';


export default function PrintBarcodePage() {
    const { productId } = useParams();
    const { t } = useTranslation();
    const [quantity, setQuantity] = useState<number>(1);
    const [selectedLabelSize, setSelectedLabelSize] = useState<string>('');
    const [isPrinting, setIsPrinting] = useState(false);

    const { data: labelSizesData, isLoading: isLoadingLabelSizes } = useGetLabelSizes({
        params: {}
    });

    const labelSizes = (Array.isArray(labelSizesData) ? labelSizesData : []) as any[];

    const handlePrint = async () => {
        console.log('Print button clicked', { productId, selectedLabelSize, quantity });

        if (!productId || !selectedLabelSize) {
            console.log('Missing required fields:', { productId, selectedLabelSize });
            toast.error(t('messages.error.missingFields'));
            return;
        }

        setIsPrinting(true);
        try {
            console.log('Sending print request...');
            const response = await printBarcode(Number(productId), {
                label_size: Number(selectedLabelSize),
                quantity,
            });

            const { success, pdf_file } = response.data;

            if (success && pdf_file) {
                // Open PDF directly in a new window
                window.open(pdf_file, '_blank');
                toast.success(t('messages.success.printed'));
                toast.success(t('messages.success.printed'));
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">{t('Print Barcode')}</h1>

            <Card className="p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="labelSize">{t('forms.labelSize')}</Label>
                        <Select
                            value={selectedLabelSize}
                            onValueChange={setSelectedLabelSize}
                            disabled={isLoadingLabelSizes}
                        >
                            <SelectTrigger id="labelSize">
                                <SelectValue placeholder={t('placeholders.select_label_size')} />
                            </SelectTrigger>
                            <SelectContent>
                                {labelSizes?.map((size) => (
                                    <SelectItem key={size.id} value={String(size.id)}>
                                        {size.width} x {size.height}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="quantity">{t('forms.quantity')}</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            placeholder={t('placeholders.enter_quantity')}
                        />
                    </div>

                    <Button
                        onClick={handlePrint}
                        disabled={!selectedLabelSize || quantity < 1 || isPrinting}
                        className="w-full"
                    >
                        {isPrinting ? t('buttons.printing') : t('buttons.print')}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
