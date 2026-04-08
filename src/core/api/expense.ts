import { createResourceApiHooks } from "../helpers/createResourceApi";

// Types
export interface Expense {
  id?: number;
  store: number;
  amount: string;
  expense_name: number;
  user_name?:string;
  comment?: string;
  payment_method: string;
  store_read?: {
    id: number;
    name: string;
    address: string;
    phone_number: string;
    is_main: boolean;
    parent_store: number | null;
    owner: number;
  };
  expense_name_read?: {
    id: number;
    name: string;
  };
}

// API endpoints
const EXPENSE_URL = "budget/expenses/";

// Create expense API hooks using the factory function
export const {
  useGetResources: useGetExpenses,
  useGetResource: useGetExpense,
  useCreateResource: useCreateExpense,
  useUpdateResource: useUpdateExpense,
  useDeleteResource: useDeleteExpense,
} = createResourceApiHooks<Expense>(EXPENSE_URL, "expenses");
