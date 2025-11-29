// import { useState, useEffect, useMemo } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { useTranslation } from "react-i18next";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { Button } from "@/components/ui/button";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
// } from "@/components/ui/form";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";
// import { fetchAllStocks } from "../api/fetchAllStocks";
// import { useGetStores } from "../api/store";
// import { useGetClients } from "../api/client";
// import { useGetSale } from "@/core/api/sale";
// import { useGetUsers, type User } from "../api/user";
// import { useCurrentUser } from "../hooks/useCurrentUser";
// import { addDays } from "date-fns";
// import { syncSaleEditApis } from "../helpers/diffSaleForApi";
// import { useGetRecyclings } from "@/core/api/recycling";
// import {
//   findRecyclingForStock,
//   calculateRecyclingProfit,
// } from "@/core/helpers/recyclingProfitUtils";
//
// interface FormSaleItem {
//   stock_write: number;
//   selling_method: "Штук" | "Ед.измерения";
//   quantity: number;
//   subtotal: string;
// }
//
// interface FormSalePayment {
//   payment_method: string;
//   amount: number;
// }
//
// interface SaleFormData {
//   store_write: number;
//   sale_items: FormSaleItem[];
//   on_credit: boolean;
//   total_amount: string;
//   sale_payments: FormSalePayment[];
//   sale_debt?: {
//     client: number;
//     due_date: string;
//     deposit?: number;
//   };
//   sold_by?: number; // Added to fix type error
// }
// interface ExtendedUser extends User {
//   store_read?: {
//     id: number;
//     name: string;
//     address: string;
//     phone_number: string;
//     budget: string;
//     created_at: string;
//     is_main: boolean;
//     parent_store: number | null;
//     color?: string;
//   };
// }
//
// // type SelectedPrice = { min: number; selling: number; purchasePrice: number; profit: number };
//
// export default function EditSale() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const { t } = useTranslation();
//   const { data: currentUser } = useCurrentUser();
//   const { data: usersData } = useGetUsers({});
//
//   // Admin/superuser logic
//   const isAdmin = currentUser?.role === "Администратор";
//   const isSuperUser = currentUser?.is_superuser === true;
//   const users: ExtendedUser[] = Array.isArray(usersData)
//     ? usersData
//     : usersData?.results || [];
//
//   // State for store, stocks, prices, search
//   const [selectedStore, setSelectedStore] = useState<number | null>(
//     currentUser?.store_read?.id || null,
//   );
//   const [selectedStocks, setSelectedStocks] = useState<Record<number, number>>(
//     {},
//   );
//   const [selectedPrices, setSelectedPrices] = useState<
//     Record<
//       number,
//       { min: number; selling: number; purchasePrice: number; profit: number }
//     >
//   >({});
//   const [searchTerm, _setSearchTerm] = useState("");
//   const [productSearchTerm, setProductSearchTerm] = useState("");
//   const [, forceRender] = useState({});
//
//   // Form setup (move above useGetClients)
//   const form = useForm<SaleFormData>({
//     defaultValues: {
//       sale_items: [
//         { stock_write: 0, selling_method: "Штук", quantity: 1, subtotal: "0" },
//       ],
//       sale_payments: [{ payment_method: "Наличные", amount: 0 }],
//       on_credit: false,
//       total_amount: "0",
//       store_write: currentUser?.store_read?.id || 0,
//       sale_debt: {
//         client: 0,
//         due_date: addDays(new Date(), 30).toISOString().split("T")[0],
//       },
//     },
//     mode: "onChange",
//   });
//
//   // Fetch data
//   const { data: storesData } = useGetStores({});
//   const { data: clientsData } = useGetClients({
//     params: form.watch("on_credit") ? { name: searchTerm } : undefined,
//   });
//   const { data: saleData, isLoading: isLoadingSale } = useGetSale(Number(id));
//   // const updateSale = useUpdateSale();
//   const { data: recyclingData } = useGetRecyclings({});
//
//   // Helper to get recycling record for a stock
//   function getRecyclingRecord(productId: number, stockId: number) {
//     if (!recyclingData) return undefined;
//     return findRecyclingForStock(recyclingData.results, productId, stockId);
//   }
//
//   // Prepare data arrays
//   const stores = Array.isArray(storesData)
//     ? storesData
//     : storesData?.results || [];
//   const clients = Array.isArray(clientsData)
//     ? clientsData
//     : clientsData?.results || [];
//   const [allStocks, setAllStocks] = useState<any[]>([]);
//   const [_loadingAllStocks, setLoadingAllStocks] = useState(false);
//   const [originalSale, setOriginalSale] = useState<any | null>(null);
//
//   // Set sold_by for non-admin/non-superuser as in create-sale
//   useEffect(() => {
//     if (!isSuperUser && !isAdmin && currentUser?.id) {
//       form.setValue("sold_by", currentUser.id as any); // as any to avoid TS error, not in SaleFormData
//     }
//   }, [isAdmin, isSuperUser, currentUser?.id]);
//
//   // Fetch all stocks with search
//   useEffect(() => {
//     setLoadingAllStocks(true);
//     fetchAllStocks({
//       product_name:
//         productSearchTerm.length > 0 ? productSearchTerm : undefined,
//     })
//       .then((data) => setAllStocks(data))
//       .finally(() => setLoadingAllStocks(false));
//   }, [productSearchTerm]);
//   const stocks = allStocks;
//
//   // Filter stocks by selected store, but always include stocks referenced in sale items
//   const filteredStocks = useMemo(() => {
//     // Get all stock IDs referenced in the current sale items
//     const selectedStockIds = (form.getValues("sale_items") || [])
//       .map((item) => item.stock_write)
//       .filter(Boolean);
//     // Stocks for the selected store
//     let stocksForStore = stocks.filter(
//       (stock) => stock.store_read?.id === selectedStore,
//     );
//     // Add any missing stocks referenced in sale items
//     selectedStockIds.forEach((stockId) => {
//       if (stockId && !stocksForStore.some((s) => s.id === stockId)) {
//         const found = stocks.find((s) => s.id === stockId);
//         if (found) stocksForStore = [...stocksForStore, found];
//       }
//     });
//     return stocksForStore;
//   }, [stocks, selectedStore, form]);
//
//   // Load sale data for editing
//   useEffect(() => {
//     if (!saleData || stocks.length === 0 || stores.length === 0) return;
//     setOriginalSale(saleData); // Save original for diffing
//     const storeId = saleData.store_read?.id
//       ? Number(saleData.store_read.id)
//       : null;
//     if (storeId) {
//       setSelectedStore(storeId);
//       form.setValue("store_write", storeId);
//     }
//     // Set sold_by from saleData.worker_read if present
//     if (saleData.worker_read?.id) {
//       form.setValue("sold_by", saleData.worker_read.id);
//     }
//     if (saleData.sale_items) {
//       const validItems = saleData.sale_items.filter((item) =>
//         stocks.some((stock) => stock.id === item.stock_read?.id),
//       );
//       const newSelectedStocks: Record<number, number> = {};
//       const newSelectedPrices: Record<
//         number,
//         { min: number; selling: number; purchasePrice: number; profit: number }
//       > = {};
//       validItems.forEach((item, index) => {
//         const stockId = item.stock_read?.id
//           ? Number(item.stock_read.id)
//           : undefined;
//         const stock = stocks.find((s) => s.id === stockId);
//         if (stock) {
//           newSelectedStocks[index] = stock.quantity || 0;
//           const totalPurchasePrice = parseFloat(
//             stock.purchase_price_in_uz || "0",
//           );
//           const stockQuantity =
//             stock.quantity_for_history || stock.quantity || 1;
//           const purchasePricePerUnit = totalPurchasePrice / stockQuantity;
//           const sellingPrice = parseFloat(stock.selling_price || "0");
//           const minPrice = parseFloat(stock.min_price || "0");
//           const quantity = parseFloat(item.quantity);
//           let profit = 0;
//           const recyclingRecord = getRecyclingRecord(
//             stock.product_read.id,
//             stock.id,
//           );
//           if (recyclingRecord) {
//             profit = calculateRecyclingProfit(recyclingRecord, quantity);
//           } else if (stock.product_read?.has_kub) {
//             const measurements = stock.product_read.measurement || [];
//             const getNumber = (name: string) => {
//               const m = measurements.find(
//                 (m: any) => m.measurement_read.measurement_name === name,
//               );
//               return m ? parseFloat(m.number) : 1;
//             };
//             const length = getNumber("длина");
//             const thickness = getNumber("Толщина");
//             const meter = getNumber("Метр");
//             const exchangeRate = parseFloat(
//               stock.exchange_rate_read?.currency_rate || "1",
//             );
//             const purchasePriceInUss = parseFloat(
//               stock.purchase_price_in_us || "0",
//             );
//             const purchasePriceInUs = purchasePriceInUss;
//             const PROFIT_FAKE =
//               length * meter * thickness * exchangeRate * purchasePriceInUs;
//             // @ts-ignore
//             const subtotal = parseFloat(item?.subtotal) || 0;
//             profit = (subtotal - PROFIT_FAKE) * quantity;
//           } else {
//             profit = (sellingPrice - purchasePricePerUnit) * quantity;
//           }
//           newSelectedPrices[index] = {
//             min: minPrice,
//             selling: sellingPrice,
//             purchasePrice: purchasePricePerUnit,
//             profit,
//           };
//         }
//       });
//       setSelectedStocks(newSelectedStocks);
//       setSelectedPrices(newSelectedPrices);
//       // @ts-ignore
//       // @ts-ignore
//       form.setValue(
//         "sale_items",
//         validItems.map((item) => ({
//           stock_write: item.stock_read?.id ? Number(item.stock_read.id) : 0,
//           selling_method: item?.selling_method || "Штук",
//           quantity: parseFloat(item.quantity),
//           subtotal: item?.subtotal || "0",
//         })),
//       );
//     }
//     form.setValue("on_credit", saleData.on_credit);
//     form.setValue("total_amount", saleData.total_amount);
//     if (saleData.sale_payments) {
//       form.setValue(
//         "sale_payments",
//         saleData.sale_payments.map((payment) => ({
//           payment_method: payment.payment_method,
//           amount: parseFloat(payment.amount),
//         })),
//       );
//     }
//     if (saleData.sale_debt) {
//       const clientId = saleData.sale_debt.client
//         ? Number(saleData.sale_debt.client)
//         : 0;
//       form.setValue("sale_debt", {
//         client: clientId,
//         due_date: saleData.sale_debt.due_date,
//         deposit: saleData.sale_debt.deposit
//           ? parseFloat(saleData.sale_debt.deposit)
//           : undefined,
//       });
//     } else if (saleData.client) {
//       const clientId = Number(saleData.client);
//       form.setValue("sale_debt", {
//         client: clientId,
//         due_date: "",
//       });
//     }
//   }, [saleData, stocks, stores, form]);
//
//   // const calculateSubtotal = (quantity: number, price: number) => {
//   //   return (quantity * price).toString();
//   // };
//
//   // Update total_amount to match create-sale logic
//   const updateTotalAmount = () => {
//     const items = form.getValues("sale_items");
//     const total = items.reduce((sum, item) => {
//       const quantity = item.quantity || 0;
//       const subtotal = parseFloat(item.subtotal) || 0;
//       const actualTotal = quantity * subtotal;
//       return sum + actualTotal;
//     }, 0);
//     form.setValue("total_amount", total.toString());
//     // Update payment amount with total
//     const payments = form.getValues("sale_payments");
//     if (payments.length > 0) {
//       form.setValue("sale_payments.0.amount", total);
//     }
//   };
//
//   // --- PROFIT LOGIC FROM CREATE-SALE (with recycling) ---
//   const handleStockSelection = (value: string, index: number) => {
//     const stockId = parseInt(value, 10);
//     const selectedStock = filteredStocks.find((stock) => stock.id === stockId);
//     if (!selectedStock) {
//       console.warn("Selected stock not found:", stockId);
//       return;
//     }
//     if (
//       selectedStock.store_read?.id &&
//       selectedStock.store_read.id !== selectedStore
//     ) {
//       setSelectedStore(selectedStock.store_read.id);
//       form.setValue("store_write", selectedStock.store_read.id);
//       forceRender({});
//     }
//     setSelectedStocks((prev) => ({
//       ...prev,
//       [index]: selectedStock.quantity || 0,
//     }));
//     // PROFIT LOGIC
//     const totalPurchasePrice = parseFloat(
//       selectedStock.purchase_price_in_uz || "0",
//     );
//     const stockQuantity =
//       selectedStock.quantity_for_history || selectedStock.quantity || 1;
//     const purchasePricePerUnit = totalPurchasePrice / stockQuantity;
//     let minPrice = parseFloat(selectedStock.min_price || "0");
//     let sellingPrice = parseFloat(selectedStock.selling_price || "0");
//     let profit = 0;
//     const recyclingRecord = getRecyclingRecord(
//       selectedStock.product_read.id,
//       selectedStock.id,
//     );
//     if (recyclingRecord) {
//       profit = calculateRecyclingProfit(recyclingRecord, 1); // default 1 unit
//     } else if (
//       selectedStock.product_read?.has_kub &&
//       (selectedStock.product_read?.category_read?.category_name === "Кругляк" ||
//         selectedStock.product_read?.category_read?.category_name === "Шифер")
//     ) {
//       const measurements = selectedStock.product_read.measurement || [];
//       const getNumber = (name: string) => {
//         const m = measurements.find(
//           (m: any) => m.measurement_read.measurement_name === name,
//         );
//         return m ? parseFloat(m.number) : 1;
//       };
//       const length = getNumber("длина");
//       const thickness = getNumber("Толщина");
//       const meter = getNumber("Метр");
//       const exchangeRate = parseFloat(
//         selectedStock.exchange_rate_read?.currency_rate || "1",
//       );
//       const purchasePriceInUs = parseFloat(
//         selectedStock.purchase_price_in_us || "0",
//       );
//       const PROFIT_FAKE =
//         length * meter * thickness * exchangeRate * purchasePriceInUs;
//       profit = sellingPrice - PROFIT_FAKE;
//     } else {
//       profit = sellingPrice - purchasePricePerUnit;
//     }
//     setSelectedPrices((prev) => ({
//       ...prev,
//       [index]: {
//         min: minPrice,
//         selling: sellingPrice,
//         purchasePrice: purchasePricePerUnit,
//         profit: profit,
//       },
//     }));
//     form.setValue(`sale_items.${index}.stock_write`, stockId);
//     form.setValue(`sale_items.${index}.subtotal`, sellingPrice.toString());
//     form.setValue(`sale_items.${index}.selling_method`, "Штук" as "Штук");
//     // Set default quantity if not already set
//     if (!form.getValues(`sale_items.${index}.quantity`)) {
//       form.setValue(`sale_items.${index}.quantity`, 1);
//     }
//     updateTotalAmount();
//   };
//
//   const handleQuantityChange = (
//     e: React.ChangeEvent<HTMLInputElement>,
//     index: number,
//   ) => {
//     const value = parseInt(e.target.value, 10);
//     const maxQuantity = selectedStocks[index] || 0;
//     const subtotal =
//       parseFloat(form.getValues(`sale_items.${index}.subtotal`)) || 0;
//     const stockId = form.getValues(`sale_items.${index}.stock_write`);
//     const selectedStock = stocks.find((stock) => stock.id === stockId);
//     if (value > maxQuantity) {
//       toast.error(t("messages.error.insufficient_quantity"));
//       form.setValue(`sale_items.${index}.quantity`, maxQuantity);
//     } else {
//       form.setValue(`sale_items.${index}.quantity`, value);
//       if (selectedPrices[index] && selectedStock) {
//         let profit = 0;
//         const recyclingRecord = getRecyclingRecord(
//           selectedStock.product_read.id,
//           selectedStock.id,
//         );
//         if (recyclingRecord) {
//           const originalSubtotal = selectedPrices[index].selling;
//           const currentSubtotal =
//             parseFloat(form.getValues(`sale_items.${index}.subtotal`)) ||
//             originalSubtotal;
//           const baseProfitPerUnit = calculateRecyclingProfit(
//             recyclingRecord,
//             1,
//           );
//           const priceDifference = currentSubtotal - originalSubtotal;
//           const newProfitPerUnit = baseProfitPerUnit + priceDifference;
//           profit = newProfitPerUnit * value;
//         } else if (
//           selectedStock.product_read?.has_kub &&
//           (selectedStock.product_read?.category_read?.category_name ===
//             "Кругляк" ||
//             selectedStock.product_read?.category_read?.category_name ===
//               "Шифер")
//         ) {
//           const measurements = selectedStock.product_read.measurement || [];
//           const getNumber = (name: string) => {
//             const m = measurements.find(
//               (m: any) => m.measurement_read.measurement_name === name,
//             );
//             return m ? parseFloat(m.number) : 1;
//           };
//           const length = getNumber("длина");
//           const thickness = getNumber("Толщина");
//           const meter = getNumber("Метр");
//           const exchangeRate = parseFloat(
//             selectedStock.exchange_rate_read?.currency_rate || "1",
//           );
//           const purchasePriceInUs = parseFloat(
//             selectedStock.purchase_price_in_us || "0",
//           );
//           const PROFIT_FAKE =
//             length * meter * thickness * exchangeRate * purchasePriceInUs;
//           const sellingPrice = parseFloat(selectedStock.selling_price || "0");
//           profit = (sellingPrice - PROFIT_FAKE) * value;
//         } else {
//           const totalPurchasePrice = parseFloat(
//             selectedStock.purchase_price_in_uz || "0",
//           );
//           const stockQuantity =
//             selectedStock.quantity_for_history || selectedStock.quantity || 1;
//           const purchasePricePerUnit = totalPurchasePrice / stockQuantity;
//           profit = (subtotal - purchasePricePerUnit) * value;
//         }
//         setSelectedPrices((prev) => ({
//           ...prev,
//           [index]: {
//             ...prev[index],
//             profit: profit,
//           },
//         }));
//       }
//     }
//     updateTotalAmount();
//   };
//
//   const handleSubtotalChange = (
//     e: React.ChangeEvent<HTMLInputElement>,
//     index: number,
//   ) => {
//     const newValue = e.target.value.replace(/[^0-9]/g, "");
//     const quantity = form.getValues(`sale_items.${index}.quantity`) || 1;
//     const newSubtotal = parseFloat(newValue) || 0;
//     const stockId = form.getValues(`sale_items.${index}.stock_write`);
//     const selectedStock = stocks.find((stock) => stock.id === stockId);
//     // Calculate profit if we have price information
//     if (selectedPrices[index] && selectedStock) {
//       let profit = 0;
//       const recyclingRecord = getRecyclingRecord(
//         selectedStock.product_read.id,
//         selectedStock.id,
//       );
//       if (recyclingRecord) {
//         const baseProfitPerUnit = calculateRecyclingProfit(recyclingRecord, 1);
//         const originalSubtotal = selectedPrices[index].selling;
//         const priceDifference = newSubtotal - originalSubtotal;
//         const newProfitPerUnit = baseProfitPerUnit + priceDifference;
//         profit = newProfitPerUnit * quantity;
//       } else if (
//         selectedStock.product_read?.has_kub &&
//         (selectedStock.product_read?.category_read?.category_name ===
//           "Кругляк" ||
//           selectedStock.product_read?.category_read?.category_name === "Шифер")
//       ) {
//         const measurements = selectedStock.product_read.measurement || [];
//         const getNumber = (name: string) => {
//           const m = measurements.find(
//             (m: any) => m.measurement_read.measurement_name === name,
//           );
//           return m ? parseFloat(m.number) : 1;
//         };
//         const length = getNumber("длина");
//         const thickness = getNumber("Толщина");
//         const meter = getNumber("Метр");
//         const exchangeRate = parseFloat(
//           selectedStock.exchange_rate_read?.currency_rate || "1",
//         );
//         const purchasePriceInUs = parseFloat(
//           selectedStock.purchase_price_in_us || "0",
//         );
//         const PROFIT_FAKE =
//           length * meter * thickness * exchangeRate * purchasePriceInUs;
//         profit = (newSubtotal - PROFIT_FAKE) * quantity;
//       } else {
//         const { purchasePrice } = selectedPrices[index];
//         profit = (newSubtotal - purchasePrice) * quantity;
//       }
//       setSelectedPrices((prev) => ({
//         ...prev,
//         [index]: {
//           ...prev[index],
//           profit: profit,
//         },
//       }));
//     }
//     form.setValue(`sale_items.${index}.subtotal`, newValue);
//     updateTotalAmount();
//   };
//
//   const handleSubmit = async (data: SaleFormData) => {
//     try {
//       // Debug: log form data and editedSale
//       console.log("FORM DATA:", data);
//       const hasInvalidPrices = data.sale_items.some((item, index) => {
//         if (selectedPrices[index]) {
//           const subtotal = parseFloat(item.subtotal);
//           const minPrice = selectedPrices[index].min;
//           return subtotal < minPrice; // Compare price per unit with minimum price per unit
//         }
//         return false;
//       });
//
//       if (hasInvalidPrices) {
//         toast.error(t("messages.error.invalid_price"));
//         return;
//       }
//       if (!originalSale) throw new Error("Original sale not loaded");
//       // Calculate totalProfit (pure revenue)
//       const saleItems = data.sale_items;
//       const totalPayments = data.sale_payments.reduce(
//         (sum, payment) => sum + (payment.amount || 0),
//         0,
//       );
//       const totalAmount = parseFloat(data.total_amount) || 0;
//       let totalProfit = 0;
//       saleItems.forEach((item, index) => {
//         if (selectedPrices[index]) {
//           const quantity = item.quantity || 1;
//           const subtotal = parseFloat(item.subtotal) || 0;
//           const itemTotal = subtotal * quantity;
//           const stockId = item.stock_write;
//           const selectedStock = stocks.find((stock) => stock.id === stockId);
//           let profitPerUnit = 0;
//           let recyclingProfitUsed = false;
//           if (selectedStock && recyclingData) {
//             const recyclingRecord = getRecyclingRecord(
//               selectedStock.product_read.id,
//               selectedStock.id,
//             );
//             if (recyclingRecord) {
//               const baseProfitPerUnit = calculateRecyclingProfit(
//                 recyclingRecord,
//                 1,
//               );
//               const originalSubtotal = selectedPrices[index].selling;
//               const priceDifference = subtotal - originalSubtotal;
//               profitPerUnit = baseProfitPerUnit + priceDifference;
//               recyclingProfitUsed = true;
//             }
//           }
//           if (!recyclingProfitUsed && selectedStock) {
//             if (
//               selectedStock.product_read?.has_kub &&
//               (selectedStock.product_read?.category_read?.category_name ===
//                 "Кругляк" ||
//                 selectedStock.product_read?.category_read?.category_name ===
//                   "Шифер")
//             ) {
//               const measurements = selectedStock.product_read.measurement || [];
//               const getNumber = (name: string) => {
//                 const m = measurements.find(
//                   (m: any) => m.measurement_read.measurement_name === name,
//                 );
//                 return m ? parseFloat(m.number) : 1;
//               };
//               const length = getNumber("длина");
//               const thickness = getNumber("Толщина");
//               const meter = getNumber("Метр");
//               const exchangeRate = parseFloat(
//                 selectedStock.exchange_rate_read?.currency_rate || "1",
//               );
//               const purchasePriceInUs = parseFloat(
//                 selectedStock.purchase_price_in_us || "0",
//               );
//               const PROFIT_FAKE =
//                 length * meter * thickness * exchangeRate * purchasePriceInUs;
//               profitPerUnit = subtotal - PROFIT_FAKE;
//             } else {
//               const totalPurchasePrice = parseFloat(
//                 selectedStock?.purchase_price_in_uz || "0",
//               );
//               const stockQuantity =
//                 selectedStock?.quantity_for_history ||
//                 selectedStock?.quantity ||
//                 1;
//               const purchasePricePerUnit = totalPurchasePrice / stockQuantity;
//               profitPerUnit = subtotal - purchasePricePerUnit;
//             }
//           }
//           const paidShare =
//             totalAmount > 0
//               ? (itemTotal / totalAmount) * totalPayments
//               : itemTotal;
//           const itemCost = itemTotal - profitPerUnit * quantity;
//           totalProfit += paidShare - itemCost;
//         }
//       });
//       // Prepare editedSale in backend format
//       const editedSale = {
//         ...originalSale,
//         ...data,
//         sold_by: data.sold_by, // Ensure sold_by is present
//         sale_items: data.sale_items.map((item, idx) => ({
//           ...item,
//           id: originalSale.sale_items?.[idx]?.id,
//         })),
//         sale_payments: data.sale_payments.map((payment, idx) => ({
//           ...payment,
//           id: originalSale.sale_payments?.[idx]?.id,
//         })),
//         store_read: stores.find((s) => s.id === data.store_write),
//         total_pure_revenue: totalProfit.toFixed(1),
//       };
//       console.log("EDITED SALE:", editedSale);
//       await syncSaleEditApis({
//         saleId: Number(id),
//         originalSale,
//         editedSale,
//       });
//       toast.success(
//         t("messages.success.updated", { item: t("navigation.sale") }),
//       );
//       navigate("/sales");
//     } catch (error) {
//       console.error("Error updating sale:", error);
//       toast.error(t("messages.error_updating"));
//     }
//   };
//
//   const addSaleItem = () => {
//     const items = form.getValues("sale_items");
//     form.setValue("sale_items", [
//       ...items,
//       {
//         stock_write: 0,
//         selling_method: "Штук",
//         quantity: 1,
//         subtotal: "0",
//       } as FormSaleItem,
//     ]);
//     updateTotalAmount();
//   };
//
//   // Delay setting values again to ensure UI updates correctly
//   useEffect(() => {
//     if (!saleData || stocks.length === 0 || stores.length === 0) return;
//
//     const storeId = saleData.store_read?.id
//       ? Number(saleData.store_read.id)
//       : null;
//
//     setTimeout(() => {
//       if (storeId) {
//         form.setValue("store_write", storeId);
//       }
//
//       // Force re-render select components
//       document.querySelectorAll("select").forEach((select) => {
//         const event = new Event("change", { bubbles: true });
//         select.dispatchEvent(event);
//       });
//     }, 100);
//   }, [saleData, stocks, stores, form, id]);
//
//   if (isLoadingSale) {
//     return (
//       <div className="container mx-auto py-8 px-4">
//         <div className="animate-pulse space-y-4">
//           <div className="h-8 w-1/3 bg-gray-200 rounded"></div>
//           <div className="h-[400px] bg-gray-100 rounded-lg"></div>
//         </div>
//       </div>
//     );
//   }
//
//   return (
//     <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4">
//       <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
//         {t("common.edit")} {t("navigation.sale")}
//       </h1>
//       <Form {...form}>
//         <form
//           onSubmit={form.handleSubmit(handleSubmit)}
//           className="space-y-4 sm:space-y-6"
//         >
//           {/* Store Selection */}
//           <div className="w-full sm:w-2/3 lg:w-1/2">
//             <FormField
//               control={form.control}
//               name="store_write"
//               rules={{ required: t("validation.required") }}
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>{t("table.store")}</FormLabel>
//                   <Select
//                     value={field.value?.toString() || ""}
//                     onValueChange={(value) => {
//                       field.onChange(parseInt(value, 10));
//                       setSelectedStore(parseInt(value, 10));
//                       // Reset sold_by if not valid for new store
//                       const validUsers = users.filter(
//                         (user) =>
//                           typeof user.id === "number" &&
//                           user.store_read?.id === parseInt(value, 10),
//                       );
//                       if (validUsers.length > 0) {
//                         form.setValue("sold_by", validUsers[0].id);
//                       } else {
//                         form.setValue("sold_by", undefined);
//                       }
//                     }}
//                   >
//                     <SelectTrigger
//                       className={
//                         form.formState.errors.store_write
//                           ? "border-red-500"
//                           : ""
//                       }
//                     >
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {stores.map((store) =>
//                         store?.id !== undefined ? (
//                           <SelectItem
//                             key={store.id}
//                             value={store.id.toString()}
//                           >
//                             {store.name}
//                           </SelectItem>
//                         ) : null,
//                       )}
//                     </SelectContent>
//                   </Select>
//                   {form.formState.errors.store_write && (
//                     <p className="text-sm text-red-500 mt-1">
//                       {form.formState.errors.store_write.message}
//                     </p>
//                   )}
//                 </FormItem>
//               )}
//             />
//           </div>
//
//           {/* Seller Selection - Only for admin/superuser */}
//           {(isSuperUser || isAdmin) && (
//             <div className="w-full sm:w-2/3 lg:w-1/2">
//               <FormField
//                 control={form.control}
//                 name="sold_by"
//                 rules={{ required: t("validation.required") }}
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>{t("table.seller")}</FormLabel>
//                     <Select
//                       value={field.value?.toString() || ""}
//                       onValueChange={(value) => {
//                         field.onChange(Number(value));
//                         form.setValue("sold_by", Number(value)); // Ensure form state is updated
//                       }}
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {(() => {
//                           // Filter only sellers for the current store
//                           const sellerUsers = users.filter(
//                             (user) =>
//                               typeof user.id === "number" &&
//                               user.store_read?.id === selectedStore &&
//                               (user.role === "Продавец" ||
//                                 user.role === "Администратор"),
//                           );
//                           // If the current value is not in the sellerUsers, but is in users, add it to the list
//                           const currentSeller = users.find(
//                             (user) => user.id === form.watch("sold_by"),
//                           );
//                           const showCurrent =
//                             currentSeller &&
//                             !sellerUsers.some((u) => u.id === currentSeller.id);
//                           const allOptions = showCurrent
//                             ? [...sellerUsers, currentSeller]
//                             : sellerUsers;
//                           // Remove duplicates by id
//                           const uniqueOptions = allOptions.filter(
//                             (u, i, arr) =>
//                               arr.findIndex((x) => x.id === u.id) === i,
//                           );
//                           return uniqueOptions.map((user) => (
//                             <SelectItem
//                               key={user.id}
//                               value={user.id!.toString()}
//                             >
//                               {user.name}
//                             </SelectItem>
//                           ));
//                         })()}
//                       </SelectContent>
//                     </Select>
//                   </FormItem>
//                 )}
//               />
//             </div>
//           )}
//
//           {/* Sale Items */}
//           <div className="space-y-4">
//             <div className="flex justify-between items-center">
//               <h2 className="text-base sm:text-lg font-semibold">
//                 {t("common.sale_items")}
//               </h2>
//               <Button type="button" onClick={addSaleItem}>
//                 {t("common.add_item")}
//               </Button>
//             </div>
//
//             {form.watch("sale_items").map((_, index: number) => (
//               <div
//                 key={index}
//                 className="flex flex-col sm:flex-row flex-wrap items-start gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-white dark:bg-card dark:border-border shadow-sm"
//               >
//                 <div className="w-full sm:w-[250px]">
//                   <FormField
//                     control={form.control}
//                     name={`sale_items.${index}.stock_write`}
//                     rules={{ required: t("validation.required") }}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel className="text-sm font-medium">
//                           {t("table.product")}
//                         </FormLabel>
//                         <Select
//                           value={field.value?.toString() || ""}
//                           onValueChange={(value) =>
//                             handleStockSelection(value, index)
//                           }
//                         >
//                           <SelectTrigger
//                             className={
//                               form.formState.errors.sale_items?.[index]
//                                 ?.stock_write
//                                 ? "border-red-500"
//                                 : ""
//                             }
//                           >
//                             <SelectValue>
//                               {filteredStocks.find(
//                                 (stock) => stock.id === field.value,
//                               )?.product_read?.product_name ||
//                                 t("placeholders.select_product")}
//                             </SelectValue>
//                           </SelectTrigger>
//                           <SelectContent>
//                             {/* Product search input */}
//                             <div className="p-2 sticky top-0 bg-white z-10 border-b select-content-wrapper">
//                               <Input
//                                 type="text"
//                                 placeholder={t("placeholders.search_products")}
//                                 value={productSearchTerm}
//                                 onChange={(e) => {
//                                   e.stopPropagation();
//                                   setProductSearchTerm(e.target.value);
//                                 }}
//                                 onPointerDown={(e) => e.stopPropagation()}
//                                 onClick={(e) => e.stopPropagation()}
//                                 onKeyDown={(e) => e.stopPropagation()}
//                                 className="flex-1"
//                                 autoFocus
//                               />
//                             </div>
//
//                             {filteredStocks
//                               .filter((stock) => stock.quantity > 0)
//                               .map((stock) => (
//                                 <SelectItem
//                                   key={stock.id}
//                                   value={stock.id?.toString() || ""}
//                                 >
//                                   {stock.product_read?.product_name} (
//                                   {stock.quantity}{" "}
//                                   {stock.product_read?.measurement_read?.name})
//                                 </SelectItem>
//                               ))}
//                           </SelectContent>
//                         </Select>
//                         {selectedPrices[index] && (
//                           <div className="mt-2 space-y-1 text-xs">
//                             <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded">
//                               {(isAdmin || isSuperUser) && (
//                                 <>
//                                   <span className="text-gray-600">
//                                     {t("table.min_price")}:
//                                   </span>
//                                   <span className="font-medium text-red-600">
//                                     {selectedPrices[index].min}
//                                   </span>
//                                 </>
//                               )}
//                             </div>
//                             {(isAdmin || isSuperUser) && (
//                               <div className="flex items-center justify-between px-2 py-1 bg-green-50 rounded">
//                                 <span className="text-gray-600">
//                                   {t("table.profit")}:
//                                 </span>
//                                 <span className="font-medium text-green-600">
//                                   {selectedPrices[index].profit.toFixed(1)}
//                                 </span>
//                               </div>
//                             )}
//                           </div>
//                         )}
//                       </FormItem>
//                     )}
//                   />
//                 </div>
//
//                 <div className="w-full sm:w-[250px]">
//                   <FormField
//                     control={form.control}
//                     name={`sale_items.${index}.selling_method`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel className="text-sm font-medium">
//                           {t("common.selling_method")}
//                         </FormLabel>
//                         <Select
//                           value={field.value}
//                           onValueChange={field.onChange}
//                         >
//                           <SelectTrigger>
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="Штук">
//                               {t("table.pieces")}
//                             </SelectItem>
//                             <SelectItem value="Ед.измерения">
//                               {t("table.measurement")}
//                             </SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </FormItem>
//                     )}
//                   />
//                 </div>
//
//                 <div className="w-full sm:w-[120px]">
//                   <FormField
//                     control={form.control}
//                     name={`sale_items.${index}.quantity`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel className="text-sm font-medium">
//                           {t("table.quantity")}
//                         </FormLabel>
//                         <FormControl>
//                           <Input
//                             type="number"
//                             min="1"
//                             max={selectedStocks[index] || 1}
//                             placeholder={t("placeholders.enter_quantity")}
//                             className="text-right"
//                             {...field}
//                             onChange={(e) => handleQuantityChange(e, index)}
//                           />
//                         </FormControl>
//                       </FormItem>
//                     )}
//                   />
//                 </div>
//
//                 <div className="w-full sm:w-[150px]">
//                   <FormField
//                     control={form.control}
//                     name={`sale_items.${index}.subtotal`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel className="text-sm font-medium">
//                           {t("table.subtotal")}
//                         </FormLabel>
//                         <FormControl>
//                           <Input
//                             type="text"
//                             className="text-right font-medium"
//                             {...field}
//                             onChange={(e) => handleSubtotalChange(e, index)}
//                           />
//                         </FormControl>
//                       </FormItem>
//                     )}
//                   />
//                 </div>
//
//                 {index > 0 && (
//                   <Button
//                     type="button"
//                     variant="destructive"
//                     size="icon"
//                     onClick={() => {
//                       const items = form.getValues("sale_items");
//                       form.setValue(
//                         "sale_items",
//                         items.filter((_, i) => i !== index),
//                       );
//                       updateTotalAmount();
//                     }}
//                     className="mt-2 sm:mt-8"
//                   >
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       width="16"
//                       height="16"
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="currentColor"
//                       strokeWidth="2"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     >
//                       <path d="M18 6L6 18M6 6l12 12" />
//                     </svg>
//                   </Button>
//                 )}
//               </div>
//             ))}
//           </div>
//
//           {/* Payment Methods */}
//           <div className="space-y-4">
//             <h3 className="text-base sm:text-lg font-semibold">
//               {t("table.payment_methods")}
//             </h3>
//             {form.watch("sale_payments").map((_, index) => (
//               <div
//                 key={index}
//                 className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-end"
//               >
//                 <FormField
//                   control={form.control}
//                   name={`sale_payments.${index}.payment_method`}
//                   render={({ field }) => (
//                     <FormItem className="flex-1">
//                       <FormLabel>{t("table.payment_method")}</FormLabel>
//                       <Select
//                         value={
//                           typeof field.value === "string" ? field.value : ""
//                         }
//                         onValueChange={field.onChange}
//                       >
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="Наличные">
//                             {t("payment.cash")}
//                           </SelectItem>
//                           <SelectItem value="Click">
//                             {t("payment.click")}
//                           </SelectItem>
//                           <SelectItem value="Карта">
//                             {t("payment.card")}
//                           </SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name={`sale_payments.${index}.amount`}
//                   render={({ field: { onChange, value } }) => (
//                     <FormItem className="flex-1">
//                       <FormLabel>{t("table.amount")}</FormLabel>
//                       <FormControl>
//                         <Input
//                           type="number"
//                           value={value?.toString() || ""}
//                           onChange={(e) => {
//                             const newAmount = parseFloat(e.target.value) || 0;
//                             const totalAmount = parseFloat(
//                               form.watch("total_amount"),
//                             );
//                             const otherPaymentsTotal = form
//                               .watch("sale_payments")
//                               .filter((_, i) => i !== index)
//                               .reduce((sum, p) => sum + (p.amount || 0), 0);
//
//                             if (newAmount + otherPaymentsTotal > totalAmount) {
//                               onChange(totalAmount - otherPaymentsTotal);
//                             } else {
//                               onChange(newAmount);
//                             }
//                           }}
//                         />
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//                 {index > 0 && (
//                   <Button
//                     type="button"
//                     variant="destructive"
//                     size="icon"
//                     onClick={() => {
//                       const payments = form.getValues("sale_payments");
//                       payments.splice(index, 1);
//                       const totalAmount = parseFloat(
//                         form.watch("total_amount"),
//                       );
//                       const remainingAmount = payments.reduce(
//                         (sum, p) => sum + (p.amount || 0),
//                         0,
//                       );
//                       if (remainingAmount < totalAmount) {
//                         payments[payments.length - 1].amount =
//                           totalAmount - remainingAmount;
//                         form.setValue("sale_payments", payments);
//                       } else {
//                         form.setValue("sale_payments", payments);
//                       }
//                     }}
//                     className="mt-0 sm:mt-1"
//                   >
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       width="16"
//                       height="16"
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="currentColor"
//                       strokeWidth="2"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     >
//                       <path d="M18 6L6 18M6 6l12 12" />
//                     </svg>
//                   </Button>
//                 )}
//               </div>
//             ))}
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => {
//                 const payments = form.getValues("sale_payments");
//                 const totalAmount = parseFloat(form.watch("total_amount"));
//                 const currentTotal = payments.reduce(
//                   (sum, p) => sum + (p.amount || 0),
//                   0,
//                 );
//                 const remaining = totalAmount - currentTotal;
//
//                 if (remaining > 0) {
//                   payments.push({
//                     payment_method: "Наличные",
//                     amount: remaining,
//                   });
//                   form.setValue("sale_payments", payments);
//                 }
//               }}
//               className="w-full sm:w-auto"
//             >
//               {t("common.add_payment_method")}
//             </Button>
//           </div>
//
//           {/* On Credit */}
//           <div className="w-full sm:w-2/3 lg:w-1/2">
//             <FormField
//               control={form.control}
//               name="on_credit"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>{t("table.on_credit")}</FormLabel>
//                   <Select
//                     value={field.value ? "true" : "false"}
//                     onValueChange={(value) => {
//                       const isCredit = value === "true";
//                       field.onChange(isCredit);
//                       if (!isCredit) {
//                         form.setValue("sale_debt", undefined);
//                       }
//                     }}
//                     disabled // <--- DISABLED
//                   >
//                     <SelectTrigger>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="true">{t("common.yes")}</SelectItem>
//                       <SelectItem value="false">{t("common.no")}</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </FormItem>
//               )}
//             />
//           </div>
//
//           {/* Client Selection */}
//           {form.watch("sale_debt.client") && (
//             <div className="w-full sm:w-2/3 lg:w-1/2">
//               <FormField
//                 control={form.control}
//                 name="sale_debt.client"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>{t("table.client")}</FormLabel>
//                     <Select
//                       value={field.value?.toString()}
//                       onValueChange={(value) => {
//                         field.onChange(parseInt(value, 10));
//                         // Don't modify on_credit value here to preserve the value from API
//                       }}
//                       disabled // <--- DISABLED
//                     >
//                       <SelectTrigger>
//                         <SelectValue
//                           placeholder={t("placeholders.select_client")}
//                         />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {clients
//                           .filter((client) =>
//                             form.watch("on_credit")
//                               ? true
//                               : client.type === "Юр.лицо",
//                           )
//                           .map((client) => (
//                             <SelectItem
//                               key={client.id}
//                               value={client.id?.toString() || ""}
//                             >
//                               {client.name}{" "}
//                               {client.type !== "Юр.лицо" && `(${client.type})`}
//                             </SelectItem>
//                           ))}
//                       </SelectContent>
//                     </Select>
//                   </FormItem>
//                 )}
//               />
//             </div>
//           )}
//
//           {/* Credit Details */}
//           {form.watch("on_credit") && (
//             <div className="space-y-4 p-3 sm:p-4 border rounded-lg bg-amber-50 border-amber-200">
//               <h3 className="font-semibold text-gray-800 flex items-center gap-2">
//                 <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
//                   {t("common.on_credit")}
//                 </span>
//               </h3>
//
//               <div className="grid sm:grid-cols-2 gap-4">
//                 <FormField
//                   control={form.control}
//                   name="sale_debt.due_date"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>{t("table.due_date")}</FormLabel>
//                       <FormControl>
//                         <Input type="date" {...field} disabled />
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//
//                 <FormField
//                   control={form.control}
//                   name="sale_debt.deposit"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>{t("table.deposit")}</FormLabel>
//                       <FormControl>
//                         <Input
//                           type="number"
//                           placeholder="0"
//                           {...field}
//                           onChange={(e) =>
//                             field.onChange(e.target.valueAsNumber)
//                           }
//                           disabled
//                         />
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//               </div>
//             </div>
//           )}
//
//           {/* Total Amount Display */}
//           <div className="mt-6 sm:mt-8 p-4 sm:p-6 border rounded-lg bg-gray-50 dark:bg-card dark:border-border">
//             <div className="flex flex-col space-y-4">
//               <div className="flex items-center justify-between border-b pb-4">
//                 <h3 className="text-base sm:text-lg font-semibold text-gray-700">
//                   {t("table.total_amount")}
//                 </h3>
//                 <p className="text-xl sm:text-3xl font-bold text-green-600">
//                   {form
//                     .watch("sale_payments")
//                     .reduce((sum, payment) => sum + (payment.amount || 0), 0)
//                     .toLocaleString()}
//                 </p>
//               </div>
//               {(isAdmin || isSuperUser) && (
//                 <div className="flex items-center justify-between">
//                   <h3 className="text-base sm:text-lg font-semibold text-gray-700">
//                     {t("table.profit")}
//                   </h3>
//                   <p className="text-xl sm:text-3xl font-bold text-green-600">
//                     {(() => {
//                       const saleItems = form.watch("sale_items");
//                       const totalPayments = form
//                         .watch("sale_payments")
//                         .reduce(
//                           (sum, payment) => sum + (payment.amount || 0),
//                           0,
//                         );
//                       const totalAmount =
//                         parseFloat(form.watch("total_amount")) || 0;
//                       let totalProfit = 0;
//                       saleItems.forEach((item, index) => {
//                         if (selectedPrices[index]) {
//                           const quantity = item.quantity || 1;
//                           const subtotal = parseFloat(item.subtotal) || 0;
//                           const itemTotal = subtotal * quantity;
//                           const stockId = item.stock_write;
//                           const selectedStock = stocks.find(
//                             (stock) => stock.id === stockId,
//                           );
//                           let profitPerUnit = 0;
//                           let recyclingProfitUsed = false;
//                           if (selectedStock && recyclingData) {
//                             const recyclingRecord = getRecyclingRecord(
//                               selectedStock.product_read.id,
//                               selectedStock.id,
//                             );
//                             if (recyclingRecord) {
//                               const baseProfitPerUnit =
//                                 calculateRecyclingProfit(recyclingRecord, 1);
//                               const originalSubtotal =
//                                 selectedPrices[index].selling;
//                               const priceDifference =
//                                 subtotal - originalSubtotal;
//                               profitPerUnit =
//                                 baseProfitPerUnit + priceDifference;
//                               recyclingProfitUsed = true;
//                             }
//                           }
//                           if (!recyclingProfitUsed && selectedStock) {
//                             if (
//                               selectedStock.product_read?.has_kub &&
//                               (selectedStock.product_read?.category_read
//                                 ?.category_name === "Кругляк" ||
//                                 selectedStock.product_read?.category_read
//                                   ?.category_name === "Шифер")
//                             ) {
//                               const measurements =
//                                 selectedStock.product_read.measurement || [];
//                               const getNumber = (name: string) => {
//                                 const m = measurements.find(
//                                   (m: any) =>
//                                     m.measurement_read.measurement_name ===
//                                     name,
//                                 );
//                                 return m ? parseFloat(m.number) : 1;
//                               };
//                               const length = getNumber("длина");
//                               const thickness = getNumber("Толщина");
//                               const meter = getNumber("Метр");
//                               const exchangeRate = parseFloat(
//                                 selectedStock.exchange_rate_read
//                                   ?.currency_rate || "1",
//                               );
//                               const purchasePriceInUss = parseFloat(
//                                 selectedStock.purchase_price_in_us || "0",
//                               );
//                               const purchasePriceInUs = purchasePriceInUss;
//                               const PROFIT_FAKE =
//                                 length *
//                                 meter *
//                                 thickness *
//                                 exchangeRate *
//                                 purchasePriceInUs;
//                               profitPerUnit = subtotal - PROFIT_FAKE;
//                             } else {
//                               const totalPurchasePrice = parseFloat(
//                                 selectedStock?.purchase_price_in_uz || "0",
//                               );
//                               const stockQuantity =
//                                 selectedStock?.quantity_for_history ||
//                                 selectedStock?.quantity ||
//                                 1;
//                               const purchasePricePerUnit =
//                                 totalPurchasePrice / stockQuantity;
//                               profitPerUnit = subtotal - purchasePricePerUnit;
//                             }
//                           }
//                           const paidShare =
//                             totalAmount > 0
//                               ? (itemTotal / totalAmount) * totalPayments
//                               : itemTotal;
//                           const itemCost = itemTotal - profitPerUnit * quantity;
//                           totalProfit += paidShare - itemCost;
//                         }
//                       });
//                       return totalProfit.toFixed(1).toLocaleString();
//                     })()}
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//
//           {/* {
//             <Button
//               type="submit"
//               className="w-full mt-4 sm:mt-6 h-10 sm:h-12 text-base sm:text-lg font-medium"
//               disabled={updateSale.isPending}
//             >
//               {updateSale.isPending ? t("common.updating") : t("common.update")}
//             </Button>
//           } */}
//         </form>
//       </Form>
//     </div>
//   );
// }
