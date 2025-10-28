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
}

export const StockSelectionModal: React.FC<StockSelectionModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  onStockSelect,
}) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      setLoading(true);
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
    const selectedStock = stocks.find((s) => s.id === selectedStockId);
    if (selectedStock) {
      onStockSelect(selectedStock);
      onClose();
    } else {
      toast.error("Пожалуйста, выберите склад");
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
              {stocks.map((stock:any) => (
                <div
                  key={stock.id}
                  onClick={() => setSelectedStockId(stock.id || null)}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-all
                    ${
                      selectedStockId === stock.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }
                  `}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Количество</p>
                      <p className="font-medium">
                        {formatCurrency(stock.quantity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Партия</p>
                      <p className="font-medium">
                        {stock.stock_name || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t">

              <div className="flex gap-2">
                <Button onClick={onClose} variant="outline">
                  Отмена
                </Button>
                <Button
                  onClick={handleSelect}
                  disabled={!selectedStockId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Выбрать
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
