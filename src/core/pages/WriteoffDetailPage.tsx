import { useNavigate, useParams } from "react-router-dom";
import { useGetWriteoff, useUpdateWriteoff } from "../api/writeoff";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Edit2, Save, X } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function WriteoffDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const writeoffId = parseInt(id || "0");

  const { data: writeoff, isLoading } = useGetWriteoff(writeoffId);
  const updateMutation = useUpdateWriteoff();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  const handleEditNotes = () => {
    setNotes(writeoff?.notes || "");
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    try {
      await updateMutation.mutateAsync({ id: writeoffId, notes });
      toast.success("Примечания обновлены");
      setIsEditingNotes(false);
    } catch (error) {
      toast.error("Ошибка при обновлении");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!writeoff) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Списание не найдено</p>
          <Button onClick={() => navigate("/writeoffs")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться к списку
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => navigate("/writeoffs")}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Списание #{writeoff.id}
            </h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">
            Создано: {new Date(writeoff.created_at).toLocaleString("ru-RU")}
          </p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Main Information */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Основная информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Магазин</label>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {writeoff.items?.[0]?.stock_read?.store?.name || "-"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Причина</label>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {writeoff.reason}
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-500">Примечания</label>
                {!isEditingNotes ? (
                  <Button onClick={handleEditNotes} variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNotes} variant="ghost" size="sm" disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => setIsEditingNotes(false)} variant="ghost" size="sm">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {isEditingNotes ? (
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              ) : (
                <p className="text-base sm:text-lg mt-1">{writeoff.notes || "-"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Создатель</label>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {writeoff.created_by}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Количество товаров</label>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {writeoff.items?.length || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Items */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Товары</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">
                    №
                  </th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">
                    Товар
                  </th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">
                    Количество
                  </th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">
                    Ед. изм.
                  </th>
                  <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 text-xs sm:text-sm">
                    Валюта
                  </th>
                </tr>
              </thead>
              <tbody>
                {writeoff.items?.map((item:any, index:number) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600">
                      {index + 1}
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                      <div className="font-medium">{item.stock_read.product.product_name}</div>
                      {item.stock_read.stock_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.stock_read.stock_name}
                        </div>
                      )}
                    </td>
                    <td className="p-2 sm:p-3 text-right font-semibold text-xs sm:text-sm">
                      {parseFloat(item.quantity).toFixed(2)}
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                      {item.stock_read.purchase_unit.short_name}
                    </td>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm">
                      {item.stock_read.currency.short_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Product Attributes */}
        {writeoff.items?.map((item:any) => (
          item.stock_read.product.attribute_values?.length > 0 && (
            <Card key={item.id} className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">
                {item.stock_read.product.product_name}
              </h3>
              <div className="space-y-3">
                {item.stock_read.product.attribute_values.map((attrValue: any) => (
                  <div key={attrValue.id} className="flex flex-col sm:flex-row sm:items-start gap-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-500 min-w-[200px]">
                      {attrValue.attribute.translations?.ru || attrValue.attribute.name}
                    </label>
                    <div className="text-sm sm:text-base">
                      {attrValue.attribute.field_type === 'boolean' ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          attrValue.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {attrValue.value ? 'Да' : 'Нет'}
                        </span>
                      ) : attrValue.attribute.field_type === 'many2many' && attrValue.attribute.related_objects ? (
                        <div className="flex flex-wrap gap-1">
                          {attrValue.attribute.related_objects
                            .filter((obj: any) => attrValue.value?.includes(obj.id))
                            .map((obj: any) => (
                              <span key={obj.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {obj.name}
                              </span>
                            ))
                          }
                        </div>
                      ) : (
                        <span className="text-gray-900">{attrValue.value?.toString() || '-'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        ))}
      </div>
    </div>
  );
}
