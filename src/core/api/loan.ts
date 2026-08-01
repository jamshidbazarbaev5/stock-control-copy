import api from './api';

export interface Loan {
  id: number;
  sponsor_read: {
    id: number;
    name: string;
    phone_number: string;
  };
  is_paid: boolean;
  total_amount: string;
  currency: string;
  created_at: string;
  due_date: string;
  remainder: string;
  overpayment_unused: string;
}

export async function createLoan(sponsorId: number, data: { total_amount: number; currency: string; due_date: string; sponsor_write: number }) {
  const response = await api.post(`/sponsors/${sponsorId}/loans/`, data);
  return response.data;
}

export async function fetchLoans(sponsorId: number, currency?: string, is_paid?: boolean, page: number = 1): Promise<{ results: Loan[], totalCount: number }> {
  const params: any = { page };
  if (currency) params.currency_code = currency;
  if (typeof is_paid === 'boolean') params.is_paid = is_paid;
  const response = await api.get(`/sponsors/${sponsorId}/loans/`, { params });
  return {
    results: response.data.results || [],
    totalCount: (response.data.total_pages || 1) * (response.data.page_size || 30)
  };
}
