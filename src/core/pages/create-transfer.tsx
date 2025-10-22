import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGetStocks, useGetStock, type Stock } from "../api/stock";
import { useGetStores, type Store } from "../api/store";
import { useCreateTransfer, type Transfer } from "../api/transfer";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

export default function CreateTransfer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [sourceStore, setSourceStore] = useState<number | null>(null);
  const { data: currentUser } = useCurrentUser();
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Get URL parameters
  const searchParams = new URLSearchParams(location.search);
  const fromProductId = searchParams.get("fromProductId");
  const fromStockId = searchParams.get("fromStockId");

  const form = useForm<Transfer>({
    defaultValues: {
      from_stock: fromStockId ? Number(fromStockId) : undefined,
      to_store: undefined,
      amount: "",
      comment: "",
    },
  });

  const createTransfer = useCreateTransfer();

  // Watch the form values to react to changes
  const fromStock = form.watch("from_stock");
  const toStore = form.watch("to_store");

  const { data: stocksData, isLoading: stocksLoading } = useGetStocks();
  const { data: storesData, isLoading: storesLoading } = useGetStores();
  const { data: stockById } = useGetStock(
    fromStockId ? Number(fromStockId) : 0,
  );

  const stocks = Array.isArray(stocksData) ? stocksData : stocksData?.results;
  const stores = Array.isArray(storesData) ? storesData : storesData?.results;

  // Merge stockById into stocks if not present
  const mergedStocks = (() => {
    if (stockById && !stocks?.some((s: Stock) => s.id === stockById.id)) {
      return [...(stocks || []), stockById];
    }
    return stocks;
  })();

  // Filter stocks based on selected source store and positive quantity
  const sourceStocks = mergedStocks?.filter(
    (stock) =>
      (stock.store?.id || stock.store_read?.id) === sourceStore &&
      stock.quantity > 0,
  );

  // Set administrator's store as source store
  useEffect(() => {
    if (currentUser?.role === "Администратор" && currentUser?.store_read?.id) {
      setSourceStore(currentUser?.store_read?.id);
    }
  }, [currentUser]);

  // If we have a fromStockId from the URL, set the sourceStore and handle product selection
  useEffect(() => {
    console.log("DEBUG useEffect 1:", {
      stocksLoading,
      storesLoading,
      stocks,
      stores,
      currentUser,
      fromStockId,
      fromProductId,
      stockById,
    });

    // Only proceed if data is loaded and we have stocks data
    if (!stocksLoading && !storesLoading) {
      let selectedStock: Stock | undefined = undefined;
      if (fromStockId) {
        selectedStock =
          stocks?.find((stock: Stock) => stock.id === Number(fromStockId)) ||
          (stockById && stockById.id === Number(fromStockId)
            ? stockById
            : undefined);
        const selectedStockStoreId =
          selectedStock?.store?.id || selectedStock?.store_read?.id;
        if (selectedStockStoreId) {
          if (
            currentUser?.role !== "Администратор" &&
            sourceStore !== selectedStockStoreId
          ) {
            setSourceStore(selectedStockStoreId);
          }
          if (form.getValues("from_stock") !== Number(fromStockId)) {
            form.setValue("from_stock", Number(fromStockId));
          }
        }
      }
      // If we have a product ID but no specific stock, try to find a stock with that product
      else if (fromProductId) {
        const stockWithProduct = mergedStocks?.find(
          (stock: Stock) =>
            (stock.product?.id || stock.product_read?.id) ===
              Number(fromProductId) &&
            stock.quantity != null &&
            Number(stock.quantity) > 0 &&
            (currentUser?.role === "Администратор"
              ? (stock.store?.id || stock.store_read?.id) ===
                currentUser?.store_read?.id
              : true),
        );
        if (stockWithProduct) {
          // Set the from_stock in the form
          form.setValue("from_stock", stockWithProduct.id);

          const stockWithProductStoreId =
            stockWithProduct.store?.id || stockWithProduct.store_read?.id;
          if (
            stockWithProductStoreId &&
            currentUser?.role !== "Администратор"
          ) {
            // Set the source store only if user is not an administrator
            setSourceStore(stockWithProductStoreId);
          }
        }
      }
    }
  }, [
    fromStockId,
    fromProductId,
    stocks,
    form,
    stocksLoading,
    storesLoading,
    currentUser,
    stockById,
    sourceStore,
    mergedStocks,
    stores,
  ]);

  // Update source store when from_stock changes - only for non-administrators
  useEffect(() => {
    console.log("DEBUG useEffect 2:", {
      stocksLoading,
      fromStock,
      stocks,
      currentUser,
    });

    if (
      !stocksLoading &&
      fromStock &&
      mergedStocks?.length &&
      currentUser?.role !== "Администратор"
    ) {
      const selectedStock = mergedStocks.find(
        (stock: Stock) => stock.id === fromStock,
      );
      const selectedStockStoreId =
        selectedStock?.store?.id || selectedStock?.store_read?.id;
      if (selectedStockStoreId) {
        setSourceStore(selectedStockStoreId);
      }
    }
  }, [fromStock, mergedStocks, stocksLoading, currentUser, stocks]);

  const onSubmit = async (data: Transfer) => {
    try {
      // Remove spaces and replace comma with dot in amount (e.g., "1 344,24" -> "1344.24")
      let cleanedAmount =
        typeof data.amount === "string"
          ? data.amount.replace(/\s/g, "")
          : data.amount;
      if (typeof cleanedAmount === "string") {
        cleanedAmount = cleanedAmount.replace(",", ".");
      }
      const submitData = { ...data, amount: cleanedAmount };

      const sourceStock = mergedStocks?.find(
        (stock: Stock) => stock.id === Number(data.from_stock),
      );
      const destStore = stores?.find(
        (store: Store) => store.id === Number(data.to_store),
      );
      const sourceStoreId =
        sourceStock?.store?.id || sourceStock?.store_read?.id;
      const destStoreId = destStore?.id;
      if (sourceStoreId && destStoreId && sourceStoreId === destStoreId) {
        toast.error(t("messages.error.same_store_transfer"));
        form.setValue("to_store", null as unknown as number);
        return;
      }
      await createTransfer.mutateAsync(submitData);
      toast.success(
        t("messages.success.created", { item: t("navigation.transfers") }),
      );
      navigate("/transfers");
    } catch (error) {
      toast.error(
        t("messages.error.create", { item: t("navigation.transfers") }),
      );
      console.error("Failed to create transfer:", error);
    }
  };

  const selectedFromStock = mergedStocks?.find(
    (stock: Stock) => stock.id === fromStock,
  );
  const selectedToStore = stores?.find((store: Store) => store.id === toStore);

  // Set amount to selectedFromStock.quantity when selectedFromStock changes
  useEffect(() => {
    if (selectedFromStock && selectedFromStock.quantity !== undefined) {
      // Always set as string with 2 decimals and comma
      form.setValue(
        "amount",
        Number(selectedFromStock.quantity).toLocaleString("ru-RU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
    }
    // Optionally, clear if no stock selected
    if (!selectedFromStock) {
      form.setValue("amount", "");
    }
  }, [selectedFromStock, form]);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setProductSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter stocks based on search term
  const filteredSourceStocks = sourceStocks?.filter((stock: Stock) => {
    const productName = stock.product?.product_name || stock.product_read?.product_name || "";
    return productName.toLowerCase().includes(productSearchTerm.toLowerCase());
  });

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">
        {t("common.create")} {t("navigation.transfers")}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Source Store Selection - Only shown for non-administrators */}
          {currentUser?.role !== "Администратор" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("forms.from_store")}
              </label>
              <Select
                onValueChange={(value) => {
                  const storeId = Number(value);
                  setSourceStore(storeId);

                  // Check if we have URL parameters and if there's a matching stock in the selected store
                  if ((fromProductId || fromStockId) && mergedStocks?.length) {
                    let matchingStock;

                    if (fromStockId) {
                      // Find the stock and check if it's in the selected store
                      matchingStock = mergedStocks.find(
                        (stock: Stock) =>
                          stock.id === Number(fromStockId) &&
                          (stock.store?.id || stock.store_read?.id) === storeId,
                      );
                    } else if (fromProductId) {
                      // Find a stock with the product in the selected store
                      matchingStock = mergedStocks.find(
                        (stock: Stock) =>
                          (stock.product?.id || stock.product_read?.id) ===
                            Number(fromProductId) &&
                          (stock.store?.id || stock.store_read?.id) ===
                            storeId &&
                          stock.quantity != null &&
                          Number(stock.quantity) > 0,
                      );
                    }

                    if (matchingStock) {
                      // If we found a matching stock in the new store, use it
                      form.setValue("from_stock", matchingStock.id);
                      return; // Don't reset the stock selection if we found a match
                    }
                  }

                  // Reset selections if no match was found
                  form.setValue("from_stock", null as unknown as number); // Reset stock selection
                  form.setValue("to_store", null as unknown as number); // Reset destination store
                }}
                value={sourceStore?.toString()}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("placeholders.select_store")} />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map(
                    (store: Store) =>
                      store.id && (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.name}
                        </SelectItem>
                      ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* For administrators, show their assigned store */}
          {currentUser?.role === "Администратор" && currentUser?.store_read && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("forms.from_store")}
              </label>
              <div className="p-2 border rounded-md bg-gray-50">
                {currentUser?.store_read?.name}
              </div>
            </div>
          )}

          {/* Destination Store Selection */}
          {sourceStore && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("forms.to_store")}
                {selectedToStore && (
                  <span className="ml-2 text-gray-500">
                    Selected: {selectedToStore.name}
                  </span>
                )}
              </label>
              <Select
                onValueChange={(value) =>
                  form.setValue("to_store", Number(value))
                }
                value={toStore?.toString()}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("placeholders.select_store")} />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map((store: Store) => {
                    // Skip if this store is the same as source store
                    if (store.id === sourceStore) return null;

                    return (
                      store.id && (
                        <SelectItem key={store.id} value={store.id.toString()}>
                          {store.name}
                        </SelectItem>
                      )
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Source Stock Selection - Only shown when both stores are selected */}
          {sourceStore && toStore && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("forms.from_product")}
              </label>
              <div className="relative" ref={searchRef}>
                <Input
                  type="text"
                  placeholder={t("placeholders.search_products")}
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full"
                  autoComplete="off"
                />
                {isSearchOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-[300px] overflow-y-auto">
                    {!sourceStocks || sourceStocks.length === 0 ? (
                      <div className="px-4 py-4 text-center text-gray-600 text-sm bg-white">
                        {t("common.no_results")}
                      </div>
                    ) : filteredSourceStocks && filteredSourceStocks.length > 0 ? (
                      filteredSourceStocks.map((stock: Stock) => (
                        <div
                          key={stock.id}
                          className="px-4 py-3 bg-white hover:bg-blue-50 active:bg-blue-100 cursor-pointer border-b border-gray-200 last:border-b-0 transition-all duration-150"
                          onClick={() => {
                            // @ts-ignore
                            form.setValue("from_stock", stock.id);
                            setProductSearchTerm("");
                            setIsSearchOpen(false);
                          }}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              {stock.product?.product_name || stock.product_read?.product_name}
                            </span>
                            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                              {Number(stock.quantity).toLocaleString("ru-RU", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-center text-gray-600 text-sm bg-white">
                        {t("common.no_results")}
                      </div>
                    )}
                  </div>
                )}
                {fromStock && !isSearchOpen && selectedFromStock && (
                  <div className="mt-2 px-3 py-2 bg-blue-50 border border-gray-300 rounded-md text-sm flex justify-between items-center shadow-sm">
                    <span className="font-medium text-gray-900">
                      {selectedFromStock.product?.product_name || selectedFromStock.product_read?.product_name} - {Number(selectedFromStock.quantity).toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                   
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount and Comment fields - Only shown when stock is selected */}
          {fromStock && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("forms.amount")}
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  {...form.register("amount")}
                  className="w-full"
                  defaultValue={
                    selectedFromStock
                      ? Number(selectedFromStock.quantity).toLocaleString(
                          "ru-RU",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )
                      : ""
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t("forms.comment")}
                </label>
                <Textarea
                  {...form.register("comment")}
                  className="w-full"
                  rows={4}
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              createTransfer.isPending ||
              !fromStock ||
              !toStore ||
              !form.watch("amount")
            }
          >
            {createTransfer.isPending
              ? t("common.submitting")
              : t("common.create")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
