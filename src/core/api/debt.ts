import { createResourceApiHooks } from "../helpers/createResourceApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// Types
export interface PaginatedResponse<T> {
  links: {
    first: string | null;
    last: string | null;
    next: string | null;
    previous: string | null;
  };
  count: number;
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: T[];
}

export interface Debt {
  id?: number;
  sale_read: {
    id: number;
    store_read: {
      id: number;
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
      has_active_shift: boolean;
      shift?: object | null;
      store_read: object;
      is_superuser: boolean;
    };
    shift_read: object | null;
    client: number;
    on_credit: boolean;
    sale_items: Array<{
      id: number;
      product_read: {
        id: number;
        product_name: string;
        barcode: string;
        ikpu: string;
        category_read: {
          id: number;
          category_name: string;
        };
        base_unit: number;
        attribute_values: unknown[];
        history: object | null;
        min_price: string;
        selling_price: string;
        measurement: Array<{
          id: number;
          from_unit: {
            id: number;
            measurement_name: string;
            short_name: string;
          };
          to_unit: {
            id: number;
            measurement_name: string;
            short_name: string;
          };
          number: string;
        }>;
        available_units: Array<{
          id: number;
          short_name: string;
          factor: number;
          is_base: boolean;
        }>;
      };
      quantity: string;
      selling_unit: number;
      price_per_unit: string;
      subtotal: string;
    }>;
    sale_debt?: {
      client_read: {
        id: number;
        type: string;
        name: string;
        ceo_name?: string;
        phone_number: string;
        address: string;
        balance: string;
        stores: number[];
      };
      due_date: string | null;
      deposit: string;
      total_amount: string;
    };
    total_amount: string;
    total_pure_revenue: string;
    sale_payments: Array<{
      id: number;
      amount: string;
      payment_method: string;
      paid_at: string;
    }>;
    is_paid: boolean;
    sale_refunds: Array<{
      id: number;
      store: number;
      refund_items: Array<{
        id: number;
        sale_item: {
          id: number;
          product_read: {
            id: number;
            product_name: string;
            barcode: string;
            ikpu: string;
            category_read: {
              id: number;
              category_name: string;
            };
            base_unit: number;
            attribute_values: unknown[];
            history: object | null;
            min_price: string;
            selling_price: string;
            measurement: object[];
            available_units: object[];
          };
          quantity: string;
          selling_unit: number;
          price_per_unit: string;
          subtotal: string;
        };
        quantity: string;
        subtotal: string;
      }>;
      total_refund_amount: string;
      notes: string;
      refunded_by: number;
      created_at: string;
    }>;
    sold_date: string;
  };
  client_read: {
    id: number;
    type: string;
    name: string;
    phone_number: string;
    address: string;
    ceo_name?: string;
    balance?: string;
    linked_store?: number;
    stores?: number[];
  };
  due_date: string;
  total_amount: string;
  deposit: string;
  is_paid: boolean;
  created_at: string;
  total_amount_uzs:number;
  remainder_uzs:number;
  remainder: number;
  last_usd_rate?: string;
  usd_rate_at_creation?: string;
}

export interface DebtPayment {
  id?: number;
  debt: number;
  amount: number;
  paid_at?: string;
  payment_method: string;
  usd_rate_at_payment?: number;
  target_debt_currency?: "UZS" | "USD";
  worker_read?: {
    id: number;
    name: string;
  };
}

interface DebtPaymentResponse {
  id: number;
  debt: number;
  usd_rate_at_payment:number;
  worker_read: {
    id: number;
    name: string;
    phone_number: string;
    role: string;
    store_read: {
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
    is_superuser: boolean;
  };
  amount: string;
  payment_method: string;
  paid_at: string;
}

// API endpoints
const DEBT_URL = "debts/";

// Create debt API hooks using the factory function
export const {
  useGetResources: useGetDebts,
  useGetResource: useGetDebt,
  useCreateResource: useCreateDebt,
  useUpdateResource: useUpdateDebt,
  useDeleteResource: useDeleteDebt,
} = createResourceApiHooks<Debt>(DEBT_URL, "debts");

// Create debt payment API hooks
export const useCreateDebtPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: DebtPayment) => {
      const response = await api.post<DebtPayment>(
        `debts/${payment.debt}/payments/`,
        payment,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["debtPayments"] });
    },
  });
};

