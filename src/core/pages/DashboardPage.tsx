import { useEffect, useState } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTranslation } from "react-i18next";
import {
  getReportsSalesSummary,
  getTopProducts,
  getStockByCategory,
  getProductIntake,
  getClientDebts,
  getUnsoldProducts,
  getProductProfitability,
  getTopSellers,
  getSalesmanSummary,
  getSalesmanDebts,
  getSalesProfitReport,
  type SalesSummaryResponse,
  type TopProductsResponse,
  type StockByCategoryResponse,
  type ProductIntakeResponse,
  type ClientDebtResponse,
  type UnsoldProductsResponse,
  type ProductProfitabilityResponse,
  type TopSellersResponse,
  type SalesmanSummaryResponse,
  type SalesmanDebtsResponse,
  type SalesProfitResponse,
  getExpensesSummary,
  getNetProfit,
  getSuppliersSummary,
} from "../api/reports";
import type { ExpensesSummaryResponse, SuppliersSummaryResponse } from "../api/types/reports";
import {
  ArrowUpRight,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  BarChart2,
  Users,
  CreditCard,
  Wallet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useGetStores } from "../api/store";

// Add type for net profit response
interface NetProfitResponse {
  total_revenue: number;
  total_expense: number;
  net_profit: number;
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const [salesData, setSalesData] = useState<SalesSummaryResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductsResponse[]>([]);
  const [stockByCategory, setStockByCategory] = useState<
      StockByCategoryResponse[]
  >([]);
  const [productIntake, setProductIntake] =
      useState<ProductIntakeResponse | null>(null);
  const [clientDebts, setClientDebts] = useState<ClientDebtResponse[]>([]);
  const [unsoldProducts, setUnsoldProducts] = useState<
      UnsoldProductsResponse[]
  >([]);
  const [_productProfitability, setProductProfitability] = useState<
      ProductProfitabilityResponse[]
  >([]);
  const [topSellers, setTopSellers] = useState<TopSellersResponse[]>([]);
  const [salesmanSummary, setSalesmanSummary] =
      useState<SalesmanSummaryResponse | null>(null);
  const [salesmanDebts, setSalesmanDebts] =
      useState<SalesmanDebtsResponse | null>(null);
  const [expensesSummary, setExpensesSummary] =
      useState<ExpensesSummaryResponse | null>(null);
  const [suppliersSummary, setSuppliersSummary] =
      useState<SuppliersSummaryResponse | null>(null);
  const [salesProfit, setSalesProfit] = useState<SalesProfitResponse | null>(
      null
  );
  const [_netProfitData, setNetProfitData] = useState<NetProfitResponse | null>(
      null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_netProfitLoading, setNetProfitLoading] = useState(false);
  const [_netProfitError, setNetProfitError] = useState<string | null>(null);
  // UI period can include 'custom', but API only accepts 'day', 'week', 'month'
  const [period, setPeriod] = useState<"day" | "week" | "month" | "custom">(
      "day"
  );
  const [topProductsLimit, setTopProductsLimit] = useState<number>(5);
  const [topSellersLimit, _setTopSellersLimit] = useState<number>(5);
  const [displayedUnsoldProducts, setDisplayedUnsoldProducts] =
      useState<number>(9);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>("all");

  // Handler for showing more unsold products
  const handleShowMoreUnsoldProducts = () => {
    setDisplayedUnsoldProducts((prev) =>
        Math.min(prev + 9, unsoldProducts.length)
    );
  };
  const formatLocalDate = (date: Date | null) =>
      date
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
          : "";

