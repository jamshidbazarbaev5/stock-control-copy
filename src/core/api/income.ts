import { createResourceApiHooks } from '../helpers/createResourceApi';

// Types
export interface Income {
  id?: number;
  source: string;
 

  store_read?: {
    id: number;
    name: string;
    address: string;
    phone_number: string;
    budget: string;
    created_at: string;
    is_main: boolean;
    parent_store: number | null;
    owner: number;
  };
  description: {
    Amount: string;
    Worker?: string;
    'Sold Date'?: string;
    'Timestamp'?: string;
    Client?: string;
    Payments?: Array<{
      Method: string;
      Amount: string;
    }>;
    Items?: Array<{
      Product: string;
      Quantity: string;
      'Selling Method': string;
      Subtotal: string;
    }>;
  };
  timestamp: string;
}

// API endpoints
const INCOME_URL = 'incomes/';

// Create income API hooks using the factory function
export const {
  useGetResources: useGetIncomes,
  useGetResource: useGetIncome,
  useCreateResource: useCreateIncome,
  useUpdateResource: useUpdateIncome,
  useDeleteResource: useDeleteIncome,
} = createResourceApiHooks<Income>(INCOME_URL, 'incomes');
