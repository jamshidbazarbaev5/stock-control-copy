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

// --- Supplier Payments ---

export interface SupplierPayment {
  id: number;
  stock_entry: {
    id: number;
    date_of_arrived: string;
    date_created: string;
    is_debt: boolean;
    total_amount: string;
    total_amount_uzs: string;
    total_amount_usd: string;
    amount_of_debt: string;
    amount_of_debt_in_usd: string;
    advance_uzs: string;
    advance_usd: string;
    total_paid_uzs: string;
    total_paid_usd: string;
    rate_at_purchase: string;
    remaining_debt_uzs: string;
    remaining_debt_usd: string;
    supplier_id: number;
    supplier_name: string;
    store_id: number;
    store_name: string;
    stocks: Array<{
      id: number;
      product: {
        id: number;
        product_name: string;
      };
      quantity: string;
      purchase_unit: {
        id: number;
        measurement_name: string;
        short_name: string;
      };
      currency: {
        id: number;
        name: string;
        short_name: string;
      };
      price_per_unit_currency: string;
      total_price_in_currency: string;
      total_price_in_uz: string;
    }>;
  };
  amount: string;
  payment_type: string;
  debt_currency: string;
  currency: number;
  currency_short_name: string;
  rate_at_payment: string;
  payment_date: string;
  comment: string;
  amount_in_uzs: number;
  amount_in_usd: number;
}

export interface SupplierPaymentsResponse {
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
  results: SupplierPayment[];
  count: number;
}

export interface SupplierPaymentFilters {
  payment_date_after?: string;
  payment_date_before?: string;
  payment_type?: string;
  stock_entry?: number | string;
  page?: number;
}

// ============ DETAILED SUPPLIER DEBT/PAYMENT TYPES ============

export interface SupplierDebtItem {
  id: number;
  name: string;
  qty: string;
  unit: string;
  price_uzs: string;
  price_usd: string;
  subtotal_uzs: string;
  subtotal_usd: string;
}

export interface SupplierDebtInlinePayment {
  id: number;
  payment_date: string;
  amount: string;
  payment_type: string;
  debt_currency: string;
  currency_short_name: string;
  rate_at_payment: string;
  amount_in_uzs: number;
  amount_in_usd: number;
  comment: string;
  closes_debt: boolean;
}

export interface SupplierDetailedDebt {
  id: number;
  is_manual: boolean;
  date_of_arrived: string;
  date_created: string;
  is_debt: boolean;
  note: string | null;
  total_amount: string | null;
  total_amount_uzs: string;
  total_amount_usd: string;
  amount_of_debt: string | null;
  amount_of_debt_in_usd: string | null;
  advance_uzs: string;
  advance_usd: string;
  total_paid_uzs: string;
  total_paid_usd: string;
  rate_at_purchase: string;
  remaining_debt_uzs: string;
  remaining_debt_usd: string;
  status: string;
  supplier_id: number;
  supplier_name: string;
  store_id: number;
  store_name: string;
  items_count: number;
  items: SupplierDebtItem[];
  payments: SupplierDebtInlinePayment[];
}

export interface SupplierDebtsDetailedResponse {
  count: number;
  supplier: {
    id: number;
    name: string;
    phone?: string;
    balance_by_currency: Record<string, string>;
  };
  totals: {
    debt_count: number;
    total_by_currency: Record<string, string>;
    paid_by_currency: Record<string, string>;
    remainder_by_currency: Record<string, string>;
    counts: {
      all: number;
      open: number;
      closed: number;
      manual: number;
    };
  };
  links: { first: string | null; last: string | null; next: string | null; previous: string | null };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: SupplierDetailedDebt[];
}

export interface SupplierDetailedPaymentEntry {
  id: number;
  payment_date: string;
  amount: string;
  payment_type: string;
  debt_currency: string;
  currency_short_name: string;
  rate_at_payment: string;
  amount_in_uzs: number;
  amount_in_usd: number;
  comment: string;
  closes_debt: boolean;
  stock_entry: {
    id: number;
    is_manual: boolean;
    date_of_arrived: string;
    date_created: string;
    is_debt: boolean;
    note: string | null;
    total_amount: string | null;
    total_amount_uzs: string;
    total_amount_usd: string;
    amount_of_debt: string | null;
    amount_of_debt_in_usd: string | null;
    advance_uzs: string;
    advance_usd: string;
    total_paid_uzs: string;
    total_paid_usd: string;
    rate_at_purchase: string;
    remaining_debt_uzs: string;
    remaining_debt_usd: string;
    supplier_id: number;
    supplier_name: string;
    store_id: number;
    store_name: string;
    items_count: number;
  };
}

export interface SupplierPaymentsDetailedResponse {
  count: number;
  supplier: {
    id: number;
    name: string;
    phone?: string;
    balance_by_currency: Record<string, string>;
  };
  totals: {
    payment_count: number;
    paid_by_currency: Record<string, string>;
    remainder_by_currency: Record<string, string>;
    by_payment_type: Record<string, {
      count: number;
      amount: string;
    }>;
  };
  links: { first: string | null; last: string | null; next: string | null; previous: string | null };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: SupplierDetailedPaymentEntry[];
}

export const useGetSupplierPayments = (
  supplierId: number | string,
  filters: SupplierPaymentFilters = {},
) => {
  return useQuery<SupplierPaymentsResponse>({
    queryKey: ["supplierPayments", supplierId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.payment_date_after) params.set("payment_date_after", filters.payment_date_after);
      if (filters.payment_date_before) params.set("payment_date_before", filters.payment_date_before);
      if (filters.payment_type) params.set("payment_type", filters.payment_type);
      if (filters.stock_entry) params.set("stock_entry", String(filters.stock_entry));

      const queryString = params.toString();
      const url = `${STOCK_DEBT_PAYMENT_URL}suppliers/${supplierId}/payments/${queryString ? `?${queryString}` : ""}`;
      const { data } = await api.get<SupplierPaymentsResponse>(url);
      return data;
    },
    enabled: !!supplierId,
  });
};

// Delete stock payment
export const useDeleteStockPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId }: { paymentId: number }) => {
      const response = await api.delete(`${STOCK_DEBT_PAYMENT_URL}pay/${paymentId}/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplierDebtsDetailed"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPaymentsDetailed"] });
      queryClient.invalidateQueries({ queryKey: ["supplierPayments"] });
      queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
      queryClient.invalidateQueries({ queryKey: ["stockEntryPayments"] });
    },
  });
};
