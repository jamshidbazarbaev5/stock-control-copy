import { useNavigate, useParams } from "react-router-dom";
import type { DynamicField, StockItemEntry } from "../api/stock";
import {
  calculateStock,
  useUpdateStockEntry,
  useGetStockEntry,
  useGetStocks,
} from "../api/stock";
import {
  useCreateProduct,
  useGetProducts,
  searchProductByBarcode,
} from "../api/product";
import { useGetStores } from "../api/store";
import {
  useGetSuppliers,
  useCreateSupplier,
  type Supplier,
} from "../api/supplier";
import { useGetCategories } from "../api/category";
import { useGetCurrencies } from "../api/currency";
import { useGetMeasurements } from "../api/measurement";
import { toast } from "sonner";
import { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RotateCcw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CommonFormValues {
  store: number | string;
  supplier: number | string;
  date_of_arrived: string;
  is_debt?: boolean;
  amount_of_debt?: number | string;
  advance_of_debt?: number | string;
  use_supplier_balance?: boolean;
  deposit_payment_method?: string;
  payments?: Array<{
    amount: number | string;
    payment_type: string;
  }>;
}

interface StockItemFormValues {
  product: number | string;
  currency: number | string;
  purchase_unit: number | string;
  purchase_unit_quantity?: number | string;
  total_price_in_currency?: number | string;
  price_per_unit_currency?: number | string;
  price_per_unit_uz?: number | string;
  exchange_rate?: number | string;
  quantity?: number | string;
  total_price_in_uz?: number | string;
  base_unit_in_uzs?: number | string;
  base_unit_in_currency?: number | string;
  stock_name?: string;
  calculation_input?: number | string;
}

interface StockItem {
  id: string;
  stockId?: number; // Database ID for existing stocks
  form: StockItemFormValues;
  dynamicFields: { [key: string]: DynamicField };
  dynamicFieldsOrder: string[];
  calculationMetadata: {
    conversion_factor: number;
    exchange_rate: number;
    is_base_currency: boolean;
  } | null;
  selectedProduct: any;
  isCalculated: boolean;
  isExpanded: boolean;
  isCalculating: boolean;
}

interface CreateProductForm {
  product_name: string;
  category_write: number;
  store_write: number;
}

interface CreateSupplierForm {
  name: string;
  phone_number: string;
}

const LOCALSTORAGE_KEY_PREFIX = "edit-stock-entry-draft-";

const formatPrice = (value: number | string | null | undefined) => {
  if (value === undefined || value === null || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};
const formatNumberDisplay = (value: any): string => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  const num = Number(value);
  if (isNaN(num)) {
    return "";
  }
  return num.toFixed(2);
};

const formatPurchaseUnitQuantity = (value: any): string => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  const num = Number(value);
  if (isNaN(num)) {
    return "";
  }
  return num.toFixed(4);
};

const formatNumberForAPI = (value: any): number | undefined => {
  const num = parseFloat(value);
  if (isNaN(num)) return undefined;
  return parseFloat(num.toFixed(2));
};

const formatPurchaseUnitQuantityForAPI = (value: any): number | undefined => {
  const num = parseFloat(value);
  if (isNaN(num)) return undefined;
  return parseFloat(num.toFixed(4));
};

// LocalStorage helper functions
const getLocalStorageKey = (stockEntryId: string) =>
  `${LOCALSTORAGE_KEY_PREFIX}${stockEntryId}`;

