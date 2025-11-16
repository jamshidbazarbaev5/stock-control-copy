import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { shiftsApi } from "@/core/api/shift";
import { useTranslation } from "react-i18next";

interface ShiftData {
  id: number;
  store: {
    id: number;
    budgets: Array<{
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
    parent_store: any;
  };
  register: {
    id: number;
    store: any;
    name: string;
    is_active: boolean;
    last_opened_at: string | null;
    current_budget: string;
    last_closing_cash: number;
  };
  cashier: {
    id: number;
    name: string;
    phone_number: string;
    role: string;
  };
  opened_at: string;
  closed_at: string | null;
  opening_cash: string;
  closing_cash: string;
  opening_comment: string;
  closing_comment: string;
  approval_comment: string | null;
  is_active: boolean;
  is_awaiting_approval: boolean;
  is_approved: boolean;
  approved_by: any;
  summary_data: {
    store: string;
    cashier: string;
    shift_id: number;
    opened_at: string;
    closed_at: string | null;
    expenses: {
      total: string;
      by_type: Array<{ amount: string; payment_method: string }>;
      total_in_usd: string;
    };
    remaining: {
      total: string;
      by_type: Array<{ amount: string; payment_method: string }>;
      total_in_usd: string;
    };
    debt_payments: {
      total: string;
      by_type: Array<{ amount: string; payment_method: string }>;
      total_in_usd: string;
    };
    sales_payments: {
      total: string;
      by_type: Array<{ amount: string; payment_method: string }>;
      total_in_usd: string;
    };
    deposit_payments: {
      total: string;
      by_type: Array<{ amount: string; payment_method: string }>;
      total_in_usd: string;
    };
    deposit_clients: Array<any>;
    debt_clients: Array<any>;
    total_debt_amount: string;
    total_sales_count: number;
    total_sales_amount: string;
    total_returns_count: number;
    total_returns_amount: string;
  };
}

const EditShiftPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const shiftId = id;
  const { t } = useTranslation();

