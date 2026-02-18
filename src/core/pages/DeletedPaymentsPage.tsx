import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGetDeletedPayments, type DeletedPayment } from "../api/debt";
import { ResourceTable } from "../helpers/ResourseTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function DeletedPaymentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useGetDeletedPayments(currentPage);

  const payments = data?.results || [];
  const totalCount = data?.count || 0;

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("ru-RU").format(Number(amount) || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = [
    {
      header: "ID долга",
      accessorKey: "debt_id",
      cell: (row: DeletedPayment) => row.debt_id,
    },
    {
      header: t("forms.client_name"),
      accessorKey: "client_name",
      cell: (row: DeletedPayment) => row.client_name,
    },
    {
      header: t("forms.store") || "Магазин",
      accessorKey: "store_name",
      cell: (row: DeletedPayment) => row.store_name,
    },
    {
      header: t("forms.amount"),
      accessorKey: "amount",
      cell: (row: DeletedPayment) => (
        <span className="font-semibold text-emerald-600">
          {formatCurrency(row.amount)}
          {row.target_debt_currency === "USD" ? " $" : " UZS"}
        </span>
      ),
    },
    {
      header: t("forms.payment_method"),
      accessorKey: "payment_method",
      cell: (row: DeletedPayment) => row.payment_method,
    },
    {
      header: t("forms.usd_rate") || "Курс USD",
      accessorKey: "usd_rate_at_payment",
      cell: (row: DeletedPayment) =>
        row.usd_rate_at_payment ? formatCurrency(row.usd_rate_at_payment) : "—",
    },
    {
      header: t("forms.payment_date") || "Дата оплаты",
      accessorKey: "paid_at",
      cell: (row: DeletedPayment) => formatDate(row.paid_at),
    },
    {
      header: "Оплатил",
      accessorKey: "paid_by",
      cell: (row: DeletedPayment) => row.paid_by,
    },
    {
      header: "Удалил",
      accessorKey: "deleted_by",
      cell: (row: DeletedPayment) => (
        <span className="text-red-600 font-medium">{row.deleted_by}</span>
      ),
    },
    {
      header: "Дата удаления",
      accessorKey: "deleted_at",
      cell: (row: DeletedPayment) => formatDate(row.deleted_at),
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate("/debts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold">Удаленные платежи</h1>
        </div>
      </div>

      <Card className="overflow-hidden">
        <ResourceTable
          columns={columns}
          data={payments}
          isLoading={isLoading}
          pageSize={30}
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
}
