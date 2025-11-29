import { useQuery } from '@tanstack/react-query';
import api from './api';

// Response interfaces based on your API examples
export interface ActivitySale {
  id: number;
  sale_id: string;
  store_read: {
    id: number;
    budgets: Array<{
      id: number;
      budget_type: string;
      amount: string;
    }>;
    name: string;
    address: string;
    phone_number: string;
    budget: string;
    created_at: string;
    is_main: boolean;
    color: string;
    parent_store: number | null;
  };
  worker_read: {
    id: number;
    name: string;
    phone_number: string;
    role: string;
    is_mobile_user: boolean;
    can_view_quantity: boolean;
    has_active_shift: boolean;
    shift?: any;
    store_read: any;
    is_superuser: boolean;
  };
  shift_read: {
    id: number;
    store: number;
    register: number;
    cashier: number;
    opened_at: string;
    closed_at: string | null;
    opening_cash: string;
    closing_cash: string | null;
    is_active: boolean;
  } | null;
  client: number | null;
  on_credit: boolean;
  sale_items: Array<{
    id: number;
    product_read: {
      id: number;
      product_name: string;
      barcode: string;
      ikpu: string | null;
      base_unit: number;
      min_price: string;
      selling_price: string;
    };
    quantity: string;
    selling_unit: number;
    price_per_unit: string;
    stock_name: string;
    subtotal: string;
  }>;
  sale_debt: any | null;
  discount_amount: string;
  change_amount: string;
  total_amount: string;
  total_pure_revenue: string;
  sale_payments: Array<{
    id: number;
    amount: string;
    payment_method: string;
    exchange_rate: string | null;
    change_amount: string;
    paid_at: string;
  }>;
  sale_refunds: any[];
  sold_date: string;
  comment: string | null;
}

export interface ActivityExpense {
  id: number;
  shift: number | null;
  amount: string;
  user: number | null;
  history: {
    amount: number;
    comment: string;
    expense_name: string;
  };
  store_read: {
    id: number;
    budgets: Array<{
      id: number;
      budget_type: string;
      amount: string;
    }>;
    name: string;
    address: string;
    phone_number: string;
    budget: string;
    created_at: string;
    is_main: boolean;
    color: string;
    parent_store: number | null;
  };
  expense_name_read: {
    id: number;
    name: string;
  };
  comment: string;
  payment_type: string;
  date: string;
}

export interface ActivityDebtPayment {
  id: number;
  amount: string;
  payment_method: string;
  usd_rate_at_payment: string;
  paid_at: string;
  worker_name: string;
  client_name: string;
  store_name: string;
}

export interface PaymentTypeBreakdown {
  'Наличные': number;
  'Карта': number;
  'Click': number;
  'Перечисление': number;
  'Валюта': number;
  [key: string]: number;
}

export interface TotalWithPayments {
  total: number;
  total_in_currency: number;
  by_payment_type: PaymentTypeBreakdown;
}

export interface PageTotals extends TotalWithPayments {
  debt_total?: number;
}

export interface OverallTotals {
  sales_total?: TotalWithPayments;
  debt_total?: number;
  expenses_total?: TotalWithPayments;
  debt_payments_total?: TotalWithPayments;
}

export interface ActivityPaginatedResponse<T> {
  count: number;
  links: {
    first: number;
    last: number;
    next: string | null;
    previous: string | null;
  };
  current_page: number;
  page_range: (number | string)[];
  total_pages: number;
  page_size: number;
  results: T[];
  overall_totals?: OverallTotals;
  page_totals?: PageTotals;
}

export type ActivityTab = 'sales' | 'expenses' | 'debt_payments';

interface ActivityParams {
  tab: ActivityTab;
  page?: number;
  // Shared filters
  store?: string;
  start_date?: string;
  end_date?: string;
  // Sales-specific filters
  client?: string;
  worker?: string;
  product?: string;
  on_credit?: boolean;
  shift_id?: string;
  // Expenses-specific filters
  payment_type?: string;
  expense_name?: string;
}

export const useGetActivity = (params: ActivityParams) => {
  return useQuery({
    queryKey: ['activity', params],
    queryFn: async () => {
      const queryParams: Record<string, any> = {
        tab: params.tab,
        page: params.page || 1,
      };

      // Add shared filters
      if (params.store && params.store !== 'all') queryParams.store = params.store;
      if (params.start_date) queryParams.start_date = params.start_date;
      if (params.end_date) queryParams.end_date = params.end_date;

      // Add tab-specific filters
      if (params.tab === 'sales') {
        if (params.client && params.client !== 'all') queryParams.client = params.client;
        if (params.worker && params.worker !== 'all') queryParams.worker = params.worker;
        if (params.product) queryParams.product = params.product;
        if (params.on_credit !== undefined) queryParams.on_credit = params.on_credit;
        if (params.shift_id && params.shift_id !== 'all') queryParams.shift_id = params.shift_id;
      } else if (params.tab === 'expenses') {
        if (params.payment_type && params.payment_type !== 'all') queryParams.payment_type = params.payment_type;
        if (params.expense_name && params.expense_name !== 'all') queryParams.expense_name = params.expense_name;
      } else if (params.tab === 'debt_payments') {
        if (params.client && params.client !== 'all') queryParams.client = params.client;
      }

      const response = await api.get<
        ActivityPaginatedResponse<ActivitySale | ActivityExpense | ActivityDebtPayment>
      >('sales/activity/', { params: queryParams });
      
      return response.data;
    },
  });
};
