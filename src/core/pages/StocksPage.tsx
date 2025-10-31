import { useState, useEffect } from "react";

import { WriteOffDialog } from "../components/dialogs/WriteOffDialog";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { DeleteConfirmationModal } from "../components/modals/DeleteConfirmationModal";
import { toast } from "sonner";
import type { Stock } from "../api/stock";
import type { Store } from "../api/store";
import type { Supplier } from "../api/supplier";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Settings,
  Landmark,
  Wallet,
  DollarSign,
  Package,
} from "lucide-react";
import { useGetStocks, useDeleteStock, useUpdateExtraQuantity } from "../api/stock";
import { useGetStores } from "../api/store";
import { useGetSuppliers } from "../api/supplier";
import { useCreateStockDebtPayment } from "../api/stock-debt-payment";
import { ResourceTable } from "../helpers/ResourseTable";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

type PaginatedData<T> = { results: T[]; count: number } | T[];

// Column configuration with Russian labels
const COLUMN_CONFIG: Record<string, { label: string }> = {
  select: { label: "Выбор" },
  product: { label: "Продукт" },
  store: { label: "Магазин" },
  supplier: { label: "Поставщик" },
  total_price_in_currency: { label: "Общая цена (валюта)" },
  total_price_in_uz: { label: "Общая цена (UZS)" },
  base_unit_in_currency: { label: "Цена за базовую единицу (валюта)" },
  base_unit_in_uzs: { label: "Цена за базовую единицу (UZS)" },
  date_of_arrived: { label: "Дата прихода" },
  quantity: { label: "Количество (базовая единица)" },
  purchase_unit_quantity: { label: "Количество (единица закупки)" },
  is_debt: { label: "Долг" },
  amount_of_debt: { label: "Сумма долга" },
  advance_of_debt: { label: "Аванс долга" },
  actions: { label: "Действия" },
};

// Helper function to check if a product is recyclable from attribute_values
const isProductRecyclable = (product: any): boolean => {
  if (!product?.attribute_values || !Array.isArray(product.attribute_values)) {
    return false;
  }

  const isRecyclableAttr = product.attribute_values.find(
    (attr: any) => attr.attribute?.name === "is_recyclable",
  );

  return isRecyclableAttr?.value === true;
};