  const [shiftData, setShiftData] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShift = async () => {
      if (!shiftId) {
        setError("ID смены не указан");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await shiftsApi.getById(parseInt(shiftId));
        // @ts-ignore
        setShiftData(response.data);
      } catch (err) {
        setError("Ошибка при загрузке данных смены");
        console.error("Error fetching shift:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchShift();
  }, [shiftId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !shiftData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Данные не найдены"}</p>
          <Button onClick={() => navigate("/shifts")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
        </div>
      </div>
    );
  }

  const summary = shiftData.summary_data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 md:mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <Button
                onClick={() => navigate("/shifts")}
                variant="outline"
                size="sm"
                className="rounded-full border-2 hover:bg-gray-50 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t("common.back")}</span>
              </Button>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${shiftData.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                    {t("shifts.shift")} #{shiftData.id}
                  </h1>
                  <p className="text-gray-500 text-xs sm:text-sm truncate">
                    {shiftData.store.name} • {t("shifts.opened_at")}: {new Date(shiftData.opened_at).toLocaleString("ru-RU")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Store, Register, Cashier Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Store Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-3">
                <h3 className="text-base font-bold text-white">🏪 {t("table.store")}</h3>
              </div>
              <div className="p-4 space-y-2">
                <div><span className="font-semibold">{t("forms.name")}:</span> {shiftData?.store?.name}</div>
                <div><span className="font-semibold">{t("forms.address")}:</span> {shiftData?.store?.address}</div>
                <div><span className="font-semibold">{t("forms.phone")}:</span> {shiftData?.store?.phone_number}</div>
                <div><span className="font-semibold">{t("forms.budget")}:</span> {parseFloat(shiftData?.store?.budget || '0').toLocaleString()} {t("forms.uzs")}</div>
              </div>
            </div>

            {/* Register Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-3">
                <h3 className="text-base font-bold text-white">💻 {t("table.register")}</h3>
              </div>
              <div className="p-4 space-y-2">
                <div><span className="font-semibold">{t("forms.name")}:</span> {shiftData?.register?.name}</div>
                <div><span className="font-semibold">{t("table.status")}:</span> {shiftData?.register?.is_active ? t("common.active") : t("common.inactive")}</div>
                <div><span className="font-semibold">{t("forms.budget")}:</span> {parseFloat(shiftData?.register?.current_budget || '0').toLocaleString()}</div>
              </div>
            </div>

            {/* Cashier Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-3">
                <h3 className="text-base font-bold text-white">👤 {t("table.cashier")}</h3>
              </div>
              <div className="p-4 space-y-2">
                <div><span className="font-semibold">{t("forms.name")}:</span> {shiftData?.cashier?.name}</div>
                <div><span className="font-semibold">{t("forms.phone")}:</span> {shiftData?.cashier?.phone_number}</div>
                <div><span className="font-semibold">{t("forms.role")}:</span> {shiftData?.cashier?.role}</div>
              </div>
            </div>
          </div>

          {/* Shift Status */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-500 to-slate-600 p-3">
              <h3 className="text-base font-bold text-white">📋 {t("table.status")}</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">{t("table.status")}</div>
                  <div className={`font-bold ${shiftData?.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                    {shiftData?.is_active ? t("common.active") : t("common.closed")}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">{t("table.awaiting_approval")}</div>
                  <div className={`font-bold ${shiftData?.is_awaiting_approval ? 'text-amber-600' : 'text-gray-600'}`}>
                    {shiftData?.is_awaiting_approval ? t("common.yes") : t("common.no")}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">{t("table.approved")}</div>
                  <div className={`font-bold ${shiftData?.is_approved ? 'text-green-600' : 'text-gray-600'}`}>
                    {shiftData?.is_approved ? t("common.yes") : t("common.no")}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">{t("shifts.closed_at")}</div>
                  <div className="font-bold text-gray-800 text-xs">
                    {shiftData?.closed_at ? new Date(shiftData.closed_at).toLocaleString("ru-RU") : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Sales Payments */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>💰 {t("dashboard.sales")}</span>
                <span className="text-sm">{parseFloat(summary?.sales_payments?.total).toLocaleString()} {t("forms.uzs")}</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary?.sales_payments?.by_type?.map((payment) => (
                  <div key={payment?.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{payment?.payment_method}</span>
                    <span className="font-bold text-green-700">{parseFloat(payment?.amount || '0').toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {summary?.sales_payments?.total_in_usd && parseFloat(summary?.sales_payments?.total_in_usd) > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">USD:</span>
                    <span className="text-sm font-bold text-green-700">${parseFloat(summary?.sales_payments?.total_in_usd || '0').toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deposit Payments */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>📥 {t("forms.deposit")}</span>
                <span className="text-sm">{parseFloat(summary?.deposit_payments?.total).toLocaleString()} {t("forms.uzs")}</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary?.deposit_payments?.by_type?.map((payment) => (
                  <div key={payment?.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{payment?.payment_method}</span>
                    <span className="font-bold text-blue-700">{parseFloat(payment?.amount || '0').toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {summary?.deposit_clients?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-gray-700 mb-2">{t("dashboard.clients")}:</h3>
                  {summary?.deposit_clients?.map((client, idx) => (
                    <div key={idx} className="text-sm py-1 px-2 bg-blue-50 rounded mb-1">
                      {client?.client_name} - {parseFloat(client?.deposit || '0').toLocaleString()} ({client?.deposit_payment_method})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Debt Payments */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>💳 {t("navigation.debt")}</span>
                <span className="text-sm">{parseFloat(summary?.debt_payments?.total).toLocaleString()} {t("forms.uzs")}</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary?.debt_payments?.by_type?.map((payment) => (
                  <div key={payment?.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{payment?.payment_method}</span>
                    <span className="font-bold text-amber-700">{parseFloat(payment?.amount || '0').toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {summary?.debt_clients?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-gray-700 mb-2">{t("dashboard.clients")}:</h3>
                  {summary?.debt_clients?.map((client, idx) => (
                    <div key={idx} className="text-sm py-1 px-2 bg-amber-50 rounded mb-1">
                      {client?.client_name} - {parseFloat(client?.amount || '0').toLocaleString()} ({client?.payment_method})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>📤 {t("navigation.expenses")}</span>
                <span className="text-sm">{parseFloat(summary?.expenses?.total || '0').toLocaleString()} {t("forms.uzs")}</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary?.expenses?.by_type?.map((payment) => (
                  <div key={payment?.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{payment?.payment_method}</span>
                    <span className="font-bold text-red-700">{parseFloat(payment?.amount || '0').toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Remaining */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                <span>💵 {t("forms.remaining_balance")}</span>
                <span className="text-sm">{parseFloat(summary?.remaining?.total || '0').toLocaleString()} {t("forms.uzs")}</span>
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-2">
                {summary?.remaining?.by_type?.map((payment) => (
                  <div key={payment?.payment_method} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{payment?.payment_method}</span>
                    <span className="font-bold text-purple-700">{parseFloat(payment?.amount || '0').toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {summary?.remaining?.total_in_usd && parseFloat(summary?.remaining?.total_in_usd) > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">USD:</span>
                    <span className="text-sm font-bold text-purple-700">${parseFloat(summary?.remaining.total_in_usd).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cash and Comments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold text-white">💰 {t("shifts.opening_cash")}</h3>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <div className="text-2xl font-bold text-center text-green-700">
                  {parseFloat(shiftData?.opening_cash).toLocaleString()} {t("forms.uzs")}
                </div>
                {shiftData?.opening_comment && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{shiftData?.opening_comment}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold text-white">💰 {t("shifts.closing_cash")}</h3>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <div className="text-2xl font-bold text-center text-orange-700">
                  {parseFloat(shiftData?.closing_cash).toLocaleString()} {t("forms.uzs")}
                </div>
                {shiftData?.closing_comment && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{shiftData?.closing_comment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-3 sm:p-4 md:p-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center">
                📊 {t("dashboard.sales_summary")}
              </h2>
            </div>
            <div className="p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                <div className="bg-blue-50 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-blue-500">
                  <div className="text-xs sm:text-sm text-blue-600 font-medium">{t("dashboard.total_sales")}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800">{summary?.total_sales_count || 0}</div>
                </div>
                <div className="bg-green-50 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-green-500">
                  <div className="text-xs sm:text-sm text-green-600 font-medium">{t("dashboard.total_sales_amount")}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-800 truncate">
                    {parseFloat(summary?.total_sales_amount || '0').toLocaleString()}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-amber-500">
                  <div className="text-xs sm:text-sm text-amber-600 font-medium">{t("dashboard.total_debt_amount")}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-800 truncate">
                    {parseFloat(summary?.total_debt_amount || '0').toLocaleString()}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-orange-500">
                  <div className="text-xs sm:text-sm text-orange-600 font-medium">{t("common.refund")}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-800">{summary?.total_returns_count || 0}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-2 sm:p-3 md:p-4 border-l-4 border-red-500">
                  <div className="text-xs sm:text-sm text-red-600 font-medium">{t("common.refund")} {t("forms.amount")}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-800 truncate">
                    {parseFloat(summary?.total_returns_amount || '0').toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Store Budgets */}
          {/*<div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">*/}
          {/*  <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-3 sm:p-4">*/}
          {/*    <h2 className="text-base sm:text-lg font-bold text-white">💼 {t("forms.budget")} {t("table.store")}</h2>*/}
          {/*  </div>*/}
          {/*  <div className="p-3 sm:p-4">*/}
          {/*    <div className="space-y-2">*/}
          {/*      {shiftData?.store.budgets.map((budget) => (*/}
          {/*        <div key={budget.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">*/}
          {/*          <span className="font-medium text-gray-700">{budget.budget_type}</span>*/}
          {/*          <span className="font-bold text-teal-700">{parseFloat(budget.amount).toLocaleString()}</span>*/}
          {/*        </div>*/}
          {/*      ))}*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*</div>*/}
        </div>
      </div>
    </div>
  );
};

export default EditShiftPage;
