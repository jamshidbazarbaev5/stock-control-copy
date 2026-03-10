import { createResourceApiHooks } from '../helpers/createResourceApi';

// Types
export interface ExpenseName {
  id?: number;
  name: string;
  reduce_from_budget?: boolean;
}

// API endpoints
const EXPENSE_NAME_URL = 'budget/expenses_name/';

// Create expense name API hooks using the factory function
export const {
  useGetResources: useGetExpenseNames,
  useGetResource: useGetExpenseName,
  useCreateResource: useCreateExpenseName,
  useUpdateResource: useUpdateExpenseName,
  useDeleteResource: useDeleteExpenseName,
} = createResourceApiHooks<ExpenseName>(EXPENSE_NAME_URL, 'expenseNames');
