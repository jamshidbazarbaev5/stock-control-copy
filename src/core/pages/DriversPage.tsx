import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResourceTable } from '../helpers/ResourseTable';
import { type Driver, useGetDrivers } from '../api/driver';

const columns = () => [
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

export default function DriversPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: driversData, isLoading } = useGetDrivers({
    params: {
      page: currentPage,
    },
  });

  

  // Get the drivers array from the paginated response
  let drivers: Driver[] = [];
  if (driversData) {
    if (Array.isArray(driversData)) {
      drivers = driversData;
    } else if ((driversData as any).results) {
      drivers = (driversData as any).results;
    } else {
      drivers = [];
    }
  }

  // Enhance drivers with display ID
  const enhancedDrivers = drivers.map((driver: Driver, index: number) => ({
    ...driver,
    displayId: index + 1,
  }));

  const handleEdit = (driver: Driver) => {
    navigate(`/edit-driver/${driver.id}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Водители</h1>
      </div>
     
      <ResourceTable
        data={enhancedDrivers}
        columns={columns()}
        isLoading={isLoading}
        onEdit={handleEdit}
        onAdd={() => navigate('/create-driver')}
        totalCount={(driversData as any)?.count || enhancedDrivers.length}
        pageSize={(driversData as any)?.page_size || 30}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
