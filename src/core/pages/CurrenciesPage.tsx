import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResourceTable } from "../helpers/ResourseTable";
// import { Dialog, DialogContent } from "@/components/ui/dialog";

import {
  type Currency,
  useGetCurrencies,
  // useUpdateCurrency,
  // useDeleteCurrency,
} from "../api/currency";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Checkbox } from "@/components/ui/checkbox";

const columns = (t: any) => [
  {
    header: t("forms.currency_name"),
    accessorKey: "name",
  },
  {
    header: t("forms.short_name"),
    accessorKey: "short_name",
  },
  {
    header: t("forms.is_base"),
    accessorKey: "is_base",
    cell: (row: any) => {
      return row?.is_base ? t("common.yes") : t("common.no");
    },
  },
];

export default function CurrenciesPage() {
  const navigate = useNavigate();
  // const [isFormOpen, setIsFormOpen] = useState(false);
  // const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // const [editCurrencyName, setEditCurrencyName] = useState("");
  // const [editShortName, setEditShortName] = useState("");
  // const [editIsBase, setEditIsBase] = useState(false);

  const { t } = useTranslation();
  const { data: currenciesData, isLoading } = useGetCurrencies({
    params: {
      name: searchTerm,
    },
  });

  // Get the currencies array from the paginated response
  const currencies = Array.isArray(currenciesData)
    ? currenciesData
    : (currenciesData as any)?.results || [];

  // Enhance currencies with display ID
  const enhancedCurrencies = currencies.map(
    (currency: Currency, index: number) => ({
      ...currency,
      displayId: index + 1,
    }),
  );

  // const { mutate: updateCurrency, isPending: isUpdating } = useUpdateCurrency();
  // const { mutate: deleteCurrency } = useDeleteCurrency();

  // const handleEdit = (currency: Currency) => {
  //   setEditingCurrency(currency);
  //   setEditCurrencyName(currency.name);
  //   setEditShortName(currency.short_name);
  //   setEditIsBase(currency.is_base);
  //   setIsFormOpen(true);
  // };

  // const handleUpdateSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!editingCurrency?.id) return;

  //   const updateData: Currency = {
  //     ...editingCurrency,
  //     name: editCurrencyName,
  //     short_name: editShortName,
  //     is_base: editIsBase,
  //   };

  //   updateCurrency(updateData, {
  //     onSuccess: () => {
  //       toast.success(
  //         t("messages.success.updated", { item: t("navigation.currencies") }),
  //       );
  //       setIsFormOpen(false);
  //       setEditingCurrency(null);
  //       setEditCurrencyName("");
  //       setEditShortName("");
  //       setEditIsBase(false);
  //     },
      
  //   });
  // };

  // const handleDelete = (id: number) => {
  //   deleteCurrency(id, {
  //     onSuccess: () =>
  //       toast.success(
  //         t("messages.success.deleted", { item: t("navigation.currencies") }),
  //       ),
  //     onError: () =>
  //       toast.error(
  //         t("messages.error.delete", { item: t("navigation.currencies") }),
  //       ),
  //   });
  // };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("navigation.currencies")}</h1>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder={t("placeholders.search_currency")}
          className="w-full p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ResourceTable
        data={enhancedCurrencies}
        columns={columns(t)}
        isLoading={isLoading}
        // onEdit={handleEdit}
        // onDelete={handleDelete}
        onAdd={() => navigate("/currencies/create")}
        totalCount={enhancedCurrencies.length}
        pageSize={30}
        currentPage={1}
        onPageChange={() => {}}
      />

     
    </div>
  );
}
