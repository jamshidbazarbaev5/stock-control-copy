import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceTable } from '../helpers/ResourseTable';
import { type VehicleIncome, useGetVehicleIncomes } from '../api/vehicle-income';
import { type Vehicle, useGetVehicles } from '../api/vehicle';
import { type Driver, useGetDrivers } from '../api/driver';
import { useGetStores } from '../api/store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const incomeColumns = () => [
  {
    header: 'Автомобиль',
    accessorKey: 'vehicle_name',
    cell: (row: any) => {
      return row.vehicle_name || `#${row.vehicle}`;
    },
  },
  {
    header: 'Водитель',
    accessorKey: 'driver_name',
    cell: (row: any) => {
      return row.driver_name || `#${row.driver}`;
    },
  },
  {
    header: 'Магазин',
    accessorKey: 'store_name',
    cell: (row: any) => {
      return row.store_name || `#${row.store}`;
    },
  },
  {
    header: 'Дата',
    accessorKey: 'date',
    cell: (row: any) => {
      if (!row.date) return '-';
      return new Date(row.date).toLocaleDateString();
    },
  },
  {
    header: 'Общая сумма',
    accessorKey: 'total_amount',
    cell: (row: any) => {
      if (!row.total_amount) return '-';
      return parseFloat(row.total_amount).toLocaleString();
    },
  },
  {
    header: 'Способы оплаты',
    accessorKey: 'payments',
    cell: (row: any) => {
      if (!row.payments || row.payments.length === 0) return '-';
      return (
        <div className="text-xs space-y-1">
          {row.payments.map((p: any, idx: number) => (
            <div key={idx}>
              {p.payment_method}: {parseFloat(p.amount).toLocaleString()}
            </div>
          ))}
        </div>
      );
    },
  },
];

const vehicleColumns = () => [
  {
    header: 'Название',
    accessorKey: 'name',
  },
  {
    header: 'Дата создания',
    accessorKey: 'created_at',
    cell: (row: any) => {
      if (!row.created_at) return '-';
      return new Date(row.created_at).toLocaleDateString();
    },
  },
];

const driverColumns = () => [
  {
    header: 'Водитель',
    accessorKey: 'full_name',
  },
  {
    header: 'Дата создания',
    accessorKey: 'created_at',
    cell: (row: any) => {
      if (!row.created_at) return '-';
      return new Date(row.created_at).toLocaleDateString();
    },
  },
];