export default function StocksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: currentUser } = useCurrentUser();
  // Removed selectedStock state - using dedicated edit page instead
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null);
  const [writeOffDialogOpen, setWriteOffDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [productName, setProductName] = useState<string>(""); // New state for product name
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [productZero, setProductZero] = useState(false); // Show zero arrivals filter
  const pageSize = 30;
  const [productId, setProductId] = useState<string>("");
  const [columnVisibilityDialogOpen, setColumnVisibilityDialogOpen] =
    useState(false);
  const [debtPaymentDialogOpen, setDebtPaymentDialogOpen] = useState(false);
  const [selectedStockForPayment, setSelectedStockForPayment] =
    useState<Stock | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentComment, setPaymentComment] = useState<string>("");
  const [extraQuantityDialogOpen, setExtraQuantityDialogOpen] = useState(false);
  const [selectedStockForExtra, setSelectedStockForExtra] = useState<Stock | null>(null);
  const [extraQuantityAmount, setExtraQuantityAmount] = useState<string>("");

  // Column visibility state - load from localStorage or use defaults
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      const saved = localStorage.getItem("stocksColumnVisibility");
      if (saved) {
        return JSON.parse(saved);
      }
      // Default: all columns visible
      return Object.keys(COLUMN_CONFIG).reduce(
        (acc, key) => {
          acc[key] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
    },
  );

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    localStorage.setItem(
      "stocksColumnVisibility",
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    productName,
    selectedSupplier,
    selectedStore,
    dateFrom,
    dateTo,
    productZero,
    productId,
  ]);

  // Toggle individual column
  const toggleColumn = (columnKey: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  // Toggle all columns
  const toggleAllColumns = () => {
    const allVisible = Object.values(visibleColumns).every((v) => v);
    const newState = Object.keys(COLUMN_CONFIG).reduce(
      (acc, key) => {
        acc[key] = !allVisible;
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setVisibleColumns(newState);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "-";
    }
  };

  const formatCurrency = (amount: string | number | undefined) => {
    return new Intl.NumberFormat("ru-RU").format(Number(amount));
  };

  // Columns definition
  const [selectedStocks, setSelectedStocks] = useState<number[]>([]);

  const allColumns = [
    {
      header: t("table.select"),
      accessorKey: "select",
      cell: (stock: any) => {
        return (
          <input
            type="checkbox"
            checked={stock?.id ? selectedStocks.includes(stock?.id) : false}
            onChange={(e) => {
              e.stopPropagation();
              if (stock?.id) {
                setSelectedStocks((prev) =>
                  prev.includes(stock.id)
                    ? prev.filter((id) => id !== stock.id)
                    : [...prev, stock.id],
                );
              }
            }}
            className="w-4 h-4"
          />
        );
      },
    },

    {
      header: t("table.product"),
      accessorKey: "product",
      cell: (row: Stock) => {
        const productName =
          row.product?.product_name || row.product_read?.product_name || "-";

        const label =
          row.stock_name && row.stock_name.trim() !== ""
            ? `${productName} (${row.stock_name})`
            : productName;

        return (
          <span className="inline-flex items-center gap-2">
            <span>{label}</span>
            {row.is_recycled ? (
              <span className="text-[10px] leading-none px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                {t("stock.recycled")}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      header: t("table.store"),
      accessorKey: "store",
      cell: (row: any) => row.store?.name || row.store_read?.name || "-",
    },
    {
      header: "Поставщик",
      accessorKey: "supplier",
      cell: (row: any) =>
        row?.stock_entry?.supplier?.name || row.supplier_read?.name || "-",
    },

    {
      header: "Общая цена (валюта)",
      accessorKey: "total_price_in_currency",
      cell: (row: Stock) =>
        row.total_price_in_currency
          ? `${row.total_price_in_currency} ${row.currency?.short_name || "UZS"}`
          : "-",
    },

    {
      header: "Общая цена (UZS)",
      accessorKey: "total_price_in_uz",
      cell: (row: Stock) =>
        row.total_price_in_uz
          ? `${Number(row.total_price_in_uz).toLocaleString()} UZS`
          : "-",
    },
    {
      header: "Цена за базовую единицу (валюта)",
      accessorKey: "base_unit_in_currency",
      cell: (row: Stock) =>
        row.base_unit_in_currency
          ? `${Number(row.base_unit_in_currency).toFixed(2)} ${row.currency?.short_name || "UZS"}`
          : "-",
    },
    {
      header: "Цена за базовую единицу (UZS)",
      accessorKey: "base_unit_in_uzs",
      cell: (row: Stock) =>
        row.base_unit_in_uzs
          ? `${Number(row.base_unit_in_uzs).toFixed(2)} UZS`
          : "-",
    },
    {
      header: t("table.date_of_arrived"),
      accessorKey: "date_of_arrived",
      cell: (row: any) => <p>{formatDate(row?.date_of_arrived)}</p>,
    },
    {
      header: "Количество (базовая единица)",
      accessorKey: "quantity",
      cell: (row: any) => {
        const quantity = row.quantity !== undefined && row.quantity !== null
          ? Number(row.quantity)
          : 0;
        const extraQty = row.extra_quantity && Number(row.extra_quantity) > 0
          ? Number(row.extra_quantity)
          : 0;
        const total = quantity + extraQty;
        return total.toFixed(2);
      },
    },
    {
      header: "Количество (единица закупки)",
      accessorKey: "purchase_unit_quantity",
      cell: (row: Stock) =>
        row.purchase_unit_quantity
          ? `${Number(row.purchase_unit_quantity).toFixed(2)} ${row.purchase_unit?.short_name || ""}`
          : "-",
    },
    {
      header: "Долг",
      accessorKey: "is_debt",
      cell: (row: any) => (row.is_debt ? "Да" : "Нет"),
    },
    {
      header: "Сумма долга",
      accessorKey: "amount_of_debt",
      cell: (row: any) =>
        row.amount_of_debt
          ? `${Number(row.amount_of_debt).toLocaleString()} UZS`
          : "-",
    },
    {
      header: "Аванс долга",
      accessorKey: "advance_of_debt",
      cell: (row: any) =>
        row.advance_of_debt
          ? `${Number(row.advance_of_debt).toLocaleString()} UZS`
          : "-",
    },
    {
      header: t("table.actions"),
      accessorKey: "actions",
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate(`/stocks/${row.id}/history`)}
            >
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v5h5" />
                  <path d="M3 3l6.1 6.1" />
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                {t("navigation.history")}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              {t("common.edit")}
            </DropdownMenuItem>
            {/* Only show remove if superuser and stock is not recycled */}
            {currentUser?.is_superuser && !row.is_recycled ? (
              <DropdownMenuItem
                onClick={() => {
                  setStockToDelete(row);
                  setDeleteModalOpen(true);
                }}
              >
                {t("common.remove")}
              </DropdownMenuItem>
            ) : null}

            {/* Show pay button if stock has debt */}
            {row.is_debt && (
              <DropdownMenuItem onClick={() => handlePayDebt(row)}>
                <span className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1v6l3-3m-3 3l-3-3" />
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.35 0 4.5.9 6.1 2.4" />
                  </svg>
                  {t("common.pay_debt")}
                </span>
              </DropdownMenuItem>
            )}

            {currentUser?.role?.toLowerCase() !== "продавец" && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    navigate(
                      `/create-transfer?fromProductId=${row.product?.id || row.product_read?.id}&fromStockId=${row.id}`,
                    )
                  }
                >
                  {t("common.create")} {t("navigation.transfer")}
                </DropdownMenuItem>
                {(isProductRecyclable(row.product) ||
                  isProductRecyclable(row.product_read)) && (
                  <DropdownMenuItem
                    onClick={() =>
                      navigate(
                        `/create-recycling?fromProductId=${row.product?.id || row.product_read?.id}&fromStockId=${row.id}&storeId=${row.store?.id || row.store_read?.id}`,
                      )
                    }
                  >
                    {t("common.create")} {t("navigation.recycling")}
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem onClick={() => handleAddExtraQuantity(row)}>
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Добавить количество
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Filter columns based on visibility - always show select and actions
  const columns = allColumns.filter(
    (col) =>
      col.accessorKey === "select" ||
      col.accessorKey === "actions" ||
      visibleColumns[col.accessorKey],
  );

  // Removed stockFields - using dedicated create/edit pages instead

  const { data: stocksData, isLoading } = useGetStocks({
    params: {
      product_name: productName || undefined, // Send as product_name
      supplier: selectedSupplier === "all" ? undefined : selectedSupplier,
      date_of_arrived_gte: dateFrom || undefined,
      date_of_arrived_lte: dateTo || undefined,
      page: currentPage,
      product_zero: productZero, // Add product_zero param
      store: selectedStore === "all" ? undefined : selectedStore, // Add store filter
      id: productId,
    },
  });

  // Get the stocks array from the paginated response
  const stocks = stocksData?.results || [];

  // Fetch stores and suppliers for the filter dropdowns
  const { data: storesData } = useGetStores({});
  const { data: suppliersData } = useGetSuppliers({});

  // Extract data from paginated responses
  const getPaginatedData = <T extends { id?: number }>(
    data: PaginatedData<T> | undefined,
  ): T[] => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.results;
  };

  const stores = getPaginatedData<Store>(storesData);
  const suppliers = getPaginatedData<Supplier>(suppliersData);

  // Mutations
  const deleteStock = useDeleteStock();
  const createStockDebtPayment = useCreateStockDebtPayment();
  const updateExtraQuantity = useUpdateExtraQuantity();

  // Removed fields configuration - using dedicated edit page instead

  // Handlers
  const handleEdit = (stock: Stock) => {
    const supplierId = stock.stock_entry?.supplier?.id || stock.supplier_read?.id;
    const stockEntryId = stock.stock_entry?.id;
    if (supplierId && stockEntryId) {
      navigate(`/suppliers/${supplierId}/stock-entries/${stockEntryId}/edit`);
    } else {
      toast.error("Cannot edit: missing supplier or stock entry information");
    }
  };

  const handlePayDebt = (stock: Stock) => {
    setSelectedStockForPayment(stock);
    setPaymentAmount("");
    setPaymentComment("");
    setDebtPaymentDialogOpen(true);
  };

  const handleDebtPaymentSubmit = async () => {
    if (!selectedStockForPayment || !paymentAmount) {
      toast.error(t("validation.fill_all_required_fields"));
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("validation.amount_must_be_positive"));
      return;
    }

    try {
      await createStockDebtPayment.mutateAsync({
        stock: selectedStockForPayment.id!,
        amount: amount,
        comment: paymentComment || "Таксиден жибердим",
      });

      toast.success(t("common.payment_successful"));
      setDebtPaymentDialogOpen(false);
      setSelectedStockForPayment(null);
      setPaymentAmount("");
      setPaymentComment("");
      // Refresh the page to update the data
      window.location.reload();
    } catch (error) {
      console.error("Error making debt payment:", error);
      toast.error(t("common.payment_failed"));
    }
  };

  const handleAddExtraQuantity = (stock: Stock) => {
    setSelectedStockForExtra(stock);
    setExtraQuantityAmount("");
    setExtraQuantityDialogOpen(true);
    window.location.reload()
  };

  const handleExtraQuantitySubmit = async () => {
    if (!selectedStockForExtra || !extraQuantityAmount) {
      toast.error(t("validation.fill_all_required_fields"));
      return;
    }

    const amount = parseFloat(extraQuantityAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("validation.amount_must_be_positive"));
      return;
    }

    try {
      await updateExtraQuantity.mutateAsync({
        stockId: selectedStockForExtra.id!,
        total_extra_quantity: amount,
      });

      toast.success("Количество успешно добавлено");
      setExtraQuantityDialogOpen(false);
      setSelectedStockForExtra(null);
      setExtraQuantityAmount("");
    } catch (error) {
      console.error("Error adding extra quantity:", error);
      toast.error("Ошибка при добавлении количества");
    }
  };

  // Removed inline edit functionality - use dedicated edit page instead

  const handleDelete = async (id: number) => {
    // Check if the stock is recycled
    if (stockToDelete?.is_recycled) {
      toast.error("Нельзя удалить переработанный товар");
      setDeleteModalOpen(false);
      setStockToDelete(null);
      return;
    }

    try {
      await deleteStock.mutateAsync(id);
      toast.success(
        t("messages.success.deleted", { item: t("table.product") }),
      );
      // Close modal and reload the page
      setDeleteModalOpen(false);
      setStockToDelete(null);
      window.location.reload();
    } catch (error) {
      toast.error(t("messages.error.delete", { item: t("table.product") }));
      console.error("Failed to delete stock:", error);
      setDeleteModalOpen(false);
      setStockToDelete(null);
      window.location.reload();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("navigation.stocks")}</h1>
        <div className="flex gap-2">
          <Dialog
            open={columnVisibilityDialogOpen}
            onOpenChange={setColumnVisibilityDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Настройка колонок таблицы</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={toggleAllColumns}
                >
                  {Object.values(visibleColumns).every((v) => v)
                    ? "Снять выделение со всех"
                    : "Выбрать все"}
                </Button>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(COLUMN_CONFIG).map(([key, config]) => (
                    <label
                      key={key}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[key] || false}
                        onChange={() => toggleColumn(key)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{config.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setWriteOffDialogOpen(true)}>
            Списать товар
          </Button>
          <Button onClick={() => navigate("/create-stock")}>
            {t("common.create")}{" "}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
        {/* Removed store selection dropdown */}
        <Input
          type="text"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder={t("forms.type_product_id")}
        />{" "}
        <Input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder={t("forms.type_product_name")}
        />
        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger>
            <SelectValue placeholder={t("forms.select_supplier")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("forms.all_suppliers")}</SelectItem>
            {suppliers?.map((supplier: Supplier) =>
              supplier.id ? (
                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                  {supplier.name}
                </SelectItem>
              ) : null,
            ) || null}
          </SelectContent>
        </Select>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger>
            <SelectValue placeholder={t("forms.select_store")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("forms.all_stores")}</SelectItem>
            {stores?.map((store: Store) =>
              store.id ? (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ) : null,
            ) || null}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder={t("forms.from_date")}
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder={t("forms.to_date")}
        />
        <Select
          value={productZero ? "true" : "false"}
          onValueChange={(val) => setProductZero(val === "true")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Показать нулевые приходы?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">ненулевые приходы</SelectItem>
            <SelectItem value="true">показать нулевые приходы</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ResourceTable
        data={stocks}
        columns={columns}
        isLoading={isLoading}
        // onEdit={handleEdit}
        // onDelete={currentUser?.is_superuser ? handleDelete : undefined}
        pageSize={pageSize}
        totalCount={stocksData?.count || 0}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Totals Summary Section */}
      {stocksData && (
        <Card className="p-4 sm:p-6 mb-4 mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Итоги</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Count */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">
                    Всего записей
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {stocksData.count || 0}
                </p>
              </div>

              {/* Current Page */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">
                    Текущая страница
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {stocksData.current_page || currentPage}
                </p>
              </div>

              {/* Page Size */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-gray-600">
                    Размер страницы
                  </span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">
                  {stocksData.page_size || pageSize}
                </p>
              </div>

              {/* Total Pages */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium text-gray-600">
                    Всего страниц
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-700">
                  {stocksData.total_pages ||
                    Math.ceil((stocksData.count || 0) / pageSize)}
                </p>
              </div>
            </div>

            {/* Current Page Totals */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-700 mb-3">
                Сумма по текущей странице
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Общая стоимость (валюта)
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(
                      stocksData.total_price_in_currency_page || 0,
                    )}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Общая стоимость (UZS)
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(stocksData.total_price_in_uz_page || 0)} UZS
                  </p>
                </div>
              </div>
            </div>

            {/* All Records Totals */}
            <div className="mt-4">
              <h4 className="text-md font-semibold text-gray-700 mb-3">
                Общая сумма (все записи)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Общая стоимость (валюта)
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700">
                    {formatCurrency(
                      stocksData.total_price_in_currency_all || 0,
                    )}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Общая стоимость (UZS)
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(stocksData.total_price_in_uz_all || 0)} UZS
                  </p>
                </div>
              </div>
            </div>

            {/* Page Range */}
            {stocksData.page_range && stocksData.page_range.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-gray-700 mb-3">
                  Диапазон страниц
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {stocksData.page_range.map((page: number) => (
                    <span
                      key={page}
                      className={`px-3 py-1 rounded ${page === currentPage ? "bg-blue-500 text-white font-semibold" : "bg-gray-100 text-gray-700"}`}
                    >
                      {page}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Inline edit dialog removed - use dedicated edit page instead */}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setStockToDelete(null);
        }}
        onConfirm={() =>
          stockToDelete?.id !== undefined && handleDelete(stockToDelete.id)
        }
        title={t("common.delete") + " " + t("table.product")}
        // description={t('messages.confirm.delete', { item: t('table.product') })}
      />

      <WriteOffDialog
        open={writeOffDialogOpen}
        onClose={() => {
          setWriteOffDialogOpen(false);
          setSelectedStocks([]);
        }}
        selectedStocks={selectedStocks}
        stocksData={stocksData}
      />

      {/* Debt Payment Dialog */}
      <Dialog
        open={debtPaymentDialogOpen}
        onOpenChange={setDebtPaymentDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.pay_debt")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedStockForPayment && (
              <div className="space-y-2">
                <Label>{t("common.product")}</Label>
                <p className="text-sm text-gray-600">
                  {selectedStockForPayment.product?.product_name ||
                    selectedStockForPayment.product_read?.product_name}
                </p>
                <Label>{t("common.amount_of_debt")}</Label>
                <p className="text-sm text-gray-600">
                  {selectedStockForPayment.amount_of_debt
                    ? `${Number(selectedStockForPayment.amount_of_debt).toLocaleString()} UZS`
                    : "-"}
                </p>
                <Label>{t("common.advance_of_debt")}</Label>
                <p className="text-sm text-gray-600">
                  {selectedStockForPayment.advance_of_debt
                    ? `${Number(selectedStockForPayment.advance_of_debt).toLocaleString()} UZS`
                    : "-"}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">
                {t("common.payment_amount")}
              </Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={t("common.enter_payment_amount")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentComment">{t("common.comment")}</Label>
              <Textarea
                id="paymentComment"
                value={paymentComment}
                onChange={(e) => setPaymentComment(e.target.value)}
                placeholder={t("common.enter_comment")}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDebtPaymentDialogOpen(false)}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleDebtPaymentSubmit}
                className="flex-1"
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                {t("common.pay")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extra Quantity Dialog */}
      <Dialog
        open={extraQuantityDialogOpen}
        onOpenChange={setExtraQuantityDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить количество</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedStockForExtra && (
              <div className="space-y-2">
                <Label>Продукт</Label>
                <p className="text-sm text-gray-600">
                  {selectedStockForExtra.product?.product_name ||
                    selectedStockForExtra.product_read?.product_name}
                </p>
                <Label>Текущее количество</Label>
                <p className="text-sm text-gray-600">
                  {selectedStockForExtra.quantity
                    ? Number(selectedStockForExtra.quantity).toFixed(2)
                    : "-"}
                </p>
                {selectedStockForExtra.extra_quantity && Number(selectedStockForExtra.extra_quantity) > 0 && (
                  <>
                    <Label>Дополнительное количество</Label>
                    <p className="text-sm text-gray-600">
                      +{Number(selectedStockForExtra.extra_quantity).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="extraQuantityAmount">
                Количество для добавления
              </Label>
              <Input
                id="extraQuantityAmount"
                type="number"
                step="0.01"
                value={extraQuantityAmount}
                onChange={(e) => setExtraQuantityAmount(e.target.value)}
                placeholder="Введите количество"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setExtraQuantityDialogOpen(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleExtraQuantitySubmit}
                className="flex-1"
                disabled={!extraQuantityAmount || parseFloat(extraQuantityAmount) <= 0}
              >
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
