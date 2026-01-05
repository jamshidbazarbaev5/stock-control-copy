import { createResourceApiHooks } from '../helpers/createResourceApi';
import api from './api';

// Types
export interface Driver {
  id?: number;
  full_name: string;
  created_at?: string;
}

// API endpoints
const DRIVER_URL = 'incomes/drivers/';

// Create driver API hooks using the factory function
export const {
  useGetResources: useGetDrivers,
  useGetResource: useGetDriver,
  useCreateResource: useCreateDriver,
  useUpdateResource: useUpdateDriver,
  useDeleteResource: useDeleteDriver,
} = createResourceApiHooks<Driver>(DRIVER_URL, 'drivers');

// Function to fetch driver details
export const fetchDriverDetails = async (id: number): Promise<Driver> => {
  const response = await api.get<Driver>(`${DRIVER_URL}${id}/`);
  return response.data;
};
