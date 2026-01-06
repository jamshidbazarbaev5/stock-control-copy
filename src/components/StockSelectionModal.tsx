import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchStockByProduct, type Stock } from "@/core/api/stock";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StockSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  onStockSelect: (stock: Stock) => void;
  allowMultipleSelect?: boolean;
  onMultipleStockSelect?: (stocks: Stock[]) => void;
}

export const StockSelectionModal: React.FC<StockSelectionModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  onStockSelect,
  allowMultipleSelect = false,
  onMultipleStockSelect,
}) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
  const [selectedStockIds, setSelectedStockIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen && productId) {
      setLoading(true);
      setSelectedStockId(null);
      setSelectedStockIds(new Set());
      fetchStockByProduct(productId, false)
        .then((data) => {
          setStocks(data);
          if (data.length === 0) {
            toast.error("Нет доступного склада для этого товара");
          }
        })
        .catch((error) => {
          console.error("Error fetching stock:", error);
          toast.error("Ошибка при загрузке склада");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, productId]);

  const handleSelect = () => {
    if (allowMultipleSelect) {
      // Multiple selection mode
      if (selectedStockIds.size === 0) {
        toast.error("Пожалуйста, выберите хотя бы один склад");
        return;
      }
      const selectedStocks = stocks.filter((s) => selectedStockIds.has(s.id || 0));
      if (onMultipleStockSelect) {
        onMultipleStockSelect(selectedStocks);
      }
      onClose();
    } else {
      // Single selection mode
      const selectedStock = stocks.find((s) => s.id === selectedStockId);
      if (selectedStock) {
        onStockSelect(selectedStock);
        onClose();
      } else {
        toast.error("Пожалуйста, выберите склад");
      }
    }
  };

  const handleStockToggle = (stockId: number) => {
    if (allowMultipleSelect) {
      const newSelected = new Set(selectedStockIds);
      if (newSelected.has(stockId)) {
        newSelected.delete(stockId);
      } else {
        newSelected.add(stockId);
      }
      setSelectedStockIds(newSelected);
    } else {
      setSelectedStockId(stockId);
    }
  };



  // const formatDate = (dateString?: string) => {
  //   if (!dateString) return "-";
  //   try {
  //     return new Date(dateString).toLocaleDateString("ru-RU");
  //   } catch {
  //     return dateString;
  //   }
  // };

  const formatCurrency = (value?: string | number) => {
    if (!value) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return Number(num.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Выбор склада для товара</DialogTitle>
          <DialogDescription>
            Выберите склад для продажи: <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Нет доступных складов для этого товара
            </p>
            <Button onClick={onClose} variant="outline">
              Закрыть
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stocks.map((stock:any) => {
                const isSelected = allowMultipleSelect
                  ? selectedStockIds.has(stock.id || 0)
                  : selectedStockId === stock.id;

                return (
                  <div
                    key={stock.id}
                    onClick={() => handleStockToggle(stock.id || 0)}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all flex items-start gap-3
                      ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }
                    `}
                  >
                    {allowMultipleSelect && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleStockToggle(stock.id || 0)}
                        className="mt-1"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div>
                        <p className="text-xs text-gray-500">Количество</p>
                        <p className="font-medium">
                          {formatCurrency(
                            (Number(stock.quantity) || 0) + (Number(stock.extra_quantity) || 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Рулон / Склад</p>
                        <p className="font-medium">
                          {stock.stock_name || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t">

              <div className="flex gap-2">
                <Button onClick={onClose} variant="outline">
                  Отмена
                </Button>
                <Button
                  onClick={handleSelect}
                  disabled={allowMultipleSelect ? selectedStockIds.size === 0 : !selectedStockId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {allowMultipleSelect ? `Выбрать (${selectedStockIds.size})` : "Выбрать"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
