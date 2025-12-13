import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Printer } from "lucide-react";
import {
  shiftsApi,
  type ShiftSummary,
  type CloseShiftData,
} from "@/core/api/shift";
import { useCurrentUser } from "@/core/hooks/useCurrentUser";
import { useAuth } from "@/core/context/AuthContext";
import {
  shiftClosureReceiptService,
  type ShiftClosureData,
} from "@/services/shiftClosureReceiptService";
import {toast} from "sonner";

const CloseShiftPage = () => {
  const navigate = useNavigate();
  const { shiftId } = useParams<{ shiftId: string }>();
  const { data: userData } = useCurrentUser();
  const { refreshUser } = useAuth();

  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [closingCash, setClosingCash] = useState<number>(0);
  const [closingComment, setClosingComment] = useState<string>("");

  // Printer state
  const [printerStatus, setPrinterStatus] = useState<
    "checking" | "ready" | "not-ready" | "unknown"
  >("unknown");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      let actualShiftId: number;

      if (shiftId === "active") {
        try {
          const shiftsResponse = await shiftsApi.getAll();
          const activeShift = shiftsResponse.data.results.find(
            (shift) => shift.is_active,
          );
          if (!activeShift) {
            setError("Активная смена не найдена");
            setLoading(false);
            return;
          }
          actualShiftId = activeShift.id;
        } catch {
          setError("Ошибка при поиске активной смены");
          setLoading(false);
          return;
        }
      } else {
        actualShiftId = parseInt(shiftId || "0");
        if (isNaN(actualShiftId)) {
          setError("Неверный ID смены");
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        const response = await shiftsApi.getSummary(actualShiftId);
        setSummary(response.data);

        setClosingCash(0);
      } catch (err) {
        setError("Ошибка при загрузке данных смены");
        console.error("Error fetching shift summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [shiftId, userData]);

  // Check printer status on component mount
  useEffect(() => {
    const checkPrinter = async () => {
      setPrinterStatus("checking");
      try {
        const status = await shiftClosureReceiptService.checkPrinterStatus();
        setPrinterStatus(status.printer_ready ? "ready" : "not-ready");
      } catch (error) {
        console.warn("Printer service not available:", error);
        setPrinterStatus("not-ready");
      }
    };

    checkPrinter();
  }, []);



  const handleSubmit = async () => {
    if (!summary) return;

    try {
      setSubmitting(true);

      // Get the actual shift ID from summary data
      const actualShiftId = summary.shift_id;

      const closeData: CloseShiftData = {
        payments: summary.remaining.by_type.map(p => ({
          payment_method: p.payment_method,
          actual: p.amount
        })),
        closing_cash: closingCash,
        closing_comment: closingComment,
      };

      // Close the shift first
      const closeResponse = await shiftsApi.closeShift(
        actualShiftId,
        closeData,
      );
      console.log("✅ Shift closed successfully:", closeResponse);

      // Use the data from close endpoint response - it contains all we need
      const shiftData = closeResponse.data;
      console.log("📊 Shift close response data:", shiftData);

      // Prepare data for printing with summary_data
      const printData: ShiftClosureData = {
        id: shiftData.id,
        store: shiftData.store,
        register: shiftData.register,
        cashier: shiftData.cashier,
        opened_at: shiftData.opened_at,
        closed_at: shiftData.closed_at || new Date().toISOString(),
        opening_cash: shiftData.opening_cash,
        closing_cash: shiftData.closing_cash || closingCash.toString(),
        opening_comment: shiftData.opening_comment || "",
        closing_comment: shiftData.closing_comment || closingComment,
        approval_comment: shiftData.approval_comment,
        is_active: shiftData.is_active,
        is_awaiting_approval: shiftData.is_awaiting_approval,
        is_approved: shiftData.is_approved,
        approved_by: shiftData.approved_by,
        summary_data: shiftData.summary_data || summary,
      };

      // Attempt automatic printing
      setPrinting(true);
      try {
        const printResult =
          await shiftClosureReceiptService.printWithFallback(printData);
        shiftClosureReceiptService.showPrintNotification(printResult);
        console.log("🖨️ Print result:", printResult);
      } catch (printError) {
        console.error("❌ Printing failed:", printError);
        shiftClosureReceiptService.showPrintNotification({
          success: false,
          method: "failed",
          message: "Не удалось напечатать чек",
          error:
            printError instanceof Error ? printError.message : "Unknown error",
        });
      } finally {
        setPrinting(false);
      }

      // Refresh user data to update has_active_shift status
      await refreshUser();
      toast.success('Смена закрыто успешно')

      // Navigate back to POS interface - it will show OpenShiftForm since shift is now closed
      navigate("/pos");
    } catch (err) {
      setError("Ошибка при закрытии смены");
      console.error("Error closing shift:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      setPrinting(true);
      await shiftClosureReceiptService.printTestReceipt();
      shiftClosureReceiptService.showPrintNotification({
        success: true,
        method: "thermal",
        message: "Тестовый чек напечатан успешно",
      });
    } catch (error) {
      console.error("Test print failed:", error);
      shiftClosureReceiptService.showPrintNotification({
        success: false,
        method: "failed",
        message: "Ошибка печати тестового чека",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || "Данные не найдены"}</p>
          <Button onClick={() => navigate("/pos")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться
          </Button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 md:mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <Button
                onClick={() => navigate("/pos")}
                variant="outline"
                size="sm"
                className="rounded-full border-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Назад</span>
              </Button>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                    ЗАКРЫТИЕ КАССЫ
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">
                    Магазин {summary.store} • Открыта{" "}
                    {new Date(summary.opened_at).toLocaleString("ru-RU")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {/* Printer Status Indicator */}
              <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-2 rounded-full bg-gray-100 dark:bg-gray-700">
                <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">
                  {printerStatus === "checking" && "🔄"}
                  {printerStatus === "ready" && "✅"}
                  {printerStatus === "not-ready" && "❌"}
                  {printerStatus === "unknown" && "❓"}
                  <span className="hidden sm:inline ml-1">
                    {printerStatus === "checking" && "Проверка..."}
                    {printerStatus === "ready" && "Готов"}
                    {printerStatus === "not-ready" && "Не готов"}
                    {printerStatus === "unknown" && "Неизвестно"}
                  </span>
                </span>
              </div>

              {/* Test Print Button */}
              <Button
                onClick={handleTestPrint}
                disabled={printing || printerStatus !== "ready"}
                variant="outline"
                size="sm"
                className="rounded-full text-xs sm:text-sm px-2 sm:px-4"
              >
                <Printer className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">{printing ? "Печать..." : "Тест"}</span>
              </Button>

              {/* Close Shift Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || printing}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-xs sm:text-base flex-1 sm:flex-none"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                {submitting
                  ? "Закрытие..."
                  : printing
                    ? "Печать..."
                    : "Закрыть кассу"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Sales Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>💰 Продажи</span>
                <span className="text-sm">{summary.sales_payments.total.toLocaleString()} UZS</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary.sales_payments.by_type.map((payment) => (
                  <div key={payment.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{payment.payment_method}</span>
                    <span className="font-bold text-green-700 dark:text-green-400">{payment.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deposit Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>📥 Депозиты</span>
                <span className="text-sm">{summary.deposit_payments.total.toLocaleString()} UZS</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary.deposit_payments.by_type.map((payment) => (
                  <div key={payment.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{payment.payment_method}</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">{payment.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {summary.deposit_clients.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Клиенты:</h3>
                  {summary.deposit_clients.map((client, idx) => (
                    <div key={idx} className="text-sm py-1 px-2 bg-blue-50 dark:bg-blue-900/30 rounded mb-1 text-gray-900 dark:text-gray-100">
                      {client.client_name} - {client.deposit.toLocaleString()} ({client.deposit_payment_method})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Debt Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>💳 Погашение долгов</span>
                <span className="text-sm">{summary.debt_payments.total.toLocaleString()} UZS</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary.debt_payments.by_type.map((payment) => (
                  <div key={payment.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{payment.payment_method}</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{payment.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {summary.debt_clients.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Клиенты:</h3>
                  {summary.debt_clients.map((client, idx) => (
                    <div key={idx} className="text-sm py-1 px-2 bg-amber-50 dark:bg-amber-900/30 rounded mb-1 text-gray-900 dark:text-gray-100">
                      {client.client_name} - {client.amount.toLocaleString()} ({client.payment_method})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>📤 Расходы</span>
                <span className="text-sm">{summary.expenses.total.toLocaleString()} UZS</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary.expenses.by_type.map((payment) => (
                  <div key={payment.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{payment.payment_method}</span>
                    <span className="font-bold text-red-700 dark:text-red-400">{payment.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Remaining - READ ONLY */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>💵 Остаток</span>
                <span className="text-sm">{summary.remaining.total.toLocaleString()} UZS</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary.remaining.by_type.map((payment) => (
                  <div key={payment.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{payment.payment_method}</span>
                    <span className="font-bold text-purple-700 dark:text-purple-400">{payment.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Closing Cash and Comments in a row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Closing Cash */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  💰 Наличные в кассе
                </h3>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Сумма наличных при закрытии
                    </label>
                    <Input
                      type="number"
                      value={closingCash}
                      onChange={(e) =>
                        setClosingCash(parseFloat(e.target.value) || 0)
                      }
                      className="w-full border-2 border-green-200 dark:border-green-700 focus:border-green-500 dark:focus:border-green-400 rounded-xl bg-green-50 dark:bg-green-900/20 text-lg font-bold text-center py-4 text-gray-900 dark:text-gray-100"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold text-white">📝 Комментарий</h3>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <Textarea
                  value={closingComment}
                  onChange={(e) => setClosingComment(e.target.value)}
                  placeholder="Добавьте комментарий к закрытию смены..."
                  className="w-full border-2 border-orange-200 dark:border-orange-700 focus:border-orange-500 dark:focus:border-orange-400 rounded-xl bg-orange-50 dark:bg-orange-900/20 resize-none text-gray-900 dark:text-gray-100"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Totals Summary - Moved to bottom */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-3 sm:p-4 md:p-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center">
                📊 Итоги смены
              </h2>
            </div>
            <div className="p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-blue-500 dark:border-blue-400">
                  <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Всего продаж
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {summary.total_sales_count}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-green-500 dark:border-green-400">
                  <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                    Сумма продаж
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-800 dark:text-green-200 truncate">
                    {summary.total_sales_amount.toLocaleString()}
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-amber-500 dark:border-amber-400">
                  <div className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium">
                    Сумма долгов
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-800 dark:text-amber-200 truncate">
                    {summary.total_debt_amount?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-orange-500 dark:border-orange-400">
                  <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium">
                    Возвратов
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-800 dark:text-orange-200">
                    {summary.total_returns_count}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-red-500 dark:border-red-400">
                  <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">
                    Сумма возвратов
                  </div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-800 dark:text-red-200 truncate">
                    {summary.total_returns_amount.toLocaleString()}
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloseShiftPage;
