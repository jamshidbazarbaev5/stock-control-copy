import { createResourceApiHooks } from "../helpers/createResourceApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// Types
export interface SaleDebt {
  client: number;
  due_date: string;
  deposit?: string;
  deposit_payment_method?: string;
  client_read?: {
    id: number;
    name: string;
    phone_number: string;
    address: string;
  };
}

export interface SaleItem {
  stock_read?: any;
  price_per_unit?: string;
  id?: number;
  stock_write?: number;
  stock_name?: string | null;
  product_read?: {
    id: number;
    product_name: string;
    barcode: string;
    ikpu: string;
    category_read?: {
      id: number;
      category_name: string;
    };
    base_unit?: number;
    measurement?: Array<{
      id: number;
      from_unit?: {
        id: number;
        measurement_name: string;
        short_name: string;
      };
      to_unit?: {
        id: number;
        measurement_name: string;
        short_name: string;
      };
      number: string;
    }>;
    available_units?: Array<{
      id: number;
      short_name: string;
      factor: number;
      is_base: boolean;
    }>;
  };
  selling_unit?: number;
  selling_method?: "Штук" | "Ед.измерения";
  quantity: string;
  subtotal?: string;
}

export interface SaleRefund {
  id: number;
  store: number;
  refund_items: Array<{
    id: number;
    sale_item: {
      id: number;
      stock_name?: string | null;
      product_read?: {
        id: number;
        product_name: string;
        barcode: string;
        ikpu: string;
        category_read?: {
          id: number;
          category_name: string;
        };
        base_unit?: number;
        measurement?: Array<{
          id: number;
          from_unit?: {
            id: number;
            measurement_name: string;
            short_name: string;
          };
          to_unit?: {
            id: number;
            measurement_name: string;
            short_name: string;
          };
          number: string;
        }>;
        available_units?: Array<{
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
    };
    quantity: string;
    subtotal: string;
  }>;
  refund_payments?: Array<{
    payment_method: string;
    amount: string;
  }>;
  total_refund_amount: string;
  notes: string;
  refunded_by: number;
  created_at: string;
}

export interface Sale {
  id?: number;
  sale_id?: string;
  discount_amount?: string;
  store?: number;
  store_read?: {
    id: number;
    name: string;
    address: string;
    phone_number: string;
    created_at: string;
    is_main: boolean;
    parent_store: number | null;
    owner: number;
  };
  payment_method: string;
  sale_items: SaleItem[];
  on_credit: boolean;
  is_paid?: boolean;
  sale_debt?: SaleDebt;
  total_amount: string;
  total_pure_revenue?: string;
  sale_payments?:
    | {
        payment_method: string;
        amount: string;
      }[]
    | undefined;
  sale_refunds?: SaleRefund[];
  client?: number;
  created_at?: string;
  sold_date?: string;
  worker_read?: any;
}

// API endpoints
const SALE_CREATE_URL = "sales/create/";
const SALE_LIST_URL = "sales/";

// Create hooks for update and delete operations using the list URL
const { useUpdateResource: useUpdateSale, useDeleteResource: useDeleteSale } =
  createResourceApiHooks<Sale>(SALE_LIST_URL, "sales");

// Custom create hook using the correct create endpoint
const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSale: Sale | FormData) => {
      const isFormData = newSale instanceof FormData;
      const config = isFormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};

      const response = await api.post<Sale>(SALE_CREATE_URL, newSale, config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
};

// Custom GET hooks using the correct /sales/ endpoint
export interface SalesResponse {
  results: Sale[];
  count: number;
  total_sum_all: number;
  total_sum_page: number;
  total_payments_all: Record<string, number>;
  total_payments_page: Record<string, number>;
  total_debt_sum: number;
  page_size: number;
  current_page: number;
  total_pages: number;
  page_range: number[];
  links: {
    first: string | null;
    last: string | null;
    next: string | null;
    previous: string | null;
  };
}

export const useGetSales = (options?: { params?: Record<string, any> }) => {
  return useQuery({
    queryKey: ["sales", options?.params],
    queryFn: async () => {
      const response = await api.get<Sale[] | SalesResponse>(SALE_LIST_URL, {
        params: options?.params,
      });
      return response.data;
    },
  });
};

export const useGetSale = (id: number) => {
  return useQuery({
    queryKey: ["sales", id],
    queryFn: async () => {
      const response = await api.get<Sale>(`${SALE_LIST_URL}${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

export { useCreateSale, useUpdateSale, useDeleteSale };
