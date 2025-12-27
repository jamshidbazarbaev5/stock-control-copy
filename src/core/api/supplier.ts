import { createResourceApiHooks } from "../helpers/createResourceApi";
import api from "./api";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

// Types
export interface Supplier {
  id?: number;
  name: string;
  balance_type?: string;
  phone_number: string;
  total_debt?: string;
  total_paid?: string;
  balance_in_usd?:string;
  remaining_debt?: string;
  balance?: string | null;
}

export interface AddSupplierBalanceRequest {
  supplier: number;
  store: number;
  amount: number;
  payment_method: string;
}

// API endpoints
const SUPPLIER_URL = "suppliers/";
const SUPPLIER_BALANCE_URL = "suppliers/balance/";

// Create supplier API hooks using the factory function
export const {
  useGetResources: useGetSuppliers,
  useGetResource: useGetSupplier,
  useCreateResource: useCreateSupplier,
  useUpdateResource: useUpdateSupplier,
  useDeleteResource: useDeleteSupplier,
} = createResourceApiHooks<Supplier>(SUPPLIER_URL, "suppliers");

// Hook to fetch ALL suppliers across all pages
export const useGetAllSuppliers = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["all-suppliers"],
    queryFn: async (): Promise<Supplier[]> => {
      let allSuppliers: Supplier[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get<{ results: Supplier[], count: number, total_pages: number }>(SUPPLIER_URL, {
          params: { page, page_size: 100 },
        });

        const data = response.data;
        if (data.results) {
          allSuppliers = [...allSuppliers, ...data.results];
        }

        // Check if there are more pages
        hasMore = page < (data.total_pages || 1);
        page++;

        // Safety limit to prevent infinite loops
        if (page > 100) break;
      }

      return allSuppliers;
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
};

// Add supplier balance mutation
export const useAddSupplierBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddSupplierBalanceRequest) => {
      const response = await api.post(SUPPLIER_BALANCE_URL, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};
