import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ResourceTable } from "../helpers/ResourseTable";
import { toast } from "sonner";
import { type Product, useGetProducts, useDeleteProduct } from "../api/product";
import { useGetCategories } from "../api/category";
import { useTranslation } from "react-i18next";
import { useGetMeasurements } from "../api/measurement";
import { useGetStores } from "../api/store";
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
import {
  WideDialog,
  WideDialogContent,
  WideDialogHeader,
  WideDialogTitle,
  WideDialogFooter,
} from "@/components/ui/wide-dialog";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import { type Stock } from "../api/stock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PriceEdit {
  productId: number;
  selling_price?: string;
  selling_price_in_currency?: string;
  min_price?: string;
  min_stock?: string;
}

const columns = (
  t: any,
  onPrint: (product: Product) => void,
  selectedProducts: number[],
  onSelectProduct: (productId: number) => void,
  priceEdits: Record<number, PriceEdit>,
  onPriceChange: (
    productId: number,
    field: "selling_price" | "selling_price_in_currency" | "min_price" | "min_stock",
    value: string,
  ) => void,
  _onCurrencyPriceChange?: (
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
    header: t("table.selling_price"),
    accessorKey: "selling_price",
    cell: (product: any) => {
      const editValue = priceEdits[product?.id]?.selling_price;
      return (
        <Input
          type="text"
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
          type="text"
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
    header: t("table.min_stock") || "Мин. остаток",
    accessorKey: "min_stock",
    cell: (product: any) => {
      const editValue = priceEdits[product?.id]?.min_stock;
      return (
        <Input
          type="text"
          value={editValue !== undefined ? editValue : product?.min_stock || ""}
          onChange={(e) => {
            e.stopPropagation();
            if (product?.id) {
              onPriceChange(product.id, "min_stock", e.target.value);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-24"
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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem("products_searchTerm") || "");
  const [selectedCategory, setSelectedCategory] = useState<string>(() => localStorage.getItem("products_selectedCategory") || "");
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>(() => localStorage.getItem("products_selectedMeasurement") || "");
  const [hasPrice, setHasPrice] = useState<string>(() => localStorage.getItem("products_hasPrice") || "all");
  const [selectedStore, setSelectedStore] = useState<string>(() => localStorage.getItem("products_selectedStore") || "");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isRevaluationDialogOpen, setIsRevaluationDialogOpen] = useState(false);
  const [priceEdits, setPriceEdits] = useState<Record<number, PriceEdit>>({});
  const [unitPriceEdits, setUnitPriceEdits] = useState<Record<string, PriceEdit>>({});
  const [productTab, setProductTab] = useState<
    "with_quantity" | "without_quantity" | "imported"
  >(() => (localStorage.getItem("products_productTab") as "with_quantity" | "without_quantity" | "imported") || "with_quantity");
  const [expandedRows, setExpandedRows] = useState<Record<number, Stock[]>>({});
  const [loadingRows, setLoadingRows] = useState<Set<number>>(new Set());

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

  // Barcode scanner state
  const [scanBuffer, setScanBuffer] = useState("");
  const [_isScanning, setIsScanning] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Barcode assignment dialog state
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [assigningProductId, setAssigningProductId] = useState<number | null>(null);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem("products_searchTerm", searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem("products_selectedCategory", selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    localStorage.setItem("products_selectedMeasurement", selectedMeasurement);
  }, [selectedMeasurement]);

  useEffect(() => {
    localStorage.setItem("products_hasPrice", hasPrice);
  }, [hasPrice]);

  useEffect(() => {
    localStorage.setItem("products_selectedStore", selectedStore);
  }, [selectedStore]);

  useEffect(() => {
    localStorage.setItem("products_productTab", productTab);
  }, [productTab]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, selectedMeasurement, productTab, hasPrice, selectedStore]);

  // Barcode scanner functionality
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field or dialog is open
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      // Clear any existing timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      // Start scanning mode
      setIsScanning(true);

      // Handle Enter key (end of barcode scan)
      if (event.key === "Enter") {
        event.preventDefault();
        if (scanBuffer.trim()) {
          // Open the barcode assignment dialog with scanned barcode
          setScannedBarcode(scanBuffer.trim());
          setIsBarcodeDialogOpen(true);
          setProductSearchQuery("");
          setProductSearchResults([]);
        }
        setScanBuffer("");
        setIsScanning(false);
        return;
      }

      // Accumulate characters for barcode
      if (event.key.length === 1) {
        setScanBuffer((prev) => prev + event.key);

        // Set timeout to reset buffer if scanning stops
        scanTimeoutRef.current = setTimeout(() => {
          setScanBuffer("");
          setIsScanning(false);
        }, 100);
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [scanBuffer]);

  // Live search products by name for barcode assignment dialog
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleProductSearch = async (query: string) => {
    if (!query.trim()) {
      setProductSearchResults([]);
      return;
    }
    setIsSearchingProducts(true);
    try {
      const response = await api.get(`items/product/?product_name=${query}`);
      const results = response.data.results || response.data || [];
      setProductSearchResults(results);
    } catch (error) {
      console.error("Error searching products:", error);
      toast.error("Ошибка при поиске товаров");
    } finally {
      setIsSearchingProducts(false);
    }
  };

  // Debounced live search
  useEffect(() => {
    if (!isBarcodeDialogOpen) return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      handleProductSearch(productSearchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearchQuery, isBarcodeDialogOpen]);

  // Assign barcode to product
  const handleAssignBarcode = async (product: Product) => {
    if (!product.id) return;
    setAssigningProductId(product.id);
    try {
      await api.patch(`items/product/${product.id}/`, {
        barcode: scannedBarcode,
      });
      toast.success("Штрих-код успешно присвоен товару");
      setIsBarcodeDialogOpen(false);
      setScannedBarcode("");
      setProductSearchQuery("");
      setProductSearchResults([]);
    } catch (error) {
      // console.error("Error assigning barcode:", error);
      // toast.error("Ошибка при присвоении штрих-кода");
    } finally {
      setAssigningProductId(null);
    }
  };

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
      ...(hasPrice !== "all" && { has_price: hasPrice === "true" }),
      ...(selectedStore && { store_id: selectedStore }),
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

  // Fetch categories, measurements, and stores for the select dropdowns
  const { data: categoriesData } = useGetCategories({});
  const { data: measurementsData } = useGetMeasurements({});
  const { data: storesData } = useGetStores({});

  // Get the categories, measurements, and stores arrays
  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];
  const measurementsList = Array.isArray(measurementsData)
    ? measurementsData
    : measurementsData?.results || [];
  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];

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
    }
  };

  const handlePriceChange = (
    productId: number,
    field: "selling_price" | "selling_price_in_currency" | "min_price" | "min_stock",
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

  const handleUnitPriceChange = (
    productId: number,
    unitId: number,
    field: "selling_price" | "selling_price_in_currency" | "min_price",
    value: string,
  ) => {
    const key = `${productId}-${unitId}`;
    setUnitPriceEdits((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
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
    const regularEditsToSave = Object.values(priceEdits).filter(
      (edit) =>
        edit.selling_price !== undefined ||
        edit.selling_price_in_currency !== undefined ||
        edit.min_price !== undefined ||
        edit.min_stock !== undefined,
    );

    const unitEditsToSave = Object.entries(unitPriceEdits).filter(
      ([_key, edit]) =>
        edit.selling_price !== undefined ||
        edit.selling_price_in_currency !== undefined ||
        edit.min_price !== undefined ||
        edit.min_stock !== undefined,
    );

    if (regularEditsToSave.length === 0 && unitEditsToSave.length === 0) {
      toast.error(
        t("messages.error.noPriceChanges") || "No price changes to save",
      );
      return;
    }

    const totalToSave = regularEditsToSave.length + unitEditsToSave.length;

    // Handle regular price edits (existing functionality)
    const regularPromises = regularEditsToSave.map(async (edit) => {
      const product = products.find((p) => p.id === edit.productId);
      if (!product) {
        return { success: false, productId: edit.productId, error: "Product not found" };
      }

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

      const newMinStock =
        edit.min_stock !== undefined
          ? edit.min_stock
          : String(product.min_stock || "0");

      try {
        await revaluateProducts({
          comment: "Price update from products page",
          new_selling_price: newSellingPrice,
          new_min_price: newMinPrice,
          new_selling_price_in_currency: newSellingPriceInCurrency,
          new_min_stock: parseFloat(newMinStock),
          product_ids: [edit.productId],
          ...(selectedStore && { store_id: parseInt(selectedStore) }),
        });

        return { success: true, productId: edit.productId };
      } catch (error) {
        return { success: false, productId: edit.productId, error };
      }
    });

    // Handle unit price edits (new functionality)
    const unitPromises = unitEditsToSave.map(async ([key, edit]) => {
      const [productIdStr, unitIdStr] = key.split('-');
      const productId = parseInt(productIdStr);
      const unitId = parseInt(unitIdStr);
      
      const product = products.find((p) => p.id === productId);
      if (!product) {
        return { success: false, key, error: "Product not found" };
      }

      const unit = product.available_units?.find(u => u.id === unitId);
      if (!unit) {
        return { success: false, key, error: "Unit not found" };
      }

      const newSellingPrice = edit.selling_price !== undefined
        ? parseFloat(edit.selling_price)
        : parseFloat(String(unit.selling_price || "0"));
      const newSellingPriceInCurrency = edit.selling_price_in_currency !== undefined
        ? parseFloat(edit.selling_price_in_currency)
        : parseFloat(String(unit.selling_price_in_currency || "0"));
      const newMinPrice = edit.min_price !== undefined
        ? parseFloat(edit.min_price)
        : parseFloat(String(unit.min_price || "0"));

      const updateData: any = {
        product_id: productId,
        new_selling_price: newSellingPrice,
        new_selling_price_in_currency: newSellingPriceInCurrency,
        new_min_price: newMinPrice,
      };

      // Add unit_id only for non-base units
      if (!unit.is_base) {
        updateData.unit_id = unitId;
      }

      // Add min_stock only for base units
      if (unit.is_base) {
        updateData.new_min_stock = edit.min_stock !== undefined
          ? parseFloat(edit.min_stock)
          : parseFloat(String(product.min_stock || "0"));
      }

      try {
        const payload = {
          comment: "Unit price update",
          products: [updateData],
          ...(selectedStore && { store_id: parseInt(selectedStore) }),
        };

        await api.post("revaluation/bulk/", payload);
        return { success: true, key };
      } catch (error) {
        return { success: false, key, error };
      }
    });

    // Wait for all promises to settle
    const allPromises = [...regularPromises, ...unitPromises];
    const results = await Promise.allSettled(allPromises);

    // Collect successful updates
    const successfulRegularEdits: number[] = [];
    const successfulUnitEdits: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        if (index < regularPromises.length) {
          // Regular edit
          const value = result.value as { success: boolean; productId: number };
          successfulRegularEdits.push(value.productId);
        } else {
          // Unit edit
          const value = result.value as { success: boolean; key: string };
          successfulUnitEdits.push(value.key);
        }
      }
    });

    const totalSuccessful = successfulRegularEdits.length + successfulUnitEdits.length;

    // Show toast messages
    if (totalSuccessful > 0) {
      toast.success(
        t("messages.success.pricesSaved") || "Идет сохранение",
      );
    }

    if (totalSuccessful < totalToSave) {
      const failedCount = totalToSave - totalSuccessful;
      toast.error(
        t("messages.error.somePricesFailed") || `Не удалось сохранить ${failedCount} цен`,
      );
    }

    // Clear successful edits from state
    setPriceEdits((prev) => {
      const newEdits = { ...prev };
      successfulRegularEdits.forEach(id => {
        delete newEdits[id];
      });
      return newEdits;
    });

    setUnitPriceEdits((prev) => {
      const newEdits = { ...prev };
      successfulUnitEdits.forEach(key => {
        delete newEdits[key];
      });
      return newEdits;
    });

    // Refresh data so updated prices are visible
    if (totalSuccessful > 0) {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setExpandedRows({});
    }
  };

  // Fetch stock data for expanded row
  const fetchStockForProduct = async (productId: number) => {
    if (expandedRows[productId] !== undefined) {
      // Already loaded, just toggle
      setExpandedRows((prev) => {
        const newRows = { ...prev };
        delete newRows[productId];
        return newRows;
      });
      return;
    }

    setLoadingRows((prev) => new Set(prev).add(productId));

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
      setExpandedRows((prev) => ({
        ...prev,
        [productId]: [],
      }));
    } finally {
      setLoadingRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Render expanded row content
  const renderExpandedRow = (row: Product) => {
    const isLoading = loadingRows.has(row.id!);
    const stockData = expandedRows[row.id!];
    
    if (isLoading) {
      return (
        <div className="p-4 bg-gray-50 text-center text-gray-500">
          Загрузка данных...
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-50 space-y-6">
        {/* Available Units Table */}
        {row.available_units && row.available_units.filter((u) => !u.is_base).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Единицы измерения и цены</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left w-[25%]">Единица</th>
                    <th className="px-4 py-2 text-right w-[35%]">Цена продажи</th>
                    <th className="px-4 py-2 text-right w-[35%]">Мин. цена</th>
                  </tr>
                </thead>
                <tbody>
                  {row.available_units.filter((unit) => !unit.is_base).map((unit) => {
                    const unitKey = `${row.id!}-${unit.id}`;
                    const unitEdit = unitPriceEdits[unitKey];
                    return (
                      <tr key={unit.id} className="border-b hover:bg-gray-100">
                        <td className="px-4 py-2 font-medium">{unit.short_name}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end">
                            <Input
                              type="number"
                              step="0.01"
                              value={
                                unitEdit?.selling_price !== undefined
                                  ? unitEdit.selling_price
                                  : unit.selling_price || ""
                              }
                              onChange={(e) => {
                                e.stopPropagation();
                                if (row.id) {
                                  handleUnitPriceChange(row.id, unit.id, "selling_price", e.target.value);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full max-w-[140px] h-8 text-xs text-right border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end">
                            <Input
                              type="number"
                              step="0.01"
                              value={
                                unitEdit?.min_price !== undefined
                                  ? unitEdit.min_price
                                  : unit.min_price || ""
                              }
                              onChange={(e) => {
                                e.stopPropagation();
                                if (row.id) {
                                  handleUnitPriceChange(row.id, unit.id, "min_price", e.target.value);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full max-w-[140px] h-8 text-xs text-right border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/*<div className="mt-2 text-xs text-gray-600 space-y-1">*/}
            {/*  <p>• Для базовой единицы unit_id не отправляется</p>*/}
            {/*  <p>• Для остальных единиц unit_id обязательно</p>*/}
            {/*  <p>• Минимальный остаток устанавливается только для базовой единицы</p>*/}
            {/*</div>*/}
          </div>
        )}

        {/* Stock Batches Table */}
        {stockData && stockData.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Партии товара</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left">№ Партии</th>
                    <th className="px-4 py-2 text-left">Поставщик</th>
                    <th className="px-4 py-2 text-right">Количество</th>
                    <th className="px-4 py-2 text-right">Цена за ед. (сум)</th>
                    <th className="px-4 py-2 text-right">Цена за {row.base_unit_name  || "ед."} (сум)</th>
                    <th className="px-4 py-2 text-left">Дата поступления</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.filter((stock: Stock) => (parseFloat(String(stock.quantity || 0)) + parseFloat(String(stock.extra_quantity || 0))) > 0).map((stock: Stock, index: number) => (
                    <tr key={stock.id || index} className="border-b hover:bg-gray-100">
                      <td className="px-4 py-2">{stock.stock_name || stock.id}</td>
                      <td className="px-4 py-2">
                        {stock.stock_entry?.supplier?.name || 
                         stock.supplier?.name || 
                         "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {stock.purchase_unit_quantity ? parseFloat(parseFloat(String(stock.purchase_unit_quantity)).toFixed(2)).toString() : "0"} {stock.purchase_unit?.short_name || ""}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {stock.base_unit_in_uzs
                          ? parseFloat(stock.base_unit_in_uzs).toLocaleString()
                          : "—"} сум
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
        )}

        {/* Show message if no data */}
        {(!stockData || stockData.length === 0) && (!row.available_units || row.available_units.length === 0) && (
          <div className="text-center text-gray-500">
            Нет данных для отображения
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("navigation.products")}</h1>
          <Select value={selectedStore || "all"} onValueChange={(value) => setSelectedStore(value === "all" ? "" : value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Выбрать магазин" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все магазины</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={String(store.id)}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            disabled={Object.keys(priceEdits).length === 0 && Object.keys(unitPriceEdits).length === 0}
            onClick={handleSavePrices}
          >
            {t("buttons.save")} ({Object.keys(priceEdits).length + Object.keys(unitPriceEdits).length})
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

      <div className="flex gap-2 mb-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 flex-1">
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

          <Select value={hasPrice} onValueChange={setHasPrice}>
            <SelectTrigger>
              <SelectValue placeholder="Наличие цен" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Цены</SelectItem>
              <SelectItem value="true">Есть цены</SelectItem>
              <SelectItem value="false">Нет цены</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory("");
            setSelectedMeasurement("");
            setHasPrice("all");
            setSelectedStore("");
            localStorage.removeItem("products_searchTerm");
            localStorage.removeItem("products_selectedCategory");
            localStorage.removeItem("products_selectedMeasurement");
            localStorage.removeItem("products_hasPrice");
            localStorage.removeItem("products_selectedStore");
          }}
        >
          {t("buttons.clear_filters") || "Очистить"}
        </Button>
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

      {/* Barcode Assignment Dialog */}
      <WideDialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
        <WideDialogContent width="wide" className="max-h-[90vh] overflow-auto">
          <WideDialogHeader>
            <WideDialogTitle>
              {t("dialogs.assign_barcode", "Присвоить штрих-код товару")}
            </WideDialogTitle>
          </WideDialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">
                {t("labels.scanned_barcode", "Отсканированный штрих-код")}:
              </div>
              <div className="text-lg font-mono font-bold text-blue-900">
                {scannedBarcode}
              </div>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder={t("placeholders.search_product_name", "Поиск по названию товара...")}
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="w-full"
                autoFocus
              />
              {isSearchingProducts && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {t("common.searching", "Поиск...")}
                </div>
              )}
            </div>

            {productSearchResults.length > 0 && (
              <div className="border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.name")}</TableHead>
                      <TableHead>{t("table.category")}</TableHead>
                      <TableHead>{t("table.barcode", "Штрих-код")}</TableHead>
                      <TableHead className="text-right">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSearchResults.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.product_name}
                        </TableCell>
                        <TableCell>
                          {product.category_read?.category_name || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {product.barcode || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleAssignBarcode(product)}
                            disabled={assigningProductId !== null}
                          >
                            {assigningProductId === product.id
                              ? t("common.saving", "Сохранение...")
                              : t("buttons.assign_barcode", "Присвоить")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {productSearchResults.length === 0 && productSearchQuery && !isSearchingProducts && (
              <div className="text-center py-8 text-gray-500">
                {t("messages.no_products_found", "Товары не найдены")}
              </div>
            )}
          </div>

          <WideDialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsBarcodeDialogOpen(false);
                setScannedBarcode("");
                setProductSearchQuery("");
                setProductSearchResults([]);
              }}
            >
              {t("common.cancel", "Отмена")}
            </Button>
          </WideDialogFooter>
        </WideDialogContent>
      </WideDialog>
    </div>
  );
}
  