export default function VehicleIncomesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('incomes');
  const [currentIncomeePage, setCurrentIncomePage] = useState(1);
  const [currentVehiclePage, setCurrentVehiclePage] = useState(1);
  const [currentDriverPage, setCurrentDriverPage] = useState(1);

  // Filters
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch data
  const { data: vehiclesData } = useGetVehicles({ params: { page: currentVehiclePage } });
  const { data: driversData } = useGetDrivers({ params: { page: currentDriverPage } });
  const { data: storesData } = useGetStores({ params: { page: 1 } });

  // Extract arrays from paginated responses
  const filterVehicles = Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.results || [];
  const filterDrivers = Array.isArray(driversData) ? driversData : driversData?.results || [];
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  // Build query params for incomes
  const queryParams: any = {
    page: currentIncomeePage,
  };

  if (selectedStore) queryParams.store = selectedStore;
  if (selectedDriver) queryParams.driver = selectedDriver;
  if (selectedVehicle) queryParams.vehicle = selectedVehicle;
  if (dateFrom) queryParams.date_from = dateFrom;
  if (dateTo) queryParams.date_to = dateTo;

  const { data: vehicleIncomesData, isLoading } = useGetVehicleIncomes({
    params: queryParams,
  });

  // Get the vehicle incomes array from the paginated response
  let vehicleIncomes: VehicleIncome[] = [];
  if (vehicleIncomesData) {
    if (Array.isArray(vehicleIncomesData)) {
      vehicleIncomes = vehicleIncomesData;
    } else if ((vehicleIncomesData as any).results) {
      vehicleIncomes = (vehicleIncomesData as any).results;
    } else {
      vehicleIncomes = [];
    }
  }

  // Enhance incomes with display ID
  const enhancedIncomes = vehicleIncomes.map((income: VehicleIncome, index: number) => ({
    ...income,
    displayId: index + 1,
  }));

  // Enhance vehicles with display ID
  const enhancedVehicles = (filterVehicles as Vehicle[]).map((vehicle: Vehicle, index: number) => ({
    ...vehicle,
    displayId: index + 1,
  }));

  // Enhance drivers with display ID
  const enhancedDrivers = (filterDrivers as Driver[]).map((driver: Driver, index: number) => ({
    ...driver,
    displayId: index + 1,
  }));

  // const handleIncomeEdit = (income: VehicleIncome) => {
  //   navigate(`/edit-vehicle-income/${income.id}`);
  // };

  const handleVehicleEdit = (vehicle: Vehicle) => {
    navigate(`/edit-vehicle/${vehicle.id}`);
  };

  const handleDriverEdit = (driver: Driver) => {
    navigate(`/edit-driver/${driver.id}`);
  };

  const handleClearFilters = () => {
    setSelectedStore('');
    setSelectedDriver('');
    setSelectedVehicle('');
    setDateFrom('');
    setDateTo('');
    setCurrentIncomePage(1);
  };

  const hasActiveFilters =
    selectedStore || selectedDriver || selectedVehicle || dateFrom || dateTo;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">{t('navigation.vehicle_incomes')}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incomes">{t('navigation.vehicle_incomes')}</TabsTrigger>
          <TabsTrigger value="vehicles">{t('navigation.vehicles')}</TabsTrigger>
          <TabsTrigger value="drivers">{t('navigation.drivers')}</TabsTrigger>
        </TabsList>

        {/* Vehicle Incomes Tab */}
        <TabsContent value="incomes" className="space-y-4">
          {/* Filters Section */}
          <div className="bg-gray-50  p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('common.filters')}</h3>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  {t('common.clear_filters')}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Store Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('forms.store')}</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
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

              {/* Driver Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('forms.driver')}</label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.select_driver')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterDrivers.map((driver: any) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('forms.vehicle')}</label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.select_vehicle')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterVehicles.map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('forms.date')} {t('common.from')}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white "
                />
              </div>

              {/* Date To Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('forms.date')} {t('common.to')}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white "
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <ResourceTable
            data={enhancedIncomes}
            columns={incomeColumns()}
            isLoading={isLoading}
            // onEdit={handleIncomeEdit}
            onAdd={() => navigate('/create-vehicle-income')}
            totalCount={(vehicleIncomesData as any)?.count || enhancedIncomes.length}
            pageSize={(vehicleIncomesData as any)?.page_size || 30}
            currentPage={currentIncomeePage}
            onPageChange={setCurrentIncomePage}
          />
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <ResourceTable
            data={enhancedVehicles}
            columns={vehicleColumns()}
            isLoading={false}
            onEdit={handleVehicleEdit}
            onAdd={() => navigate('/create-vehicle')}
            totalCount={(vehiclesData as any)?.count || enhancedVehicles.length}
            pageSize={(vehiclesData as any)?.page_size || 30}
            currentPage={currentVehiclePage}
            onPageChange={setCurrentVehiclePage}
          />
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4">
          <ResourceTable
            data={enhancedDrivers}
            columns={driverColumns()}
            isLoading={false}
            onEdit={handleDriverEdit}
            onAdd={() => navigate('/create-driver')}
            totalCount={(driversData as any)?.count || enhancedDrivers.length}
            pageSize={(driversData as any)?.page_size || 30}
            currentPage={currentDriverPage}
            onPageChange={setCurrentDriverPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
