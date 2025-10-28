export interface ExpensesSummaryResponse {
  total_expense: number;
  purchase_expense_total: number;
  other_expense_total: number;
  expenses: Array<{
    expense_name__name: string;
    total_amount: number;
  }>;
}

export interface SuppliersSummaryResponse {
  total_left_debt: number;
  suppliers: Array<{
    supplier_name: string;
    total_purchases: number;
    total_debts: number;
    total_paid: number;
    remaining_debt: number;
  }>;
}
