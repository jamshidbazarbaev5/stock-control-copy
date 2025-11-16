/**
 * Shift Closure Receipt Service
 * Handles automatic thermal receipt printing for shift closures
 * Communicates with local thermal printer service running on port 3001
 */

export interface ShiftClosureData {
  id: number;
  store: {
    id: number;
    budgets?: Array<{
      id: number;
      budget_type: string;
      amount: string;
    }>;
    name: string;
    address: string;
    phone_number: string;
    budget: string;
    created_at: string;
    is_main: boolean;
    color: string;
    parent_store: null | number;
  };
  register: {
    id: number;
    store: {
      id: number;
      budgets?: Array<{
        id: number;
        budget_type: string;
        amount: string;
      }>;
      name: string;
      address: string;
      phone_number: string;
      budget: string;
      created_at: string;
      is_main: boolean;
      color: string;
      parent_store: null | number;
    };
    name: string;
    is_active: boolean;
    last_opened_at: string | null;
    current_budget?: string;
    last_closing_cash: number;
  };
  cashier: {
    id: number;
    name: string;
    phone_number: string;
    role: string;
  };
  opened_at: string;
  closed_at: string;
  opening_cash: string;
  closing_cash: string;
  opening_comment: string;
  closing_comment: string;
  approval_comment: string | null;
  is_active: boolean;
  is_awaiting_approval: boolean;
  is_approved: boolean;
  approved_by: null | number;
  // Old payment structure (fallback)
  payments?: Array<{
    id: number;
    payment_method: string;
    income: string;
    expense: string;
    expected: string;
    actual: string;
  }>;
  total_sales_count?: number;
  total_sales_amount?: number;
  total_returns_count?: number;
  total_returns_amount?: number;
  total_debt_amount?: number;
  total_income?: number;
  total_expense?: number;
  total_expected?: string;
  total_actual?: string;
  // New summary_data structure
  summary_data?: {
    shift_id: number;
    cashier: string;
    store: string;
    opened_at: string;
    closed_at: string | null;
    total_sales_count: number;
    total_sales_amount: string | number;
    total_debt_amount: string | number;
    total_returns_count: number;
    total_returns_amount: string | number;
    sales_payments: {
      total: string | number;
      total_in_usd: string | number;
      by_type: Array<{
        payment_method: string;
        amount: string | number;
      }>;
    };
    deposit_payments: {
      total: string | number;
      total_in_usd: string | number;
      by_type: Array<{
        payment_method: string;
        amount: string | number;
      }>;
    };
    debt_payments: {
      total: string | number;
      total_in_usd: string | number;
      by_type: Array<{
        payment_method: string;
        amount: string | number;
      }>;
    };
    expenses: {
      total: string | number;
      total_in_usd: string | number;
      by_type: Array<{
        payment_method: string;
        amount: string | number;
      }>;
    };
    remaining: {
      total: string | number;
      total_in_usd: string | number;
      by_type: Array<{
        payment_method: string;
        amount: string | number;
      }>;
    };
    debt_clients: Array<{
      client_name: string;
      amount: number;
      payment_method: string;
    }>;
    deposit_clients: Array<{
      client_name: string;
      deposit: number;
      deposit_payment_method: string;
    }>;
  };
}

export interface PrintServiceResponse {
  message: string;
  shift_id?: number;
  timestamp?: string;
  error?: string;
  printer_ready?: boolean;
}

export interface PrintServiceHealthCheck {
  status: string;
  printer_ready: boolean;
  timestamp: string;
}

class ShiftClosureReceiptService {
  private readonly PRINT_SERVICE_URL = "http://localhost:3001";
  private readonly PRINT_TIMEOUT = 10000; // 10 seconds timeout

