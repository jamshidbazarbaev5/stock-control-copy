import { createResourceApiHooks } from '../helpers/createResourceApi';
import api from './api';

// Types
export interface Payment {
  payment_method: string;
  amount: string | number;
}

export interface VehicleIncome {
  id?: number;
  driver: number;
  driver_name?: string;
  vehicle: number;
  vehicle_name?: string;
  date: string;
  comment?: string;
  payments: Payment[];
  store: number;
  store_name?: string;
  worker: number;
  total_amount?: string;
  created_at?: string;
  driver_read?: {
    id: number;
    full_name: string;
  };
  vehicle_read?: {
    id: number;
    name: string;
  };
  store_read?: {
    id: number;
    name: string;
  };
  worker_read?: {
    id: number;
    name: string;
  };
}

// API endpoints
const VEHICLE_INCOME_URL = 'incomes/vehicle-incomes/';

// Create vehicle income API hooks using the factory function
export const {
  useGetResources: useGetVehicleIncomes,
  useGetResource: useGetVehicleIncome,
  useCreateResource: useCreateVehicleIncome,
  useUpdateResource: useUpdateVehicleIncome,
  useDeleteResource: useDeleteVehicleIncome,
} = createResourceApiHooks<VehicleIncome>(VEHICLE_INCOME_URL, 'vehicle_incomes');

// Function to fetch vehicle income with full details
export const fetchVehicleIncomeDetails = async (id: number): Promise<VehicleIncome> => {
  const response = await api.get<VehicleIncome>(`${VEHICLE_INCOME_URL}${id}/`);
  return response.data;
};
