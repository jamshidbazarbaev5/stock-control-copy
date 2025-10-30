import { createResourceApiHooks } from "../helpers/createResourceApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import { toast } from "sonner";

// Types
export interface BaseClient {
  id?: number;
  name: string;
  phone_number: string;
  address: string;
}

export interface IndividualClient extends BaseClient {
  type: "Физ.лицо";
}

export interface CorporateClient extends BaseClient {
  type: "Юр.лицо";
  ceo_name: string;
  balance: number;
}

export type Client = IndividualClient | CorporateClient;

export interface ClientHistoryEntry {
  sale: {
    id: number;
    total_amount: string;
    on_credit: boolean;
    sold_date: string;
    store: number;
    sold_by: number;
    client: number;
  };
  previous_balance: string;
  new_balance: string;
  amount_deducted: string;
  timestamp: string;
}

export interface IncrementBalancePayload {
  amount: number;
  store: number;
  payment_method: "Наличные" | "Карта" | "Click" | "Перечисление";
}

export interface CashOutPayload {
  amount: number;
  store: number;
  payment_method: "Наличные" | "Карта" | "Click" | "Перечисление";
}

// API endpoints
const CLIENT_URL = "clients/";

// Create client API hooks using the factory function
export const {
  useGetResources: useGetClients,
  // useGetResource: useGetClient,
  // useCreateResource: useCreateClient,
  useUpdateResource: useUpdateClient,
  useDeleteResource: useDeleteClient,
} = createResourceApiHooks<Client>(CLIENT_URL, "clients");

// Client history hook
export const useGetClientHistory = (
  clientId: number,
  params?: {
    sale?: string;
    start_date?: string;
    end_date?: string;
    type?: string;
  },
) => {
  return useQuery({
    queryKey: ["clientHistory", clientId, params],
    queryFn: async () => {
      const response = await api.get<ClientHistoryEntry[]>(
        `${CLIENT_URL}${clientId}/history`,
        { params },
      );
      return response.data;
    },
    enabled: !!clientId,
  });
};
// Client hook
export const useGetClient = (clientId: number) => {
  return useQuery({
    queryKey: ["clients", clientId],
    queryFn: async () => {
      const response = await api.get<Client>(`${CLIENT_URL}${clientId}`);
      return response.data;
    },
    enabled: !!clientId,
  });
};

// Increment balance mutation hook
export const useIncrementBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, store, payment_method }: { id: number; amount: number; store: number; payment_method: string }) => {
      const response = await api.post<Client>(
        `${CLIENT_URL}${id}/increment-balance/`,
        { amount, store, payment_method },
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: ["clients", data.id] });
        queryClient.invalidateQueries({ queryKey: ["clientHistory", data.id] });
      }
    },
    onError: (error: any) => {
      console.error("Error incrementing balance:", error);
      toast.error(
        error?.response?.data?.detail || "Failed to increment balance",
      );
    },
  });
};

// Cash-out mutation hook
export const useClientCashOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, store, payment_method }: { id: number } & CashOutPayload) => {
      const response = await api.post<Client>(
        `${CLIENT_URL}${id}/cash-out/`,
        { amount, store, payment_method },
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: ["clients", data.id] });
        queryClient.invalidateQueries({ queryKey: ["clientHistory", data.id] });
      }
    },
    onError: (error: any) => {
      console.error("Error during cash-out:", error);
      toast.error(error?.response?.data?.detail || "Failed to cash out");
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/clients/create/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      // queryClient.invalidateQueries({ queryKey: ['debtPayments'] });
    },
  });
};
export { api };

