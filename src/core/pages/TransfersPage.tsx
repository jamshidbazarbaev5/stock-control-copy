import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ResourceTable } from "../helpers/ResourseTable";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ResourceForm } from "../helpers/ResourceForm";
import { toast } from "sonner";
import {
  useGetTransfers,
  useUpdateTransfer,
  useDeleteTransfer,
  type Transfer,
} from "../api/transfer";
import { useGetStocks, type Stock } from "../api/stock";
import { useGetStores, type Store } from "../api/store";
import { Input } from "@/components/ui/input";

// Form data interface for handling form submissions
interface TransferFormData {
  from_stock: number;
  to_store: number;
  amount: string;
  comment: string;
  date_of_transfer?: string;
}

export default function TransfersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [selectedFromStock, setSelectedFromStock] = useState<number | null>(
    null,
  );
  // Add product name filter state
  const [productNameFilter, setProductNameFilter] = useState("");

  const [fromStockId, setFromStockId] = useState<string>("");

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [productNameFilter, fromStockId]);
  const { data: transfersData, isLoading } = useGetTransfers({
    params: {
      page: page,
      from_stock_id: fromStockId,
    },
  });
  const { data: stocksData } = useGetStocks();
  const { data: storesData } = useGetStores();

  // Handle both array and object response formats
  const results = Array.isArray(transfersData)
    ? transfersData
    : transfersData?.results || [];
  const totalCount = Array.isArray(transfersData)
    ? transfersData.length
    : transfersData?.count || 0;
  const stocks = Array.isArray(stocksData)
    ? stocksData
    : stocksData?.results || [];
  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];

  const transfers = results.map((transfer, index) => ({
    ...transfer,
    displayId: (page - 1) * 10 + index + 1,
  }));

  // Filter transfers by product name
  const filteredTransfers = productNameFilter
    ? transfers.filter((transfer) => {
        const productName =
          typeof transfer.from_stock === "object"
            ? transfer.from_stock?.product?.product_name
            : undefined;
        return productName
          ?.toLowerCase()
          .includes(productNameFilter.toLowerCase());
      })
    : transfers;

  const { mutate: updateTransfer, isPending: isUpdating } = useUpdateTransfer();
  const { mutate: deleteTransfer } = useDeleteTransfer();

  const columns = [
    {
      header: t("forms.from_product"),
      accessorKey: "from_stock",
      cell: (row: Transfer) =>
        typeof row.from_stock === "object"
          ? row.from_stock?.product?.product_name || "Unknown Product"
          : "Unknown Product",
    },
    {
      header: t("forms.from_store"),
      accessorKey: "from_stock",
      cell: (row: Transfer) =>
        typeof row.from_stock === "object"
          ? row.from_stock?.store?.name || "Unknown Store"
          : "Unknown Store",
    },
    {
      header: t("forms.to_store"),
      accessorKey: "to_store",
      cell: (row: Transfer) =>
        typeof row.to_store === "object"
          ? row.to_store?.name || "Unknown Store"
          : "Unknown Store",
    },
    {
      header: t("forms.amount"),
      accessorKey: "amount",
    },
    {
      header: t("forms.date"),
      accessorKey: "date_of_transfer",
      cell: (row: Transfer) =>
        row.date_of_transfer
          ? new Date(row.date_of_transfer).toLocaleDateString()
          : "-",
    },
    {
      header: t("forms.comment"),
      accessorKey: "comment",
    },
  ];

  const handleEdit = (transfer: Transfer) => {
    // Create a new object with only the required fields for the form
    const fromStockId =
      typeof transfer.from_stock === "object"
        ? transfer.from_stock.id
        : transfer.from_stock;
    const toStoreId =
      typeof transfer.to_store === "object"
        ? transfer.to_store.id
        : transfer.to_store;

    const formattedTransfer: Transfer = {
      id: transfer.id,
      from_stock: fromStockId,
      to_store: toStoreId,
      to_stock: transfer.to_stock,
      amount: transfer.amount,
      comment: transfer.comment || "",
      date_of_transfer: transfer.date_of_transfer,
    };
    setEditingTransfer(formattedTransfer);
    setSelectedFromStock(fromStockId);
    setIsFormOpen(true);
  };

  const handleUpdateSubmit = (data: TransferFormData) => {
    if (!editingTransfer?.id) return;

    // Find the source stock and destination store to check if they're the same
    const sourceStock = stocks.find(
      (s: Stock) => s.id === Number(data.from_stock),
    );

    const sourceStoreId = sourceStock?.store?.id || sourceStock?.store_read?.id;

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
    if (sourceStock && transferAmount > Number(sourceStock.quantity)) {
      toast.error(
        t("messages.error.insufficient_quantity") ||
          "Insufficient quantity in source stock",
      );
      return;
    }
    const transformedData = {
      from_stock: Number(data.from_stock),
      to_store: Number(data.to_store),
      to_stock: Number(data.to_store), // Add required to_stock field
      amount: String(data.amount),
      date_of_transfer: data.date_of_transfer,
      comment: data.comment,
    };
    updateTransfer(
      { id: editingTransfer.id, ...transformedData },
      {
        onSuccess: () => {
          toast.success("Transfer updated successfully");
          setIsFormOpen(false);
          setEditingTransfer(null);
        },
       
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteTransfer(id, {
      onSuccess: () => toast.success(t("messages.success.deleted")),
      onError: () =>
        toast.error(
          t("messages.error.delete", { item: t("navigation.transfers") }),
        ),
    });
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 px-2 sm:px-4">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">
          {t("navigation.transfers")}
        </h1>
      </div>
      {/* Product name filter input */}
      <div className="flex items-center gap-2 mb-4 width-[300px]">
        <Input
          type="text"
          placeholder={t("forms.type_product_name") || "Filter by product name"}
          value={productNameFilter}
          onChange={(e) => setProductNameFilter(e.target.value)}
          className="border rounded px-2 py-1 w-full max-w-xs"
        />
        <Input
          value={fromStockId}
          onChange={(e) => setFromStockId(String(e.target.value))}
          placeholder={t("table.id")}
        />
      </div>
      <div className="overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <ResourceTable
              data={filteredTransfers}
              columns={columns}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              // onAdd={() => navigate('/create-transfer')}
              totalCount={totalCount}
              pageSize={30}
              currentPage={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <ResourceForm
            fields={[
              {
                name: "from_stock",
                label: t("forms.from_stock"),
                type: "select",
                options:
                  stocks?.map((stock) => ({
                    value: stock.id,
                    label: `${stock.product?.product_name || stock.product_read?.product_name} - ${stock.quantity}`,
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
                      const sourceStockStoreId =
                        sourceStock?.store?.id || sourceStock?.store_read?.id;
                      if (sourceStockStoreId === store.id) return null;
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
                defaultValue: editingTransfer?.date_of_transfer
                  ? new Date(editingTransfer.date_of_transfer)
                      .toISOString()
                      .slice(0, 16)
                  : undefined,
              },
              {
                name: "comment",
                label: t("forms.comment"),
                type: "textarea",
              },
            ]}
            onSubmit={handleUpdateSubmit}
            defaultValues={{
              from_stock:
                typeof editingTransfer?.from_stock === "object"
                  ? editingTransfer.from_stock.id
                  : editingTransfer?.from_stock,
              to_store:
                typeof editingTransfer?.to_store === "object"
                  ? editingTransfer.to_store.id
                  : editingTransfer?.to_store,
              amount: editingTransfer?.amount,
              comment: editingTransfer?.comment,
              date_of_transfer: editingTransfer?.date_of_transfer
                ? new Date(editingTransfer.date_of_transfer)
                    .toISOString()
                    .slice(0, 16)
                : undefined,
            }}
            isSubmitting={isUpdating}
            title={t("messages.edit", { item: t("navigation.transfers") })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