export const useGetDebtPayments = (debtId: number) => {
  return useQuery<DebtPaymentResponse[]>({
    queryKey: ["debtPayments", debtId],
    queryFn: async () => {
      const { data } = await api.get(`debts/${debtId}/payments`);
      return data.results;
    },
    enabled: !!debtId,
  });
};

export const useDeleteDebtPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ debtId, paymentId }: { debtId: number; paymentId: number }) => {
      const response = await api.delete(`debts/${debtId}/payments/${paymentId}/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["debtPayments"] });
      queryClient.invalidateQueries({ queryKey: ["debtsHistory"] });
    },
  });
};

export interface DebtsTotals {
  total_amount_uzs: number;
  total_amount_usd: number;
  remainder_uzs: number;
  remainder_usd: number;
  deposit: number;
  paid_debts: number;
  total_debts: number;
}

export const useGetDebtsHistory = (clientId: number, page: number = 1) => {
  return useQuery({
    queryKey: ["debtsHistory", clientId, page],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Debt> & { totals: DebtsTotals }>(
        `debts?client=${clientId}&page=${page}`,
      );
      return response.data;
    },
  });
};

export interface DeletedPayment {
  id: number;
  debt_id: number;
  client_name: string;
  store_name: string;
  amount: string;
  payment_method: string;
  target_debt_currency: string;
  usd_rate_at_payment: string;
  paid_at: string;
  paid_by: string;
  deleted_by: string;
  deleted_at: string;
}

export const useGetDeletedPayments = (page: number = 1) => {
  return useQuery<PaginatedResponse<DeletedPayment>>({
    queryKey: ["deletedPayments", page],
    queryFn: async () => {
      const response = await api.get(`debts/deleted-payments/?page=${page}`);
      return response.data;
    },
  });
};

export interface ClientDetailedPayment {
  id: number;
  debt: {
    id: number;
    due_date: string;
    is_paid: boolean;
    total_amount: string;
    total_amount_uzs: string;
    total_amount_usd: string;
    remainder: string;
    remainder_uzs: string;
    remainder_usd: string;
    client_id: number;
    client_name: string;
    store_id: number;
    store_name: string;
    sale: {
      id: number;
      sale_id: string;
    };
  };
  worker_read: {
    id: number;
    name: string;
  } | null;
  amount: string;
  payment_method: string;
  target_debt_currency: string;
  currency: string;
  usd_rate_at_payment: string;
  amount_in_uzs: string;
  paid_at: string;
}

export interface ClientPaymentsFilters {
  paid_at_after?: string;
  paid_at_before?: string;
  payment_method?: string;
  worker?: number;
  debt?: number;
}

export const useGetClientPaymentsDetailed = (
  clientId: number, 
  page: number = 1,
  filters?: ClientPaymentsFilters
) => {
  return useQuery<PaginatedResponse<ClientDetailedPayment>>({
    queryKey: ["clientPaymentsDetailed", clientId, page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString() });
      
      if (filters?.paid_at_after) params.append('paid_at_after', filters.paid_at_after);
      if (filters?.paid_at_before) params.append('paid_at_before', filters.paid_at_before);
      if (filters?.payment_method) params.append('payment_method', filters.payment_method);
      if (filters?.worker) params.append('worker', filters.worker.toString());
      if (filters?.debt) params.append('debt', filters.debt.toString());
      
      const response = await api.get(`debts/clients/${clientId}/payments/detailed/?${params.toString()}`);
      return response.data;
    },
    enabled: !!clientId,
  });
};

// ============ NEW DETAILED API TYPES ============

export interface DetailedDebtItem {
  id: number;
  name: string;
  qty: string;
  unit: string;
  price: string;
  subtotal: string;
}

export interface DetailedDebtPayment {
  id: number;
  paid_at: string;
  amount: string;
  currency: string;
  method: string;
  target_debt_currency: string;
  worker_name: string;
  amount_in_uzs: number | null;
  usd_rate_at_payment: number | null;
  closes_debt: boolean;
  comment?: string;
}

export interface DetailedDebt {
  id: number;
  is_manual: boolean;
  sale_id: number | null;
  created_at: string;
  due_date: string;
  total_amount_uzs: string;
  total_amount_usd: string;
  remainder_uzs: string;
  remainder_usd: string;
  usd_rate_at_creation: string;
  last_usd_rate: string;
  deposit: string;
  deposit_payment_method: string;
  status: string;
  days_overdue: number;
  store_name: string;
  seller_name: string;
  items_count: number;
  items: DetailedDebtItem[];
  payments: DetailedDebtPayment[];
}

export interface ClientDebtsDetailedResponse {
  count: number;
  client: {
    id: number;
    name: string;
    type?: string;
    phone?: string;
    balance_by_currency: Record<string, string>;
    last_purchase_date?: string;
  };
  totals: {
    debt_count: number;
    total_by_currency: Record<string, string>;
    paid_by_currency: Record<string, string>;
    remainder_by_currency: Record<string, string>;
    counts: {
      all: number;
      open: number;
      overdue: number;
      closed: number;
      manual: number;
    };
  };
  links: { first: string | null; last: string | null; next: string | null; previous: string | null };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: DetailedDebt[];
}

export interface PaymentDebtInfo {
  id: number;
  is_manual: boolean;
  sale_id: number | null;
  due_date: string;
  store_name: string;
  items_count: number;
  total_amount_uzs: string;
  total_amount_usd: string;
  remainder_uzs: string;
  remainder_usd: string;
  usd_rate_at_creation: string;
  last_usd_rate: string;
  deposit: string;
  deposit_payment_method: string;
}

export interface DetailedPaymentEntry {
  id: number;
  paid_at: string;
  amount: string;
  currency: string;
  method: string;
  target_debt_currency: string;
  worker_name: string;
  amount_in_uzs: number | null;
  usd_rate_at_payment: number | null;
  closes_debt: boolean;
  debt: PaymentDebtInfo;
}

export interface ClientPaymentsDetailedNewResponse {
  count: number;
  client: {
    id: number;
    name: string;
    balance_by_currency: Record<string, string>;
  };
  totals: {
    payment_count: number;
    paid_by_currency: Record<string, string>;
    remainder_by_currency: Record<string, string>;
    by_method: Record<string, {
      count: number;
      amount_by_currency: Record<string, string>;
    }>;
  };
  links: { first: string | null; last: string | null; next: string | null; previous: string | null };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: DetailedPaymentEntry[];
}

// Direct API call for payment history
export const debtApi = {
  getClientPaymentHistory: async (clientId: number, params?: {
    date_from?: string;
    date_to?: string;
    method?: string;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.method) queryParams.append('method', params.method);
    if (params?.search) queryParams.append('search', params.search);
    
    const response = await api.get(`debts/clients/${clientId}/payments/detailed/?${queryParams.toString()}`);
    return response.data;
  },
  
  getClientDebtsDetailed: async (clientId: number, params?: {
    date_from?: string;
    date_to?: string;
    status?: string;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    
    const response = await api.get(`debts/clients/${clientId}/debts/detailed/?${queryParams.toString()}`);
    return response.data;
  },

  getDebtItems: async (debtId: number) => {
    const response = await api.get(`debts/${debtId}/items/`);
    return response.data;
  }
};
