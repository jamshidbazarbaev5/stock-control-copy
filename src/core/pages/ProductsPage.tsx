import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ResourceTable } from "../helpers/ResourseTable";
import { toast } from "sonner";
import { type Product, useGetProducts, useDeleteProduct } from "../api/product";
import { useGetCategories } from "../api/category";
import { useTranslation } from "react-i18next";
import { useGetMeasurements } from "../api/measurement";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RevaluationDialog } from "@/components/dialogs/RevaluationDialog";
import { useProductRevaluation } from "../api/revaluation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import api from "../api/api";
import { type Stock } from "../api/stock";

interface PriceEdit {
  productId: number;
  selling_price?: string;
  selling_price_in_currency?: string;
  min_price?: string;
}

const columns = (
  t: any,
  onPrint: (product: Product) => void,
  selectedProducts: number[],
  onSelectProduct: (productId: number) => void,
  priceEdits: Record<number, PriceEdit>,
  onPriceChange: (
    productId: number,
    field: "selling_price" | "selling_price_in_currency" | "min_price",
    value: string,
  ) => void,
  onCurrencyPriceChange?: (
    productId: number,
    currencyPrice: string,
    sellInCurrencyUnit: any,
  ) => void,
) => [
  {
    header: t("table.select"),
    accessorKey: "select",
    cell: (product: any) => {
      return (
        <input
          type="checkbox"
          checked={product?.id ? selectedProducts.includes(product?.id) : false}
          onChange={(e) => {
            e.stopPropagation();
            if (product?.id) {
              onSelectProduct(product?.id);
            }
          }}
          className="w-4 h-4"
        />
      );
    },
  },
  {
    header: t("table.name"),
    accessorKey: "product_name",
  },
  {
    header: t("table.category"),
    accessorKey: (row: Product) =>
      row.category_read?.category_name || row.category_write,
  },
  {
    header: t("table.selling_price_in_currency"),
    accessorKey: "selling_price_in_currency",
    cell: (product: any) => {
      if (!product?.sell_in_currency_unit) {
        return <span className="text-muted-foreground">-</span>;
      }
      const editValue = priceEdits[product?.id]?.selling_price_in_currency;
      return (
        <Input
          type="number"
          step="0.01"
          value={
            editValue !== undefined
              ? editValue
              : product?.selling_price_in_currency || ""
          }
          onChange={(e) => {
            e.stopPropagation();
            if (product?.id && onCurrencyPriceChange) {
              onCurrencyPriceChange(
                product.id,
                e.target.value,
                product.sell_in_currency_unit,
              );
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-28"
        />
      );
    },
  },
  {
    header: t("table.selling_price"),
    accessorKey: "selling_price",
    cell: (product: any) => {
      const editValue = priceEdits[product?.id]?.selling_price;
      return (
        <Input
          type="number"
          step="0.01"
          value={
            editValue !== undefined ? editValue : product?.selling_price || ""
          }
          onChange={(e) => {
            e.stopPropagation();
            if (product?.id) {
              onPriceChange(product.id, "selling_price", e.target.value);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-28"
        />
      );
    },
  },
  {
    header: t("table.min_price"),
    accessorKey: "min_price",
    cell: (product: any) => {
      const editValue = priceEdits[product?.id]?.min_price;
      return (
        <Input
          type="number"
          step="0.01"
          value={editValue !== undefined ? editValue : product?.min_price || ""}
          onChange={(e) => {
            e.stopPropagation();
            if (product?.id) {
              onPriceChange(product.id, "min_price", e.target.value);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-28"
        />
      );
    },
  },

  {
    header: t("table.actions"),
    accessorKey: "id",
    cell: (product: any) => {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (product && product.id) {
              onPrint(product);
            }
          }}
          disabled={!product?.id}
        >
          {t("buttons.print")}
        </Button>
      );
    },
  },
];

export default function ProductsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isRevaluationDialogOpen, setIsRevaluationDialogOpen] = useState(false);
  const [priceEdits, setPriceEdits] = useState<Record<number, PriceEdit>>({});
  const [productTab, setProductTab] = useState<
    "with_quantity" | "without_quantity" | "imported"
  >("with_quantity");
  const [expandedRows, setExpandedRows] = useState<Record<number, Stock[]>>({});

  // Import dialog state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<
    | null
    | {
        message: string;
        imported: number;
        updated: number;
      }
  >(null);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, selectedMeasurement, productTab]);

  const { data: productsData, isLoading } = useGetProducts({
    params: {
      page,
      ...(productTab === "imported" ? { is_imported: true } : { 
        non_zero: productTab === "with_quantity" ? 1 : 0,
        is_imported: false 
      }),
      ...(searchTerm && { product_name: searchTerm }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedMeasurement && { measurement: selectedMeasurement }),
    },
  });

  // Handle both array and object response formats
  const results = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];
  const totalCount = Array.isArray(productsData)
    ? productsData.length
    : productsData?.count || 0;

  const products = results.map((product, index) => ({
    ...product,
    displayId: (page - 1) * 10 + index + 1,
  }));

  const { mutate: deleteProduct } = useDeleteProduct();

  // Fetch categories and measurements for the select dropdowns
  const { data: categoriesData } = useGetCategories({});
  const { data: measurementsData } = useGetMeasurements({});

  // Get the categories and measurements arrays
  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];
  const measurementsList = Array.isArray(measurementsData)
    ? measurementsData
    : measurementsData?.results || [];

  const handleEdit = (product: Product) => {
    navigate(`/edit-product/${product?.id}`);
  };

  const handleDelete = (id: number) => {
    deleteProduct(id, {
      onSuccess: () =>
        toast.success(
          t("messages.success.deleted", { item: t("table.product") }),
        ),
      onError: () =>
        toast.error(t("messages.error.delete", { item: t("table.product") })),
    });
  };

  const handlePrint = (product: Product) => {
    if (!product?.id) {
      toast.error(t("messages.error.invalidProduct"));
      return;
    }
    navigate(`/print-barcode/${product.id}`);
  };

  const { mutateAsync: revaluateProducts } = useProductRevaluation();

  const handleRevaluation = async (data: {
    comment: string;
    new_selling_price: string;
    new_min_price: string;
  }) => {
    if (selectedProducts.length === 0) {
      toast.error(t("messages.error.noProductsSelected"));
      return;
    }

    try {
      await revaluateProducts({
        ...data,
        product_ids: selectedProducts,
      });
      toast.success(t("messages.success.revaluation"));
      setIsRevaluationDialogOpen(false);
      setSelectedProducts([]);
    } catch (error) {
      toast.error(t("messages.error.revaluation"));
    }
  };

  const handlePriceChange = (
    productId: number,
    field: "selling_price" | "selling_price_in_currency" | "min_price",
    value: string,
  ) => {
    setPriceEdits((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        productId,
        [field]: value,
      },
    }));
  };

  const handleCurrencyPriceChange = (
    productId: number,
    currencyPrice: string,
    sellInCurrencyUnit: any,
  ) => {
    const price = parseFloat(currencyPrice);
    if (!isNaN(price)) {
      let calculatedPrice: number;

      if (sellInCurrencyUnit.action === "*") {
        calculatedPrice =
          price *
          sellInCurrencyUnit.exchange_rate *
          sellInCurrencyUnit.conversion;
      } else if (sellInCurrencyUnit.action === "/") {
        calculatedPrice =
          (price / sellInCurrencyUnit.exchange_rate) *
          sellInCurrencyUnit.conversion;
      } else {
        calculatedPrice =
          price *
          sellInCurrencyUnit.exchange_rate *
          sellInCurrencyUnit.conversion;
      }

      setPriceEdits((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          productId,
          selling_price_in_currency: currencyPrice,
          selling_price: calculatedPrice.toFixed(2),
        },
      }));
    } else {
      setPriceEdits((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          productId,
          selling_price_in_currency: currencyPrice,
        },
      }));
    }
  };

  const handleSavePrices = async () => {
    const editsToSave = Object.values(priceEdits).filter(
      (edit) =>
        edit.selling_price !== undefined ||
        edit.selling_price_in_currency !== undefined ||
        edit.min_price !== undefined,
    );

    console.log("🚀 handleSavePrices called");
    console.log("📝 Current priceEdits:", priceEdits);
    console.log("💾 Edits to save:", editsToSave);

    if (editsToSave.length === 0) {
      toast.error(
        t("messages.error.noPriceChanges") || "No price changes to save",
      );
      return;
    }

    const totalToSave = editsToSave.length;
    console.log(`📊 Total to save: ${totalToSave}`);

    // Process all edits in parallel using Promise.allSettled
    const promises = editsToSave.map(async (edit, index) => {
      const product = products.find((p) => p.id === edit.productId);
      if (!product) {
        console.warn(`⚠️ Product not found for edit:`, edit);
        return { success: false, productId: edit.productId, error: "Product not found" };
      }

      console.log(`🔄 Processing edit ${index + 1}/${totalToSave} for product ${edit.productId} (${product.product_name})`);

      const newSellingPrice =
        edit.selling_price !== undefined
          ? edit.selling_price
          : String(product.selling_price);
      const newMinPrice =
        edit.min_price !== undefined
          ? edit.min_price
          : String(product.min_price);
      const newSellingPriceInCurrency =
        edit.selling_price_in_currency !== undefined
          ? edit.selling_price_in_currency
          : product.selling_price_in_currency
            ? String(product.selling_price_in_currency)
            : undefined;

      try {
        await revaluateProducts({
          comment: "Price update from products page",
          new_selling_price: newSellingPrice,
          new_min_price: newMinPrice,
          new_selling_price_in_currency: newSellingPriceInCurrency,
          product_ids: [edit.productId],
        });

        console.log(`✅ Success for product ${edit.productId} (${product.product_name})`);
        toast.success(
          t("messages.success.priceUpdated") ||
            `Price updated for ${product.product_name}`,
        );
        return { success: true, productId: edit.productId };
      } catch (error) {
        console.error(`❌ Error for product ${edit.productId}:`, error);
        toast.error(
          t("messages.error.priceUpdate") ||
            `Failed to update price for ${product.product_name}`,
        );
        return { success: false, productId: edit.productId, error };
      }
    });

    // Wait for all promises to settle
    const results = await Promise.allSettled(promises);
    
    console.log("📊 All operations completed:", results);

    // Collect successful product IDs
    const productIdsToRemove: number[] = [];
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success) {
        productIdsToRemove.push(result.value.productId);
      }
    });

    console.log(`✅ Successful saves: ${productIdsToRemove.length}/${totalToSave}`);
    console.log(`🗑️ Removing IDs:`, productIdsToRemove);

    // Clear successful edits from state
    setPriceEdits((prev) => {
      console.log("📋 Previous priceEdits:", prev);
      const newEdits = { ...prev };
      productIdsToRemove.forEach(id => {
        console.log(`🗑️ Deleting product ${id} from priceEdits`);
        delete newEdits[id];
      });
      console.log("📋 New priceEdits:", newEdits);
      console.log("📊 New count:", Object.keys(newEdits).length);
      return newEdits;
    });
  };

  // Fetch stock data for expanded row
  const fetchStockForProduct = async (productId: number) => {
    if (expandedRows[productId]) {
      // Already loaded, just toggle
      setExpandedRows((prev) => {
        const newRows = { ...prev };
        delete newRows[productId];
        return newRows;
      });
      return;
    }

    try {
      const response = await api.get(`items/stock/?product=${productId}`);
      const stockData = response.data.results || [];
      setExpandedRows((prev) => ({
        ...prev,
        [productId]: stockData,
      }));
    } catch (error) {
      console.error("Error fetching stock data:", error);
      toast.error("Ошибка при загрузке данных партии");
    }
  };

  // Render expanded row content
  const renderExpandedRow = (row: Product) => {
    const stockData = expandedRows[row.id!];
    
    if (!stockData || stockData.length === 0) {
      return (
        <div className="p-4 bg-gray-50 text-center text-gray-500">
          Нет данных о партиях
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Партии товара</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">№ Партии</th>
                <th className="px-4 py-2 text-left">Поставщик</th>
                <th className="px-4 py-2 text-right">Количество</th>
                <th className="px-4 py-2 text-right">Цена за ед. (валюта)</th>
                <th className="px-4 py-2 text-right">Цена за ед. (сум)</th>
                <th className="px-4 py-2 text-left">Дата поступления</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((stock: Stock, index: number) => (
                <tr key={stock.id || index} className="border-b hover:bg-gray-100">
                  <td className="px-4 py-2">{stock.stock_name || stock.id}</td>
                  <td className="px-4 py-2">
                    {stock.stock_entry?.supplier?.name || 
                     stock.supplier?.name || 
                     "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {stock.quantity || "0"} {stock.purchase_unit?.short_name || ""}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {stock.price_per_unit_currency
                      ? parseFloat(stock.price_per_unit_currency).toLocaleString()
                      : "—"}{" "}
                    {stock.currency?.short_name || ""}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {stock.base_unit_in_uzs
                      ? parseFloat(stock.base_unit_in_uzs).toLocaleString()
                      : "—"} сум
                  </td>
                  <td className="px-4 py-2">
                    {stock.date_of_arrived
                      ? new Date(stock.date_of_arrived).toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold">{t("navigation.products")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const currentPageProductIds = products.map(p => p.id).filter(Boolean) as number[];
              const allSelected = currentPageProductIds.every(id => selectedProducts.includes(id));
              
              if (allSelected) {
                // Deselect all on current page
                setSelectedProducts(prev => prev.filter(id => !currentPageProductIds.includes(id)));
              } else {
                // Select all on current page
                setSelectedProducts(prev => {
                  const newSelection = [...prev];
                  currentPageProductIds.forEach(id => {
                    if (!newSelection.includes(id)) {
                      newSelection.push(id);
                    }
                  });
                  return newSelection;
                });
              }
            }}
          >
            {(() => {
              const currentPageProductIds = products.map(p => p.id).filter(Boolean) as number[];
              const allSelected = currentPageProductIds.every(id => selectedProducts.includes(id));
              return allSelected ? t("buttons.deselect_all") || "Снять выделение" : t("buttons.select_all") || "Выбрать все";
            })()}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await api.get("items/generate-template/", {
                  responseType: "blob",
                });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", "items_template.xlsx");
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
              } catch (e) {
                toast.error("Не удалось скачать шаблон");
              }
            }}
          >
            Скачать шаблон
          </Button>

          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Импорт товаров</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("dialogs.new_import", "Новый импорт")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        Загрузите файл (XLSX, XLS или CSV)
                      </div>
                      <div className="text-xs">Ключи формы (multipart/form-data):</div>
                      <ul className="text-xs list-disc pl-5">
                        <li>
                          file: файл Excel/CSV
                        </li>
                      </ul>
                    </div>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="max-w-xs"
                    />
                  </div>
                </div>

                {importResult && (
                  <div className="rounded-lg border p-3 bg-green-50 text-sm">
                    <div className="font-medium text-green-800">
                      {importResult.message}
                    </div>
                    <div className="text-green-700 mt-1">
                      {t("import.imported", "Импортировано")}: {importResult.imported}
                      {" · "}
                      {t("import.updated", "Обновлено")}: {importResult.updated}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportFile(null);
                    setImportResult(null);
                  }}
                >
                  {t("common.cancel", "Отмена")}
                </Button>
                <Button
                  onClick={async () => {
                    if (!importFile) {
                      toast.error(t("errors.no_file", "Выберите файл для импорта"));
                      return;
                    }
                    try {
                      const form = new FormData();
                      form.append("file", importFile);
                      const { data } = await api.post("items/import-items/", form, {
                        headers: { "Content-Type": "multipart/form-data" },
                      });
                      setImportResult(data);
                      // Auto-close dialog after 3s
                      setTimeout(() => {
                        setIsImportOpen(false);
                        setImportFile(null);
                        setImportResult(null);
                      }, 3000);
                    } catch (e) {
                      toast.error(t("errors.import_failed", "Не удалось импортировать товары"));
                    }
                  }}
                  disabled={!importFile}
                >
                  {t("common.continue", "Продолжить")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="default"
            disabled={Object.keys(priceEdits).length === 0}
            onClick={handleSavePrices}
          >
            {t("buttons.save")} ({Object.keys(priceEdits).length})
          </Button>
          {/*<Button*/}
          {/*  variant="secondary"*/}
          {/*  disabled={selectedProducts.length === 0}*/}
          {/*  onClick={() => setIsRevaluationDialogOpen(true)}*/}
          {/*>*/}
          {/*  {t("buttons.revaluate")} ({selectedProducts.length})*/}
          {/*</Button>*/}
        </div>
      </div>
      {/* Product Tabs */}
      <div className="mb-4">
        <Tabs
          value={productTab}
          onValueChange={(value) =>
            setProductTab(value as "with_quantity" | "without_quantity" | "imported")
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="with_quantity">
              {t("common.with_quantity") || "В наличии"}
            </TabsTrigger>
            <TabsTrigger value="without_quantity">
              {t("common.without_quantity") || "Нет в наличии"}
            </TabsTrigger>
            <TabsTrigger value="imported">
             Импортированные
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <Input
          type="text"
          placeholder={t("placeholders.search_product")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder={t("placeholders.select_category")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedMeasurement}
          onValueChange={setSelectedMeasurement}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("placeholders.select_measurement")} />
          </SelectTrigger>
          <SelectContent>
            {measurementsList?.map((measurement) => (
              <SelectItem key={measurement.id} value={String(measurement.id)}>
                {measurement.measurement_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResourceTable
        data={products}
        columns={columns(
          t,
          handlePrint,
          selectedProducts,
          (productId: number) => {
            setSelectedProducts((prev) =>
              prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId],
            );
          },
          priceEdits,
          handlePriceChange,
          handleCurrencyPriceChange,
        )}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => navigate("/create-product")}
        totalCount={totalCount}
        pageSize={30}
        currentPage={page}
        onPageChange={(newPage) => setPage(newPage)}
        canDelete={(product: Product) => !product.is_default}
        expandedRowRenderer={(row: Product) => renderExpandedRow(row)}
        onRowClick={(row: Product) => {
          if (row.id) {
            fetchStockForProduct(row.id);
          }
        }}
      />

      <RevaluationDialog
        isOpen={isRevaluationDialogOpen}
        onClose={() => setIsRevaluationDialogOpen(false)}
        onSubmit={handleRevaluation}
        selectedCount={selectedProducts.length}
        sellInCurrencyUnit={
          selectedProducts.length > 0
            ? products.find((p) => p.id === selectedProducts[0])
                ?.sell_in_currency_unit || null
            : null
        }
      />
    </div>
  );
}
  