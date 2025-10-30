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
  User2,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Store,
  Package,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ResourceForm } from "../helpers/ResourceForm";

interface DebtListItem {
  id: number;
  isExpanded: boolean;
}

interface PaymentFormData {
  amount: number;
  payment_method: string;
}

export default function DebtDetailsPage() {
  const { t } = useTranslation();
  const { id: clientId } = useParams();
  const queryClient = useQueryClient();
  const [expandedDebts, setExpandedDebts] = useState<DebtListItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<{
    id: number;
    remainder: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: debtsData, isLoading } = useGetDebtsHistory(
    Number(clientId),
    currentPage,
  );
  const createPayment = useCreateDebtPayment();

  // Access the paginated data
  const debts = debtsData?.results || [];
  const totalPages = debtsData?.total_pages || 1;

  // Function to handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Reset expanded states when changing page
    setExpandedDebts([]);
  };

  // Function to handle debt expansion
  const handleDebtClick = (debtId: number) => {
    setExpandedDebts((prev) => {
      const index = prev.findIndex((d) => d.id === debtId);
      if (index === -1) {
        return [...prev, { id: debtId, isExpanded: true }];
      }
      return prev.map((d) =>
        d.id === debtId ? { ...d, isExpanded: !d.isExpanded } : d,
      );
    });
  };
  const navigation = useNavigate();
  // Check if a debt is expanded
  const isDebtExpanded = (debtId: number) => {
    return expandedDebts.find((d) => d.id === debtId)?.isExpanded || false;
  };
  const goToPaymentHistory = (debtId: number) => {
    navigation(`/debts/${debtId}/payments`);
  };

  // Payment handling
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
          value: selectedDebt?.remainder || 0,
          message: t("validation.amount_exceeds_total"),
        },
        validate: {
          notGreaterThanRemainder: (value: number) => {
            if (!selectedDebt) return true;
            return (
              value <= selectedDebt.remainder ||
              t("validation.amount_exceeds_remainder")
            );
          },
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
        { value: "Наличные", label: t("payment.cash") },
        { value: "Click", label: t("payment.click") },
        { value: "Карта", label: t("payment.card") },

        { value: "Перечисление", label: t("payment.per") },
      ],
    },
  ];

  const handlePaymentClick = (debt: { id: number; remainder: number }) => {
    setSelectedDebt(debt);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (!selectedDebt) return;

    // Additional validation to prevent overpayment
    if (data.amount > selectedDebt.remainder) {
      toast.error(t("validation.amount_exceeds_remainder"));
      return;
    }

    try {
      await createPayment.mutateAsync({
        debt: selectedDebt.id,
        ...data,
      });

      // Update the debts data locally
      const updatedDebts = debts.map((debt) => {
        if (debt.id === selectedDebt.id) {
          return {
            ...debt,
            remainder: debt.remainder - data.amount,
            deposit: Number(debt.deposit),
            is_paid: debt.remainder - data.amount <= 0,
          };
        }
        return debt;
      });

      // Update the query cache with new data
      queryClient.setQueryData(
        ["debtsHistory", Number(clientId), currentPage],
        {
          ...debtsData,
          results: updatedDebts,
        },
      );

      toast.success(t("messages.success.payment_created"));
      setIsPaymentModalOpen(false);
      setSelectedDebt(null);
    } catch (error) {
      console.error("Failed to create payment:", error);
      toast.error(t("messages.error.payment_create"));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 bg-gray-200 rounded-lg shadow-sm"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!Array.isArray(debts) || debts.length === 0) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-600">
          {t("common.no_data")}
        </h2>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number | string) => {
    return Number(amount).toLocaleString();
  };

  return (
      <div className="container mx-auto py-4 sm:py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="mb-6 sm:mb-8 animate-in slide-in-from-left duration-500">
        <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-4 sm:mb-6">
          <DollarSign className="w-6 h-6 sm:w-10 sm:h-10 text-emerald-500" />
          <span className="break-words">{t("pages.debt_details")} - {debts[0]?.client_read.name}</span>
        </h1>

        {debts[0] && (
          <Card className="overflow-hidden mb-6 sm:mb-8">
            <div className="bg-gray-50/50 rounded-lg p-4 sm:p-6">
              <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-3 sm:mb-4 text-emerald-700">
                <User2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                {t("forms.client_info")}
              </h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-emerald-500 mt-1" />
                  <div>
                    <dt className="text-sm text-gray-500">
                      {t("forms.phone")}
                    </dt>
                    <dd className="font-medium text-gray-900">
                      {debts[0].client_read.phone_number}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-500 mt-1" />
                  <div>
                    <dt className="text-sm text-gray-500">
                      {t("forms.address")}
                    </dt>
                    <dd className="font-medium text-gray-900">
                      {debts[0].client_read.address}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {debts.map((debt, index) => (
          <div
            key={debt.id}
            className="animate-in fade-in slide-in-from-bottom duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
              <div
                className="flex items-center justify-between p-4 sm:p-6 cursor-pointer transition-colors duration-200 hover:bg-gray-50/80 min-h-[44px]"
                onClick={() => handleDebtClick(debt.id!)}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="text-base sm:text-xl font-semibold flex flex-wrap items-center gap-2">
                    <span className="text-emerald-600">
                      {formatCurrency(debt.total_amount)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 text-sm sm:text-base">
                      {formatDate(debt.created_at)}
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t("forms.due_date")}: {formatDate(debt.due_date)}
                    <span className="text-gray-400">|</span>
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                        debt.is_paid
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {debt.is_paid ? t("common.paid") : t("common.unpaid")}
                    </span>
                  </p>
                </div>
                <div
                  className={`transform transition-transform duration-200 ml-2 flex-shrink-0 ${
                    isDebtExpanded(debt.id!) ? "rotate-180" : ""
                  }`}
                >
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </div>
              </div>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isDebtExpanded(debt.id!)
                    ? "max-h-[2000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="border-t">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 p-4 sm:p-6">
                    <div className="bg-gray-50/50 rounded-lg p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                      <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-3 sm:mb-4 text-emerald-700">
                        <Store className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                        {t("forms.store_info")}
                      </h4>
                      <dl className="space-y-3 sm:space-y-4">
                        <div className="flex items-start gap-3">
                          <Store className="w-4 h-4 text-emerald-500 mt-1" />
                          <div>
                            <dt className="text-sm text-gray-500">
                              {t("forms.store_name")}
                            </dt>
                            <dd className="font-medium text-gray-900">
                              {debt.sale_read.store_read.name}
                            </dd>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-emerald-500 mt-1" />
                          <div>
                            <dt className="text-sm text-gray-500">
                              {t("forms.phone")}
                            </dt>
                            <dd className="font-medium text-gray-900">
                              {debt.sale_read.store_read.phone_number}
                            </dd>
                          </div>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="border-t p-6 bg-white">
                    <h4 className="text-lg font-semibold flex items-center gap-2 mb-6 text-emerald-700">
                      <ShoppingCart className="w-5 h-5 text-emerald-500" />
                      {t("forms.sale_items")}
                    </h4>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold text-gray-600">
                              {t("forms.product")}
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-600">
                              {t("forms.quantity")}
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-600">
                              {t("forms.price_per_unit")}
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-600">
                              {t("forms.subtotal")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {debt.sale_read.sale_items.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b hover:bg-gray-50/50 transition-colors duration-150"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-start gap-3">
                                  <Package className="w-4 h-4 text-emerald-500 mt-1" />
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {item.product_read.product_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {
                                        item.product_read.category_read
                                          .category_name
                                      }
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-right py-3 px-4 text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="text-right py-3 px-4 text-gray-900">
                                {formatCurrency(item.price_per_unit)}
                              </td>
                              <td className="text-right py-3 px-4 font-medium text-gray-900">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold bg-gray-50">
                            <td colSpan={3} className="text-right py-4 px-4">
                              {t("forms.total_amount")}
                            </td>
                            <td className="text-right py-4 px-4 text-emerald-600">
                              {formatCurrency(debt.total_amount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t p-6 bg-gray-50/30">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-semibold flex items-center gap-2 text-emerald-700">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        {t("forms.payment_info")}
                      </h4>
                      {!debt.is_paid && (
                        <Button
                          onClick={() =>
                            handlePaymentClick({
                              id: debt.id!,
                              remainder: debt.remainder,
                            })
                          }
                          className="bg-emerald-500 hover:bg-emerald-600"
                        >
                          {t("forms.add_payment")}
                        </Button>
                      )}
                      <Button
                        onClick={() => goToPaymentHistory(debt.id!)}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        {t("forms.payment_history")}
                      </Button>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start gap-3">
                          <DollarSign className="w-5 h-5 text-emerald-500 mt-1" />
                          <div>
                            <dt className="text-sm text-gray-500">
                              {t("forms.total_amount")}
                            </dt>
                            <dd className="text-2xl font-semibold text-gray-900">
                              {formatCurrency(debt.total_amount)}
                            </dd>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start gap-3">
                          <DollarSign className="w-5 h-5 text-emerald-500 mt-1" />
                          <div>
                            <dt className="text-sm text-gray-500">
                              {t("forms.deposit")}
                            </dt>
                            <dd className="text-2xl font-semibold text-gray-900">
                              {formatCurrency(debt.deposit)}
                            </dd>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start gap-3">
                          <DollarSign className="w-5 h-5 text-emerald-500 mt-1" />
                          <div>
                            <dt className="text-sm text-gray-500">
                              {t("forms.remainder")}
                            </dt>
                            <dd
                              className={`text-2xl font-semibold ${debt.remainder < 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatCurrency(debt.remainder)}
                            </dd>
                          </div>
                        </div>
                      </div>
                      {debt.usd_rate_at_creation && (
                        <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start gap-3">
                            <DollarSign className="w-5 h-5 text-blue-500 mt-1" />
                            <div>
                              <dt className="text-sm text-gray-500">
                                {t("forms.usd_rate_at_creation")}
                              </dt>
                              <dd className="text-2xl font-semibold text-gray-900">
                                {formatCurrency(debt.usd_rate_at_creation)} UZS
                              </dd>
                            </div>
                          </div>
                        </div>
                      )}
                      {debt.last_usd_rate && (
                        <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start gap-3">
                            <DollarSign className="w-5 h-5 text-purple-500 mt-1" />
                            <div>
                              <dt className="text-sm text-gray-500">
                                {t("forms.last_usd_rate")}
                              </dt>
                              <dd className="text-2xl font-semibold text-gray-900">
                                {formatCurrency(debt.last_usd_rate)} UZS
                              </dd>
                            </div>
                          </div>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}

        {/* Pagination Controls */}
        {totalPages && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2"
            >
              {t("common.previous")}
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => handlePageChange(page)}
                    className="w-10 h-10 p-0"
                  >
                    {page}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2"
            >
              {t("common.next")}
            </Button>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("forms.add_payment")}</DialogTitle>
            </DialogHeader>
            <ResourceForm
              fields={paymentFields}
              onSubmit={handlePaymentSubmit}
              isSubmitting={createPayment.isPending}
              title=""
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
