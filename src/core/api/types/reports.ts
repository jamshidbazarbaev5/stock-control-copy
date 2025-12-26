export interface ExpensesSummaryResponse {
  total_expense: number;
  purchase_expense_total: number;
  other_expense_total: number;
  expenses: Array<{
    expense_name__name: string;
    total_amount: number;
  }>;
  other_expense_total_usd:number;
}

export interface SuppliersSummaryResponse {
  total_left_debt: number;
  
  total_left_debt_uzs: number;
  total_left_debt_usd: number;
  suppliers: Array<{
    supplier_name: string;
    total_purchases: number;
    total_debts: number;
    total_paid: number;
    remaining_debt: number;
     remaining_debt_uzs: number;
      remaining_debt_usd: number;
  }>;
}
