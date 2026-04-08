import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

interface RevaluationProduct {
  product: number;
  product_name: string;
  old_selling_price: string;
  old_min_price: string;
}

export interface RevaluationHistoryItem {
  id: number;
  created_at: string;
  comment: string;
  new_selling_price: string;
  new_min_price: string;
  revaluation_products: RevaluationProduct[];
}

interface RevaluationData {
  comment: string;
  new_selling_price: string;
  new_min_price: string;
  new_selling_price_in_currency?: string;
  new_min_stock?: number;
  product_ids: number[];
}

export interface PaginatedResponse<T> {
  links?: {
    first: string | number | null;
    last: string | number | null;
    next: string | null;
    previous: string | null;
  };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: T[];
}

export const useProductRevaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RevaluationData) => api.post("revaluation/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["revaluation-history"] });
    },
  });
};

export const useRevaluationHistory = ({
  page = 1,
  product_name,
}: { page?: number; product_name?: string }) => {
  return useQuery<PaginatedResponse<RevaluationHistoryItem>>({
    queryKey: ["revaluation-history", page, product_name ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (product_name) params.append("product_name", product_name);
      const res = await api.get(`revaluation/?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev as any,
  });
};
