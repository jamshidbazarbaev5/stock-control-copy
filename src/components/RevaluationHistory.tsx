import React, { useEffect, useState } from "react";
import { useRevaluationHistory, type RevaluationHistoryItem } from "../core/api/revaluation";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { ResourceTable } from "../core/helpers/ResourseTable";
import { Input } from "./ui/input";

export const RevaluationHistory: React.FC = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [productName, setProductName] = useState("");

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [productName]);

  const { data, isLoading } = useRevaluationHistory({
    page: currentPage,
    product_name: productName || undefined,
  });

  const columns = [
    {
      header: t("table.products"),
      accessorKey: "revaluation_products",
      cell: (row: RevaluationHistoryItem) => (
        <div className="space-y-1">
          {row.revaluation_products.map((product) => (
            <div key={product.product} className="text-sm">
              <div>{product.product_name}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: t("table.date"),
      accessorKey: "created_at",
      cell: (row: RevaluationHistoryItem) =>
        format(new Date(row.created_at), "dd.MM.yyyy HH:mm"),
    },
    {
      header: t("table.new_selling_price"),
      accessorKey: "new_selling_price",
    },
    {
      header: t("table.new_min_price"),
      accessorKey: "new_min_price",
    },
  ];

  const pageSize = data?.page_size ?? 30;
  const totalPages = data?.total_pages ?? 0;

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex max-w-sm">
        <Input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder={t("forms.search_by_product_name")}
        />
      </div>
      <ResourceTable
        data={data?.results || []}
        columns={columns}
        isLoading={isLoading}
        pageSize={pageSize}
        totalCount={totalPages * pageSize}
        currentPage={data?.current_page || 1}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
