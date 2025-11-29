import type { Stock } from '@/core/api/stock';
import api from './api';

// Fetch stock by ID or fetch all paginated stock data from the API
export async function fetchAllStocks(id?: number, params: Record<string, any> = {}) {
  // If ID is provided, fetch specific stock by ID
  if (id) {
    const response = await api.get(`/items/stock/${id}`, {
      params,
    });
    return response.data.results || [response.data];
  }

  // Otherwise, fetch all stocks with pagination
  let page = 1;
  let allResults: Stock[] = [];
  let hasNext = true;

  while (hasNext) {
    const response = await api.get('/items/stock/', {
      params: { ...params, page, product_zero: false },
    });
    const data = response.data;
    allResults = allResults.concat(data.results);
    hasNext = !!data.links.next;
    page++;
  }

  return allResults;
}
