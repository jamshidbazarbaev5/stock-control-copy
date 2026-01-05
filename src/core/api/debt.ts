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

export const useGetDebtsHistory = (clientId: number, page: number = 1) => {
  return useQuery({
    queryKey: ["debtsHistory", clientId, page],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Debt>>(
        `debts?client=${clientId}&page=${page}`,
      );
      return response.data;
    },
  });
};
