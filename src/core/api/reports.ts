import api from './api';
import type { ExpensesSummaryResponse, SuppliersSummaryResponse } from './types/reports';

export interface ProductProfitabilityResponse {
  product_name: string;
  revenue: string;
  cost: string;
  profit: string;
  margin: number;
}

export interface UnsoldProductsResponse {
  product_name: string;
}

export interface SalesSummaryResponse {
  total_sales: number;
  total_revenue: number;
  trend: {
    month: string;
    total: number;
  }[];
}

export interface SalesmanSummaryResponse {
  total_sales: number;
  total_revenue: number;
}

export interface SalesmanDebtsResponse {
  total_count: number;
  total_debt: number;
  debts: Array<{
    client_name: string;
    amount: number;
    date: string;
  }>;
}

export interface TopProductsResponse {
  product_name: string;
  total_quantity: string;
  total_revenue: string;
}

export interface StockByCategoryResponse {
  category: string;
  total_stock: string;
}

export interface ProductIntakeResponse {
  total_positions: number;
  total_sum: number;
  data: {
    day: string;
    total_price: number;
    total_quantity: number;
  }[];
}

export interface ClientDebtResponse {
  client_name: string;
  total_debt: string;
  total_paid: string;
  remaining_debt: string;
  deposit: string;
}

export interface TopSellersResponse {
  store_name: string;
  seller_name: string | null;
  seller_phone: string | null;
  total_revenue: number;
  total_sales: number;
}

export interface SalesProfitResponse {
  total_sales: number;
  total_revenue: number;
  total_pure_revenue: number;
  sale_items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    selling_method: string;
    subtotal: number;
    sold_date: string;
    sold_by: string;
  }>;
  payments_by_method?: {
    [method: string]: {
      total_amount: number;
      count: number;
    };
  };
}

type PeriodType = 'day' | 'week' | 'month';

export const getReportsSalesSummary = async (period?: PeriodType, dateParams?: string): Promise<SalesSummaryResponse> => {
  let url = 'reports/sales-summary';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<SalesSummaryResponse>(url);
  return response.data;
};

export const getTopProducts = async (period?: PeriodType, limit?: number, dateParams?: string): Promise<TopProductsResponse[]> => {
  let url = 'reports/top-products';
  const params: Record<string, string | number> = {};
  
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
    if (limit) url += `&limit=${limit}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
    if (limit) url += `&limit=${limit}`;
  } else {
    if (period) params.period = period;
    if (limit) params.limit = limit;
  }

  const response = await api.get<TopProductsResponse[]>(url, { params: dateParams ? undefined : params });
  return response.data;
};

export const getStockByCategory = async (period?: PeriodType, dateParams?: string): Promise<StockByCategoryResponse[]> => {
  let url = 'reports/stock-by-category';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<StockByCategoryResponse[]>(url);
  return response.data;
};

export const getProductIntake = async (period?: PeriodType, dateParams?: string): Promise<ProductIntakeResponse> => {
  let url = 'reports/product-intake';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<ProductIntakeResponse>(url);
  return response.data;
};

export const getClientDebts = async (period?: PeriodType, dateParams?: string): Promise<ClientDebtResponse[]> => {
  let url = 'reports/client-debts';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<ClientDebtResponse[]>(url);
  return response.data;
};

export const getUnsoldProducts = async (period?: PeriodType, dateParams?: string): Promise<UnsoldProductsResponse[]> => {
  let url = 'reports/unsold-products';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<UnsoldProductsResponse[]>(url);
  return response.data;
};

export const getProductProfitability = async (period?: PeriodType, dateParams?: string): Promise<ProductProfitabilityResponse[]> => {
  let url = 'reports/product-profitability';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<ProductProfitabilityResponse[]>(url);
  return response.data;
};

export const getTopSellers = async (period?: PeriodType, dateParams?: string): Promise<TopSellersResponse[]> => {
  let url = 'reports/top-sellers';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<TopSellersResponse[]>(url);
  return response.data;
};

export const getSalesmanSummary = async (period?: PeriodType, dateParams?: string): Promise<SalesmanSummaryResponse> => {
  let url = 'reports/salesman-summary';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<SalesmanSummaryResponse>(url);
  return response.data;
};

export const getSalesmanDebts = async (period?: PeriodType, dateParams?: string): Promise<SalesmanDebtsResponse> => {
  let url = 'reports/salesman-debts';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<SalesmanDebtsResponse>(url);
  return response.data;
};

export const getExpensesSummary = async (period?: PeriodType, dateParams?: string): Promise<ExpensesSummaryResponse> => {
  let url = 'reports/expenses-summary';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<ExpensesSummaryResponse>(url);
  return response.data;
};

export const getSalesProfitReport = async (period?: PeriodType, dateParams?: string): Promise<SalesProfitResponse> => {
  let url = 'reports/sales-profit';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<SalesProfitResponse>(url);
  return response.data;
};

// export const getSalesProfitReport = async (
//   period?: 'day' | 'week' | 'month',
//   dateParams?: string
// ): Promise<SalesProfitResponse> => {
//   let url = 'reports/sales-profit/';
//   if (dateParams) {
//     url += `?${dateParams}`;
//   } else if (period) {
//     url += `?period=${period}`;
//   }
  
//   const response = await api.get<SalesProfitResponse>(url);
//   return response.data;
// };

// Add this function to fetch net profit from the API
export const getNetProfit = async (period?: 'day' | 'week' | 'month', dateParams?: string) => {
  let url = 'reports/net-profit';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getSuppliersSummary = async (period?: PeriodType, dateParams?: string): Promise<SuppliersSummaryResponse> => {
  let url = 'reports/suppliers-summary';
  if (dateParams && period) {
    url += `?${dateParams}&period=${period}`;
  } else if (dateParams) {
    url += `?${dateParams}`;
  } else if (period) {
    url += `?period=${period}`;
  }
  const response = await api.get<SuppliersSummaryResponse>(url);
  return response.data;
};