const saveToLocalStorage = (
  stockEntryId: string,
  commonData: CommonFormValues,
  items: StockItem[],
) => {
  try {
    const draft = {
      commonData,
      items,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(
      getLocalStorageKey(stockEntryId),
      JSON.stringify(draft),
    );
  } catch (error) {
    console.error("Failed to save draft to localStorage:", error);
  }
};

const loadFromLocalStorage = (
  stockEntryId: string,
): { commonData: CommonFormValues; items: StockItem[] } | null => {
  try {
    const draft = localStorage.getItem(getLocalStorageKey(stockEntryId));
    if (!draft) return null;

    const parsed = JSON.parse(draft);
    return {
      commonData: parsed.commonData,
      items: parsed.items,
    };
  } catch (error) {
    console.error("Failed to load draft from localStorage:", error);
    return null;
  }
};

const clearLocalStorage = (stockEntryId: string) => {
  try {
    localStorage.removeItem(getLocalStorageKey(stockEntryId));
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
};

const getDraftTimestamp = (stockEntryId: string): string | null => {
  try {
    const draft = localStorage.getItem(getLocalStorageKey(stockEntryId));
    if (!draft) return null;

    const parsed = JSON.parse(draft);
    return parsed.timestamp;
  } catch (error) {
    return null;
  }
};

export default function EditStockEntry() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { supplierId, stockEntryId } = useParams<{
    supplierId: string;
    stockEntryId: string;
  }>();
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productPage, _setProductPage] = useState(1);

  // Barcode scanner state
  const [scanBuffer, setScanBuffer] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stock items state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedStockIds, setDeletedStockIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [activeCalculationItemId, setActiveCalculationItemId] = useState<
    string | null
  >(null);

  // API hooks
  const createProduct = useCreateProduct();
  const createSupplier = useCreateSupplier();
  const updateStockEntry = useUpdateStockEntry();
  const { data: stockEntryData, isLoading: stockEntryLoading } =
    useGetStockEntry(Number(stockEntryId));
  const { data: stocksData, isLoading: stocksLoading } = useGetStocks({
    params: { stock_entry: stockEntryId },
  });
  const { data: storesData, isLoading: storesLoading } = useGetStores({});
  const { data: suppliersData, isLoading: suppliersLoading } = useGetSuppliers(
    {},
  );
  const { data: categoriesData, isLoading: categoriesLoading } =
    useGetCategories({});
  const { data: currenciesData, isLoading: currenciesLoading } =
    useGetCurrencies({});
  const { data: _measurementsData, isLoading: measurementsLoading } =
    useGetMeasurements({});
  const { data: productsData } = useGetProducts({
    params: {
      page: productPage,
      ...(productSearchTerm ? { product_name: productSearchTerm } : {}),
    },
  });

  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);

  const productForm = useForm<CreateProductForm>();
  const supplierForm = useForm<CreateSupplierForm>();

  const commonForm = useForm<CommonFormValues>({
    defaultValues: {
      store: "",
      supplier: "",
      date_of_arrived: "",
      is_debt: false,
      amount_of_debt: "",
      advance_of_debt: "",
      use_supplier_balance: false,
      deposit_payment_method: "",
      payments: [],
    },
  });

  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];
  const suppliers = Array.isArray(suppliersData)
    ? suppliersData
    : suppliersData?.results || [];
  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];
  const currencies = Array.isArray(currenciesData)
    ? currenciesData
    : currenciesData?.results || [];

  const allProducts = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];

  // Load existing stock entry data
  useEffect(() => {
    if (stockEntryData && stocksData && !stockEntryLoading && !stocksLoading) {
      const entry = stockEntryData;
      const stocks = Array.isArray(stocksData)
        ? stocksData
        : stocksData?.results || [];

      // Set common form values
      commonForm.setValue("store", entry.store.id);
      commonForm.setValue("supplier", entry.supplier.id);

      // Parse datetime and convert to local time format
      const date = new Date(entry.date_of_arrived);
      const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000,
      );
      commonForm.setValue(
        "date_of_arrived",
        localDate.toISOString().slice(0, 16),
      );

      commonForm.setValue("is_debt", entry.is_debt);
      if (entry.amount_of_debt) {
        commonForm.setValue("amount_of_debt", entry.amount_of_debt);
      }
      if (entry.advance_of_debt) {
        commonForm.setValue("advance_of_debt", entry.advance_of_debt);
      }
      commonForm.setValue("use_supplier_balance", entry.use_supplier_balance || false);

      // Create stock items from existing stocks
      const items: StockItem[] = stocks.map((stock, index) => {
        // Extract exchange_rate ID properly
        let exchangeRateValue: any = "";
        if (stock.exchange_rate) {
          if (
            typeof stock.exchange_rate === "object" &&
            stock.exchange_rate !== null
          ) {
            // Check if it has an 'id' property
            if ("id" in stock.exchange_rate) {
              exchangeRateValue = (stock.exchange_rate as any).id;
            }
          } else {
            exchangeRateValue = stock.exchange_rate;
          }
        }

        console.log("Loading stock data:", stock);
        console.log(
          "Exchange rate:",
          stock.exchange_rate,
          "Extracted:",
          exchangeRateValue,
        );
        console.log("Form values:", {
          purchase_unit_quantity: stock.purchase_unit_quantity,
          quantity: stock.quantity,
          price_per_unit_currency: stock.price_per_unit_currency,
          total_price_in_currency: stock.total_price_in_currency,
          price_per_unit_uz: stock.price_per_unit_uz,
          total_price_in_uz: stock.total_price_in_uz,
          base_unit_in_uzs: stock.base_unit_in_uzs,
          base_unit_in_currency: stock.base_unit_in_currency,
          exchange_rate: exchangeRateValue,
        });

        return {
          id: `item-${index + 1}`,
          stockId: stock.id, // Store the database ID
          form: {
            product: stock.product?.id || "",
            currency: stock.currency?.id || "",
            purchase_unit: stock.purchase_unit?.id || "",
            purchase_unit_quantity: stock.purchase_unit_quantity || "",
            total_price_in_currency: stock.total_price_in_currency || "",
            price_per_unit_currency: stock.price_per_unit_currency || "",
            price_per_unit_uz: stock.price_per_unit_uz || "",
            exchange_rate: exchangeRateValue || "",
            quantity: stock.quantity || "",
            total_price_in_uz: stock.total_price_in_uz || "",
            base_unit_in_uzs: stock.base_unit_in_uzs || "",
            base_unit_in_currency: stock.base_unit_in_currency || "",
            stock_name: stock.stock_name || "",
            calculation_input: "",
          },
          dynamicFields: {},
          dynamicFieldsOrder: [],
          calculationMetadata: null,
          selectedProduct: stock.product || null,
          isCalculated: false, // Will be recalculated to get field metadata
          isExpanded: true, // All items expanded by default
          isCalculating: false,
        };
      });

      if (items.length > 0) {
        setStockItems(items);
      }

      setIsLoading(false);
    }
  }, [stockEntryData, stocksData, stockEntryLoading, stocksLoading]);

  // Check for saved draft on mount
  useEffect(() => {
    if (!stockEntryId) return;

    const timestamp = getDraftTimestamp(stockEntryId);
    if (timestamp) {
      setHasDraft(true);
      setDraftTimestamp(timestamp);
      setShowDraftDialog(true);
    }
  }, [stockEntryId]);

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    if (!stockEntryId || isSubmitting || isLoading) return;

    const commonValues = commonForm.getValues();

    const hasData =
      commonValues.store ||
      commonValues.supplier ||
      stockItems.some((item) => item.form.product);

    if (hasData) {
      const timeoutId = setTimeout(() => {
        saveToLocalStorage(stockEntryId, commonValues, stockItems);
        setHasDraft(true);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [stockItems, commonForm.watch(), isSubmitting, isLoading, stockEntryId]);

  // Restore draft
  const restoreDraft = () => {
    if (!stockEntryId) return;

    const draft = loadFromLocalStorage(stockEntryId);
    if (draft) {
      Object.entries(draft.commonData).forEach(([key, value]) => {
        commonForm.setValue(key as keyof CommonFormValues, value);
      });

      setStockItems(draft.items);

      toast.success(t("common.draft_restored_successfully"));
      setShowDraftDialog(false);
      setHasDraft(false);
    }
  };

  // Clear draft
  const clearDraft = () => {
    if (!stockEntryId) return;

    clearLocalStorage(stockEntryId);
    setHasDraft(false);
    setDraftTimestamp(null);
    setShowDraftDialog(false);
    toast.info(t("common.draft_cleared"));
  };

  // Start fresh
  const startFresh = () => {
    setShowDraftDialog(false);
    setHasDraft(false);
  };

  // Add new stock item
  const addStockItem = () => {
    const newId = `item-${Date.now()}`;
    // Collapse all existing items before adding new one
    setStockItems([
      ...stockItems.map((item) => ({ ...item, isExpanded: false })),
      {
        id: newId,
        form: {
          product: "",
          currency: "",
          purchase_unit: "",
          purchase_unit_quantity: "",
          total_price_in_currency: "",
          price_per_unit_currency: "",
          price_per_unit_uz: "",
          exchange_rate: "",
          quantity: "",
          total_price_in_uz: "",
          base_unit_in_uzs: "",
          base_unit_in_currency: "",
          stock_name: "",
          calculation_input: "",
        },
        dynamicFields: {},
        dynamicFieldsOrder: [],
        calculationMetadata: null,
        selectedProduct: null,
        isCalculated: false,
        isExpanded: true,
        isCalculating: false,
      },
    ]);
  };

  // Duplicate stock item
  const duplicateStockItem = (itemId: string) => {
    const item = stockItems.find((i) => i.id === itemId);
    if (!item) return;

    const newId = `item-${Date.now()}`;
    const duplicated: StockItem = {
      ...item,
      id: newId,
      stockId: undefined, // New item, no database ID
      isExpanded: true,
      isCalculated: false,
      isCalculating: false,
    };

    setStockItems([...stockItems, duplicated]);
    toast.success(t("common.item_duplicated"));
  };

  // Remove stock item
  const removeStockItem = (itemId: string) => {
    if (stockItems.length === 1) {
      toast.error(t("common.must_have_one_item"));
      return;
    }

    const item = stockItems.find((i) => i.id === itemId);

    // If this item has a stockId, add it to deleted list
    if (item?.stockId) {
      setDeletedStockIds([...deletedStockIds, item.stockId]);
    }

    setStockItems(stockItems.filter((item) => item.id !== itemId));
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  // Remove selected items
  const removeSelectedItems = () => {
    if (selectedItems.size === 0) {
      toast.error(t("common.no_items_selected"));
      return;
    }
    if (stockItems.length === selectedItems.size) {
      toast.error(t("common.must_have_one_item"));
      return;
    }

    // Add stockIds to deleted list
    const itemsToDelete = stockItems.filter((item) =>
      selectedItems.has(item.id),
    );
    const newDeletedIds = itemsToDelete
      .filter((item) => item.stockId)
      .map((item) => item.stockId as number);

    setDeletedStockIds([...deletedStockIds, ...newDeletedIds]);
    setStockItems(stockItems.filter((item) => !selectedItems.has(item.id)));
    setSelectedItems(new Set());
    toast.success(`Removed ${selectedItems.size} item(s)`);
  };

  // Toggle item expansion
  const toggleItemExpansion = (itemId: string) => {
    setStockItems(
      stockItems.map((item) =>
        item.id === itemId ? { ...item, isExpanded: !item.isExpanded } : item,
      ),
    );
  };

  // Toggle all items expansion
  const toggleAllExpansion = (expand: boolean) => {
    setStockItems(stockItems.map((item) => ({ ...item, isExpanded: expand })));
  };

  // Update stock item form field
  const updateStockItemField = (
    itemId: string,
    field: keyof StockItemFormValues,
    value: any,
  ) => {
    setStockItems((items) =>
      items.map((item) => {
        if (item.id === itemId) {
          // If changing product, currency, or purchase_unit, need to recalculate
          const needsRecalculation = [
            "product",
            "currency",
            "purchase_unit",
          ].includes(field);
          return {
            ...item,
            form: {
              ...item.form,
              [field]: value,
            },
            ...(needsRecalculation && { isCalculated: false }), // Force recalculation
          };
        }
        return item;
      }),
    );
    
    // Trigger calculation for numeric fields if item is already calculated
    const item = stockItems.find((i) => i.id === itemId);
    if (item?.isCalculated && [
      "purchase_unit_quantity",
      "quantity",
      "price_per_unit_currency",
      "total_price_in_currency",
      "price_per_unit_uz",
      "total_price_in_uz"
    ].includes(field)) {
      setTimeout(() => calculateItemFields(itemId, field, value), 0);
    }
  };

  // Get field configuration for a stock item (for new items or recalculation)
  const getFieldConfiguration = useCallback(
    async (itemId: string) => {
      const item = stockItems.find((i) => i.id === itemId);
      if (!item) return;

      const commonValues = commonForm.getValues();
      const { form } = item;

      // Set calculating state
      setStockItems((items) =>
        items.map((i) => (i.id === itemId ? { ...i, isCalculating: true } : i)),
      );

      if (
        !commonValues.store ||
        !form.product ||
        !form.currency ||
        !form.purchase_unit ||
        !commonValues.supplier ||
        !commonValues.date_of_arrived
      ) {
        return;
      }

      try {
        const configRequest = {
          store: Number(commonValues.store),
          product: Number(form.product),
          currency: Number(form.currency),
          purchase_unit: Number(form.purchase_unit),
          supplier: Number(commonValues.supplier),
          date_of_arrived: commonValues.date_of_arrived,
        };

        const response = await calculateStock(configRequest);

        const fieldOrder = Object.keys(response.dynamic_fields);
        const exchangeRateValue = response.dynamic_fields.exchange_rate?.value;
        const exchangeRate =
          typeof exchangeRateValue === "object" &&
          exchangeRateValue !== null &&
          "rate" in exchangeRateValue
            ? Number(exchangeRateValue.rate)
            : 1;

        const conversionFactorValue =
          response.dynamic_fields.conversion_factor?.value;
        const conversionFactor =
          typeof conversionFactorValue === "number"
            ? conversionFactorValue
            : Number(conversionFactorValue) || 1;

        const metadata = {
          conversion_factor: conversionFactor,
          exchange_rate: exchangeRate,
          is_base_currency: response.currency?.is_base || false,
        };

        // Update item with calculation results
        setStockItems((items) =>
          items.map((i) => {
            if (i.id === itemId) {
              const updatedForm = { ...i.form };

              // Populate form with calculated values
              Object.entries(response.dynamic_fields).forEach(
                ([fieldName, fieldData]) => {
                  if (
                    fieldData.value !== null &&
                    fieldData.value !== undefined
                  ) {
                    const rawValue = formatFieldValue(fieldData.value);
                    const displayValue = fieldName === 'purchase_unit_quantity' 
                      ? formatPurchaseUnitQuantity(rawValue)
                      : formatNumberDisplay(rawValue);
                    updatedForm[fieldName as keyof StockItemFormValues] =
                      displayValue;
                  }
                },
              );

              return {
                ...i,
                form: updatedForm,
                dynamicFields: response.dynamic_fields,
                dynamicFieldsOrder: fieldOrder,
                calculationMetadata: metadata,
                isCalculated: true,
                isCalculating: false,
              };
            }
            return i;
          }),
        );
      } catch (error) {
        console.error("Field configuration error:", error);
        toast.error("Failed to calculate stock values");
        // Reset calculating state on error
        setStockItems((items) =>
          items.map((i) =>
            i.id === itemId ? { ...i, isCalculating: false } : i,
          ),
        );
      }
    },
    [stockItems, commonForm],
  );

  // Get field configuration but preserve original values (for loading existing data)
  const getFieldConfigurationWithOriginalValues = useCallback(
    async (itemId: string, originalForm: StockItemFormValues) => {
      console.log(
        "getFieldConfigurationWithOriginalValues called for item:",
        itemId,
      );
      console.log("originalForm:", originalForm);

      const commonValues = commonForm.getValues();

      if (
        !commonValues.store ||
        !originalForm.product ||
        !originalForm.currency ||
        !originalForm.purchase_unit ||
        !commonValues.supplier ||
        !commonValues.date_of_arrived
      ) {
        return;
      }

      try {
        const configRequest = {
          store: Number(commonValues.store),
          product: Number(originalForm.product),
          currency: Number(originalForm.currency),
          purchase_unit: Number(originalForm.purchase_unit),
          supplier: Number(commonValues.supplier),
          date_of_arrived: commonValues.date_of_arrived,
        };

        const response = await calculateStock(configRequest);

        const fieldOrder = Object.keys(response.dynamic_fields);
        const exchangeRateValue = response.dynamic_fields.exchange_rate?.value;
        const exchangeRate =
          typeof exchangeRateValue === "object" &&
          exchangeRateValue !== null &&
          "rate" in exchangeRateValue
            ? Number(exchangeRateValue.rate)
            : 1;

        const conversionFactorValue =
          response.dynamic_fields.conversion_factor?.value;
        console.log("Conversion factor from API:", conversionFactorValue);
        const conversionFactor =
          typeof conversionFactorValue === "number"
            ? conversionFactorValue
            : Number(conversionFactorValue) || 1;
        console.log("Parsed conversion factor:", conversionFactor);

        const metadata = {
          conversion_factor: conversionFactor,
          exchange_rate: exchangeRate,
          is_base_currency: response.currency?.is_base || false,
        };
        console.log("Metadata:", metadata);

        // Update item with metadata but keep original form values
        setStockItems((items) =>
          items.map((i) => {
            if (i.id === itemId) {
              console.log("Updating item with preserved values:", originalForm);
              console.log(
                "Exchange rate from response:",
                response.dynamic_fields.exchange_rate,
              );

              // Extract exchange_rate ID from response if not in originalForm
              const finalForm = { ...originalForm };
              if (!finalForm.exchange_rate || finalForm.exchange_rate === "") {
                const exchangeRateField = response.dynamic_fields.exchange_rate;
                if (exchangeRateField?.value) {
                  if (
                    typeof exchangeRateField.value === "object" &&
                    (exchangeRateField.value as any).id
                  ) {
                    finalForm.exchange_rate = String(
                      (exchangeRateField.value as any).id,
                    );
                  } else {
                    finalForm.exchange_rate = String(exchangeRateField.value);
                  }
                }
              }

              console.log(
                "Final form with exchange_rate:",
                finalForm.exchange_rate,
              );

              return {
                ...i,
                form: finalForm, // Keep the original loaded values with fixed exchange_rate
                dynamicFields: response.dynamic_fields,
                dynamicFieldsOrder: fieldOrder,
                calculationMetadata: metadata,
                isCalculated: true, // Mark as calculated to prevent auto-recalculation
              };
            }
            return i;
          }),
        );
        console.log("State updated for item:", itemId);
      } catch (error) {
        console.error("Field configuration error:", error);
        toast.error("Failed to load stock configuration");
      }
    },
    [commonForm],
  );

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      if (value.rate !== undefined) return String(value.rate);
      if (value.value !== undefined) {
        if (typeof value.value === "object") {
          if (value.value.rate !== undefined) return String(value.value.rate);
          if (value.value.amount !== undefined)
            return String(value.value.amount);
        }
        return String(value.value);
      }
      if (value.amount !== undefined) return String(value.amount);
      if (value.id !== undefined) return String(value.id);
    }
    return String(value);
  };

  // Handle product selection change
  const handleProductChange = (itemId: string, productId: string) => {
    const product = allProducts.find((p) => p.id === Number(productId));
    console.log("Product changed:", productId, product);
    setStockItems((items) =>
      items.map((item) => {
        if (item.id === itemId) {
          const updatedForm = {
            ...item.form,
            product: productId,
            purchase_unit: "", // Reset purchase unit
          };

          return {
            ...item,
            selectedProduct: product,
            form: updatedForm,
            isCalculated: false, // Reset calculation status
          };
        }
        return item;
      }),
    );
  };

  // Calculate fields based on user input
  const calculateItemFields = useCallback(
    (itemId: string, changedField: string, value: any) => {
      console.log(
        `calculateItemFields called: item=${itemId}, field=${changedField}, value=${value}`,
      );
      const item = stockItems.find((i) => i.id === itemId);
      if (!item) {
        console.log("Item not found:", itemId);
        return;
      }
      if (!item.calculationMetadata) {
        console.log("No calculation metadata for item:", itemId);
        return;
      }

      const { conversion_factor, exchange_rate, is_base_currency } =
        item.calculationMetadata;
      console.log("Calculation metadata:", {
        conversion_factor,
        exchange_rate,
        is_base_currency,
      });
      const currentForm = { ...item.form, [changedField]: value };
      console.log("Current form before calculation:", currentForm);

      const qty = Number(currentForm.purchase_unit_quantity) || 0;
      const quantity = Number(currentForm.quantity) || 0;

      // Update quantity based on purchase_unit_quantity
      if (
        changedField === "purchase_unit_quantity" &&
        qty &&
        !item.dynamicFields.quantity?.editable
      ) {
        currentForm.quantity = formatNumberDisplay(qty * conversion_factor);
      } else if (
        changedField === "quantity" &&
        quantity &&
        !item.dynamicFields.purchase_unit_quantity?.editable
      ) {
        currentForm.purchase_unit_quantity = formatPurchaseUnitQuantity(
          quantity * conversion_factor,
        );
      }

      const currentQty =
        changedField === "purchase_unit_quantity"
          ? qty
          : Number(currentForm.purchase_unit_quantity) || 0;

      // Price calculations
      if (!is_base_currency && currentQty) {
        if (changedField === "price_per_unit_currency") {
          currentForm.total_price_in_currency = formatNumberDisplay(
            (Number(currentForm.price_per_unit_currency) || 0) * currentQty,
          );
        } else if (changedField === "total_price_in_currency") {
          currentForm.price_per_unit_currency = formatNumberDisplay(
            (Number(currentForm.total_price_in_currency) || 0) / currentQty,
          );
        } else if (
          changedField === "purchase_unit_quantity" ||
          changedField === "quantity"
        ) {
          // When quantity changes, recalculate total from per_unit * qty
          currentForm.total_price_in_currency = formatNumberDisplay(
            (Number(currentForm.price_per_unit_currency) || 0) * currentQty,
          );
        }

        // Always recalculate UZ prices
        currentForm.price_per_unit_uz = formatNumberDisplay(
          (Number(currentForm.price_per_unit_currency) || 0) * exchange_rate,
        );
        currentForm.total_price_in_uz = formatNumberDisplay(
          (Number(currentForm.total_price_in_currency) || 0) * exchange_rate,
        );
      } else if (is_base_currency && currentQty) {
        if (changedField === "price_per_unit_uz") {
          currentForm.total_price_in_uz = formatNumberDisplay(
            (Number(currentForm.price_per_unit_uz) || 0) * currentQty,
          );
        } else if (changedField === "total_price_in_uz") {
          currentForm.price_per_unit_uz = formatNumberDisplay(
            (Number(currentForm.total_price_in_uz) || 0) / currentQty,
          );
        } else if (
          changedField === "purchase_unit_quantity" ||
          changedField === "quantity"
        ) {
          // When quantity changes, recalculate total from per_unit * qty
          currentForm.total_price_in_uz = formatNumberDisplay(
            (Number(currentForm.price_per_unit_uz) || 0) * currentQty,
          );
        }
      }

      // Base unit cost
      const finalQuantity = Number(currentForm.quantity) || 0;
      if (finalQuantity) {
        currentForm.base_unit_in_currency = formatNumberDisplay(
          (Number(currentForm.total_price_in_currency) || 0) / finalQuantity,
        );
        currentForm.base_unit_in_uzs = formatNumberDisplay(
          (Number(currentForm.total_price_in_uz) || 0) / finalQuantity,
        );
      }

      // Update the item
      console.log("Final calculated form:", currentForm);
      setStockItems((items) =>
        items.map((i) => {
          if (i.id === itemId) {
            return {
              ...i,
              form: currentForm,
            };
          }
          return i;
        }),
      );
      console.log("Item state updated");
    },
    [stockItems],
  );

  // Barcode scanner
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      setIsScanning(true);

      if (event.key === "Enter") {
        event.preventDefault();
        if (scanBuffer.trim()) {
          searchProductByBarcode(scanBuffer.trim())
            .then((product) => {
              if (product) {
                // Find first empty item or create new one
                const firstEmptyItem = stockItems.find((i) => !i.form.product);
                const targetItemId = firstEmptyItem?.id || `item-${Date.now()}`;

                if (!firstEmptyItem) {
                  addStockItem();
                }

                setTimeout(() => {
                  handleProductChange(targetItemId, String(product.id));
                  toast.success(
                    `Product found and selected: ${product.product_name}`,
                  );
                }, 100);
                setProductSearchTerm("");
              } else {
                setProductSearchTerm(scanBuffer.trim());
                toast.info(
                  `No product found with barcode: ${scanBuffer.trim()}. Showing search results.`,
                );
              }
            })
            .catch((error) => {
              console.error("Error searching for product:", error);
              setProductSearchTerm(scanBuffer.trim());
              toast.error(
                "Error searching for product. Showing search results.",
              );
            });
        }
        setScanBuffer("");
        setIsScanning(false);
        return;
      }

      if (event.key.length === 1) {
        setScanBuffer((prev) => prev + event.key);
        scanTimeoutRef.current = setTimeout(() => {
          setScanBuffer("");
          setIsScanning(false);
        }, 100);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [scanBuffer, stockItems]);

  // Get conversion number from measurement array
  const getConversionNumber = (
    product: any,
    purchaseUnitId: number,
  ): number | null => {
    if (!product?.measurement || !Array.isArray(product.measurement)) {
      return null;
    }

    // Find the measurement that has the purchase unit as from_unit or to_unit
    const measurement = product.measurement.find((m: any) => {
      return (
        m.from_unit?.id === purchaseUnitId || m.to_unit?.id === purchaseUnitId
      );
    });

    if (measurement && measurement.number) {
      return Number(measurement.number);
    }

    return null;
  };

  // Open calculation modal
  const openCalculationModal = (itemId: string) => {
    const item = stockItems.find((i) => i.id === itemId);
    if (!item) return;

    if (!item.form.purchase_unit || !item.selectedProduct) {
      toast.error(t("common.select_product_and_unit_first"));
      return;
    }

    setActiveCalculationItemId(itemId);
    setCalculationModalOpen(true);
  };

  // Handle calculation for Лист category
  const handleCalculateQuantity = () => {
    if (!activeCalculationItemId) return;

    const item = stockItems.find((i) => i.id === activeCalculationItemId);
    if (!item) return;

    const calculationInput = Number(item.form.calculation_input);
    if (!calculationInput || isNaN(calculationInput)) {
      toast.error(t("common.enter_valid_number"));
      return;
    }

    // Find the selected purchase unit
    const selectedUnit = item.selectedProduct.available_units?.find(
      (unit: any) => unit.id === Number(item.form.purchase_unit),
    );

    if (!selectedUnit) {
      toast.error("Selected purchase unit not found");
      return;
    }

    // Get the conversion number from the measurement array
    const conversionNumber = getConversionNumber(
      item.selectedProduct,
      selectedUnit.id,
    );
    if (!conversionNumber || isNaN(conversionNumber)) {
      toast.error("Conversion number not found for this unit");
      return;
    }

    // Calculate: input / conversion_number
    const result = calculationInput / conversionNumber;
    const resultValue = result.toFixed(4);

    console.log("=== Calculation Debug ===");
    console.log("Input:", calculationInput);
    console.log("Conversion Number:", conversionNumber);
    console.log("Result:", resultValue);
    console.log("Item before update:", item);
    console.log("Item isCalculated:", item.isCalculated);
    console.log("Item dynamicFields:", item.dynamicFields);

    // Update the state comprehensively
    setStockItems((items) =>
      items.map((i) => {
        if (i.id === item.id) {
          const updatedForm = {
            ...i.form,
            purchase_unit_quantity: resultValue,
            quantity: calculationInput.toFixed(2), // Set input value to quantity
          };

          // Also update dynamicFields if purchase_unit_quantity exists there
          const updatedDynamicFields = { ...i.dynamicFields };
          if (updatedDynamicFields.purchase_unit_quantity) {
            console.log(
              "Updating dynamicFields.purchase_unit_quantity from:",
              updatedDynamicFields.purchase_unit_quantity.value,
              "to:",
              resultValue,
            );
            updatedDynamicFields.purchase_unit_quantity = {
              ...updatedDynamicFields.purchase_unit_quantity,
              value: resultValue,
            };
          } else {
            console.log("No purchase_unit_quantity field in dynamicFields");
          }

          const updatedItem = {
            ...i,
            form: updatedForm,
            dynamicFields: updatedDynamicFields,
          };

          console.log("Updated item:", updatedItem);
          return updatedItem;
        }
        return i;
      }),
    );

    // Trigger recalculation of all dependent fields
    if (item.isCalculated && item.calculationMetadata) {
      setTimeout(() => {
        calculateItemFields(item.id, "purchase_unit_quantity", resultValue);
      }, 0);
    }

    toast.success(
      `${t("common.calculated_result")} ${calculationInput} ÷ ${conversionNumber} = ${resultValue}`,
    );

    // Close modal and reset
    setCalculationModalOpen(false);
    setActiveCalculationItemId(null);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate common fields
      const commonValues = commonForm.getValues();
      if (
        !commonValues.store ||
        !commonValues.supplier ||
        !commonValues.date_of_arrived
      ) {
        toast.error("Please fill all required common fields");
        return;
      }

      // Check supplier balance if using supplier balance
      if (commonValues.use_supplier_balance) {
        const selectedSupplier = suppliers.find(
          (s: Supplier) => s.id === Number(commonValues.supplier),
        );
        if (selectedSupplier) {
          const totalAmount = stockItems.reduce((sum, item) => {
            if (item.isCalculated) {
              return sum + (Number(item.form.total_price_in_uz) || 0);
            }
            return sum;
          }, 0);
          const balance = Number(selectedSupplier.balance) || 0;
          if (balance < totalAmount) {
            toast.error(
                `Недостаточный баланс поставщика. Баланс: ${formatPrice(balance)} UZS, Требуется: ${formatPrice(totalAmount)} UZS`,
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Validate all items are calculated
      const uncalculatedItems = stockItems.filter((item) => !item.isCalculated);
      if (uncalculatedItems.length > 0) {
        toast.error(
          "Please complete all stock items by filling required fields and calculating",
        );
        return;
      }

      // Build stocks array
      const stocks: StockItemEntry[] = stockItems.map((item) => {
        const exchangeRateField = item.dynamicFields.exchange_rate;
        let exchangeRateId: number;

        if (
          exchangeRateField?.value &&
          typeof exchangeRateField.value === "object" &&
          (exchangeRateField.value as any).id
        ) {
          exchangeRateId = (exchangeRateField.value as any).id;
        } else {
          exchangeRateId = Number(item.form.exchange_rate);
        }

        const stockEntry: any = {
          product: Number(item.form.product),
          purchase_unit: Number(item.form.purchase_unit),
          currency: Number(item.form.currency),
          exchange_rate: exchangeRateId,
          quantity: formatNumberForAPI(item.form.quantity) || 0,
          purchase_unit_quantity:
            formatPurchaseUnitQuantityForAPI(item.form.purchase_unit_quantity) || 0,
          price_per_unit_uz:
            formatNumberForAPI(item.form.price_per_unit_uz) || 0,
          total_price_in_uz:
            formatNumberForAPI(item.form.total_price_in_uz) || 0,
          price_per_unit_currency:
            formatNumberForAPI(item.form.price_per_unit_currency) || 0,
          total_price_in_currency:
            formatNumberForAPI(item.form.total_price_in_currency) || 0,
          base_unit_in_uzs: formatNumberForAPI(item.form.base_unit_in_uzs),
          base_unit_in_currency: formatNumberForAPI(
            item.form.base_unit_in_currency,
          ),
        };

        // Add stock_name only if it exists
        if (item.form.stock_name && item.form.stock_name.trim()) {
          stockEntry.stock_name = item.form.stock_name.trim();
        }

        // Add id if this is an existing stock
        if (item.stockId) {
          stockEntry.id = item.stockId;
        }

        return stockEntry;
      });

      const payload: any = {
        store: Number(commonValues.store),
        supplier: Number(commonValues.supplier),
        date_of_arrived: commonValues.date_of_arrived,
        ...(commonValues.is_debt && { is_debt: true }),
        ...(commonValues.amount_of_debt && {
          amount_of_debt: formatNumberForAPI(commonValues.amount_of_debt),
        }),
        ...(commonValues.advance_of_debt && {
          advance_of_debt: formatNumberForAPI(commonValues.advance_of_debt),
        }),
        ...(commonValues.use_supplier_balance && {
          use_supplier_balance: true,
        }),
        ...(commonValues.deposit_payment_method && {
          deposit_payment_method: commonValues.deposit_payment_method,
        }),
        ...(commonValues.payments &&
          commonValues.payments.length > 0 && {
            payments: commonValues.payments.map((p) => ({
              amount: formatNumberForAPI(p.amount),
              payment_type: p.payment_type,
            })),
          }),
        stocks,
        ...(deletedStockIds.length > 0 && { deleted_stocks: deletedStockIds }),
      };

      console.log("Submitting payload:", payload);
      await updateStockEntry.mutateAsync({
        id: Number(stockEntryId),
        data: payload,
      });

      // Clear localStorage on successful submission
      if (stockEntryId) {
        clearLocalStorage(stockEntryId);
      }

      toast.success("Stock entry updated successfully");
      navigate(`/suppliers/${supplierId}`);
    } catch (error) {
      toast.error("Failed to update stock entry");
      console.error("Failed to update stock entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-set debt amount to sum of total UZS if is_debt is true
  const isDebt = commonForm.watch("is_debt");
  useEffect(() => {
    if (!isDebt) return;

    // Sum all calculated items' total_price_in_uz
    const totalUZS = stockItems.reduce((sum, item) => {
      if (item.isCalculated && item.form.total_price_in_uz) {
        const v = Number(item.form.total_price_in_uz) || 0;
        return sum + v;
      }
      return sum;
    }, 0);

    if (totalUZS > 0) {
      const currentDebt = commonForm.getValues("amount_of_debt");
      // Only auto-set if user hasn't manually entered a value
      if (
        !currentDebt ||
        Number(currentDebt) === 0 ||
        Number(currentDebt) < totalUZS
      ) {
        commonForm.setValue("amount_of_debt", totalUZS.toFixed(2));
      }
    }
  }, [isDebt, stockItems]);

  // Auto-trigger calculation when all required fields are filled
  useEffect(() => {
    console.log("Auto-trigger effect running, stockItems:", stockItems.length);
    const commonValues = commonForm.getValues();
    console.log("Common values:", commonValues);

    stockItems.forEach((item) => {
      console.log(`Item ${item.id}:`, {
        hasStore: !!commonValues.store,
        hasSupplier: !!commonValues.supplier,
        hasDate: !!commonValues.date_of_arrived,
        hasProduct: !!item.form.product,
        hasCurrency: !!item.form.currency,
        hasPurchaseUnit: !!item.form.purchase_unit,
        isCalculated: item.isCalculated,
        stockId: item.stockId,
      });

      if (
        commonValues.store &&
        commonValues.supplier &&
        commonValues.date_of_arrived &&
        item.form.product &&
        item.form.currency &&
        item.form.purchase_unit &&
        !item.isCalculated &&
        !item.isCalculating
      ) {
        console.log(
          `Triggering configuration for item ${item.id}, has stockId:`,
          !!item.stockId,
        );
        // For existing stocks (with stockId), preserve values
        if (item.stockId) {
          const originalForm = { ...item.form }; // Capture current values
          getFieldConfigurationWithOriginalValues(item.id, originalForm);
        } else {
          // For new stocks, calculate normally
          getFieldConfiguration(item.id);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stockItems,
    commonForm.watch("store"),
    commonForm.watch("supplier"),
    commonForm.watch("date_of_arrived"),
  ]);

  // Auto-initialize payment when entering payment mode (both checkboxes unchecked)
  useEffect(() => {
    const isDebt = commonForm.watch("is_debt");
    const useSupplierBalance = commonForm.watch("use_supplier_balance");
    const payments = commonForm.watch("payments") || [];

    // Only initialize when in payment mode (both checkboxes false)
    if (!isDebt && !useSupplierBalance) {
      const totalAmount = stockItems.reduce((sum, item) => {
        if (item.isCalculated) {
          return sum + (Number(item.form.total_price_in_uz) || 0);
        }
        return sum;
      }, 0);

      // Initialize with one payment if no payments exist and total > 0
      if (payments.length === 0 && totalAmount > 0) {
        commonForm.setValue("payments", [
          {
            amount: totalAmount.toFixed(2),
            payment_type: "Наличные",
          },
        ]);
      } else if (payments.length === 1 && totalAmount > 0) {
        // Update the single payment amount if items changed
        const currentAmount = Number(payments[0].amount) || 0;
        if (currentAmount !== totalAmount) {
          commonForm.setValue("payments", [
            {
              amount: totalAmount.toFixed(2),
              payment_type: payments[0].payment_type,
            },
          ]);
        }
      }
    }
  }, [
    commonForm.watch("is_debt"),
    commonForm.watch("use_supplier_balance"),
    stockItems,
  ]);

  const handleCreateProductSubmit = async (data: CreateProductForm) => {
    try {
      await createProduct.mutateAsync(data);
      toast.success(t("common.product_created"));
      setCreateProductOpen(false);
      productForm.reset();
    } catch (error) {
      toast.error(t("common.error_creating_product"));
    }
  };

  const handleCreateSupplierSubmit = async (data: CreateSupplierForm) => {
    try {
      await createSupplier.mutateAsync(data);
      toast.success(t("common.supplier_created"));
      setCreateSupplierOpen(false);
      supplierForm.reset();
    } catch (error) {
      toast.error(t("common.error_creating_supplier"));
    }
  };

  if (isLoading || stockEntryLoading || stocksLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {isScanning && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-blue-700 font-medium">
              Scanning barcode to find product... ({scanBuffer})
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {t("common.edit_stock_entry")}
            </h1>
            {hasDraft && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                  <Save className="h-4 w-4" />
                  <span>Draft auto-saved</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearDraft}
                  title="Clear saved draft"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Common Fields Section */}
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">
            {t("common.common_information")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store */}
            <div className="space-y-2">
              <Label htmlFor="store">{t("common.store")} *</Label>
              <Select
                value={commonForm.watch("store")?.toString()}
                onValueChange={(value) =>
                  commonForm.setValue("store", Number(value))
                }
                disabled={storesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select_store")} />
                </SelectTrigger>
                <SelectContent>
                  {stores
                    .filter((store) => store.is_main)
                    .map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">{t("common.supplier")} *</Label>
              <div className="flex gap-2">
                <Select
                  value={commonForm.watch("supplier")?.toString()}
                  onValueChange={(value) =>
                    commonForm.setValue("supplier", Number(value))
                  }
                  disabled={suppliersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.select_supplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date_of_arrived">
                {t("common.date_of_arrival")} *
              </Label>
              <Input
                id="date_of_arrived"
                type="datetime-local"
                {...commonForm.register("date_of_arrived")}
              />
            </div>
          </div>

          {/* Is Debt Checkbox */}
          <div className="space-y-2 flex items-center gap-2 pt-8">
            <Checkbox
              id="is_debt"
              checked={commonForm.watch("is_debt") === true}
              onCheckedChange={(checked) => {
                if (checked) {
                  commonForm.setValue("is_debt", true);
                  commonForm.setValue("use_supplier_balance", false);
                  // Clear payments when switching to debt mode
                  commonForm.setValue("payments", []);
                } else {
                  commonForm.setValue("is_debt", false);
                }
              }}
            />
            <Label htmlFor="is_debt" className="cursor-pointer">
              {t("common.is_debt") || "This is a debt purchase"}
            </Label>
          </div>

          {/* Debt fields */}
          {commonForm.watch("is_debt") && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount_of_debt">
                    {t("common.amount_of_debt") || "Total Debt Amount"}
                  </Label>
                  <Input
                    id="amount_of_debt"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...commonForm.register("amount_of_debt")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advance_of_debt">
                    {t("common.advance_of_debt") || "Advance Payment"}
                  </Label>
                  <Input
                    id="advance_of_debt"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...commonForm.register("advance_of_debt")}
                  />
                </div>
              </div>

              {/* Deposit Payment Method - show when debt and NOT using supplier balance */}
              {!commonForm.watch("use_supplier_balance") && (
                <div className="space-y-2">
                  <Label htmlFor="deposit_payment_method">
                    {t("common.deposit_payment_method") ||
                      "Advance Payment Method"}
                  </Label>
                  <Select
                    value={commonForm.watch("deposit_payment_method") || ""}
                    onValueChange={(value) =>
                      commonForm.setValue("deposit_payment_method", value)
                    }
                  >
                    <SelectTrigger id="deposit_payment_method">
                      <SelectValue
                        placeholder={
                          t("common.select_payment_method") ||
                          "Select payment method"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Наличные">Наличные</SelectItem>
                      <SelectItem value="Карта">Карта</SelectItem>
                      <SelectItem value="Click">Click</SelectItem>
                      <SelectItem value="Перечисление">Перечисление</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Use Supplier Balance Section - Separate from debt */}
          <div className="space-y-2 flex items-center gap-2 pt-8">
            <Checkbox
              id="use_supplier_balance"
              checked={commonForm.watch("use_supplier_balance") === true}
              onCheckedChange={(checked) => {
                if (checked) {
                  commonForm.setValue("use_supplier_balance", true);
                  commonForm.setValue("is_debt", false);
                  // Clear payments when switching to supplier balance mode
                  commonForm.setValue("payments", []);
                } else {
                  commonForm.setValue("use_supplier_balance", false);
                }
              }}
            />
            <Label htmlFor="use_supplier_balance" className="cursor-pointer">
              {t("common.use_supplier_balance") || "Use Supplier Balance"}
            </Label>
          </div>

          {/* Show supplier balance info when use_supplier_balance is checked */}
          {commonForm.watch("use_supplier_balance") &&
            commonForm.watch("supplier") && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <h3 className="font-semibold mb-2">
                  {t("common.supplier_info") || "Supplier Information"}
                </h3>
                {(() => {
                  const selectedSupplier = suppliers.find(
                    (s: Supplier) =>
                      s.id === Number(commonForm.watch("supplier")),
                  );
                  if (selectedSupplier) {
                    const totalAmount = stockItems.reduce((sum, item) => {
                      if (item.isCalculated) {
                        return sum + (Number(item.form.total_price_in_uz) || 0);
                      }
                      return sum;
                    }, 0);
                    const balance = Number(selectedSupplier.balance) || 0;
                    const canPay = balance >= totalAmount;

                    return (
                      <div className="space-y-3">
                        <div className="p-3 bg-white border border-blue-200 rounded-lg">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                {t("common.supplier_name") || "Supplier"}:
                              </span>
                              <span className="font-medium">
                                {selectedSupplier.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                {t("common.supplier_balance") ||
                                  "Available Balance"}
                                :
                              </span>
                              <span
                                className={`font-semibold ${balance > 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {formatPrice(balance)} UZS
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-gray-600">
                                {t("common.total_amount") || "Purchase Amount"}:
                              </span>
                              <span className="font-semibold">
                                {formatPrice(totalAmount)} UZS
                              </span>
                            </div>
                          </div>
                        </div>

                        {!canPay && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <div className="flex items-start gap-2">
                              <span className="font-semibold">⚠️</span>
                              <div>
                                <p className="font-semibold">
                                  Недостаточный баланс
                                </p>
                                <p className="text-xs mt-1">
                                  Баланс поставщика ({formatPrice(balance)} UZS)
                                  меньше суммы покупки ({formatPrice(totalAmount)}{" "}
                                  UZS). Нехватка:{" "}
                                  {formatPrice(totalAmount - balance)} UZS
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {canPay && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                            <div className="flex items-start gap-2">
                              <span className="font-semibold">✓</span>
                              <div>
                                <p className="font-semibold">Оплата доступна</p>
                                <p className="text-xs mt-1">
                                  Остаток баланса после покупки:{" "}
                                  {(balance - totalAmount).toFixed(2)} UZS
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

          {/* Payments Section - show when NOT using supplier balance AND NOT debt */}
          {commonForm.watch("use_supplier_balance") !== true &&
            commonForm.watch("is_debt") !== true && (
              <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">
                    {t("common.payments") || "Payments"}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentPayments =
                        commonForm.watch("payments") || [];
                      const totalAmount = stockItems.reduce((sum, item) => {
                        if (item.isCalculated) {
                          return (
                            sum + (Number(item.form.total_price_in_uz) || 0)
                          );
                        }
                        return sum;
                      }, 0);

                      const paidAmount = currentPayments.reduce(
                        (sum, p) => sum + (Number(p.amount) || 0),
                        0,
                      );
                      const remainingAmount = totalAmount - paidAmount;

                      commonForm.setValue("payments", [
                        ...currentPayments,
                        {
                          amount:
                            remainingAmount > 0
                              ? remainingAmount.toFixed(2)
                              : "0",
                          payment_type: "Наличные",
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("common.add_payment") || "Add Payment"}
                  </Button>
                </div>

                {/* Total Amount Display */}
                {(() => {
                  const totalAmount = stockItems.reduce((sum, item) => {
                    if (item.isCalculated) {
                      return sum + (Number(item.form.total_price_in_uz) || 0);
                    }
                    return sum;
                  }, 0);
                  const payments = commonForm.watch("payments") || [];
                  const paidAmount = payments.reduce(
                    (sum, p) => sum + (Number(p.amount) || 0),
                    0,
                  );
                  const remainingAmount = totalAmount - paidAmount;

                  return (
                    <div className="space-y-2 p-3 bg-white rounded border">
                      <div className="flex justify-between text-sm">
                        <span>
                          {t("common.total_amount") || "Total Amount"}:
                        </span>
                        <span className="font-semibold">
                          {totalAmount.toFixed(2)} UZS
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t("common.paid_amount") || "Paid Amount"}:</span>
                        <span className="font-semibold text-green-600">
                          {paidAmount.toFixed(2)} UZS
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>
                          {t("common.remaining_amount") || "Remaining Amount"}:
                        </span>
                        <span
                          className={`font-semibold ${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          {remainingAmount.toFixed(2)} UZS
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Payments List */}
                <div className="space-y-2">
                  {(() => {
                    const payments = commonForm.watch("payments") || [];

                    return payments.map((payment, index) => (
                      <div
                        key={index}
                        className="flex gap-2 items-start p-3 bg-white rounded border"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {t("common.amount") || "Amount"}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={payment.amount}
                                onChange={(e) => {
                                  const payments =
                                    commonForm.watch("payments") || [];
                                  const newPayments = [...payments];
                                  newPayments[index] = {
                                    ...newPayments[index],
                                    amount: e.target.value,
                                  };
                                  commonForm.setValue("payments", newPayments);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {t("common.payment_type") || "Payment Type"}
                              </Label>
                              <Select
                                value={payment.payment_type}
                                onValueChange={(value) => {
                                  const payments =
                                    commonForm.watch("payments") || [];
                                  const newPayments = [...payments];
                                  newPayments[index] = {
                                    ...newPayments[index],
                                    payment_type: value,
                                  };
                                  commonForm.setValue("payments", newPayments);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Наличные">
                                    Наличные
                                  </SelectItem>
                                  <SelectItem value="Карта">Карта</SelectItem>
                                  <SelectItem value="Click">Click</SelectItem>
                                  <SelectItem value="Перечисление">
                                    Перечисление
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const payments = commonForm.watch("payments") || [];
                            const newPayments = payments.filter(
                              (_, i) => i !== index,
                            );
                            commonForm.setValue("payments", newPayments);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ));
                  })()}

                  {(!commonForm.watch("payments") ||
                    commonForm.watch("payments")?.length === 0) && (
                    <div className="text-center text-sm text-gray-500 py-4">
                      {t("common.no_payments_added") ||
                        "No payments added. A payment will be auto-added once items are calculated."}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Stock Items List */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {t("common.stock_items")} ({stockItems.length})
            </h2>
            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={removeSelectedItems}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItems.size})
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleAllExpansion(false)}
              >
                Свернуть
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleAllExpansion(true)}
              >
                развернуть
              </Button>
              <Button type="button" onClick={addStockItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t("common.add_stock_item")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {stockItems.map((item, index) => (
              <div
                key={item.id}
                className={`border rounded-lg transition-all ${
                  selectedItems.has(item.id) ? "ring-2 ring-blue-500" : ""
                } ${item.isCalculated ? "border-green-300 bg-green-50/30" : "border-gray-200"}`}
              >
                {/* Item Header */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-t-lg">
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) => {
                      setSelectedItems((prev) => {
                        const newSet = new Set(prev);
                        if (checked) {
                          newSet.add(item.id);
                        } else {
                          newSet.delete(item.id);
                        }
                        return newSet;
                      });
                    }}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleItemExpansion(item.id)}
                    className="p-1"
                  >
                    {item.isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="flex-1 flex items-center gap-4">
                    <span className="font-medium text-gray-600">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-lg">
                      {item.selectedProduct?.product_name ||
                        t("common.select_product_placeholder")}
                    </span>
                    {item.isCalculated && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600"/>
                          <span className="text-green-700 font-medium">
                          {item.form.quantity}{" "}
                            {
                              item.selectedProduct?.available_units?.[0]
                                  ?.short_name
                            }{" "}
                            · {formatPrice(item.form.total_price_in_uz)}{" "}
                            UZS
                        </span>
                        </div>
                    )}
                    {item.isCalculating && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin"/>
                          <span>{t("common.calculating")}</span>
                        </div>
                    )}
                    {!item.isCalculated &&
                        !item.isCalculating &&
                      item.form.product && (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>{t("common.incomplete")}</span>
                        </div>
                      )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateStockItem(item.id)}
                      title={t("common.duplicate")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {stockItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStockItem(item.id)}
                        title={t("common.delete")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Item Content */}
                {item.isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Product Selection Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Product */}
                      <div className="space-y-2">
                        <Label htmlFor={`product-${item.id}`}>
                          {t("common.product")} *
                        </Label>
                        <Select
                          value={item.form.product?.toString()}
                          onValueChange={(value) =>
                            handleProductChange(item.id, value)
                          }
                          onOpenChange={(open) => {
                            if (!open) setProductSearchTerm("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("common.product")} />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2 sticky top-0 bg-white">
                              <Input
                                placeholder="Search product"
                                value={productSearchTerm}
                                onChange={(e) =>
                                  setProductSearchTerm(e.target.value)
                                }
                                onKeyDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                            {(() => {
                              const options = [...allProducts];
                              const sel = item.selectedProduct as any;
                              if (
                                sel &&
                                !options.some((p: any) => p.id === sel.id)
                              ) {
                                options.unshift(sel);
                              }
                              return options.map((product: any) => (
                                <SelectItem
                                  key={product.id}
                                  value={String(product.id)}
                                >
                                  {product.product_name}
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Currency */}
                      <div className="space-y-2">
                        <Label htmlFor={`currency-${item.id}`}>
                          {t("common.currency")} *
                        </Label>
                        <Select
                          value={item.form.currency?.toString()}
                          onValueChange={(value) =>
                            updateStockItemField(item.id, "currency", value)
                          }
                          disabled={currenciesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("common.select_currency")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem
                                key={currency.id}
                                value={String(currency.id)}
                              >
                                {currency.name} ({currency.short_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Purchase Unit */}
                      <div className="space-y-2">
                        <Label htmlFor={`purchase_unit-${item.id}`}>
                          {t("common.purchase_unit")} *
                        </Label>
                        {item.stockId && stocksData ? (
                          /* For existing stocks, show the purchase unit from stock data */
                          <div className="px-3 py-2 border rounded-md bg-gray-100">
                            {(() => {
                              const stocks = Array.isArray(stocksData)
                                ? stocksData
                                : stocksData?.results || [];
                              const stock = stocks.find(
                                (s) => s.id === item.stockId,
                              );
                              return (
                                stock?.purchase_unit?.short_name ||
                                t("common.purchase_unit")
                              );
                            })()}
                          </div>
                        ) : (
                          <Select
                            value={item.form.purchase_unit?.toString()}
                            onValueChange={(value) => {
                              updateStockItemField(
                                item.id,
                                "purchase_unit",
                                value,
                              );
                            }}
                            disabled={
                              measurementsLoading || !item.selectedProduct
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("common.select_purchase_unit")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {item.selectedProduct?.available_units?.map(
                                (unit: any) => (
                                  <SelectItem
                                    key={unit.id}
                                    value={String(unit.id)}
                                  >
                                    {unit.short_name}
                                    {unit.is_base ? " (base)" : ""}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Stock Name Field - Show only for category Лист (id: 3) */}
                    {item.selectedProduct?.category_read?.id === 3 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`stock_name-${item.id}`}>
                            Партия
                          </Label>
                          <Input
                            id={`stock_name-${item.id}`}
                            type="text"
                            value={item.form.stock_name || ""}
                            onChange={(e) => {
                              updateStockItemField(
                                item.id,
                                "stock_name",
                                e.target.value,
                              );
                            }}
                            placeholder="Партия"
                          />
                        </div>

                        {/* Calculation Button for Лист category */}
                        <div className="space-y-2">
                          <Label>калькулятор</Label>
                          <Button
                            type="button"
                            onClick={() => openCalculationModal(item.id)}
                            disabled={!item.form.purchase_unit}
                            variant="outline"
                            className="w-full"
                          >
                            калькулятор
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Fields */}
                    {item.isCalculated ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
                        {item.dynamicFieldsOrder
                          .filter(
                            (fieldName: string) =>
                              item.dynamicFields[fieldName] &&
                              item.dynamicFields[fieldName].show,
                          )
                          .map((fieldName: string) => {
                            const fieldData = item.dynamicFields[fieldName];
                            // For exchange_rate field, display the rate value from metadata
                            const displayValue = fieldName === 'exchange_rate' && item.calculationMetadata
                              ? item.calculationMetadata.exchange_rate.toString()
                              : (item.form[fieldName as keyof StockItemFormValues] || "");
                            
                            return (
                              <div key={fieldName} className="space-y-2">
                                <Label htmlFor={`${fieldName}-${item.id}`}>
                                  {fieldData.label}
                                </Label>
                                <Input
                                  id={`${fieldName}-${item.id}`}
                                  type="number"
                                  step="0.01"
                                  value={displayValue}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    console.log(
                                      `Field ${fieldName} changed to ${value}, editable: ${fieldData.editable}`,
                                    );
                                    updateStockItemField(
                                      item.id,
                                      fieldName as keyof StockItemFormValues,
                                      value,
                                    );
                                    if (fieldData.editable) {
                                      console.log(
                                        `Calling calculateItemFields for ${fieldName}`,
                                      );
                                      calculateItemFields(
                                        item.id,
                                        fieldName,
                                        value,
                                      );
                                    } else {
                                      console.log(
                                        `Field ${fieldName} is not editable, skipping calculation`,
                                      );
                                    }
                                  }}
                                  readOnly={!fieldData.editable}
                                  className={
                                    !fieldData.editable
                                      ? "bg-gray-100 cursor-not-allowed"
                                      : ""
                                  }
                                />
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
                        <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                          {t("common.please_select_required_fields")}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="mt-6 flex justify-end gap-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/suppliers/${supplierId}`)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (() => {
                  // Disable if using supplier balance and insufficient balance
                  if (
                    commonForm.watch("use_supplier_balance") &&
                    commonForm.watch("supplier")
                  ) {
                    const selectedSupplier = suppliers.find(
                      (s: Supplier) =>
                        s.id === Number(commonForm.watch("supplier")),
                    );
                    if (selectedSupplier) {
                      const totalAmount = stockItems.reduce((sum, item) => {
                        if (item.isCalculated) {
                          return (
                            sum + (Number(item.form.total_price_in_uz) || 0)
                          );
                        }
                        return sum;
                      }, 0);
                      const balance = Number(selectedSupplier.balance) || 0;
                      return balance < totalAmount;
                    }
                  }
                  return false;
                })()
              }
            >
              {isSubmitting ? t("common.submitting") : t("common.update")}
            </Button>
          </div>
        </div>
      </div>

      {/* Restore Draft Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogTitle>{t("common.restore_draft")}</DialogTitle>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("common.saved_draft_found")}{" "}
              {draftTimestamp
                ? new Date(draftTimestamp).toLocaleString()
                : t("common.earlier")}{" "}
              {t("common.was_found_restore")}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={startFresh}>
                {t("common.start_fresh")}
              </Button>
              <Button type="button" onClick={restoreDraft}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("common.restore_draft_button")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
        <DialogContent>
          <DialogTitle>{t("common.create_new_product")}</DialogTitle>
          <form
            onSubmit={productForm.handleSubmit(handleCreateProductSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="product_name">{t("common.product_name")}</Label>
              <Input
                id="product_name"
                {...productForm.register("product_name", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_write">{t("common.category")}</Label>
              <Select
                value={productForm.watch("category_write")?.toString()}
                onValueChange={(value) =>
                  productForm.setValue("category_write", parseInt(value))
                }
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select_category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={String(category.id)}
                      value={String(category.id || "")}
                    >
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_write">{t("common.store")}</Label>
              <Select
                value={productForm.watch("store_write")?.toString()}
                onValueChange={(value) =>
                  productForm.setValue("store_write", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select_store")} />
                </SelectTrigger>
                <SelectContent>
                  {stores
                    .filter((store) => !store.is_main)
                    .map((store) => (
                      <SelectItem
                        key={store.id?.toString() || ""}
                        value={(store.id || 0).toString()}
                      >
                        {store.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createProduct.isPending}>
              {t("common.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Supplier Dialog */}
      <Dialog open={createSupplierOpen} onOpenChange={setCreateSupplierOpen}>
        <DialogContent>
          <DialogTitle>{t("common.create_new_supplier")}</DialogTitle>
          <form
            onSubmit={supplierForm.handleSubmit(handleCreateSupplierSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">{t("common.supplier_name")}</Label>
              <Input
                id="name"
                {...supplierForm.register("name", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">{t("common.phone_number")}</Label>
              <Input
                id="phone_number"
                {...supplierForm.register("phone_number", { required: true })}
              />
            </div>
            <Button type="submit" disabled={createSupplier.isPending}>
              {t("common.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quantity Calculation Modal */}
      <Dialog
        open={calculationModalOpen}
        onOpenChange={setCalculationModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{t("common.calculate_quantity")}</DialogTitle>
          <div className="space-y-4">
            {activeCalculationItemId &&
              (() => {
                const item = stockItems.find(
                  (i) => i.id === activeCalculationItemId,
                );
                if (!item) return null;

                const selectedUnit =
                  item.selectedProduct?.available_units?.find(
                    (u: any) => u.id === Number(item.form.purchase_unit),
                  );
                const conversionNumber = getConversionNumber(
                  item.selectedProduct,
                  Number(item.form.purchase_unit),
                );

                return (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("common.product_label")}
                          </span>
                          <span className="font-medium">
                            {item.selectedProduct?.product_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("common.purchase_unit_label")}
                          </span>
                          <span className="font-medium">
                            {selectedUnit?.short_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {t("common.conversion_number")}
                          </span>
                          <span className="font-bold text-blue-600">
                            {conversionNumber
                              ? Number(conversionNumber).toFixed(2)
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="calculation_input">
                        {t("common.enter_value")}
                      </Label>
                      <Input
                        id="calculation_input"
                        type="number"
                        step="0.01"
                        value={item.form.calculation_input || ""}
                        onChange={(e) => {
                          updateStockItemField(
                            item.id,
                            "calculation_input",
                            e.target.value,
                          );
                        }}
                        placeholder={t("common.enter_number")}
                        autoFocus
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            item.form.calculation_input
                          ) {
                            handleCalculateQuantity();
                          }
                        }}
                      />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <p className="text-sm text-amber-800">
                        <strong>{t("common.formula")}</strong>{" "}
                        {item.form.calculation_input || t("common.input")} ÷{" "}
                        {conversionNumber
                          ? Number(conversionNumber).toFixed(2)
                          : "N/A"}
                        {item.form.calculation_input && conversionNumber && (
                          <span className="block mt-1 font-bold text-amber-900">
                            ={" "}
                            {(
                              Number(item.form.calculation_input) /
                              Number(conversionNumber)
                            ).toFixed(4)}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCalculationModalOpen(false);
                          setActiveCalculationItemId(null);
                        }}
                        className="flex-1"
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCalculateQuantity}
                        disabled={!item.form.calculation_input}
                        className="flex-1"
                      >
                        {t("common.calculate")}
                      </Button>
                    </div>
                  </>
                );
              })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