  /**
   * Check if the thermal printer service is running and printer is ready
   */
  async checkPrinterStatus(): Promise<PrintServiceHealthCheck> {
    try {
      const response = await fetch(`${this.PRINT_SERVICE_URL}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: PrintServiceHealthCheck = await response.json();
      return data;
    } catch (error) {
      console.error("❌ Printer service health check failed:", error);
      throw new Error(
        "Thermal printer service is not available. Please ensure the service is running.",
      );
    }
  }

  /**
   * Print a test receipt to verify printer functionality
   */
  async printTestReceipt(): Promise<PrintServiceResponse> {
    try {
      // First check if service is available
      await this.checkPrinterStatus();

      const response = await fetch(`${this.PRINT_SERVICE_URL}/test-print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.PRINT_TIMEOUT),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error ||
            `Print failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: PrintServiceResponse = await response.json();
      console.log("✅ Test receipt printed successfully");
      return data;
    } catch (error) {
      console.error("❌ Test print failed:", error);
      throw error;
    }
  }

  /**
   * Print shift closure receipt automatically using thermal printer service
   * This is the main function called after successful shift closure
   */
  async printShiftClosureReceipt(
    shiftData: ShiftClosureData,
  ): Promise<PrintServiceResponse> {
    try {
      console.log(
        "🖨️ Starting automatic thermal receipt printing via service...",
      );

      // Add extra spacing at the end for better printer height
      const shiftDataWithSpacing = {
        ...shiftData,
        _extraSpacing: "60px", // Signal to printer service to add spacing
      };

      const response = await fetch(
        `${this.PRINT_SERVICE_URL}/print-shift-closure`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shiftDataWithSpacing),
          signal: AbortSignal.timeout(this.PRINT_TIMEOUT),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error ||
            `Print failed: ${response.status} ${response.statusText}`,
        );
      }

      const data: PrintServiceResponse = await response.json();
      console.log("✅ Thermal receipt printed successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Thermal receipt printing failed:", error);
      throw error;
    }
  }

  /**
   * Print shift closure receipt with thermal printer service (no fallback to browser)
   * Uses direct thermal printing like the successful test
   */
  async printWithFallback(shiftData: ShiftClosureData): Promise<{
    success: boolean;
    method: "thermal" | "browser" | "failed";
    message: string;
    error?: string;
  }> {
    try {
      // Use thermal printer service directly (like the successful test)
      console.log("🖨️ Printing via thermal service (like test print)...");
      await this.printShiftClosureReceipt(shiftData);
      return {
        success: true,
        method: "thermal",
        message: "Чек напечатан на термопринтере H-58C",
      };
    } catch (thermalError) {
      console.error("❌ Thermal printing failed:", thermalError);
      return {
        success: false,
        method: "failed",
        message: "Ошибка печати на термопринтере",
        error:
          thermalError instanceof Error
            ? thermalError.message
            : "Unknown error",
      };
    }
  }

  /**
   * Generate HTML for browser printing fallback (unused - keeping for future reference)
   */

  /**
   * Print brief report with mock data
   */
  async printBriefReport(data?: any): Promise<PrintServiceResponse> {
    try {
      console.log("🖨️ Printing brief report...");

      const response = await fetch(
        `${this.PRINT_SERVICE_URL}/print-brief-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data || {}),
          signal: AbortSignal.timeout(this.PRINT_TIMEOUT),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error ||
            `Print failed: ${response.status} ${response.statusText}`,
        );
      }

      const responseData: PrintServiceResponse = await response.json();
      console.log("✅ Brief report printed successfully:", responseData);
      return responseData;
    } catch (error) {
      console.error("❌ Brief report printing failed:", error);
      throw error;
    }
  }

  /**
   * Show user notification about print status
   */
  showPrintNotification(result: {
    success: boolean;
    method: string;
    message: string;
    error?: string;
  }) {
    // Create a simple notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ${
        result.success
          ? "background: linear-gradient(135deg, #10b981, #059669);"
          : "background: linear-gradient(135deg, #ef4444, #dc2626);"
      }
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">${result.success ? "✅" : "❌"}</span>
        <div>
          <div style="font-size: 14px; margin-bottom: 4px;">
            ${result.success ? "Чек напечатан" : "Ошибка печати"}
          </div>
          <div style="font-size: 12px; opacity: 0.9;">
            ${result.message}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);

    // Allow manual close on click
    notification.addEventListener("click", () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }
}

// Export singleton instance
export const shiftClosureReceiptService = new ShiftClosureReceiptService();
export default shiftClosureReceiptService;
