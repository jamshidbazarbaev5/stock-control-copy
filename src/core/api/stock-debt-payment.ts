import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// Types
export interface StockDebtPayment {
  id?: number;
  stock: number;
  amount: number;
  comment?: string;
  paid_at?: string;
  worker_read?: {
    id: number;
    name: string;
  };
}

export interface StockEntryPayment {
  id: number;
  stock_entry: number;
  amount: string;
  comment: string;
  payment_type: string;
  debt_currency: string;
  payment_date: string;
}

export interface StockEntryPaymentResponse {
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
  results: StockEntryPayment[];
  count: number;
}

export interface StockDebtPaymentRequest {
  stock: number;
  amount: number;
  comment?: string;
}

export interface StockDebtPaymentResponse {
  id: number;
  stock: number;
  amount: string;
  comment: string;
  paid_at: string;
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
}

// API endpoints
const STOCK_DEBT_PAYMENT_URL = "stock_debt_payment/";

// Create stock debt payment API hooks
export const useCreateStockDebtPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: StockDebtPaymentRequest) => {
      const response = await api.post<StockDebtPaymentResponse>(
        `${STOCK_DEBT_PAYMENT_URL}pay/`,
        payment,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocks"] });
      queryClient.invalidateQueries({ queryKey: ["stockDebtPayments"] });
    },
  });
};

// Get stock debt payments for a specific stock
export const useGetStockDebtPayments = (stockId: number) => {
  return useQuery({
    queryKey: ["stockDebtPayments", stockId],
    queryFn: async () => {
      const { data } = await api.get<StockDebtPaymentResponse[] | { results: StockDebtPaymentResponse[] }>(
        `${STOCK_DEBT_PAYMENT_URL}?stock=${stockId}`,
      );
      return Array.isArray(data) ? data : data.results || [];
    },
    enabled: !!stockId,
  });
};

// Get stock entry payments (for payment history page)
export const useGetStockEntryPayments = (stockEntryId: number | string) => {
  return useQuery({
    queryKey: ["stockEntryPayments", stockEntryId],
    queryFn: async () => {
      const { data } = await api.get<StockEntryPaymentResponse>(
        `${STOCK_DEBT_PAYMENT_URL}pay/?stock_entry=${stockEntryId}`,
      );
      return data;
    },
    enabled: !!stockEntryId,
  });
};

// Direct API function for making stock debt payments
export const payStockDebt = async (payment: StockDebtPaymentRequest): Promise<StockDebtPaymentResponse> => {
  const response = await api.post<StockDebtPaymentResponse>(
    `${STOCK_DEBT_PAYMENT_URL}pay/`,
    payment,
  );
  return response.data;
};
