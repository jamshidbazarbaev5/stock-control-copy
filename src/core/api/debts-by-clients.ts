import { useQuery } from '@tanstack/react-query';
import api from './api';

export interface DebtByClient {
  id: number;
  type: string;
  name: string;
  ceo_name?: string;
  phone_number: string;
  address: string;
  balance?: string;
  total_amount: string;
  total_deposit: string;
}

interface DebtsByClientsFilters {
  store?: string;
  client?: string;
  type?: string;
  name?: string;
  is_paid?: boolean;
  due_date_after?: string;
  due_date_before?: string;
  created_at_after?: string;
  created_at_before?: string;
  total_amount_min?: string;
  total_amount_max?: string;
}

export const useGetDebtsByClients = (filters?: DebtsByClientsFilters) => {
  return useQuery({
    queryKey: ['debtsByClients', filters],
    queryFn: async () => {
      const response = await api.get<DebtByClient[]>('debts-by-clients', {
        params: filters,
      });
      return response.data;
    },
  });
};
