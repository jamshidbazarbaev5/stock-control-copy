import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Recycling } from "../api/recycling";
import { useCreateRecycling } from "../api/recycling";
import { useGetProducts } from "../api/product";
import { fetchAllStocks } from "../api/fetchAllStocks";
import { useGetStores } from "../api/store";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useGetMeasurements } from "../api/measurement";

interface FormValues extends Partial<Recycling> {
  outputs?: Array<{
    to_product?: number;
    get_amount?: string;
  }>;
}

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

// Helper function to get allowed categories from attribute_values
const getAllowedCategories = (
  product: any,
): Array<{ id: number; name: string }> | null => {
  if (!product?.attribute_values || !Array.isArray(product.attribute_values)) {
    return null;
  }

  const canBeRecycledToAttr = product.attribute_values.find(
    (attr: any) => attr.attribute?.name === "can_be_recycled_to",
  );

  if (canBeRecycledToAttr && canBeRecycledToAttr.attribute?.related_objects) {
    // Get the allowed category IDs
    const allowedIds = Array.isArray(canBeRecycledToAttr.value)
      ? canBeRecycledToAttr.value
      : [];

    // Get the related_objects array which contains {id, name}
    const relatedObjects = canBeRecycledToAttr.attribute.related_objects;

    // Filter to only include categories that are in the allowedIds
    return relatedObjects.filter((obj: any) => allowedIds.includes(obj.id));
  }

  return null;
};

const recyclingFields = (t: any) => [
  // --- Product Selection ---
  {
    name: "from_to",
    label: t("table.from_product"),
    type: "select",
    placeholder: t("placeholders.select_product"),
    required: true,
    options: [], // Will be populated with stocks
  },
  // --- Store Selection ---
  {
    name: "store",
    label: t("table.store"),
    type: "select",
    placeholder: t("placeholders.select_store"),
    required: true,
    options: [], // Will be populated with stores
  },
  // --- Amounts ---
  {
    name: "spent_amount",
    label: t("table.spent_amount"),
    type: "string",
    placeholder: t("placeholders.enter_quantity"),
    required: true,
  },
  // --- Date ---
  {
    name: "date_of_recycle",
    label: t("table.date"),
    type: "date",
    placeholder: t("placeholders.select_date"),
    required: true,
  },
];

