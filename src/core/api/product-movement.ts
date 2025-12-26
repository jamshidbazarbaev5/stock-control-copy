import { useQuery } from '@tanstack/react-query';
import api from './api';

// Types
export interface ProductMovement {
  id?: number;
  date: string;
  operation: string;
  product: string;
  store: string;
  opening_balance: string;
  quantity_in: string;
  quantity_out: string;
  closing_balance: string;
}

export interface ProductMovementResponse {
  count: number;
  next: string | null;
  previous: string | null;
  movements: ProductMovement[];
}

export interface StockNamesResponse {
  stock_names: string[];
}

export interface ProductMovementParams {
  page?: number;
  product_id?: number;
  store_id?: number;
  stock_name?: string;
  document_type?: string;
  date_from?: string;
  date_to?: string;
}

// API endpoints
const PRODUCT_MOVEMENT_URL = 'items/product-movement/';
const STOCK_NAMES_URL = 'items/stock-names/';

// Hook to get product movements
export const useGetProductMovements = (params: ProductMovementParams) => {
  return useQuery({
    queryKey: ['product-movements', params],
    queryFn: async () => {
      const queryParams: Record<string, any> = {};

      if (params.page) queryParams.page = params.page;
      if (params.product_id) queryParams.product_id = params.product_id;
      if (params.store_id) queryParams.store_id = params.store_id;
      if (params.stock_name) queryParams.stock_name = params.stock_name;
      if (params.document_type) queryParams.document_type = params.document_type;
      if (params.date_from) queryParams.date_from = params.date_from;
      if (params.date_to) queryParams.date_to = params.date_to;

      const response = await api.get<ProductMovementResponse>(PRODUCT_MOVEMENT_URL, {
        params: queryParams,
      });
      return response.data;
    },
  });
};

// Hook to get stock names for a product in a store
export const useGetStockNames = (productId: number | undefined, storeId: number | undefined) => {
  return useQuery({
    queryKey: ['stock-names', productId, storeId],
    queryFn: async () => {
      const params: Record<string, any> = {
        product_id: productId,
      };
      if (storeId) {
        params.store_id = storeId;
      }
      const response = await api.get<StockNamesResponse>(STOCK_NAMES_URL, {
        params,
      });
      return response.data;
    },
    enabled: !!productId,
  });
};
