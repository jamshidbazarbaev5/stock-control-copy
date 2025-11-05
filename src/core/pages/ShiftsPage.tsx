import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResourceTable } from "../helpers/ResourseTable";
import { shiftsApi } from "../api/shift";
import type { Shift } from "../api/shift";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Printer } from "lucide-react";
import {
  shiftClosureReceiptService,
  type ShiftClosureData,
} from "@/services/shiftClosureReceiptService";
import { useGetStores } from "../api/store";
import { useGetCashRegisters } from "../api/cash-register";
import { useGetUsers } from "../api/user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ShiftsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [printingShiftId, setPrintingShiftId] = useState<number | null>(null);
  const [shiftId, setShiftId] = useState<string>("");

  // Filter states
  const [storeFilter, setStoreFilter] = useState<string>("");
  const [registerFilter, setRegisterFilter] = useState<string>("");
  const [cashierFilter, setCashierFilter] = useState<string>("");
  const [approvedByFilter, setApprovedByFilter] = useState<string>("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("");
  const [isApprovedFilter, setIsApprovedFilter] = useState<string>("");
  const [isAwaitingApprovalFilter, setIsAwaitingApprovalFilter] =
    useState<string>("");

  // Fetch filter options
  const { data: storesData } = useGetStores({});
  const { data: cashRegistersData } = useGetCashRegisters();
  const { data: usersData } = useGetUsers({});
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [
    storeFilter,
    registerFilter,
    cashierFilter,
    approvedByFilter,
    isActiveFilter,
    isApprovedFilter,
    isAwaitingApprovalFilter,
    searchTerm,
    shiftId,
  ]);

  // Build filter params
  const filterParams: {
    store?: number;
    register?: number;
    cashier?: number;
    approved_by?: number;
    is_active?: boolean;
    is_approved?: boolean;
    is_awaiting_approval?: boolean;
  } = {};
  if (storeFilter && storeFilter !== "all")
    filterParams.store = parseInt(storeFilter);
  if (registerFilter && registerFilter !== "all")
    filterParams.register = parseInt(registerFilter);
  if (cashierFilter && cashierFilter !== "all")
    filterParams.cashier = parseInt(cashierFilter);
  if (approvedByFilter && approvedByFilter !== "all")
    filterParams.approved_by = parseInt(approvedByFilter);
  if (isActiveFilter && isActiveFilter !== "all")
    filterParams.is_active = isActiveFilter === "true";
  if (isApprovedFilter && isApprovedFilter !== "all")
    filterParams.is_approved = isApprovedFilter === "true";
  if (isAwaitingApprovalFilter && isAwaitingApprovalFilter !== "all")
    filterParams.is_awaiting_approval = isAwaitingApprovalFilter === "true";
  if (shiftId) {
    (filterParams as any).id = parseInt(shiftId);
  }

  const { data: response, isLoading } = useQuery({
    queryKey: ["shifts", page, searchTerm, filterParams],
    queryFn: () => shiftsApi.getAll(filterParams),
  });

  // Prepare filter options
  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];
  const cashRegisters = Array.isArray(cashRegistersData)
    ? cashRegistersData
    : cashRegistersData?.results || [];
  const users = Array.isArray(usersData) ? usersData : usersData?.results || [];

  const shifts = response?.data?.results || [];
  const totalCount = response?.data?.count || 0;
  const columns = [
    {
      header: t("table.store"),
      accessorKey: (row: Shift) => row.store?.name,
    },
    {
      header: t("table.register"),
      accessorKey: (row: Shift) => row.register?.name,
    },
    {
      header: t("table.cashier"),
      accessorKey: (row: Shift) => row.cashier?.name,
    },
    {
      header: t("table.total_expected"),
      accessorKey: "total_expected",
    },

    {
      header: t("table.opened_at"),
      accessorKey: "opened_at",
      cell: (row: Shift) => formatDate(row.opened_at),
    },
    {
      header: t("table.closed_at"),
      accessorKey: "closed_at",
      cell: (row: Shift) => (row.closed_at ? formatDate(row.closed_at) : "-"),
    },
    {
      header: t("table.opening_cash"),
      accessorKey: "opening_cash",
    },

    {
      header: t("table.status"),
      accessorKey: "is_active",
      cell: (row: Shift) =>
        row.is_active ? t("common.active") : t("common.closed"),
    },

    {
      header: "Печать",
      accessorKey: "print",
      cell: (row: Shift) => (
        <Button
          onClick={() => handlePrint(row)}
          disabled={printingShiftId === row.id || row.is_active}
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          <Printer className="w-4 h-4 mr-1" />
          {printingShiftId === row.id ? "Печать..." : "Печать"}
        </Button>
      ),
    },
  ];

  const handleEdit = (shift: Shift) => {
    navigate(`/shifts/${shift.id}/edit`);
  };

  const handlePrint = async (shift: Shift) => {
    if (shift.is_active) {
      // Don't allow printing for active shifts
      shiftClosureReceiptService.showPrintNotification({
        success: false,
        method: "failed",
        message: "Нельзя печатать чек для активной смены",
        error: "Shift is still active",
      });
      return;
    }

    try {
      setPrintingShiftId(shift.id);
      console.log(`🖨️ Printing receipt for shift ${shift.id}...`);

      // Fetch full shift details from API
      const response = await shiftsApi.getById(shift.id);
      const shiftData = response.data;

      // Transform the API response to match ShiftClosureData interface
      const printData: ShiftClosureData = {
        id: shiftData.id,
        store: shiftData.store,
        register: shiftData.register,
        cashier: shiftData.cashier,
        total_expected: shiftData.total_expected,
        total_actual: shiftData.total_actual,
        total_sales_amount: shiftData.total_sales_amount,
        total_debt_amount: shiftData.total_debt_amount,
        total_sales_count: shiftData.total_sales_count,
        total_returns_amount: shiftData.total_returns_amount,
        total_returns_count: shiftData.total_returns_count,
        total_income: shiftData.total_income,
        total_expense: shiftData.total_expense,
        opened_at: shiftData.opened_at,
        closed_at: shiftData.closed_at || new Date().toISOString(),
        opening_cash: shiftData.opening_cash,
        closing_cash: shiftData.closing_cash || "0.00",
        opening_comment: shiftData.opening_comment || "",
        closing_comment: shiftData.closing_comment || "",
        approval_comment: shiftData.approval_comment,
        is_active: shiftData.is_active,
        is_awaiting_approval: shiftData.is_awaiting_approval,
        is_approved: shiftData.is_approved,
        approved_by: shiftData.approved_by,
        payments: shiftData.payments,
      };

      // Print the receipt
      const printResult =
        await shiftClosureReceiptService.printWithFallback(printData);
      shiftClosureReceiptService.showPrintNotification(printResult);
      console.log("✅ Print completed:", printResult);
    } catch (error) {
      shiftClosureReceiptService.showPrintNotification({
        success: false,
        method: "failed",
        message: "Ошибка при печати чека",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPrintingShiftId(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("navigation.shifts")}</h1>
        <Button onClick={() => navigate("/shifts/new")}>
          {t("common.create")}
        </Button>
      </div>

      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder={t("placeholders.search_shifts")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Поиск по ID смены"
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Store Filter */}
          <div>
            <Label>{t("table.store")}</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.select_store")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id?.toString() || ""}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Register Filter */}
          <div>
            <Label>{t("table.register")}</Label>
            <Select value={registerFilter} onValueChange={setRegisterFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.select_register")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {cashRegisters.map((register) => (
                  <SelectItem
                    key={register.id}
                    value={register.id?.toString() || ""}
                  >
                    {register.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cashier Filter */}
          <div>
            <Label>{t("table.cashier")}</Label>
            <Select value={cashierFilter} onValueChange={setCashierFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.select_cashier")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id?.toString() || ""}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Approved By Filter */}
          <div>
            <Label>{t("table.approved_by")}</Label>
            <Select
              value={approvedByFilter}
              onValueChange={setApprovedByFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.select_approver")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id?.toString() || ""}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Is Active Filter */}
          <div>
            <Label>{t("forms.status")}</Label>
            <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.closed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Is Approved Filter */}
          <div>
            <Label>{t("table.approval_status")}</Label>
            <Select
              value={isApprovedFilter}
              onValueChange={setIsApprovedFilter}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("placeholders.select_approval_status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="true">{t("table.approved")}</SelectItem>
                <SelectItem value="false">{t("table.not_approved")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Is Awaiting Approval Filter */}
          <div>
            <Label>{t("table.awaiting_approval")}</Label>
            <Select
              value={isAwaitingApprovalFilter}
              onValueChange={setIsAwaitingApprovalFilter}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("placeholders.select_awaiting_status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="true">{t("table.awaiting")}</SelectItem>
                <SelectItem value="false">{t("table.not_awaiting")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setStoreFilter("all");
                setRegisterFilter("all");
                setCashierFilter("all");
                setApprovedByFilter("all");
                setIsActiveFilter("all");
                setIsApprovedFilter("all");
                setIsAwaitingApprovalFilter("all");
                setShiftId("");
              }}
            >
              {t("common.clear_filters2")}
            </Button>
          </div>
        </div>
      </div>

      <ResourceTable<Shift>
        data={shifts}
        columns={columns}
        isLoading={isLoading}
        onEdit={currentUser?.is_superuser ? handleEdit : undefined}
        totalCount={totalCount}
        currentPage={page}
        onPageChange={setPage}
        pageSize={30}
      />
    </div>
  );
}
