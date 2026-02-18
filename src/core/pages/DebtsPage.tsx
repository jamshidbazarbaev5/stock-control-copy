import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateDebtPayment,
} from "../api/debt";
import {
  useMassPayment,
} from "../api/client";
import {
  useGetDebtsByClients,
  type DebtByClient,
} from "../api/debts-by-clients";
import { ResourceTable } from "../helpers/ResourseTable";
import { useNavigate } from "react-router-dom";
import { ResourceForm } from "../helpers/ResourceForm";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

interface PaymentFormData {
  amount: number;
  payment_method: "Наличные" | "Карта" | "Click" | "Перечисление" | "Валюта";
  usd_rate_at_payment?: number;
  target_debt_currency?: "UZS" | "USD";
}

export default function DebtsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedDebtClient, setSelectedDebtClient] =
    useState<DebtByClient | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMassPaymentOpen, setIsMassPaymentOpen] = useState(false);
  const [selectedMassPaymentClient, setSelectedMassPaymentClient] =
    useState<DebtByClient | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [storeData, setStoreData] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<"Физ.лицо" | "Юр.лицо" | "Магазин">(() => {
    const saved = localStorage.getItem("debtsPageTab");
    if (saved === "Физ.лицо" || saved === "Юр.лицо" || saved === "Магазин") {
      return saved;
    }
    return "Физ.лицо";
  });
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
    // ...(selectedStore && selectedStore !== "all" && { store: selectedStore }),
  });

  const debtsByClients = debtsByClientsData?.results || [];
  const totalCount = debtsByClientsData?.count || 0;

  const createPayment = useCreateDebtPayment();
  const massPayment = useMassPayment();

  // Get the latest USD rate from currency rates
  const { data: currencyRates } = useQuery<Array<{ id: number; rate: string; currency_detail: any }>>({
    queryKey: ["currency-rates"],
    queryFn: async () => {
      const response = await api.get("/currency/rates/");
      return response.data;
    },
  });

  const usdRate = currencyRates?.[0] ? parseFloat(currencyRates[0].rate) : 0;

  // Fetch store data when mass payment is opened for a store client
  useEffect(() => {
    if (selectedMassPaymentClient && selectedMassPaymentClient.type === "Магазин") {
      const fetchStoreData = async () => {
        try {
          const response = await api.get(`/store/${selectedMassPaymentClient.linked_store}/`);
          const storeInfo = response?.data || response;
          setStoreData(storeInfo);
        } catch (error) {
          console.error("Failed to fetch store data:", error);
        }
      };
      fetchStoreData();
    } else {
      setStoreData(null);
    }
  }, [selectedMassPaymentClient]);

  const getAvailableBalance = () => {
    if (selectedMassPaymentClient?.type !== "Магазин" || !storeData?.budgets || !selectedPaymentMethod) {
      return 0;
    }

    const budget = storeData.budgets.find(
      (b: any) => b.budget_type === selectedPaymentMethod
    );
    return budget ? Number(budget.amount) : 0;
  };

  const handleMassPaymentClick = (client: DebtByClient) => {
    setSelectedMassPaymentClient(client);
    setSelectedPaymentMethod("");
    setStoreData(null);
    setIsMassPaymentOpen(true);
  };

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (!selectedDebtClient) return;

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
      window.location.reload();
    } catch (error) {
    }
  };

  const handleMassPaymentSubmit = async (data: PaymentFormData) => {
    if (!selectedMassPaymentClient) return;

    try {
      await massPayment.mutateAsync({
        id: selectedMassPaymentClient.id,
        amount: data.amount,
        payment_method: data.payment_method as "Наличные" | "Карта" | "Click" | "Перечисление" | "Валюта",
        usd_rate_at_payment: data.usd_rate_at_payment || usdRate,
        target_debt_currency: data.target_debt_currency,
      });
      toast.success(t("common.mass_payment_successful", "Mass payment successful"));
      setIsMassPaymentOpen(false);
      setSelectedMassPaymentClient(null);
      window.location.reload();
    } catch (error) {
      toast.error(t("messages.error.payment_failed"));
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

  const massPaymentFields = [
    {
      name: "target_debt_currency",
      label: t("forms.target_debt_currency") || "Валюта долга",
      type: "select",
      placeholder: t("placeholders.select_currency") || "Выберите валюту",
      required: true,
      options: [
        { value: "UZS", label: "UZS" },
        { value: "USD", label: "USD" },
      ],
    },
    {
      name: "amount",
      label: t("forms.amount"),
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
        { value: "Наличные", label: t("forms.cash") },
        { value: "Карта", label: t("forms.card") },
        { value: "Click", label: t("forms.click") },
        { value: "Перечисление", label: t("forms.per") || "Перечисление" },
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
      // {
      //   accessorKey: "total_amount",
      //   header: t("forms.total_amount4"),
      //   cell: (client: DebtByClient) => client.total_amount?.toLocaleString(),
      // },
      // {
      //   accessorKey: "total_deposit",
      //   header: t("forms.deposit"),
      //   cell: (client: DebtByClient) => client.total_deposit?.toLocaleString(),
      // },
      // {
      //   accessorKey: "total_remainder",
      //   header: t("forms.total_remainder") || "Остаток",
      //   cell: (client: DebtByClient) => (
      //     <span className="text-red-600 font-medium">
      //       {(client as any).total_remainder?.toLocaleString() || "0"}
      //     </span>
      //   ),
      // },
      {
        accessorKey: "total_remainder_usd",
        header: t("forms.total_remainder_usd") || "Остаток (USD)",
        cell: (client: DebtByClient) => {
          const usdRemainder = (client as any).total_remainder_usd;
          if (!usdRemainder || Number(usdRemainder) === 0) return "—";
          return (
            <span className="text-blue-600 font-medium">
              {Number(usdRemainder).toLocaleString()} $
            </span>
          );
        },
      },
      {
        accessorKey: "total_remainder_uzs",
        header: t("forms.total_remainder_uzs") || "Остаток (UZS)",
        cell: (client: DebtByClient) => {
          const uzsRemainder = (client as any).total_remainder_uzs;
          if (!uzsRemainder || Number(uzsRemainder) === 0) return "—";
          return (
            <span className="text-emerald-600 font-medium">
              {Number(uzsRemainder).toLocaleString()}
            </span>
          );
        },
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
              История баланса
            </button>
          )}
          <button
            onClick={() => handleMassPaymentClick(client)}
            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
          >
            Массовая оплата
          </button>
        </div>
      ),
    });

    return baseColumns;
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder={t("forms.search_by_name")}
          />
          <div className="flex justify-end">
            <button
              onClick={() => navigate("/deleted-payments")}
              className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white"
            >
              Удаленные платежи
            </button>
          </div>
        </div>
      </Card>

      <Tabs
        value={selectedTab}
        onValueChange={(value: string) => {
          setSelectedTab(value as "Физ.лицо" | "Юр.лицо" | "Магазин");
          localStorage.setItem("debtsPageTab", value);
        }}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="Физ.лицо">{t("forms.individual")}</TabsTrigger>
          <TabsTrigger value="Юр.лицо">{t("forms.legal_entity")}</TabsTrigger>
           <TabsTrigger value="Магазин">{t("forms.store")}</TabsTrigger>
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

      <Dialog
        open={isMassPaymentOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsMassPaymentOpen(false);
            setSelectedMassPaymentClient(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.mass_payment", "Mass Payment")}</DialogTitle>
            <DialogDescription>
              {selectedMassPaymentClient?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedMassPaymentClient && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-xs text-emerald-700 mb-1">{t("forms.total_remainder_uzs") || "Остаток (UZS)"}</div>
                <div className="text-lg font-bold text-emerald-800">
                  {Number(selectedMassPaymentClient.total_remainder_uzs || 0).toLocaleString()} UZS
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-700 mb-1">{t("forms.total_remainder_usd") || "Остаток (USD)"}</div>
                <div className="text-lg font-bold text-blue-800">
                  {Number(selectedMassPaymentClient.total_remainder_usd || 0).toLocaleString()} $
                </div>
              </div>
            </div>
          )}
          {selectedMassPaymentClient?.type === "Магазин" && selectedPaymentMethod && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-blue-700">
                <div className="font-semibold mb-2">{t("forms.available_balance") || "Available Balance"}</div>
                <div className="text-lg font-bold text-blue-900">
                  {getAvailableBalance().toLocaleString()}
                  {selectedPaymentMethod === "Валюта" ? " $" : ""}
                </div>
              </div>
            </div>
          )}
          <ResourceForm
            fields={massPaymentFields}
            onSubmit={handleMassPaymentSubmit}
            isSubmitting={massPayment.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
