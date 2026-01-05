import { createResourceApiHooks } from '../helpers/createResourceApi';
import api from './api';

// Types
export interface Vehicle {
  id?: number;
  name: string;
  created_at?: string;
}

// API endpoints
const VEHICLE_URL = 'incomes/vehicles/';

// Create vehicle API hooks using the factory function
export const {
  useGetResources: useGetVehicles,
  useGetResource: useGetVehicle,
  useCreateResource: useCreateVehicle,
  useUpdateResource: useUpdateVehicle,
  useDeleteResource: useDeleteVehicle,
} = createResourceApiHooks<Vehicle>(VEHICLE_URL, 'vehicles');

// Function to fetch vehicle details
export const fetchVehicleDetails = async (id: number): Promise<Vehicle> => {
  const response = await api.get<Vehicle>(`${VEHICLE_URL}${id}/`);
  return response.data;
};
