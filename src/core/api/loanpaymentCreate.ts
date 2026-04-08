import api from './api';

export interface LoanPaymentCreate {
  amount: number;
  loan: number;
  notes: string;
  payment_method: string;
  currency_type?: string;
  rate?: number;
}

export async function createLoanPayment(sponsorId: number, loanId: number, data: LoanPaymentCreate) {
  const response = await api.post(`/sponsors/${sponsorId}/loans/${loanId}/payments/`, data);
  return response.data;
}
