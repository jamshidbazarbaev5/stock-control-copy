import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { VehicleIncome, Payment } from '../api/vehicle-income';
import { useCreateVehicleIncome } from '../api/vehicle-income';
import { useGetVehicles, useCreateVehicle } from '../api/vehicle';
import { useGetDrivers, useCreateDriver } from '../api/driver';
import { useGetStores } from '../api/store';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Payment methods available
const PAYMENT_METHODS = [
  'Наличные',      // Cash
  'Click',         // Click payment
  'Карта',         // Card
  'Перечисление',  // Transfer
  'Валюта',        // Currency
];

export default function CreateVehicleIncome() {
  const navigate = useNavigate();
  const createVehicleIncome = useCreateVehicleIncome();
  const createVehicle = useCreateVehicle();
  const createDriver = useCreateDriver();
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();

  const { data: vehiclesData, refetch: refetchVehicles } = useGetVehicles({ params: { page: 1 } });
  const { data: driversData, refetch: refetchDrivers } = useGetDrivers({ params: { page: 1 } });
  const { data: storesData } = useGetStores({ params: { page: 1 } });

  // Extract arrays from paginated responses
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.results || [];
  const drivers = Array.isArray(driversData) ? driversData : driversData?.results || [];
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  // Form state
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState('');
  const [payments, setPayments] = useState<Payment[]>([
    { payment_method: 'Наличные', amount: '' },
  ]);

  // Modal states
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);

  const handleAddPayment = () => {
    setPayments([...payments, { payment_method: 'Наличные', amount: '' }]);
  };

  const handleRemovePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const handlePaymentChange = (index: number, field: 'payment_method' | 'amount', value: string) => {
    const newPayments = [...payments];
    if (field === 'payment_method') {
      newPayments[index].payment_method = value;
    } else {
      newPayments[index].amount = value;
    }
    setPayments(newPayments);
  };

  const handleCreateVehicle = async () => {
    if (!newVehicleName.trim()) {
      toast.error(t('validation.required_field', { field: t('forms.vehicle') }));
      return;
    }

    setIsCreatingVehicle(true);
    try {
      const newVehicle = await createVehicle.mutateAsync({ name: newVehicleName });
      toast.success(t('messages.success.created', { item: t('navigation.vehicles') }));
      setVehicleId((newVehicle?.id ?? '').toString());
      setNewVehicleName('');
      setShowVehicleModal(false);
      await refetchVehicles();
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.vehicles') }));
    } finally {
      setIsCreatingVehicle(false);
    }
  };

  const handleCreateDriver = async () => {
    if (!newDriverName.trim()) {
      toast.error(t('validation.required_field', { field: t('forms.driver') }));
      return;
    }

    setIsCreatingDriver(true);
    try {
      const newDriver = await createDriver.mutateAsync({ full_name: newDriverName });
      toast.success(t('messages.success.created', { item: t('navigation.drivers') }));
      setDriverId((newDriver?.id ?? '').toString());
      setNewDriverName('');
      setShowDriverModal(false);
      await refetchDrivers();
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.drivers') }));
    } finally {
      setIsCreatingDriver(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!vehicleId.trim()) {
      toast.error(t('validation.required_field', { field: t('forms.vehicle') }));
      return;
    }
    if (!driverId.trim()) {
      toast.error(t('validation.required_field', { field: t('forms.driver') }));
      return;
    }
    if (!storeId.trim()) {
      toast.error(t('validation.required_field', { field: t('forms.store') }));
      return;
    }
    if (!date.trim()) {
      toast.error(t('validation.required_field', { field: t('forms.date') }));
      return;
    }
    if (payments.some((p) => !p.amount)) {
      toast.error(t('validation.fill_all_required_fields'));
      return;
    }

    try {
      const incomeData: VehicleIncome = {
        vehicle: parseInt(vehicleId),
        driver: parseInt(driverId),
        store: parseInt(storeId),
        worker: currentUser?.id || 0,
        date,
        comment,
        payments: payments.map((p) => ({
          payment_method: p.payment_method,
          amount: p.amount.toString(),
        })),
      };

      await createVehicleIncome.mutateAsync(incomeData);
      toast.success(t('messages.success.created', { item: t('navigation.vehicle_incomes') }));
      navigate('/vehicle-incomes');
    } catch (error) {
      toast.error(t('messages.error.create', { item: t('navigation.vehicle_incomes') }));
    }
  };

  return (
    <div className="container py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('common.create')} {t('navigation.vehicle_incomes')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Vehicle Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="vehicle">{t('forms.vehicle')} *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVehicleModal(true)}
              className="h-8 px-2"
            >
              + {t('common.create')}
            </Button>
          </div>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger id="vehicle">
              <SelectValue placeholder={t('placeholders.select_vehicle')} />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle: any) => (
                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                  {vehicle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Driver Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="driver">{t('forms.driver')} *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDriverModal(true)}
              className="h-8 px-2"
            >
              + {t('common.create')}
            </Button>
          </div>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger id="driver">
              <SelectValue placeholder={t('placeholders.select_driver')} />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver: any) => (
                <SelectItem key={driver.id} value={driver.id.toString()}>
                  {driver.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Store Selection */}
        <div className="space-y-2">
          <Label htmlFor="store">{t('forms.store')} *</Label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger id="store">
              <SelectValue placeholder={t('placeholders.select_store')} />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store: any) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">{t('forms.date')} *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">{t('forms.comment')}</Label>
          <Input
            id="comment"
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('placeholders.enter_comment')}
          />
        </div>

        {/* Payments */}
        <div className="space-y-4">
          <Label>{t('forms.payments')} *</Label>
          <div className="space-y-3">
            {payments.map((payment, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select
                    value={payment.payment_method}
                    onValueChange={(value) =>
                      handlePaymentChange(index, 'payment_method', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('placeholders.select_payment_method')} />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder={t('placeholders.enter_amount')}
                    value={payment.amount}
                    onChange={(e) =>
                      handlePaymentChange(index, 'amount', e.target.value)
                    }
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleRemovePayment(index)}
                  disabled={payments.length === 1}
                  className="px-2"
                >
                  {t('common.remove')}
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddPayment}
            className="w-full"
          >
            {t('common.add')} {t('forms.payment_methods')}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={createVehicleIncome.isPending}
            className="flex-1"
          >
            {createVehicleIncome.isPending ? t('common.creating') : t('common.create')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/vehicle-incomes')}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>

      {/* Vehicle Creation Modal */}
      <Dialog open={showVehicleModal} onOpenChange={setShowVehicleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.create')} {t('navigation.vehicles')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle-name">{t('forms.vehicle')} *</Label>
              <Input
                id="vehicle-name"
                placeholder={t('placeholders.enter_vehicle_name')}
                value={newVehicleName}
                onChange={(e) => setNewVehicleName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowVehicleModal(false)}
              disabled={isCreatingVehicle}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateVehicle}
              disabled={isCreatingVehicle}
            >
              {isCreatingVehicle ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver Creation Modal */}
      <Dialog open={showDriverModal} onOpenChange={setShowDriverModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.create')} {t('navigation.drivers')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name">{t('forms.full_name')} *</Label>
              <Input
                id="driver-name"
                placeholder={t('placeholders.enter_full_name')}
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDriverModal(false)}
              disabled={isCreatingDriver}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateDriver}
              disabled={isCreatingDriver}
            >
              {isCreatingDriver ? t('common.creating') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
