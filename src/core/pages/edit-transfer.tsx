import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResourceForm } from "../helpers/ResourceForm";
import { toast } from "sonner";
import { useGetTransfer, useUpdateTransfer } from "../api/transfer";
import { useGetStocks, type Stock } from "../api/stock";

// Form data interface for handling form submissions
interface TransferFormData {
  from_stock: number;
  to_store: number;
  amount: string;
  comment: string;
  date_of_transfer?: string;
}
import { useGetStores, type Store } from "../api/store";

export default function EditTransferPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const [selectedFromStock, setSelectedFromStock] = useState<number | null>(
    null,
  );

  const { data: transfer, isLoading: isLoadingTransfer } = useGetTransfer(
    Number(id),
  );
  const { data: stocksData } = useGetStocks();
  const { data: storesData } = useGetStores();

  // Handle both array and object response formats
  const stocks = Array.isArray(stocksData)
    ? stocksData
    : stocksData?.results || [];
  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];

  const { mutate: updateTransfer, isPending: isUpdating } = useUpdateTransfer();

  useEffect(() => {
    if (transfer) {
      const fromStockId =
        typeof transfer.from_stock === "object"
          ? transfer.from_stock.id
          : transfer.from_stock;
      setSelectedFromStock(Number(fromStockId));
    }
  }, [transfer]);

  const handleSubmit = (data: TransferFormData) => {
    // Find the source stock and destination store to check if they're the same
    const sourceStock = stocks.find(
      (s: Stock) => s.id === Number(data.from_stock),
    );
    const sourceStoreId = sourceStock?.store_read?.id;

    // Prevent transfers between the same store
    if (sourceStoreId && sourceStoreId === Number(data.to_store)) {
      toast.error(
        t("messages.error.same_store_transfer") ||
          "Cannot transfer to the same store",
      );
      return;
    }

    // Validate that we have enough quantity
    const transferAmount = Number(data.amount);
    if (sourceStock && transferAmount > sourceStock.quantity) {
      toast.error(
        t("messages.error.insufficient_quantity") ||
          "Insufficient quantity in source stock",
      );
      return;
    }

    const transformedData = {
      from_stock: Number(data.from_stock),
      to_store: Number(data.to_store),
      to_stock: Number(data.to_store),
      amount: String(data.amount),
      date_of_transfer: data.date_of_transfer,
      comment: data.comment,
    };
    updateTransfer(
      { id: Number(id), ...transformedData },
      {
        onSuccess: () => {
          toast.success(t("messages.success.updated"));
          navigate("/transfers");
        },

      },
    );
  };

  if (isLoadingTransfer) {
    return <div>Loading...</div>;
  }

  if (!transfer) {
    return <div>Transfer not found</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {t("messages.edit", { item: t("navigation.transfers") })}
        </h1>
        <ResourceForm
          fields={[
            {
              name: "from_stock",
              label: t("forms.from_stock"),
              type: "select",
              options:
                stocks
                  ?.filter((stock) => stock.quantity > 0)
                  .map((stock) => ({
                    value: stock.id,
                    label: `${stock.product_read?.product_name} - ${stock.quantity}`,
                  })) || [],
              defaultValue: selectedFromStock,
              onChange: (value: number) => {
                setSelectedFromStock(Number(value));
              },
            },
            {
              name: "to_store",
              label: t("forms.to_store"),
              type: "select",
              options:
                stores
                  ?.map((store: Store) => {
                    const sourceStock = stocks.find(
                      (s) => s.id === selectedFromStock,
                    );
                    if (sourceStock?.product_read?.store_read?.id === store.id)
                      return null;
                    return {
                      value: store.id,
                      label: store.name,
                    };
                  })
                  .filter(Boolean) || [],
            },
            {
              name: "amount",
              label: t("forms.amount"),
              type: "number",
              step: "0.01",
            },
            {
              name: "date_of_transfer",
              label: t("forms.date"),
              type: "datetime-local",
            },
            {
              name: "comment",
              label: t("forms.comment"),
              type: "textarea",
            },
          ]}
          onSubmit={handleSubmit}
          defaultValues={{
            from_stock:
              typeof transfer.from_stock === "object"
                ? transfer.from_stock.id
                : transfer.from_stock,
            to_store:
              typeof transfer.to_store === "object"
                ? transfer.to_store.id
                : transfer.to_store,
            amount: transfer.amount,
            comment: transfer.comment,
            date_of_transfer: transfer.date_of_transfer
              ? new Date(transfer.date_of_transfer).toISOString().slice(0, 16)
              : undefined,
          }}
          isSubmitting={isUpdating}
        />
      </div>
    </div>
  );
}
