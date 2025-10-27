import { createResourceApiHooks } from "../helpers/createResourceApi";
import api from "./api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Supplier {
  id?: number;
  name: string;
  phone_number: string;
  total_debt?: string;
  total_paid?: string;
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