  // Get current user to determine role
  const { data: currentUser } = useCurrentUser();
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData)
      ? storesData
      : storesData?.results || [];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Check if user is a salesman (Продавец)
        if (currentUser?.role === "Продавец") {
          // For salesman, fetch only the relevant data
          // Format dates for API parameters
          let dateParams = "";
          let apiPeriod: "day" | "week" | "month" | undefined = undefined;

          // If using custom dates, prepare the date parameters
          if (startDate || endDate) {
            const formattedStartDate = formatLocalDate(startDate);
            const formattedEndDate = formatLocalDate(endDate);
            dateParams = `date_from=${formattedStartDate}&date_to=${formattedEndDate}`;
          } else if (period !== "custom") {
            // Only use period if we're not using custom dates
            apiPeriod = period;
          }

          // Add store parameter if a specific store is selected
          if (selectedStore !== "all") {
            dateParams = dateParams
                ? `${dateParams}&store=${selectedStore}`
                : `store=${selectedStore}`;
          }

          const [salesmanSummaryData, salesmanDebtsData] = await Promise.all([
            getSalesmanSummary(apiPeriod, dateParams || undefined),
            getSalesmanDebts(apiPeriod, dateParams || undefined),
          ]);

          setSalesmanSummary(salesmanSummaryData);
          setSalesmanDebts(salesmanDebtsData);
        } else {
          // For admin, fetch all the dashboard data
          // Format dates for API parameters
          let dateParams = "";
          let apiPeriod: "day" | "week" | "month" | undefined = undefined;

          // If using custom dates, prepare the date parameters
          if (startDate || endDate) {
            const formattedStartDate = startDate
                ? formatLocalDate(startDate)
                : "";
            const formattedEndDate = endDate
                ? formatLocalDate (endDate)
                : "";
            dateParams = `date_from=${formattedStartDate}&date_to=${formattedEndDate}`;
          } else if (period !== "custom") {
            // Only use period if we're not using custom dates
            apiPeriod = period;
          }

          // Add store parameter if a specific store is selected
          if (selectedStore !== "all") {
            dateParams = dateParams
                ? `${dateParams}&store=${selectedStore}`
                : `store=${selectedStore}`;
          }

          const [
            salesSummary,
            topProductsData,
            stockByCategoryData,
            productIntakeData,
            clientDebtsData,
            unsoldProductsData,
            profitabilityData,
            topSellersData,
            expensesSummaryData,
            salesProfitData,
            suppliersSummaryData,
          ] = await Promise.all([
            // Apply filters to all API calls consistently
            getReportsSalesSummary(apiPeriod, dateParams || undefined),
            getTopProducts(
                apiPeriod,
                topProductsLimit,
                dateParams || undefined
            ),
            getStockByCategory(apiPeriod, dateParams || undefined),
            getProductIntake(apiPeriod, dateParams || undefined),
            getClientDebts(apiPeriod, dateParams || undefined),
            getUnsoldProducts(apiPeriod, dateParams || undefined),
            getProductProfitability(apiPeriod, dateParams || undefined),
            getTopSellers(apiPeriod, dateParams || undefined),
            getExpensesSummary(apiPeriod, dateParams || undefined),
            getSalesProfitReport(apiPeriod, dateParams || undefined),
            getSuppliersSummary(apiPeriod, dateParams || undefined),
          ]);

          setSalesData(salesSummary);
          setTopProducts(topProductsData);
          setStockByCategory(stockByCategoryData);
          setProductIntake(productIntakeData);
          setClientDebts(clientDebtsData);
          setUnsoldProducts(unsoldProductsData);
          setProductProfitability(profitabilityData);
          setTopSellers(topSellersData);
          setExpensesSummary(expensesSummaryData);
          setSalesProfit(salesProfitData);
          setSuppliersSummary(suppliersSummaryData);
        }
      } catch (err) {
        setError("Failed to load dashboard data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [
    period,
    topProductsLimit,
    topSellersLimit,
    startDate,
    endDate,
    selectedStore,
    currentUser?.role,
  ]);

  // Fetch net profit data
  useEffect(() => {
    setNetProfitLoading(true);
    setNetProfitError(null);

    // Build dateParams and apiPeriod just like in the main dashboard fetch
    let dateParams = "";
    let apiPeriod: "day" | "week" | "month" | undefined = undefined;
    if (startDate || endDate) {
      const formattedStartDate = startDate
          ? formatLocalDate(startDate)
          : "";
      const formattedEndDate = endDate
          ? formatLocalDate(endDate)
          : "";
      dateParams = `date_from=${formattedStartDate}&date_to=${formattedEndDate}`;
    } else if (period !== "custom") {
      apiPeriod = period;
    }
    if (selectedStore !== "all") {
      dateParams = dateParams
          ? `${dateParams}&store=${selectedStore}`
          : `store=${selectedStore}`;
    }
    getNetProfit(apiPeriod, dateParams || undefined)
        .then((data) => setNetProfitData(data))
        .catch((err) => setNetProfitError(err?.message || "Error"))
        .finally(() => setNetProfitLoading(false));
  }, [period, startDate, endDate, selectedStore]);
  // Place this helper function near the top of your component file
  const EXPENSE_OTHER_THRESHOLD = 0.01; // 5%
  const getGroupedExpenses = (expenses: any) => {
    if (!expenses || expenses.length === 0) return [];
    const total = expenses.reduce(
        (sum: number, e: any) => sum + e.total_amount,
        0
    );
    const grouped = [];
    let otherSum = 0;
    expenses.forEach((e: any) => {
      if (total > 0 && e.total_amount / total < EXPENSE_OTHER_THRESHOLD) {
        otherSum += e.total_amount;
      } else {
        grouped.push({ name: e.expense_name__name, value: e.total_amount });
      }
    });
    if (otherSum > 0) {
      grouped.push({ name: t("dashboard.other") || "Other", value: otherSum });
    }
    return grouped;
  };
  // function groupPaymentsByMethod(
  //   paymentsByMethod: any,
  //   thresholdPercent = 0.05
  // ) {
  //   if (!paymentsByMethod) return [];
  //   const entries = Object.entries(paymentsByMethod);
  //   const total = entries.reduce(
  //     (sum, [, data]: any) => sum + Number(data.total_amount),
  //     0
  //   );
  //   if (total === 0)
  //     return entries.map(([method, data]: any) => ({
  //       name: method,
  //       value: data.total_amount,
  //       count: data.count,
  //     }));
  //   const grouped = [];
  //   let othersAmount = 0;
  //   let othersCount = 0;
  //   entries.forEach(([method, data]: any) => {
  //     const percent = data.total_amount / total;
  //     if (percent < thresholdPercent) {
  //       othersAmount += data.total_amount;
  //       othersCount += data.count;
  //     } else {
  //       grouped.push({
  //         name: method,
  //         value: data.total_amount,
  //         count: data.count,
  //       });
  //     }
  //   });
  //   if (othersAmount > 0) {
  //     grouped.push({ name: "другие", value: othersAmount, count: othersCount });
  //   }
  //   return grouped;
  // }
  // const groupedPayments = groupPaymentsByMethod(salesProfit?.payments_by_method, 0.05); // 5% threshold

  // Format the trend data for the charts
  const formattedData =
      salesData?.trend.map((item) => ({
        date: format(parseISO(item.month), "MMM yyyy"),
        sales: item.total,
      })) || [];

  // Format product intake data for chart
  const formattedIntakeData =
      productIntake?.data.map((item) => ({
        date: format(parseISO(item.day), "MMM dd"),
        quantity: item.total_quantity,
        price: item.total_price,
      })) || [];

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[60vh] bg-white dark:bg-[rgb(17,24,39)]">
        <span className="text-lg text-gray-500 dark:text-gray-200">
          {t("loading")}
        </span>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-full">
          <div className="text-destructive text-lg">{error}</div>
        </div>
    );
  }

  // Define a stable array of payment method names and colors
  const paymentColors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#8BC34A",
    "#673AB7",
  ];

  const paymentMethodNames = salesProfit?.payments_by_method
      ? Object.keys(salesProfit.payments_by_method).sort()
      : [];

  const groupedPaymentsStable = paymentMethodNames.map((name) => ({
    name,
    value: salesProfit?.payments_by_method?.[name]?.total_amount || 0,
  }));

  // Determine which dashboard to show based on user role
  if (currentUser?.role === "Продавец") {
    return (
        <div className="p-6 w-full max-w-none">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {t("dashboard.title")}
            </h1>

            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center gap-4">
              {/* Store Selector */}

              {/* Period Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-medium whitespace-nowrap">
                {t("dashboard.period")}:
              </span>
                <Select
                    value={period}
                    onValueChange={(value) => {
                      const newPeriod = value as
                          | "day"
                          | "week"
                          | "month"
                          | "custom";
                      setPeriod(newPeriod);
                      if (newPeriod !== "custom") {
                        setStartDate(null);
                        setEndDate(null);
                      }
                    }}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder={t("dashboard.select_period")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">{t("dashboard.day")}</SelectItem>
                    <SelectItem value="week">{t("dashboard.week")}</SelectItem>
                    <SelectItem value="month">{t("dashboard.month")}</SelectItem>
                    <SelectItem value="custom">
                      {t("dashboard.custom")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => {
                      setStartDate(date);
                      // If selecting a date, switch to custom period
                      if (date) {
                        setPeriod("custom");
                      }
                    }}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={t("forms.date_from") || "Date from"}
                    className="w-full sm:w-36 flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
                />

                <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) => {
                      setEndDate(date);
                      // If selecting a date, switch to custom period
                      if (date) {
                        setPeriod("custom");
                      }
                    }}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate || undefined}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={t("forms.date_to") || "Date to"}
                    className="w-full sm:w-36 flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Salesman Dashboard - Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Sales Summary Card */}
            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  {t("dashboard.sales_summary") || "Sales Summary"}
                </CardTitle>
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {salesmanSummary?.total_sales || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.total_sales") || "Total Sales"}
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {salesmanSummary?.total_revenue?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.total_revenue") || "Total Revenue"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Debts Card */}
            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  {t("dashboard.debts") || "Debts"}
                </CardTitle>
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {salesmanDebts?.total_count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.total_debts") || "Total Debts"}
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {salesmanDebts?.total_debt?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.total_debt_amount") || "Total Debt Amount"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    );
  }

  // Admin dashboard content
  return (
      <div className="p-6 w-full max-w-none">
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center gap-4">
            {/* Period Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentUser?.is_superuser && (
                  <>
                <span className="text-sm font-medium whitespace-nowrap">
                  {t("dashboard.store")}:
                </span>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder={t("dashboard.select_store")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.all_stores")}
                        </SelectItem>
                        {stores.map((store) => (
                            <SelectItem
                                key={store.id}
                                value={store.id?.toString() || ""}
                            >
                              {store.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium whitespace-nowrap">
              {t("dashboard.period")}:
            </span>
              <Select
                  value={period}
                  onValueChange={(value) => {
                    const newPeriod = value as "day" | "week" | "month" | "custom";
                    setPeriod(newPeriod);
                    // When selecting a predefined period, clear the date range
                    if (newPeriod !== "custom") {
                      setStartDate(null);
                      setEndDate(null);
                    }
                  }}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder={t("dashboard.select_period")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">{t("dashboard.day")}</SelectItem>
                  <SelectItem value="week">{t("dashboard.week")}</SelectItem>
                  <SelectItem value="month">{t("dashboard.month")}</SelectItem>
                  <SelectItem value="custom">{t("dashboard.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
              <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => {
                    setStartDate(date);
                    // If selecting a date, switch to custom period
                    if (date) {
                      setPeriod("custom");
                    }
                  }}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={t("forms.date_from") || "Date from"}
                  className="w-full sm:w-36 flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
              />

              <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => {
                    setEndDate(date);
                    // If selecting a date, switch to custom period
                    if (date) {
                      setPeriod("custom");
                    }
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || undefined}
                  dateFormat="dd/MM/yyyy"
                  placeholderText={t("forms.date_to") || "Date to"}
                  className="w-full sm:w-36 flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 ">
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.total_sales")}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesData?.total_sales}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("dashboard.transactions")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.total_revenue")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("uz-UZ", {
                  style: "currency",
                  currency: "UZS",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
                    .format(salesData?.total_revenue || 0)
                    .replace("UZS", "")
                    .trim()}
              </div>
              <div className="text-xs text-green-500 flex items-center mt-1">
                <ArrowUpRight className="h-4 w-4 mr-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.average_sale")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData && salesData.total_sales > 0
                    ? new Intl.NumberFormat("uz-UZ", {
                      style: "currency",
                      currency: "UZS",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                        .format(salesData.total_revenue / salesData.total_sales)
                        .replace("UZS", "")
                        .trim()
                    : "0"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("dashboard.per_transaction")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.pure_revenue")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <div
                    className={`text-2xl font-bold ${
                        (salesProfit?.total_pure_revenue || 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                    }`}
                >
                  {new Intl.NumberFormat("uz-UZ", {
                    style: "currency",
                    currency: "UZS",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                      .format(salesProfit?.total_pure_revenue || 0)
                      .replace("UZS", "")
                      .trim()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.total_expenses")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <div
                    className={`text-2xl font-bold ${
                        (expensesSummary?.total_expense || 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                    }`}
                >
                  {new Intl.NumberFormat("uz-UZ", {
                    style: "currency",
                    currency: "UZS",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                      .format(expensesSummary?.total_expense || 0)
                      .replace("UZS", "")
                      .trim()}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Store Balance Card */}
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.net_profit") || "Store Balance"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  if (selectedStore === "all") {
                    // Sum all store budgets
                    const total = stores.reduce(
                        (sum, store) => sum + Number(store.budget),
                        0
                    );
                    return new Intl.NumberFormat("uz-UZ", {
                      style: "currency",
                      currency: "UZS",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                        .format(total)
                        .replace("UZS", "")
                        .trim();
                  } else {
                    const store = stores.find(
                        (s) => s.id?.toString() === selectedStore
                    );
                    const budget = store ? Number(store.budget) : 0;
                    return new Intl.NumberFormat("uz-UZ", {
                      style: "currency",
                      currency: "UZS",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                        .format(budget)
                        .replace("UZS", "")
                        .trim();
                  }
                })()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedStore === "all"
                    ? t("dashboard.all_stores_balance") || "All Stores Balance"
                    : t("dashboard.selected_store_balance") ||
                    "Selected Store Balance"}
              </div>
            </CardContent>
          </Card>

          {/* Supplier Debts Card */}
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.supplier_debts") || "Supplier Debts"}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {new Intl.NumberFormat("uz-UZ", {
                  style: "currency",
                  currency: "UZS",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
                    .format(
                      suppliersSummary?.suppliers?.reduce(
                        (sum, supplier) => sum + supplier.total_debts,
                        0
                      ) || 0
                    )
                    .replace("UZS", "")
                    .trim()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("dashboard.total_supplier_debts") || "Total Supplier Debts"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments by Method Pie Chart */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow mb-8 dark:bg-card">
          <CardHeader>
            <CardTitle>
              {t("dashboard.payments_by_method") || "Payments by Method"}
            </CardTitle>
            <CardDescription>
              {t("dashboard.payments_by_method_desc") ||
                  "Distribution of sales by payment method"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesProfit?.payments_by_method && paymentMethodNames.length > 0 ? (
                <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div className="w-full md:w-1/2 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                            data={groupedPaymentsStable}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                                `${name}\n${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                          {paymentMethodNames.map((_, index) => (
                              <Cell
                                  key={`cell-${index}`}
                                  fill={paymentColors[index % paymentColors.length]}
                              />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip
                            formatter={(value) =>
                                new Intl.NumberFormat("uz-UZ", {
                                  style: "currency",
                                  currency: "UZS",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                                    .format(Number(value))
                                    .replace("UZS", "")
                                    .trim()
                            }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2">
                    <div className="space-y-2">
                      {paymentMethodNames.map((method, idx) => {
                        const data = salesProfit?.payments_by_method?.[method];
                        return (
                            <div
                                key={method}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                            >
                              <div className="flex items-center">
                          <span
                              className="inline-block w-3 h-3 rounded-full mr-2"
                              style={{
                                backgroundColor:
                                    paymentColors[idx % paymentColors.length],
                              }}
                          ></span>
                                <span className="font-medium">{method}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  {new Intl.NumberFormat("uz-UZ", {
                                    style: "currency",
                                    currency: "UZS",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })
                                      .format(data?.total_amount || 0)
                                      .replace("UZS", "")
                                      .trim()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("dashboard.transactions") || "Transactions"}:{" "}
                                  {data?.count || 0}
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">
                    {t("dashboard.no_payment_method_data") ||
                        "No payment method data available"}
                  </p>
                </div>
            )}
          </CardContent>
        </Card>
        {/* Top Products */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-blue-500 mb-8 dark:bg-card">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-4 sm:gap-0">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-blue-700">
                {t("dashboard.top_products")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.best_performing_products")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 bg-blue-50 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg w-full sm:w-auto">
            <span className="text-sm font-medium text-blue-700 whitespace-nowrap">
              {t("dashboard.show")}:
            </span>
              <Select
                  value={topProductsLimit.toString()}
                  onValueChange={(value) => setTopProductsLimit(parseInt(value))}
              >
                <SelectTrigger className="w-full sm:w-24 border-blue-200 bg-white dark:bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="w-full overflow-x-auto">
              {topProducts.length > 0 ? (
                  <div className="min-w-[350px] sm:min-w-0 overflow-x-auto rounded-lg border border-gray-200 dark:bg-card">
                    <table className="w-full border-collapse bg-white text-xs sm:text-sm dark:bg-card">
                      <thead className="bg-gray-50 ">
                      <tr className="text-left">
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 dark:text-white-900">
                          {t("dashboard.product")}
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 text-center">
                          {t("dashboard.quantity")}
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 text-right">
                          {t("dashboard.revenue")}
                        </th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                      {topProducts.map((product, index) => (
                          <tr
                              key={index}
                              className="hover:bg-blue-50/30 transition-colors"
                          >
                            <td className="px-2 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 ">
                              <div
                                  className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ${
                                      index < 3
                                          ? "bg-blue-100 text-blue-600"
                                          : "bg-gray-100 text-gray-600"
                                  }`}
                              >
                                <Package className="h-4 w-4" />
                              </div>
                              <span className="font-medium truncate max-w-[120px] sm:max-w-none">
                            {product.product_name}
                          </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-medium">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {product.total_quantity}
                          </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                              {new Intl.NumberFormat("uz-UZ", {
                                style: "currency",
                                currency: "UZS",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                                  .format(Number(product.total_revenue))
                                  .replace("UZS", "")
                                  .trim()}
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
              ) : (
                  <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">
                      {t("dashboard.no_product_data_available")}
                    </p>
                  </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Detailed Expense Breakdown */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow mb-8 dark:bg-card">
          <CardHeader>
            <CardTitle>
              {t("dashboard.expense_breakdown") || "Expense Breakdown"}
            </CardTitle>
            <CardDescription>
              {t("dashboard.expense_categories_detail") ||
                  "Detailed view of expense categories"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Expense Pie Chart */}
              <div className="min-h-[400px] lg:min-h-[350px]">
                <h3 className="font-medium mb-2 flex items-center"></h3>
                <div className="h-[300px] sm:h-[350px]">
                  {expensesSummary?.expenses?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                              data={getGroupedExpenses(expensesSummary.expenses)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                  window.innerWidth > 640
                                      ? `${name} (${(percent * 100).toFixed(0)}%)`
                                      : `${(percent * 100).toFixed(0)}%`
                              }
                              outerRadius={window.innerWidth > 640 ? 100 : 80}
                              fill="#8884d8"
                              dataKey="value"
                          >
                            {expensesSummary.expenses.map((_expense, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      [
                                        "#FF6384",
                                        "#36A2EB",
                                        "#FFCE56",
                                        "#4BC0C0",
                                        "#9966FF",
                                        "#FF9F40",
                                        "#8BC34A",
                                        "#673AB7",
                                      ][index % 8]
                                    }
                                />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip
                              formatter={(value) => {
                                if (typeof value === "number") {
                                  return new Intl.NumberFormat("uz-UZ", {
                                    style: "currency",
                                    currency: "UZS",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })
                                      .format(value)
                                      .replace("UZS", "")
                                      .trim();
                                }
                                return String(value);
                              }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          {t("dashboard.no_expenses") ||
                              "No expenses data available"}
                        </p>
                      </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
                  {t("dashboard.expense_details") || "Expense Details"}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                    <div className="font-medium">
                      {t("dashboard.expense_name") || "Expense Name"}
                    </div>
                    <div className="font-medium">
                      {t("dashboard.amount") || "Amount"}
                    </div>
                  </div>
                  {expensesSummary?.expenses?.length ? (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                        {expensesSummary.expenses.map((expense, index) => (
                            <div
                                key={index}
                                className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-md transition-colors"
                            >
                              <div className="flex items-center">
                                <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{
                                      backgroundColor: [
                                        "#FF6384",
                                        "#36A2EB",
                                        "#FFCE56",
                                        "#4BC0C0",
                                        "#9966FF",
                                        "#FF9F40",
                                        "#8BC34A",
                                        "#673AB7",
                                      ][index % 8],
                                    }}
                                ></div>
                                <div className="font-medium">
                                  {expense.expense_name__name}
                                </div>
                              </div>
                              <div className="font-medium">
                                {new Intl.NumberFormat("uz-UZ", {
                                  style: "currency",
                                  currency: "UZS",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                                    .format(expense.total_amount)
                                    .replace("UZS", "")
                                    .trim()}
                              </div>
                            </div>
                        ))}
                      </div>
                  ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        {t("dashboard.no_expenses") || "No expenses recorded"}
                      </div>
                  )}
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                    <div className="font-bold">
                      {t("dashboard.total_expenses") || "Total Expenses"}
                    </div>
                    <div className="font-bold text-destructive">
                      {new Intl.NumberFormat("uz-UZ", {
                        style: "currency",
                        currency: "UZS",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                          .format(expensesSummary?.total_expense || 0)
                          .replace("UZS", "")
                          .trim()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suppliers Summary */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow mb-8 dark:bg-card">
          <CardHeader>
            <CardTitle>
              {t("dashboard.suppliers_summary") || "Suppliers Summary"}
            </CardTitle>
            <CardDescription>
              {t("dashboard.supplier_debts_overview") ||
                  "Overview of supplier purchases and debts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suppliersSummary?.suppliers?.length ? (
                <div className="space-y-6">
                  {/* Total Left Debt Card */}
                  <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 font-medium">
                          {t("dashboard.total_supplier_debt") || "Total Supplier Debt"}
                        </p>
                        <p className="text-3xl font-bold text-red-700 mt-1">
                          {new Intl.NumberFormat("uz-UZ", {
                            style: "currency",
                            currency: "UZS",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                              .format(suppliersSummary.total_left_debt)
                              .replace("UZS", "")
                              .trim()}
                        </p>
                      </div>
                      <Wallet className="h-12 w-12 text-red-500" />
                    </div>
                  </div>

                  {/* Suppliers Table */}
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full border-collapse bg-white text-sm dark:bg-card">
                      <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium text-gray-900">
                          {t("dashboard.supplier_name") || "Supplier Name"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900 text-right">
                          {t("dashboard.total_purchases") || "Total Purchases"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900 text-right">
                          {t("dashboard.total_debts") || "Total Debts"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900 text-right">
                          {t("dashboard.total_paid") || "Total Paid"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900 text-right">
                          {t("dashboard.remaining_debt") || "Remaining Debt"}
                        </th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                      {suppliersSummary.suppliers.map((supplier, index) => (
                          <tr
                              key={index}
                              className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                  <Users className="h-4 w-4" />
                                </div>
                                <span className="font-medium">
                                  {supplier.supplier_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {new Intl.NumberFormat("uz-UZ", {
                                style: "currency",
                                currency: "UZS",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                                  .format(supplier.total_purchases)
                                  .replace("UZS", "")
                                  .trim()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-orange-600">
                              {new Intl.NumberFormat("uz-UZ", {
                                style: "currency",
                                currency: "UZS",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                                  .format(supplier.total_debts)
                                  .replace("UZS", "")
                                  .trim()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              {new Intl.NumberFormat("uz-UZ", {
                                style: "currency",
                                currency: "UZS",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                                  .format(supplier.total_paid)
                                  .replace("UZS", "")
                                  .trim()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-red-600">
                              {new Intl.NumberFormat("uz-UZ", {
                                style: "currency",
                                currency: "UZS",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                                  .format(supplier.remaining_debt)
                                  .replace("UZS", "")
                                  .trim()}
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">
                    {t("dashboard.no_supplier_data") ||
                        "No supplier data available"}
                  </p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow mb-8 dark:bg-card">
          <CardHeader>
            <CardTitle>
              {t("dashboard.revenue_analysis") || "Анализ доходов"}
            </CardTitle>
            <CardDescription>
              {t("dashboard.detailed_view_of_sales_performance") ||
                  "Детальный обзор показателей продаж"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={formattedData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 60,
                      bottom: 10,
                    }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                      width={70}
                      tickFormatter={(value) =>
                          new Intl.NumberFormat("uz-UZ", {
                            notation: "compact",
                            compactDisplay: "short",
                          }).format(value)
                      }
                  />
                  <Tooltip
                      formatter={(value) => [
                        new Intl.NumberFormat("uz-UZ", {
                          style: "currency",
                          currency: "UZS",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                            .format(Number(value))
                            .replace("UZS", "")
                            .trim(),
                        "Доход",
                      ]}
                  />
                  <Legend />
                  <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#ff7300"
                      activeDot={{ r: 8 }}
                      name="Доходы"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products and Stock by Category */}
        <div className="w-full mb-8 space-y-8">
          {/* Stock by Category - Full Width */}
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-purple-500 dark:bg-card">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl font-bold text-purple-700">
                {t("dashboard.stock_by_category")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.current_inventory_by_category")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div>
                {stockByCategory.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="overflow-x-auto rounded-lg border border-gray-200 ">
                        <table className="w-full border-collapse bg-white text-sm dark:bg-card">
                          <thead className="bg-gray-50">
                          <tr className="text-left">
                            <th className="px-4 py-3 font-medium text-gray-900">
                              {t("dashboard.category")}
                            </th>
                            <th className="px-4 py-3 font-medium text-gray-900 text-right">
                              {t("dashboard.total_stock")}
                            </th>
                          </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                          {stockByCategory.map((category, index) => (
                              <tr
                                  key={index}
                                  className="hover:bg-purple-50/30 transition-colors"
                              >
                                <td className="px-4 py-3 flex items-center gap-3">
                                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                    <BarChart2 className="h-4 w-4" />
                                  </div>
                                  <span className="font-medium">
                                {category.category}
                              </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                {category.total_stock}
                              </span>
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Add visual chart representation */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200 dark:bg-card">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">
                          {t("dashboard.category_distribution")}
                        </h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stockByCategory.map((cat) => ({
                                  name: cat.category,
                                  value: cat.total_stock,
                                }))}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={false}
                              />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip
                                  formatter={(value) => [
                                    value,
                                    t("dashboard.total_stock"),
                                  ]}
                              />
                              <Bar
                                  dataKey="value"
                                  fill="#8884d8"
                                  radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <BarChart2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500">
                        {t("dashboard.no_category_data_available")}
                      </p>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Intake Chart */}
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-2 dark:bg-card">
            <CardHeader>
              <CardTitle>{t("dashboard.product_intake")}</CardTitle>
              <CardDescription>
                {t("dashboard.products_coming_into_storage")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productIntake && productIntake.data.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted/20 p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground">
                          {t("dashboard.total_positions")}
                        </div>
                        <div className="text-2xl font-bold">
                          {productIntake.total_positions}
                        </div>
                      </div>
                      <div className="bg-muted/20 p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground">
                          {t("dashboard.total_sum")}
                        </div>
                        <div className="text-2xl font-bold">
                          {new Intl.NumberFormat("uz-UZ", {
                            style: "currency",
                            currency: "UZS",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                              .format(productIntake.total_sum)
                              .replace("UZS", "")
                              .trim()}
                        </div>
                      </div>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formattedIntakeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" />
                          <YAxis
                              yAxisId="left"
                              orientation="left"
                              stroke="#82ca9d"
                          />
                          <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="#8884d8"
                          />
                          <Tooltip
                              formatter={(value, name) => {
                                if (name === "price") {
                                  return [
                                    Number(value || 0).toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }),
                                    t("dashboard.total_price"),
                                  ];
                                }
                                if (name === "quantity") {
                                  return [
                                    Number(value || 0).toLocaleString("en-US", {
                                      maximumFractionDigits: 2,
                                    }),
                                    t("dashboard.quantity"),
                                  ];
                                }
                                return [value, name];
                              }}
                          />
                          <Legend />
                          <Bar
                              yAxisId="left"
                              dataKey="quantity"
                              name={t("dashboard.quantity")}
                              fill="#82ca9d"
                          />
                          <Bar
                              yAxisId="right"
                              dataKey="price"
                              name={t("dashboard.total_price")}
                              fill="#8884d8"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
              ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    {t("dashboard.no_product_intake_data_available")}
                  </div>
              )}
            </CardContent>
          </Card>

          {/* Client Debts - Full Width */}
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-2 mb-8 dark:bg-card">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {t("dashboard.client_debts") || "Долги клиентов"}
                  </CardTitle>
                  <CardDescription>
                    {t("dashboard.outstanding_client_debts") ||
                        "Неоплаченные долги клиентов"}
                  </CardDescription>
                </div>
                <div className="bg-amber-100 px-3 py-1 rounded-full text-amber-800 text-sm font-medium">
                  {clientDebts.length > 0 ? clientDebts.length : 0}{" "}
                  {t("dashboard.clients") || "clients"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {clientDebts.length > 0 ? (
                  <div>
                    {/* Summary metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col dark:bg-card">
                    <span className="text-sm text-gray-500 mb-1">
                      {t("dashboard.total_debt") || "Total Debt"}
                    </span>
                        <span className="text-xl font-bold">
                      {new Intl.NumberFormat("uz-UZ", {
                        style: "currency",
                        currency: "UZS",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                          .format(
                              clientDebts.reduce(
                                  (sum, client) => sum + Number(client.total_debt),
                                  0
                              )
                          )
                          .replace("UZS", "")
                          .trim()}
                    </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col dark:bg-card">
                    <span className="text-sm text-gray-500 mb-1">
                      {t("dashboard.total_paid") || "Total Paid"}
                    </span>
                        <span className="text-xl font-bold text-green-600">
                      {new Intl.NumberFormat("uz-UZ", {
                        style: "currency",
                        currency: "UZS",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                          .format(
                              clientDebts.reduce(
                                  (sum, client) => sum + Number(client.total_paid),
                                  0
                              )
                          )
                          .replace("UZS", "")
                          .trim()}
                    </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col dark:bg-card">
                    <span className="text-sm text-gray-500 mb-1">
                      {t("dashboard.remaining_debt") || "Remaining Debt"}
                    </span>
                        <span className="text-xl font-bold text-destructive">
                      {new Intl.NumberFormat("uz-UZ", {
                        style: "currency",
                        currency: "UZS",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                          .format(
                              clientDebts.reduce(
                                  (sum, client) =>
                                      sum + Number(client.remaining_debt),
                                  0
                              )
                          )
                          .replace("UZS", "")
                          .trim()}
                    </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col dark:bg-card">
                    <span className="text-sm text-gray-500 mb-1">
                      {t("dashboard.deposit") || "Deposit"}
                    </span>
                        <span className="text-xl font-bold text-blue-600">
                      {new Intl.NumberFormat("uz-UZ", {
                        style: "currency",
                        currency: "UZS",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                          .format(
                              clientDebts.reduce(
                                  (sum, client) => sum + Number(client.deposit),
                                  0
                              )
                          )
                          .replace("UZS", "")
                          .trim()}
                    </span>
                      </div>
                    </div>

                    {/* Enhanced Table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full border-collapse bg-white text-sm dark:bg-card">
                        <thead className="bg-gray-50">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-medium text-gray-900">
                            {t("dashboard.client") || "Client"}
                          </th>
                          <th className="px-4 py-3 font-medium text-gray-900 text-right">
                            {t("dashboard.total_debt") || "Total Debt"}
                          </th>
                          <th className="px-4 py-3 font-medium text-gray-900 text-right">
                            {t("dashboard.total_paid") || "Total Paid"}
                          </th>
                          <th className="px-4 py-3 font-medium text-gray-900 text-right">
                            {t("dashboard.remaining_debt") || "Remaining"}
                          </th>
                          <th className="px-4 py-3 font-medium text-gray-900 text-right">
                            {t("dashboard.deposit") || "Deposit"}
                          </th>
                          {/* <th className="px-4 py-3 font-medium text-gray-900 text-right">{t('dashboard.payment_status') || 'Status'}</th> */}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {clientDebts.map((client, index) => {
                          // Calculate payment percentage
                          // const totalDebt = Number(client.total_debt) || 0;
                          // const totalPaid = Number(client.total_paid) || 0;
                          // const paymentPercentage = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;

                          return (
                              <tr key={index} className="">
                                <td className="px-4 py-3 flex items-center gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                                      <Users className="h-4 w-4" />
                                    </div>
                                    <div className="font-medium dark:text-white-900">
                                      {client.client_name}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-medium">
                                  {new Intl.NumberFormat("uz-UZ", {
                                    style: "currency",
                                    currency: "UZS",
                                  })
                                      .format(Number(client.total_debt))
                                      .replace("UZS", "")
                                      .trim()}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">
                                  {new Intl.NumberFormat("uz-UZ", {
                                    style: "currency",
                                    currency: "UZS",
                                  })
                                      .format(Number(client.total_paid))
                                      .replace("UZS", "")
                                      .trim()}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-destructive">
                                  {new Intl.NumberFormat("uz-UZ", {
                                    style: "currency",
                                    currency: "UZS",
                                  })
                                      .format(Number(client.remaining_debt))
                                      .replace("UZS", "")
                                      .trim()}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-blue-600">
                                  {new Intl.NumberFormat("uz-UZ", {
                                    style: "currency",
                                    currency: "UZS",
                                  })
                                      .format(Number(client.deposit))
                                      .replace("UZS", "")
                                      .trim()}
                                </td>
                              </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                  </div>
              ) : (
                  <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">
                      {t("dashboard.no_client_debt_data_available") ||
                          "No client debt data available"}
                    </p>
                  </div>
              )}
            </CardContent>
          </Card>

          {/* Unsold Products */}

          {currentUser?.is_superuser && (
              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-2 dark:bg-card">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {t("dashboard.unsold_products") || "Unsold Products"}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.products_with_no_sales") ||
                            "Products that have not been sold"}
                      </CardDescription>
                    </div>
                    {unsoldProducts.length > 0 && (
                        <div className="bg-red-100 px-3 py-1 rounded-full text-red-800 text-sm font-medium dark:bg-card">
                          {unsoldProducts.length} {t("dashboard.items") || "items"}
                        </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {unsoldProducts.length > 0 ? (
                      <div>
                        {/* Grid layout for unsold products */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {unsoldProducts
                              .slice(0, displayedUnsoldProducts)
                              .map((product, index) => (
                                  <div
                                      key={index}
                                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow dark:bg-card"
                                  >
                                    <div className="flex items-start space-x-3">
                                      <div className="bg-red-50 p-2 rounded-full">
                                        <Package className="h-5 w-5 text-red-500" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium  mb-1 truncate">
                                          {product.product_name}
                                        </h4>
                                      </div>
                                    </div>
                                  </div>
                              ))}
                        </div>

                        {/* Show more button */}
                        {displayedUnsoldProducts < unsoldProducts.length && (
                            <div className="mt-4">
                              <button
                                  onClick={handleShowMoreUnsoldProducts}
                                  className="w-full inline-flex items-center justify-center rounded-md border border-transparent  px-4 py-2 text-sm font-medium  shadow-sm transition-colors dark:bg-card"
                              >
                                {t("dashboard.show_more") || "Show More"}
                              </button>
                            </div>
                        )}
                      </div>
                  ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-500 mb-4">
                          <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-6 h-6"
                          >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-green-800 text-lg font-medium mb-2">
                          {t("dashboard.no_unsold_products") || "No unsold products"}
                        </h3>
                        <p className="text-green-700">
                          {t("dashboard.all_products_sold") ||
                              "All products have been sold at least once!"}
                        </p>
                      </div>
                  )}
                </CardContent>
              </Card>
          )}
        </div>

        {/* Top Sellers */}
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow mb-8 border-t-4 border-t-emerald-500 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-emerald-700">
                {t("dashboard.top_sellers") || "Лучшие продавцы"}
              </CardTitle>
              <CardDescription>
                {t("dashboard.top_performing_stores") ||
                    "Лучшие магазины и продавцы"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div>
              {topSellers.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full border-collapse bg-white text-sm dark:bg-card">
                      <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium text-gray-900">
                          {t("dashboard.rank") || "Rank"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900">
                          {t("dashboard.store") || "Store"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900">
                          {t("dashboard.seller") || "Seller"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900 text-right">
                          {t("dashboard.revenue") || "Revenue"}
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-900 text-right">
                          {t("dashboard.total_sales") || "Total Sales"}
                        </th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                      {topSellers.map((seller, index) => {
                        // Get medal colors for top 3 performers
                        const rankColors = [
                          "bg-amber-100 text-amber-800",
                          "bg-gray-100 text-gray-800",
                          "bg-amber-50 text-amber-700",
                        ];

                        return (
                            <tr key={index} className="">
                              <td className="px-4 py-3">
                            <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                    index < 3
                                        ? rankColors[index]
                                        : "bg-gray-50 text-gray-600"
                                }`}
                            >
                              {index + 1}
                            </span>
                              </td>
                              <td className="px-4 py-3">
                            <span className="font-medium ">
                              {seller.store_name}
                            </span>
                              </td>
                              <td className="px-4 py-3">
                            <span className="font-medium ">
                              {seller.seller_name || "-"}
                            </span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {new Intl.NumberFormat("uz-UZ", {
                                  style: "currency",
                                  currency: "UZS",
                                })
                                    .format(seller.total_revenue)
                                    .replace("UZS", "")
                                    .trim()}
                              </td>
                              <td className="px-4 py-3 text-right">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs">
                              {seller.total_sales}
                            </span>
                              </td>
                            </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
              ) : (
                  <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">{t("dashboard.no_seller_data")}</p>
                  </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default DashboardPage;
