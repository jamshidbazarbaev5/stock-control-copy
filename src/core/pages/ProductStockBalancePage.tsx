import { useTranslation } from "react-i18next";
import { ResourceTable } from "../helpers/ResourseTable";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useGetStores } from "../api/store";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Button } from "@/components/ui/button";

interface ProductStockBalance {
  product__product_name: string;
  store__name: string;
  total_quantity: number;
  total_cost_usd: number;
}

interface StockBalanceResponse {
  count: number;
  total: number;
  total_volume: number;
  total_pages: number;
  current_page: number;
  page_range: number[];
  links: {
    first: string | null;
    last: string | null;
    next: string | null;
    previous: string | null;
  };
  page_size: number;
  results: {
    total_product: number;
    total: number;
    total_cost: number;
    total_cost_usd: number;
    info_products: ProductStockBalance[];
    total_volume: number;
  };
}

export default function ProductStockBalancePage() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [showZeroStock, setShowZeroStock] = useState<"true" | "false">("false");
  const [productName, setProductName] = useState("");


  const formatNumber = (value: string | number) => {
    return Number(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStore, showZeroStock, productName]);

  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData)
    ? storesData
    : storesData?.results || [];
  const { data: currentUser } = useCurrentUser();
  const { data, isLoading } = useQuery<StockBalanceResponse>({
    queryKey: [
      "stockBalance",
      currentPage,
      selectedStore,
      showZeroStock,
      productName,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
      });
      if (selectedStore !== "all") {
        params.append("store", selectedStore);
      }
      params.append("product_zero", showZeroStock);
      if (productName) params.append("product_name", productName);
      const response = await api.get(
        `/dashboard/item_dashboard/?${params.toString()}`
      );
      return response.data;
    },
    placeholderData: (prev) => prev as any,
  });

  const columns = [
    {
      header: t("table.product"),
      accessorKey: "product__product_name",
    },
    {
      header: t("table.store"),
      accessorKey: "store__name",
    },
    {
      header: t("table.quantity"),
      accessorKey: "total_quantity",
      cell: (row: any) => row.total_quantity?.toLocaleString(),
    },
    {
      header: t("table.total_cost"),
      accessorKey: "total_cost",
      cell: (row: any) => row.total_cost?.toLocaleString(),
    },
    ...(currentUser?.is_superuser ? [{
      header: t("table.total_cost_usd") || "Стоимость (USD)",
      accessorKey: "total_cost_usd",
      cell: (row: any) => row.total_cost_usd ? `${row.total_cost_usd.toLocaleString()} $` : "",
    }] : []),
    {
      header: t("table.total_kub_volume"),
      accessorKey: "total_kub_volume",
      cell: (row: any) => {
        const kub =
          typeof row?.total_kub === "number"
            ? row.total_kub.toFixed(2).replace(".", ",")
            : null;
        const kubVol =
          typeof row?.total_kub_volume === "number"
            ? row.total_kub_volume.toFixed(2).replace(".", ",")
            : null;
        if (kub && kubVol) return `${kub} / ${kubVol}`;
        if (kub) return kub;
        if (kubVol) return kubVol;
        return "0,00";
      },
    },

  ];

  // Change handler to ensure correct type
  const handleShowZeroStockChange = (value: string) => {
    setShowZeroStock(value === "true" ? "true" : "false");
  };

  // Add Excel export handler
  const handleExportExcel = async () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
    });
    if (selectedStore !== "all") {
      params.append("store", selectedStore);
    }
    params.append("product_zero", showZeroStock);
    if (productName) params.append("product_name", productName);
    try {
      const response = await api.get(
        `/dashboard/excel_export/?${params.toString()}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "stock_balance.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      // Optionally show error to user
      alert("Ошибка при экспорте Excel");
    }
  };
  

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">{t("navigation.stock_balance")}</h1>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {currentUser?.is_superuser && (
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={t("forms.select_store")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("forms.all_stores")}</SelectItem>
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
            )}
            <Select
              value={showZeroStock}
              onValueChange={handleShowZeroStockChange}
            >
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Показать нулевые остатки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Показать нулевые остатки</SelectItem>
                <SelectItem value="false">
                  Не показывать нулевые остатки
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full">
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={t(
                "forms.search_by_product_name",
                "Поиск по названию товара"
              )}
              className="w-full h-12 text-base px-4"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 mb-4">
          <div className="flex gap-4 flex-wrap flex-1">
            <Card className="px-6 py-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 shadow-md">
              <div className="flex flex-col">
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {t("table.total_volume")}
                </span>
                {typeof data?.results.total === "number" && (
                  <span className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {data.results.total.toFixed(2).replace(".", ",")} м³
                  </span>
                )}
              </div>
            </Card>

            {currentUser?.is_superuser && (
              <>
                <Card className="px-6 py-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 shadow-md">
                  <div className="flex flex-col">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      {t("table.total_cost")}
                    </span>
                    {typeof data?.results.total_cost === "number" && (
                      <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                        {formatNumber(data.results.total_cost)} UZS
                      </span>
                    )}
                  </div>
                </Card>

                <Card className="px-6 py-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 shadow-md">
                  <div className="flex flex-col">
                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {t("table.total_cost_usd") || "Общая сумма в USD"}
                    </span>
                    {typeof data?.results.total_cost_usd === "number" && (
                      <span className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                        {formatNumber(data.results.total_cost_usd)} $
                      </span>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>

          <Button onClick={handleExportExcel} variant="outline" className="ml-4">
            {t("buttons.export_excel", "Экспорт в Excel")}
          </Button>
        </div>
      </div>
      <Card className="mt-4">
        <ResourceTable
          data={data?.results.info_products || []}
          columns={columns}
          isLoading={isLoading}
          pageSize={30}
          totalCount={data?.count || 0}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
}
