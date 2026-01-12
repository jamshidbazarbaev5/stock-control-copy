import { createResourceApiHooks } from '../helpers/createResourceApi';

// Types
export interface RefundItem {
  id?: number;
  sale_item: number;
  quantity: number;
  return_price?: string | number;
}

export interface Refund {
  id?: number;
  sale: number;
  notes?: string;
  refund_items: RefundItem[];
  refund_payments: Array<{
    payment_method: string;
    amount: string;
  }>;
  total_amount?: string;
  created_at?: string;
  sale_read?: {
    id: number;
    store_read?: {
      id: number;
      name: string;
    };
    total_amount: string;
    sale_items: Array<{
      id: number;
      stock_read?: {
        product_read?: {
          id: number;
          product_name: string;
        };
      };
      quantity: string;
      subtotal: string;
      selling_method: string;
    }>;
    created_at: string;
  };
}

// API endpoints
const REFUND_URL = 'refunds/create/';

// Create refund API hooks using the factory function
export const {
  useGetResources: useGetRefunds,
  useGetResource: useGetRefund,
  useCreateResource: useCreateRefund,
  useUpdateResource: useUpdateRefund,
  useDeleteResource: useDeleteRefund,
} = createResourceApiHooks<Refund>(REFUND_URL, 'refunds');