export default function CreateRecycling() {
  const navigate = useNavigate();
  const location = useLocation();
  const createRecycling = useCreateRecycling();
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const [allowedCategories, setAllowedCategories] = useState<Array<{
    id: number;
    name: string;
  }> | null>(null);
  const [productPage] = useState(1);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [outputs, setOutputs] = useState<
    Array<{ to_product?: number; get_amount?: string }>
  >([{ to_product: undefined, get_amount: "" }]);
  const [productSearchTerms, setProductSearchTerms] = useState<string[]>([""]);
  // Track which output select is currently open for server-side searching per-select
  const [activeOutputIndex, setActiveOutputIndex] = useState<number | null>(null);
  // Keep labels for selected products so they don't "disappear" when the list is refetched
  const [selectedProductLabels, setSelectedProductLabels] = useState<Record<number, string>>({});
  // Track last from_to to avoid clearing outputs on redundant setValue calls
  const prevFromToRef = useRef<number | undefined>(undefined);
  // Ensure initial URL-based prefill runs only once after stocks load
  const initFromUrlRef = useRef<boolean>(false);

  // Get URL parameters
  const searchParams = new URLSearchParams(location.search);
  const fromProductId = searchParams.get("fromProductId");
  const fromStockId = searchParams.get("fromStockId");
  const storeIdFromUrl = searchParams.get("storeId");

  // Initialize form with default values
  const form = useForm<FormValues>({
    defaultValues: {
      from_to: fromStockId ? Number(fromStockId) : undefined,
      date_of_recycle: new Date().toISOString().split("T")[0], // Today's date
      store: storeIdFromUrl
        ? Number(storeIdFromUrl)
        : currentUser?.role === "Администратор"
          ? currentUser.store_read?.id
          : undefined,
      outputs: [{ to_product: undefined, get_amount: "" }],
    },
    mode: "onChange",
  });

  const { data: storesData } = useGetStores();
  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];

  // Fetch products with pagination and category + server-side name filtering
  const { data: productsData, isLoading: isLoadingProducts } = useGetProducts({
    params: {
      page: productPage,
      // Use the active select's search term to query the backend
      ...(activeOutputIndex !== null && productSearchTerms[activeOutputIndex]
        ? { product_name: productSearchTerms[activeOutputIndex] }
        : {}),
      // Add category filtering when allowedCategories is available
      ...(allowedCategories && allowedCategories.length > 0
        ? {
            category: allowedCategories.map((cat) => cat.id),
          }
        : {}),
    },
    // Custom params serializer to handle multiple category parameters correctly
    paramsSerializer: (params) => {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // For arrays, add multiple parameters with the same key
          value.forEach((item) => {
            searchParams.append(key, item.toString());
          });
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      return searchParams.toString();
    },
  });

  // Get products array from API response
  const allProducts = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];

  // Measurements for unit placeholders
  const { data: measurementsData } = useGetMeasurements({});
  const measurements = Array.isArray(measurementsData)
    ? measurementsData
    : measurementsData?.results || [];

  // Effect to ensure store is set and locked for admin or if storeIdFromUrl is present
  useEffect(() => {
    if (storeIdFromUrl) {
      form.setValue("store", Number(storeIdFromUrl));
    } else if (
      currentUser?.role === "Администратор" &&
      currentUser?.store_read?.id
    ) {
      form.setValue("store", currentUser.store_read.id);
    }
  }, [currentUser, form, storeIdFromUrl]);

  // Fetch specific stock if ID provided, otherwise fetch all stocks on mount
  useEffect(() => {
    setLoadingStocks(true);
    const stockId = fromStockId ? Number(fromStockId) : undefined;
    fetchAllStocks(stockId)
      .then(setStocks)
      .catch((err) => {
        console.error("Error fetching stocks:", err);
        toast.error(t("messages.error.load", { item: t("navigation.stocks") }));
      })
      .finally(() => setLoadingStocks(false));
  }, [t, fromStockId]);

  // Watch for changes in the from_to field to update allowed categories
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "from_to" && value.from_to) {
        const newFromTo = Number(value.from_to);
        if (prevFromToRef.current === newFromTo) return; // no real change
        prevFromToRef.current = newFromTo;

        const selectedStock = stocks.find((stock) => stock.id === newFromTo);

        // Check both product and product_read for attribute_values
        const product = selectedStock?.product || selectedStock?.product_read;

        if (isProductRecyclable(product)) {
          const categories = getAllowedCategories(product);
          setAllowedCategories(categories);
          // Clear all output selections only when from_to truly changes
          setOutputs([{ to_product: undefined, get_amount: "" }]);
          form.setValue("outputs", [{ to_product: undefined, get_amount: "" }]);
        } else {
          setAllowedCategories(null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, stocks]);

  // Set initial values based on URL parameters (run once after stocks load)
  useEffect(() => {
    if (initFromUrlRef.current) return;
    if (stocks.length === 0) return;

    if (fromStockId) {
      const idNum = Number(fromStockId);
      form.setValue("from_to", idNum);
      prevFromToRef.current = idNum;

      const stockItem = stocks.find((stock) => stock.id === idNum);
      const product = stockItem?.product || stockItem?.product_read;
      if (isProductRecyclable(product)) {
        const categories = getAllowedCategories(product);
        setAllowedCategories(categories);
      }
      initFromUrlRef.current = true;
      return;
    }

    if (fromProductId) {
      const idNum = Number(fromProductId);
      const stockWithProduct = stocks.find(
        (stock) =>
          (stock.product?.id === idNum || stock.product_read?.id === idNum) &&
          stock.quantity > 0,
      );

      if (stockWithProduct) {
        form.setValue("from_to", stockWithProduct.id);
        prevFromToRef.current = stockWithProduct.id;
        const product = stockWithProduct?.product || stockWithProduct?.product_read;
        if (isProductRecyclable(product)) {
          const categories = getAllowedCategories(product);
          setAllowedCategories(categories);
        }
      }
      initFromUrlRef.current = true;
    }
  }, [stocks, fromStockId, fromProductId]);

  const selectedStore = form.watch("store");

  // Determine base unit placeholder for spent_amount
  const selectedFromTo = form.watch("from_to");
  const selectedStock = stocks.find((s) => s.id === Number(selectedFromTo));
  const selectedProduct = selectedStock?.product || selectedStock?.product_read;
  const baseUnitId: number | undefined = selectedProduct?.base_unit;
  const baseMeasurement = baseUnitId
    ? measurements.find((m: any) => m.id === baseUnitId)
    : undefined;
  const unitPlaceholder = baseMeasurement?.measurement_name
    ? `${t("placeholders.enter_quantity")}: ${baseMeasurement.measurement_name.toLowerCase()}`
    : t("placeholders.enter_quantity");

  // Update fields with dynamic options
  const fields = recyclingFields(t)
    .map((field) => {
      if (field.name === "from_to") {
        return {
          ...field,
          options: stocks
            .filter((stock: any) => {
              // First filter: Only show recyclable products
              const product = stock.product || stock.product_read;
              if (!isProductRecyclable(product)) return false;

              // Second filter: Allow stocks from selected store or from main store
              if (!selectedStore) return true;
              const storeId = stock.store?.id || stock.store_read?.id;
              const isMain = stock.store?.is_main || stock.store_read?.is_main;
              return storeId === Number(selectedStore) || isMain;
            })
            .map((stock: any) => {
              const productName =
                stock.product?.product_name ||
                stock.product_read?.product_name ||
                "Unknown";
              const storeName =
                stock.store?.name || stock.store_read?.name || "Unknown";
              return {
                value: stock.id,
                label: `${productName} (${stock.quantity || 0}) [${storeName}]`,
              };
            })
            .filter((opt: any) => opt.value),
          isLoading: loadingStocks,
          disabled: true,
        };
      }
      if (field.name === "store") {
        const isAdmin = currentUser?.role === "Администратор";
        const isStoreIdLocked = Boolean(storeIdFromUrl);
        return {
          ...field,
          options: stores
            .map((store: any) => ({
              value: store.id,
              label: store.name,
            }))
            .filter((opt: any) =>
              isStoreIdLocked
                ? opt.value === Number(storeIdFromUrl)
                : isAdmin
                  ? opt.value === currentUser?.store_read?.id
                  : opt.value,
            ),
          disabled: isAdmin || isStoreIdLocked,
        };
      }

      // Inject dynamic placeholder for spent_amount based on product base unit
      if (field.name === "spent_amount") {
        return {
          ...field,
          placeholder: unitPlaceholder as any,
        };
      }

      return field;
    })
    // Hide store field
    .filter((field) => {
      if (["store"].includes(field.name)) {
        return false;
      }
      return true;
    });

  // Get product options for outputs (server-side filtered, but keep selected items visible)
  const getProductOptions = () => {
    const optionsFromApi = allProducts
      .map((product: any) => {
        // Find the category name from allowedCategories
        const categoryInfo = allowedCategories?.find(
          (cat) => cat.id === product.category_read?.id,
        );
        const categoryName =
          categoryInfo?.name || product.category_read?.category_name || "";

        return {
          value: product.id,
          label: categoryName
            ? `${categoryName} - ${product.product_name}`
            : product.product_name,
          categoryName: categoryName,
        };
      })
      .filter((opt: any) => opt.value);

    // Ensure already-selected products remain in the list even if not in the current API page/search
    const selectedIds = outputs
      .map((o) => o.to_product)
      .filter((id): id is number => Boolean(id));

    const existingIds = new Set(optionsFromApi.map((o: any) => o.value));
    const missingSelectedOptions = selectedIds
      .filter((id) => !existingIds.has(id))
      .map((id) => ({
        value: id,
        label: selectedProductLabels[id] || `#${id}`,
        categoryName: "",
      }));

    const merged = [...optionsFromApi, ...missingSelectedOptions];

    return merged.sort((a: any, b: any) => {
      // Sort by category name first (empty category names go last), then by product name
      if (a.categoryName !== b.categoryName) {
        if (!a.categoryName) return 1;
        if (!b.categoryName) return -1;
        return a.categoryName.localeCompare(b.categoryName, "ru");
      }
      return a.label.localeCompare(b.label, "ru");
    });
  };

  // Add new output handler
  const handleAddOutput = () => {
    const newOutputs = [...outputs, { to_product: undefined, get_amount: "" }];
    setOutputs(newOutputs);
    setProductSearchTerms([...productSearchTerms, ""]);
    form.setValue("outputs", newOutputs);
  };

  // Remove output handler
  const handleRemoveOutput = (index: number) => {
    if (outputs.length > 1) {
      const newOutputs = outputs.filter((_, i) => i !== index);
      const newSearchTerms = productSearchTerms.filter((_, i) => i !== index);
      setOutputs(newOutputs);
      setProductSearchTerms(newSearchTerms);
      form.setValue("outputs", newOutputs);
    }
  };

  // Update output value
  const handleOutputChange = (
    index: number,
    field: "to_product" | "get_amount",
    value: any,
  ) => {
    const newOutputs = [...outputs];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    setOutputs(newOutputs);

    // If a product was selected, cache its label so it remains visible across searches
    if (field === "to_product") {
      const selectedId = Number(value);
      const product = allProducts.find((p: any) => p.id === selectedId);
      if (product) {
        const categoryInfo = allowedCategories?.find(
          (cat) => cat.id === product.category_read?.id,
        );
        const categoryName =
          categoryInfo?.name || product.category_read?.category_name || "";
        const label = categoryName
          ? `${categoryName} - ${product.product_name}`
          : product.product_name;
        setSelectedProductLabels((prev) => ({ ...prev, [selectedId]: label }));
      }
    }

    form.setValue("outputs", newOutputs);
  };

  const handleSubmit = async (data: FormValues) => {
    try {
      // Validate that at least one output exists
      if (!outputs || outputs.length === 0) {
        toast.error(
          t("messages.error.at_least_one_output") ||
            "At least one output is required",
        );
        return;
      }

      // Validate all outputs have required fields
      for (const output of outputs) {
        if (!output.to_product || !output.get_amount) {
          toast.error(
            t("messages.error.complete_all_outputs") ||
              "Please complete all output fields",
          );
          return;
        }
      }

      const formattedData: any = {
        from_to: Number(data.from_to),
        store: Number(data.store),
        spent_amount: String(data.spent_amount || ""),
        outputs: outputs.map((output) => ({
          to_product: Number(output.to_product),
          get_amount: String(output.get_amount),
        })),
        date_of_recycle: data.date_of_recycle || "",
      };

      await createRecycling.mutateAsync(formattedData);
      toast.success(
        t("messages.success.created", { item: t("navigation.recyclings") }),
      );
      navigate("/recyclings");
    } catch (error) {
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {t("common.create")} {t("navigation.recyclings")}
        </h1>

        {/* Main Form Fields */}
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4 mb-6">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && "*"}
              </label>
              {field.type === "select" ? (
                <Select
                  onValueChange={(value) =>
                    form.setValue(field.name as any, Number(value))
                  }
                  value={form.watch(field.name as any)?.toString() || ""}
                  disabled={(field as any).disabled || (field as any).isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option: any) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "date" ? (
                <input
                  type="date"
                  {...form.register(field.name as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  type={field.type}
                  {...form.register(field.name as any)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>

        {/* Outputs Section */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {t("table.outputs") || "Outputs"}
            </h2>
            <button
              type="button"
              onClick={handleAddOutput}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + {t("common.add") || "Add"}
            </button>
          </div>

          <div className="space-y-4">
            {outputs.map((output, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("table.to_product")} *
                      </label>
                      <Select
                        onValueChange={(value) =>
                          handleOutputChange(index, "to_product", Number(value))
                        }
                        value={output.to_product?.toString() || ""}
                        disabled={isLoadingProducts}
                        onOpenChange={(open) => setActiveOutputIndex(open ? index : null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t("placeholders.select_product")}
                          />
                        </SelectTrigger>
                        <SelectContent
                          className="max-h-[400px]"
                          position="popper"
                          sideOffset={5}
                          onPointerDownOutside={(e) => {
                            const target = e.target as Node;
                            const selectContent = document.querySelector(
                              ".select-content-wrapper",
                            );
                            if (
                              selectContent &&
                              selectContent.contains(target)
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <div className="p-2 sticky top-0 bg-white z-10 border-b select-content-wrapper">
                            <Input
                              type="text"
                              placeholder={`Search ${t("table.to_product").toLowerCase()}...`}
                              value={productSearchTerms[index] || ""}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSearchTerms = [...productSearchTerms];
                                newSearchTerms[index] = e.target.value;
                                setProductSearchTerms(newSearchTerms);
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="flex-1"
                              autoFocus
                            />
                          </div>
                          {getProductOptions().map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value.toString()}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Get Amount Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("table.get_amount")} *
                      </label>
                      <input
                        type="text"
                        value={output.get_amount || ""}
                        onChange={(e) =>
                          handleOutputChange(
                            index,
                            "get_amount",
                            e.target.value,
                          )
                        }
                        placeholder={t("placeholders.enter_quantity")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  {outputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOutput(index)}
                      className="mt-6 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      title={t("common.remove") || "Remove"}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => form.handleSubmit(handleSubmit)()}
            disabled={createRecycling.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {createRecycling.isPending
              ? t("common.submitting") || "Submitting..."
              : t("common.submit") || "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
