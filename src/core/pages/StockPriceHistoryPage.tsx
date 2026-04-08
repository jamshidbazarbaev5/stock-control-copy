import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useGetStockHistory } from '../api/stock';
import { formatDate } from '../helpers/formatDate';
import {
  ArrowLeft, Package, DollarSign, TrendingUp, ArrowRightLeft,
  Recycle, Trash2, PlusCircle, BarChart3, Calendar, Store, Truck
} from 'lucide-react';

export default function StockPriceHistoryPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: stockHistory, isLoading } = useGetStockHistory(id ? parseInt(id) : 0);

  const fmt = (amount: string | number | null | undefined) => {
    if (amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('ru-RU').format(Number(amount));
  };

  const formatAttributeValue = (av: any): React.ReactNode => {
    const val = av.value;
    const attr = av.attribute;
    if (attr?.field_type === 'boolean') {
      return val ? <span className="text-green-600 font-medium">Да</span> : <span className="text-gray-400">Нет</span>;
    }
    if (attr?.field_type === 'many2many' && attr?.related_objects?.length) {
      const selectedIds = Array.isArray(val) ? val : [];
      const items = selectedIds.length > 0
        ? attr.related_objects.filter((obj: any) => selectedIds.includes(obj.id))
        : attr.related_objects;
      return (
        <div className="flex flex-wrap gap-1 justify-end">
          {items.map((obj: any) => (
            <span key={obj.id} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
              {obj.name}
            </span>
          ))}
        </div>
      );
    }
    return String(val ?? '-');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-20 text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (!stockHistory) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-20 text-gray-500">{t('common.no_history')}</div>
      </div>
    );
  }

  const h: any = stockHistory;
  const cur = h.currency?.short_name || h.currency?.name || 'UZS';
  const q = h.quantities || {};
  const fin = h.finances || {};
  const fc = h.forecast || {};
  const fcDetails = fc.details || {};
  const fcGroups = fc.groups || [];

  const groupLabels: Record<string, string> = {
    this_stock: 'Этот склад',
    transfers: 'Переводы',
    recyclings: 'Переработки',
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-6xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">
            {h.product?.product_name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-1">
            <Store className="h-3 w-3" />
            {h.store?.name}
            {h.date_arrived && <> &middot; <Calendar className="h-3 w-3" /> {formatDate(h.date_arrived)}</>}
            {h.stock_name && <> &middot; Партия: {h.stock_name}</>}
          </p>
          <p className="text-xs text-gray-400 flex flex-wrap items-center gap-2 mt-0.5">
            {h.currency && <span>Валюта: <b>{cur}</b></span>}
            {h.purchase_unit && <span>Ед. изм.: <b>{h.purchase_unit.short_name || h.purchase_unit.name}</b></span>}
            {h.supplier && <span><Truck className="h-3 w-3 inline" /> <b>{h.supplier.name}</b></span>}
          </p>
        </div>
      </div>

      {/* === QUANTITIES SUMMARY CARDS === */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        <SummaryCard icon={<Package className="h-4 w-4" />} label="Пришло" value={fmt(q.initial)} color="blue" />
        <SummaryCard icon={<PlusCircle className="h-4 w-4" />} label="Добавлено" value={fmt(q.extra_added)} color="gray" />
        <SummaryCard icon={<Package className="h-4 w-4" />} label="Остаток" value={fmt(q.remaining)} color="green" />
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Продано" value={fmt(q.sold)} color="violet" />
        <SummaryCard icon={<Recycle className="h-4 w-4" />} label="Возврат" value={fmt(q.refunded)} color="orange" />
      </div>

      {/* === QUANTITIES DETAIL TABLE === */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          Количество
        </div>
        <table className="w-full text-sm">
          <tbody>
            <Row label="Пришло (оригинал)" value={fmt(q.initial)} />
            <Row label="Добавлено (доп.)" value={fmt(q.extra_added)} />
            <Row label="Остаток" value={<span className="text-green-600 font-bold">{fmt(q.remaining)}</span>} />
            <Row label="Продано (этот магазин)" value={fmt(q.sold)} />
            <Row label="Возвращено покупателями" value={fmt(q.refunded)} />
            <Row label="Списано" value={fmt(q.written_off)} />
            <Row label="Возврат поставщику" value={fmt(q.returned_to_supplier)} />
            <Row label="Переведено в другие магазины" value={fmt(q.transferred_out)} />
            <Row label="Переработано в другой товар" value={fmt(q.recycled_out)} />
          </tbody>
        </table>
      </div>

      {/* === FINANCES === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Stock finances */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Финансы (этот склад)
          </div>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Себестоимость" value={`${fmt(fin.cost)} ${cur}`} />
              <Row label="Выручка" value={`${fmt(fin.stock_revenue)} ${cur}`} />
              <Row label="Выручка оплачено" value={<span className="text-green-600">{fmt(fin.stock_paid_revenue)} {cur}</span>} />
              <Row label="Выручка в долг" value={<span className="text-amber-600">{fmt(fin.stock_debt_revenue)} {cur}</span>} />
              <Row label="Прибыль" value={<span className="text-violet-600 font-bold">{fmt(fin.stock_profit)} {cur}</span>} />
              <Row label="Прибыль оплачено" value={<span className="text-green-600">{fmt(fin.stock_paid_profit)} {cur}</span>} />
              <Row label="Прибыль в долг" value={<span className="text-amber-600">{fmt(fin.stock_debt_profit)} {cur}</span>} />
            </tbody>
          </table>
        </div>

        {/* Total finances */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            Финансы (итого: склад + переводы + переработки)
          </div>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Общая выручка" value={`${fmt(fin.total_revenue)} ${cur}`} />
              <Row label="Общая выручка оплачено" value={<span className="text-green-600">{fmt(fin.total_paid_revenue)} {cur}</span>} />
              <Row label="Общая выручка в долг" value={<span className="text-amber-600">{fmt(fin.total_debt_revenue)} {cur}</span>} />
              <Row label="Общая прибыль" value={<span className="text-violet-600 font-bold">{fmt(fin.total_profit)} {cur}</span>} />
              <Row label="Общая прибыль оплачено" value={<span className="text-green-600">{fmt(fin.total_paid_profit)} {cur}</span>} />
              <Row label="Общая прибыль в долг" value={<span className="text-amber-600">{fmt(fin.total_debt_profit)} {cur}</span>} />
              <Row label="Убыток от списания" value={<span className="text-red-600">{fmt(fin.writeoff_loss)} {cur}</span>} />
            </tbody>
          </table>
        </div>
      </div>

      {/* === TRANSFERS === */}
      {h.transfers && h.transfers.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 font-semibold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2 text-blue-700">
              <ArrowRightLeft className="h-4 w-4 text-blue-500" />
              Переводы в другие магазины
            </span>
            <span className="text-blue-700 font-bold">{h.transfers.length}</span>
          </div>
          <div className="divide-y">
            {h.transfers.map((tr: any, idx: number) => (
              <div
                key={idx}
                className="px-4 py-3 hover:bg-blue-50/50 cursor-pointer transition-colors"
                onClick={() => tr.stock_id && navigate(`/stock/${tr.stock_id}/history/`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-blue-700">{tr.to_store}</span>
                  <span className="text-xs text-gray-400">{tr.date ? formatDate(tr.date) : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div><span className="text-gray-500">Отправлено:</span> <b>{fmt(tr.quantity)}</b></div>
                  <div><span className="text-gray-500">Продано:</span> <b>{fmt(tr.sold)}</b></div>
                  <div><span className="text-gray-500">Остаток:</span> <b className="text-green-600">{fmt(tr.remaining)}</b></div>
                  <div><span className="text-gray-500">Выручка:</span> <b>{fmt(tr.revenue)} {cur}</b></div>
                  <div><span className="text-gray-500">Прибыль:</span> <b className="text-violet-600">{fmt(tr.profit)} {cur}</b></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === RECYCLINGS === */}
      {h.recyclings && h.recyclings.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-200 font-semibold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2 text-orange-700">
              <Recycle className="h-4 w-4 text-orange-500" />
              Переработки
            </span>
            <span className="text-orange-700 font-bold">{h.recyclings.length}</span>
          </div>
          <div className="divide-y">
            {h.recyclings.map((rc: any, idx: number) => (
              <div
                key={idx}
                className="px-4 py-3 hover:bg-orange-50/50 cursor-pointer transition-colors"
                onClick={() => rc.stock_id && navigate(`/stock/${rc.stock_id}/history/`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-orange-700">{rc.to_product}</span>
                  <span className="text-xs text-gray-400">{rc.date ? formatDate(rc.date) : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div><span className="text-gray-500">Потрачено:</span> <b>{fmt(rc.quantity)}</b></div>
                  <div><span className="text-gray-500">Продано:</span> <b>{fmt(rc.sold)}</b></div>
                  <div><span className="text-gray-500">Остаток:</span> <b className="text-green-600">{fmt(rc.remaining)}</b></div>
                  <div><span className="text-gray-500">Выручка:</span> <b>{fmt(rc.revenue)} {cur}</b></div>
                  <div><span className="text-gray-500">Прибыль:</span> <b className="text-violet-600">{fmt(rc.profit)} {cur}</b></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === WRITEOFFS === */}
      {h.writeoffs && h.writeoffs.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 font-semibold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-4 w-4 text-red-500" />
              Списания
            </span>
            <span className="text-red-700 font-bold">{h.writeoffs.length}</span>
          </div>
          <div className="divide-y">
            {h.writeoffs.map((wo: any, idx: number) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-600">{fmt(wo.quantity)} шт</span>
                  <span className="text-gray-500">{wo.user}</span>
                </div>
                <span className="text-xs text-gray-400">{wo.date ? formatDate(wo.date) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === EXTRAS === */}
      {h.extras && h.extras.length > 0 && (
        <div className="bg-white border border-green-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-green-50 border-b border-green-200 font-semibold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2 text-green-700">
              <PlusCircle className="h-4 w-4 text-green-500" />
              Доп. добавления
            </span>
            <span className="text-green-700 font-bold">{h.extras.length}</span>
          </div>
          <div className="divide-y">
            {h.extras.map((ex: any, idx: number) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600">+{fmt(ex.quantity)}</span>
                  <span className="text-gray-500">Итого доп.: {fmt(ex.total_after)}</span>
                  <span className="text-gray-400">{ex.user}</span>
                </div>
                <span className="text-xs text-gray-400">{ex.date ? formatDate(ex.date) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === FORECAST === */}
      {fcGroups.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Прогноз
          </div>

          {/* Forecast totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
            <MiniStat label="Общий остаток" value={fmt(fc.total_remaining)} />
            <MiniStat label="Всего продано" value={fmt(fc.total_sold)} />
            <MiniStat label="Возможная прибыль" value={`${fmt(fc.total_potential_profit)} ${cur}`} highlight="violet" />
            <MiniStat label="Дней до продажи" value={fc.estimated_days_to_sellout != null ? `${fc.estimated_days_to_sellout} дн.` : '—'} />
          </div>

          {/* Forecast global details */}
          <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 flex flex-wrap gap-4">
            <span>Дней с прихода: <b className="text-gray-700">{fcDetails.days_active ?? '—'}</b></span>
            <span>Возможная выручка: <b className="text-gray-700">{fmt(fcDetails.total_potential_revenue)} {cur}</b></span>
            <span>Темп продаж: <b className="text-gray-700">{fcDetails.sell_rate_per_day ?? '—'} ед./день</b></span>
          </div>

          {/* Forecast groups */}
          {fcGroups.map((g: any, idx: number) => (
            <div key={idx} className="border-t">
              <div className="px-4 py-2 bg-indigo-50 text-xs font-semibold text-indigo-700">
                {groupLabels[g.label] || g.label}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
                <MiniStat label="Остаток" value={fmt(g.remaining)} />
                <MiniStat label="Продано" value={fmt(g.sold)} />
                <MiniStat label="Возм. прибыль" value={g.potential_profit != null ? `${fmt(g.potential_profit)} ${cur}` : '—'} highlight="violet" />
                <MiniStat label="Дней до продажи" value={g.estimated_days_to_sellout != null ? `${g.estimated_days_to_sellout} дн.` : '—'} />
              </div>
              {g.details && (
                <div className="px-4 py-2 text-xs text-gray-500 flex flex-wrap gap-4">
                  <span>Дней: <b className="text-gray-700">{g.details.days_active ?? '—'}</b></span>
                  <span>Ср. цена/ед.: <b className="text-gray-700">{g.details.avg_price_per_unit != null ? `${fmt(g.details.avg_price_per_unit)} ${cur}` : '—'}</b></span>
                  <span>Ср. прибыль/ед.: <b className="text-gray-700">{g.details.avg_profit_per_unit != null ? `${fmt(g.details.avg_profit_per_unit)} ${cur}` : '—'}</b></span>
                  <span>Возм. выручка: <b className="text-gray-700">{g.details.potential_revenue != null ? `${fmt(g.details.potential_revenue)} ${cur}` : '—'}</b></span>
                  <span>Темп: <b className="text-gray-700">{g.details.sell_rate_per_day ?? '—'} ед./день</b></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* === ATTRIBUTES === */}
      {h.product?.attribute_values && h.product.attribute_values.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm">
            Атрибуты товара
          </div>
          <table className="w-full text-sm">
            <tbody>
              {h.product.attribute_values.map((av: any) => (
                <Row
                  key={av.id}
                  label={av.attribute?.translations?.ru || av.attribute?.name || `#${av.attribute?.id}`}
                  value={formatAttributeValue(av)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'violet' | 'gray' | 'orange';
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    gray: 'bg-gray-50 text-gray-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  const iconColors: Record<string, string> = {
    blue: 'text-blue-500',
    green: 'text-emerald-500',
    violet: 'text-violet-500',
    gray: 'text-gray-500',
    orange: 'text-orange-500',
  };

  return (
    <div className={`rounded-lg p-3 sm:p-4 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={iconColors[color]}>{icon}</span>
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-base sm:text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2.5 text-gray-500">{label}</td>
      <td className="px-4 py-2.5 text-right font-medium">{value}</td>
    </tr>
  );
}

function MiniStat({ label, value, highlight }: {
  label: string;
  value: string;
  highlight?: 'green' | 'violet';
}) {
  const cls = highlight === 'green'
    ? 'text-emerald-600'
    : highlight === 'violet'
      ? 'text-violet-600'
      : 'text-gray-900';

  return (
    <div className="bg-white px-4 py-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm sm:text-base font-bold ${cls}`}>{value}</p>
    </div>
  );
}
