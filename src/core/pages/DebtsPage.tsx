import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateDebtPayment } from "../api/debt";
import {
  useGetDebtsByClients,
  type DebtByClient,
} from "../api/debts-by-clients";
import { ResourceTable } from "../helpers/ResourseTable";
import { useNavigate } from "react-router-dom";
import { ResourceForm } from "../helpers/ResourceForm";

interface PaymentFormData {
  amount: number;
  payment_method: string;
}

export default function DebtsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDebtClient, setSelectedDebtClient] =
    useState<DebtByClient | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"Физ.лицо" | "Юр.лицо">(
    "Физ.лицо",
  );
  const [searchName, setSearchName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, selectedTab]);

  const { data: debtsByClientsData, isLoading } = useGetDebtsByClients({
    ...(searchName && { name: searchName }),
    type: selectedTab,
    page: currentPage,
    page_size: pageSize,
  });

  const debtsByClients = debtsByClientsData?.results || [];
  const totalCount = debtsByClientsData?.count || 0;

  const createPayment = useCreateDebtPayment();

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (!selectedDebtClient) return;

    if (data.amount > Number(selectedDebtClient.total_amount)) {
      toast.error(t("validation.amount_exceeds_remainder"));
      return;
    }

    try {
      await createPayment.mutateAsync({
        debt: selectedDebtClient.id,
        amount: data.amount,
        payment_method: data.payment_method,
      });
      toast.success(t("messages.success.payment_created"));
      // Invalidate and refetch debts
      await queryClient.invalidateQueries({ queryKey: ["debtsByClients"] });
      setIsPaymentModalOpen(false);
      setSelectedDebtClient(null);
    } catch (error) {
    }
  };

  const paymentFields = [
    {
      name: "amount",
      label: t("forms.amount"),
      type: "number",
      placeholder: t("placeholders.enter_amount"),
      required: true,
      validation: {
        min: {
          value: 0.01,
          message: t("validation.amount_must_be_positive"),
        },
        max: {
          value: selectedDebtClient?.balance || 0,
          message: t("validation.amount_exceeds_remainder"),
        },
      },
    },
    {
      name: "payment_method",
      label: t("forms.payment_method"),
      type: "select",
      placeholder: t("placeholders.select_payment_method"),
      required: true,
      options: [
        { value: "Наличные", label: t("forms.cash") },
        { value: "Карта", label: t("forms.card") },
        { value: "Click", label: t("forms.click") },
      ],
    },
  ];

  const getColumns = () => {
    const baseColumns = [
      {
        accessorKey: "name",
        header: t("forms.client_name"),
        cell: (client: DebtByClient) => (
          <div>
            <div>
              <button
                onClick={() => navigate(`/debts/${client.id}`)}
                className="text-blue-600 hover:underline hover:text-blue-800"
              >
                {client.name}
              </button>
            </div>
            <div className="text-sm text-gray-500">{client.phone_number}</div>
          </div>
        ),
      },
      {
        accessorKey: "total_amount",
        header: t("forms.total_amount4"),
        cell: (client: DebtByClient) => client.total_amount?.toLocaleString(),
      },
      {
        accessorKey: "total_deposit",
        header: t("forms.deposit"),
        cell: (client: DebtByClient) => client.total_deposit?.toLocaleString(),
      },
    ];

    // Add balance column only for legal entities
    if (selectedTab === "Юр.лицо") {
      baseColumns.push({
        accessorKey: "balance",
        header: t("forms.balance"),
        cell: (client: DebtByClient) => (
          <span
            className={
              Number(client.balance) < 0 ? "text-red-600" : "text-green-600"
            }
          >
            {client.balance?.toLocaleString() || "0"}
          </span>
        ),
      });
    }

    baseColumns.push({
      accessorKey: "actions",
      header: t("forms.actions"),
      cell: (client: DebtByClient) => (
        <div className="space-x-2">
          {selectedTab === "Юр.лицо" && (
            <button
              onClick={() => navigate(`/clients/${client.id}/history`)}
              className="px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white"
            >
              {t("forms.history")}
            </button>
          )}
        </div>
      ),
    });

    return baseColumns;
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 gap-6">
          <Input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder={t("forms.search_by_name")}
          />
        </div>
      </Card>

      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab as (value: string) => void}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="Физ.лицо">{t("forms.individual")}</TabsTrigger>
          <TabsTrigger value="Юр.лицо">{t("forms.legal_entity")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <ResourceTable
        columns={getColumns()}
        data={debtsByClients}
        isLoading={isLoading}
        pageSize={pageSize}
        totalCount={totalCount}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forms.payment_method")}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            fields={paymentFields}
            onSubmit={handlePaymentSubmit}
            isSubmitting={createPayment.isPending}
            title={t("forms.payment_method")}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
