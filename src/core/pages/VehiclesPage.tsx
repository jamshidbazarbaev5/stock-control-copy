import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResourceTable } from '../helpers/ResourseTable';
import { type Vehicle, useGetVehicles } from '../api/vehicle';

const columns = () => [
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

export default function VehiclesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: vehiclesData, isLoading } = useGetVehicles({
    params: {
      page: currentPage,
    },
  });

  

  // Get the vehicles array from the paginated response
  let vehicles: Vehicle[] = [];
  if (vehiclesData) {
    if (Array.isArray(vehiclesData)) {
      vehicles = vehiclesData;
    } else if ((vehiclesData as any).results) {
      vehicles = (vehiclesData as any).results;
    } else {
      vehicles = [];
    }
  }

  // Enhance vehicles with display ID
  const enhancedVehicles = vehicles.map((vehicle: Vehicle, index: number) => ({
    ...vehicle,
    displayId: index + 1,
  }));

  const handleEdit = (vehicle: Vehicle) => {
    navigate(`/edit-vehicle/${vehicle.id}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('navigation.vehicles')}</h1>
      </div>

      <ResourceTable
        data={enhancedVehicles}
        columns={columns()}
        isLoading={isLoading}
        onEdit={handleEdit}
        onAdd={() => navigate('/create-vehicle')}
        totalCount={(vehiclesData as any)?.count || enhancedVehicles.length}
        pageSize={(vehiclesData as any)?.page_size || 30}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
