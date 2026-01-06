import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useGetDebtsHistory, useCreateDebtPayment } from "../api/debt";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MapPin,
  DollarSign,
  Package,
  ShoppingCart,
  History,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ResourceForm } from "../helpers/ResourceForm";
import { ResourceTable } from "../helpers/ResourseTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import api from "../api/api";

interface PaymentFormData {
  amount: number;
  payment_method: string;
  usd_rate_at_payment?: number;
}

export default function DebtDetailsPage() {
  const { t } = useTranslation();
  const { id: clientId } = useParams();
  const queryClient = useQueryClient();
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<{
    id: number;
    remainder: number;
    remainder_usd?: number;
    hasUsdDebt?: boolean;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [storeData, setStoreData] = useState<any>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);

  const { data: debtsData, isLoading } = useGetDebtsHistory(
    Number(clientId),
    currentPage,
  );
  const createPayment = useCreateDebtPayment();

  const debts = debtsData?.results || [];
  const totalCount = (debtsData as any)?.count || 0;

  // Fetch store data when debts are loaded
  useEffect(() => {
    if (debts.length > 0) {
      const client = debts[0]?.client_read;
      setClientInfo(client);
      
      // If client type is Магазин, fetch the linked store
      if (client?.type === "Магазин" && client?.linked_store) {
        const fetchStoreData = async () => {
          try {
            const response = await api.get(
              `/store/${client.linked_store}/`
            );
            // Handle both direct response and nested data structure
            const storeInfo = response?.data || response;
            setStoreData(storeInfo);
            console.log("Store data fetched:", storeInfo);
          } catch (error) {
            console.error("Failed to fetch store data:", error);
          }
        };
        fetchStoreData();
      }
    }
  }, [debts]);

  const handleRowClick = (row: any) => {
    if (row.id === expandedRowId) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(row.id || null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount: number | string | undefined) => {
    return new Intl.NumberFormat("ru-RU").format(Number(amount) || 0);
  };

  const goToPaymentHistory = (debtId: number) => {
    navigation(`/debts/${debtId}/payments`);
  };

  const getAvailableBalance = () => {
    if (clientInfo?.type !== "Магазин" || !storeData?.budgets || !selectedPaymentMethod) {
      return 0;
    }

    const budget = storeData.budgets.find(
      (b: any) => b.budget_type === selectedPaymentMethod
    );
    return budget ? Number(budget.amount) : 0;
  };

  const handlePaymentClick = (debt: {
    id: number;
    remainder: string | number;
    remainder_usd?: string | number;
    total_amount_usd?: string | number;
  }) => {
    const hasUsdDebt = debt.total_amount_usd && Number(debt.total_amount_usd) > 0;
    setSelectedDebt({
      id: debt.id,
      remainder: Number(debt.remainder),
      remainder_usd: debt.remainder_usd ? Number(debt.remainder_usd) : undefined,
      hasUsdDebt: !!hasUsdDebt,
    });
    setSelectedPaymentMethod("");
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (!selectedDebt) return;

    try {
      await createPayment.mutateAsync({
        debt: selectedDebt.id,
        ...data,
      });

      await queryClient.invalidateQueries({
        queryKey: ["debtsHistory", Number(clientId), currentPage],
      });

      toast.success(t("messages.success.payment_created"));
      setIsPaymentModalOpen(false);
      setSelectedDebt(null);
      window.location.reload();
    } catch (error) {
      toast.error(t("messages.error.payment_failed"));
    }
  };

  const navigation = useNavigate();


  const paymentFields = [
    {
      name: "amount",
      label:
        selectedPaymentMethod === "Валюта"
          ? t("forms.amount") + " (USD)"
          : t("forms.amount"),
      type: "number",
      placeholder: t("placeholders.enter_amount"),
      required: true,
    },
    {
      name: "payment_method",
      label: t("forms.payment_method"),
      type: "select",
      placeholder: t("placeholders.select_payment_method"),
      required: true,
      options: [
        { value: "Наличные", label: t("payment.cash") },
        { value: "Click", label: t("payment.click") },
        { value: "Карта", label: t("payment.card") },
        { value: "Перечисление", label: t("payment.per") },
        { value: "Валюта", label: t("forms.currency") || "Валюта" },
      ],
      onChange: (value: string) => setSelectedPaymentMethod(value),
    },
    {
      name: "usd_rate_at_payment",
      label: t("forms.usd_rate_at_payment") || "Курс USD при оплате",
      type: "number",
      placeholder: t("placeholders.enter_usd_rate") || "Введите курс USD",
      required: true,
    },
  ];

  const renderExpandedRow = (debt: any) => {
    return (
      <div className="bg-muted/30 border-t">
       
      

        {/* Sale Items Table */}
        <div className="p-4 pt-2">
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                <ShoppingCart className="w-4 h-4" />
                {t("forms.sale_items")}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">
                      {t("forms.product")}
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground w-20">
                      {t("forms.quantity")}
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground w-24">
                      {t("forms.price_per_unit")}
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground w-24">
                      {t("forms.subtotal")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {debt.sale_read?.sale_items?.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-4">
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <div>
                            <div className="font-medium">{item.product_read.product_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.product_read?.category_read?.category_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-2 px-4">{item.quantity}</td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(item.price_per_unit)}
                      </td>
                      <td className="text-right py-2 px-4 font-medium">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40 font-semibold">
                    <td colSpan={3} className="text-right py-3 px-4">
                      {t("forms.total_amount")}
                    </td>
                    <td className="text-right py-3 px-4 text-emerald-600">
                      {formatCurrency(debt.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="p-4 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-card rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground mb-1">
                {t("forms.total_amount_uzs")}
              </div>
              <div className="font-semibold text-emerald-600">
                {formatCurrency(debt.total_amount_uzs)} UZS
              </div>
            </div>
            {(debt as any).total_amount_usd && Number((debt as any).total_amount_usd) > 0 && (
              <div className="bg-card rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("forms.total_amount_usd") || "Сумма (USD)"}
                </div>
                <div className="font-semibold text-blue-600">
                  {formatCurrency((debt as any).total_amount_usd)} $
                </div>
              </div>
            )}
            <div className="bg-card rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground mb-1">{t("forms.deposit")}</div>
              <div className="font-semibold">{formatCurrency(debt.deposit)}</div>
            </div>
            <div className="bg-card rounded-lg p-3 border">
              <div className="text-xs text-muted-foreground mb-1">{t("forms.remainder_uzs")}</div>
              <div
                className={`font-semibold ${
                  Number(debt.remainder_uzs) < 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(debt.remainder_uzs)}
              </div>
            </div>
            {(debt as any).remainder_usd && Number((debt as any).remainder_usd) > 0 && (
              <div className="bg-card rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("forms.remainder_usd") || "Остаток (USD)"}
                </div>
                <div
                  className={`font-semibold ${
                    Number((debt as any).remainder_usd) < 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency((debt as any).remainder_usd)} $
                </div>
              </div>
            )}
            {debt.usd_rate_at_creation && (
              <div className="bg-card rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("forms.usd_rate_at_creation")}
                </div>
                <div className="font-semibold">
                  {formatCurrency(debt.usd_rate_at_creation)} UZS
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    
   {   
    header: t("common.sale_id"),
      accessorKey: "sale_id",
      cell: (row: any) => (row?.sale_read?.sale_id),
    },
    {
      header: t("common.date"),
      accessorKey: "created_at",
      cell: (row: any) => formatDate(row.created_at),
    },
    {
      header: t("forms.due_date"),
      accessorKey: "due_date",
      cell: (row: any) => formatDate(row.due_date),
    },
    {
      header: t("common.total_amount") + " (UZS)",
      accessorKey: "total_amount_uzs",
      cell: (row: any) => (
        <span className="font-semibold text-emerald-600">
          {formatCurrency(row.total_amount_uzs)} UZS
        </span>
      ),
    },
    {
      header: t("common.total_amount") + " (USD)",
      accessorKey: "total_amount_usd",
      cell: (row: any) =>
        row.total_amount_usd && Number(row.total_amount_usd) > 0 ? (
          <span className="font-semibold text-blue-600">
            {formatCurrency(row.total_amount_usd)} $
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: t("forms.remainder_uzs"),
      accessorKey: "remainder_uzs",
      cell: (row: any) => (
        <span
          className={`font-semibold ${
            Number(row.remainder_uzs) < 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatCurrency(row.remainder_uzs)}
        </span>
      ),
    },
    {
      header: t("forms.remainder_usd"),
      accessorKey: "remainder_usd",
      cell: (row: any) =>
        row.remainder_usd && Number(row.remainder_usd) > 0 ? (
          <span
            className={`font-semibold ${
              Number(row.remainder_usd) < 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(row.remainder_usd)} $
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: t("common.status"),
      accessorKey: "is_paid",
      cell: (row: any) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            row.is_paid
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {row.is_paid ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          {row.is_paid ? t("common.paid") : t("common.unpaid")}
        </span>
      ),
    },
    {
      header: t("common.actions"),
      accessorKey: "actions",
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                goToPaymentHistory(row.id);
              }}
            >
              <History className="w-4 h-4 mr-2" />
              {t("forms.payment_history")}
            </DropdownMenuItem>
            {!row.is_paid && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handlePaymentClick({
                    id: row.id,
                    remainder: Number(row.remainder),
                    remainder_usd: (row as any).remainder_usd,
                    total_amount_usd: (row as any).total_amount_usd,
                  });
                }}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {t("forms.add_payment")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!Array.isArray(debts) || debts.length === 0) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-muted-foreground">
          {t("common.no_data")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {debts[0]?.client_read?.name || ""}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 md:py-8 px-2 sm:px-4">
      {/* Header with client info */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {t("pages.debt_details")} - {debts[0]?.client_read?.name}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {debts[0]?.client_read?.phone_number}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {debts[0]?.client_read?.address}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {t("common.total_debt")} (UZS)
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatCurrency(
              debts.reduce((sum, d) => sum + Number(d.total_amount_uzs || 0), 0)
            )}{" "}
            UZS
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {t("common.total_deposit")} (UZS)
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(
              debts.reduce((sum, d) => sum + Number(d.deposit || 0), 0)
            )}{" "}
            UZS
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {t("dashboard.remaining_debt")} (UZS)
          </div>
          <div className="text-xl font-bold text-red-600">
            {formatCurrency(
              debts.reduce((sum, d) => sum + Number(d.remainder_uzs || 0), 0)
            )}{" "}
            UZS
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">
            {t("common.paid_debts")}
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {debts.filter((d) => d.is_paid).length} / {debts.length}
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <ResourceTable
              data={debts}
              columns={columns}
              isLoading={isLoading}
              totalCount={totalCount}
              pageSize={20}
              currentPage={currentPage}
              onPageChange={(newPage) => {
                setCurrentPage(newPage);
                setExpandedRowId(null);
              }}
              expandedRowRenderer={(row: any) => renderExpandedRow(row)}
              onRowClick={(row: any) => handleRowClick(row)}
            />
          </div>
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            window.location.reload();
          }
          setIsPaymentModalOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forms.add_payment")}</DialogTitle>
          </DialogHeader>
          {clientInfo?.type === "Магазин" && selectedPaymentMethod && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-blue-700">
                <div className="font-semibold mb-2">{t("forms.available_balance") || "Available Balance"}</div>
                <div className="text-lg font-bold text-blue-900">
                  {formatCurrency(getAvailableBalance())}
                  {selectedPaymentMethod === "Валюта" ? " $" : ""}
                </div>
              </div>
            </div>
          )}
          <ResourceForm
            fields={paymentFields}
            onSubmit={handlePaymentSubmit}
            isSubmitting={createPayment.isPending}
            title=""
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
