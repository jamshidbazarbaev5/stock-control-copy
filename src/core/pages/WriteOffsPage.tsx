import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetWriteoffs, WRITEOFF_REASONS } from "../api/writeoff";
import { ResourceTable } from "../helpers/ResourseTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye } from "lucide-react";
import { useGetStores } from "../api/store";

interface WriteOffItem {
  id: number;
  stock_read: {
    id: number;
    store: {
      id: number;
      name: string;
    };
    product: {
      id: number;
      product_name: string;
      base_unit: number;
      attribute_values: any[];
    };
    stock_name: string | null;
    currency: {
      id: number;
      name: string;
      short_name: string;
      is_base: boolean;
    };
    supplier: {
      id: number;
      name: string;
    };
    purchase_unit: {
      id: number;
      measurement_name: string;
      short_name: string;
    };
    dynamic_fields: any;
    is_debt: boolean;
    amount_of_debt: string;
    advance_of_debt: string | null;
    date_of_arrived: string;
  };
  quantity: string;
}

interface WriteOff {
  id: number;
  items: WriteOffItem[];
  reason: string;
  notes: string;
  created_at: string;
  store: number;
  created_by: number;
}

export default function WriteOffsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Filter states
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [createdAtAfter, setCreatedAtAfter] = useState<string>("");
  const [createdAtBefore, setCreatedAtBefore] = useState<string>("");
  
  const { data: writeoffsData, isLoading } = useGetWriteoffs({
    ...(selectedStore && selectedStore !== "all" && { store: selectedStore }),
    ...(selectedReason && selectedReason !== "all" && { reason: selectedReason }),
    ...(createdAtAfter && { created_at_after: createdAtAfter }),
    ...(createdAtBefore && { created_at_before: createdAtBefore }),
  });
  
  const { data: storesData } = useGetStores({});

  const writeoffs = Array.isArray(writeoffsData) ? writeoffsData : writeoffsData?.results || [];
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  const columns: Array<{ header: string; accessorKey: string; cell: (row: WriteOff) => React.ReactNode }> = [
    {
      header: "№",
      accessorKey: "id",
      cell: (row: WriteOff) => row.id,
    },
    {
      header: t("table.store"),
      accessorKey: "store",
      cell: (row: WriteOff) => {
        const item = row.items?.[0];
        return item?.stock_read?.store?.name || "-";
      },
    },
    {
      header: t("common.reason"),
      accessorKey: "reason",
      cell: (row: WriteOff) => row.reason,
    },
    {
      header: t("common.notes"),
      accessorKey: "notes",
      cell: (row: WriteOff) => (
        <div className="max-w-xs truncate" title={row.notes}>
          {row.notes || "-"}
        </div>
      ),
    },
    {
      header: "Количество товаров",
      accessorKey: "items_count",
      cell: (row: WriteOff) => row.items?.length || 0,
    },
    {
      header: t("table.date"),
      accessorKey: "created_at",
      cell: (row: WriteOff) => {
        try {
          return new Date(row.created_at).toLocaleString("ru-RU");
        } catch {
          return row.created_at;
        }
      },
    },
    {
      header: "Действия",
      accessorKey: "actions",
      cell: (row: WriteOff) => (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/writeoffs/${row.id}`);
          }}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Просмотр</span>
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // @ts-ignore
  return (
    <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t("navigation.writeoffs")}</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
          Список всех списанных товаров
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger>
            <SelectValue placeholder={t("placeholders.select_store") || "Выберите склад"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все склады</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedReason} onValueChange={setSelectedReason}>
          <SelectTrigger>
            <SelectValue placeholder="Причина списания" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все причины</SelectItem>
            {Object.entries(WRITEOFF_REASONS).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={createdAtAfter}
          onChange={(e) => setCreatedAtAfter(e.target.value)}
          placeholder="Дата от"
        />

        <Input
          type="date"
          value={createdAtBefore}
          onChange={(e) => setCreatedAtBefore(e.target.value)}
          placeholder="Дата до"
        />
      </div>

      <Card className="p-3 sm:p-4 md:p-6">
        <ResourceTable<WriteOff>
          data={writeoffs}
          columns={columns}
          isLoading={isLoading}
          onRowClick={(writeoff) => {
            navigate(`/writeoffs/${writeoff.id}`);
          }}
        />
      </Card>
    </div>
  );
}
