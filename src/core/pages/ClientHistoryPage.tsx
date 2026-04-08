import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useGetClient,
  useGetClientHistory,
  type ClientHistoryEntry,
} from "../api/client";
import { format } from "date-fns";
import { ResourceTable } from "../helpers/ResourseTable";
import { CalendarIcon, CoinsIcon, PiggyBankIcon, UserIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function ClientHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<string>("all");
  const { data: client, isLoading: isClientLoading } = useGetClient(Number(id));
  const { data: history, isLoading: isHistoryLoading } = useGetClientHistory(
    Number(id),
    {
      type: selectedType === "all" ? undefined : selectedType,
    },
  );

  if (isClientLoading || isHistoryLoading) {
    return <div className="container py-8 px-4">{t("common.loading")}</div>;
  }

  if (!client) {
    return (
      <div className="container py-8 px-4">{t("messages.error.not_found")}</div>
    );
  }

  const columns = [
    {
      header: t('forms.date'),
      accessorKey: 'timestamp',
      cell: (row: ClientHistoryEntry) => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          {format(new Date(row.timestamp), 'dd.MM.yyyy HH:mm')}
        </div>
      ),
    },
    {
      header: t('forms.type'),
      accessorKey: 'type',


      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {row.type === t("forms.expense") ? (
            <div className="flex items-center gap-2 text-red-600">
              <CoinsIcon className="h-4 w-4" />
              {row.type}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <PiggyBankIcon className="h-4 w-4" />
              {row.type}
            </div>
          )}
        </div>
      ),
    },
    {
      header: t('forms.amount'),
      accessorKey: 'amount_deducted',
      cell: (row: any) => {
        const amount = row.type === t("forms.expense") 
          ? row.amount_deducted 
          : (parseFloat(row.new_balance) - parseFloat(row.previous_balance)).toString();
        return (
          <div className={`flex items-center gap-2 ${row.type === t("forms.expense") ? 'text-red-600' : 'text-green-600'}`}>
            <CoinsIcon className="h-4 w-4" />
            {new Intl.NumberFormat('ru-RU').format(parseFloat(amount || '0'))}
          </div>
        );
      },
    },
    {
      header: t('forms.worker'),
      accessorKey: 'worker_read',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-gray-500" />
          {row.worker_read.name}
        </div>
      ),
    },
    {
      header: t('forms.previous_balance'),
      accessorKey: 'previous_balance',
      cell: (row: ClientHistoryEntry) => (
        <div className="flex items-center gap-2">
          <CoinsIcon className="h-4 w-4 text-gray-500" />
          {new Intl.NumberFormat('ru-RU').format(parseFloat(row.previous_balance))}
        </div>
      ),
    },
    {
      header: t('forms.new_balance'),
      accessorKey: 'new_balance',
      cell: (row: ClientHistoryEntry) => (
        <div className="flex items-center gap-2">
          <PiggyBankIcon className="h-4 w-4 text-gray-500" />
          {new Intl.NumberFormat('ru-RU').format(parseFloat(row.new_balance))}
        </div>
      ),
    },
  ];

  // @ts-ignore
  // @ts-ignore
  return (
    <div className="container py-8 px-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{client.name}</h2>
        <p className="text-gray-600">
          {t("forms.ceo_name")}: {client.ceo_name}
        </p>
        <p className="text-gray-600">
          {t("forms.current_balance")}:{" "}
          {new Intl.NumberFormat("ru-RU").format(
            parseFloat(String(client.balance_uzs)),
          )}
        </p>
      </div>

      <div className="mb-4 w-[200px]">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger>
            <SelectValue placeholder={t("forms.select_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="Расход">{t("forms.expense")}</SelectItem>
            <SelectItem value="Пополнение">{t("forms.replenishment")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ResourceTable<any>
        data={history || []}
        columns={columns}
        isLoading={isHistoryLoading}
        onRowClick={() => {}}
        expandedRowRenderer={(row: any) => {
          const sale = row.sale_read || row;
          const fmt = (v: string | number) =>
            new Intl.NumberFormat("ru-RU").format(parseFloat(String(v || "0")));
          return (
            <div className="p-4 space-y-4 bg-muted/30">
              {/* Sale items */}
              {sale.sale_items?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">{t("forms.products")}</h4>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-1 pr-4">{t("table.product")}</th>
                        <th className="py-1 pr-4">{t("table.unit")}</th>
                        <th className="py-1 pr-4">{t("table.quantity")}</th>
                        <th className="py-1 pr-4">{t("table.price")}</th>
                        <th className="py-1">{t("table.total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.sale_items.map((item: any) => (
                        <tr key={item.id} className="border-b border-muted">
                          <td className="py-1 pr-4">{item.product_read?.product_name}</td>
                          <td className="py-1 pr-4">{item.selling_unit_name}</td>
                          <td className="py-1 pr-4">{fmt(item.quantity)}</td>
                          <td className="py-1 pr-4">{fmt(item.price_per_unit)}</td>
                          <td className="py-1">{fmt(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payments */}
              {sale.sale_payments?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">{t("forms.payments")}</h4>
                  <div className="flex flex-wrap gap-3">
                    {sale.sale_payments.map((p: any) => (
                      <div key={p.id} className="bg-background rounded px-3 py-1.5 border text-sm">
                        {p.payment_method}: {fmt(p.amount)} {p.currency}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("table.total")}:</span>{" "}
                  <span className="font-semibold">{fmt(sale.total_amount)}</span>
                </div>
                {parseFloat(sale.discount_amount || "0") > 0 && (
                  <div>
                    <span className="text-muted-foreground">{t("forms.discount")}:</span>{" "}
                    <span className="font-semibold text-red-600">{fmt(sale.discount_amount)}</span>
                  </div>
                )}
                {sale.use_client_balance && parseFloat(sale.paid_from_balance_uzs || "0") > 0 && (
                  <div>
                    <span className="text-muted-foreground">{t("forms.paid_from_balance")}:</span>{" "}
                    <span className="font-semibold">{fmt(sale.paid_from_balance_uzs)} UZS</span>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
