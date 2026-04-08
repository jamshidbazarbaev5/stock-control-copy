import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ResourceTable } from '../helpers/ResourseTable';

interface BalanceHistoryItem {
  id: number;
  supplier: number;
  store: number;
  store_name: string;
  amount: string;
  payment_method: string;
  exchange_rate: string;
  comment: string | null;
  transaction_type: string;
  created_at: string;
}

interface BalanceHistoryResponse {
  links: {
    first: string | null;
    last: string | null;
    next: string | null;
    previous: string | null;
  };
  total_pages: number;
  current_page: number;
  page_range: number[];
  page_size: number;
  results: BalanceHistoryItem[];
  count: number;
}

export default function SupplierBalanceHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const { data, isLoading } = useQuery<BalanceHistoryResponse>({
    queryKey: ['supplier-balance-history', id, currentPage],
    queryFn: async () => {
      const response = await api.get(`/suppliers/balance?supplier=${id}&page=${currentPage}`);
      return response.data;
    },
    enabled: !!id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (value: string | number) => {
    return Number(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const columns = [
    {
      header: '№',
      accessorKey: 'id',
      cell: (row: BalanceHistoryItem) => row.id,
    },
    {
      header: t('forms.store') || 'Магазин',
      accessorKey: 'store_name',
      cell: (row: BalanceHistoryItem) => row.store_name || '-',
    },
    {
      header: t('common.amount') || 'Сумма',
      accessorKey: 'amount',
      cell: (row: BalanceHistoryItem) => (
        <span className="font-semibold text-green-600">
          {formatNumber(row.amount)} {row.payment_method === 'Валюта' ? '$' : ''}
        </span>
      ),
    },
    {
      header: t('common.payment_method') || 'Способ оплаты',
      accessorKey: 'payment_method',
      cell: (row: BalanceHistoryItem) => row.payment_method || '-',
    },
    {
      header: t('common.exchange_rate') || 'Курс',
      accessorKey: 'exchange_rate',
      cell: (row: BalanceHistoryItem) =>
        row.exchange_rate && Number(row.exchange_rate) > 0
          ? formatNumber(row.exchange_rate)
          : '-',
    },
    {
      header: 'Тип',
      accessorKey: 'transaction_type',
      cell: (row: BalanceHistoryItem) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            row.transaction_type === 'ADD'
              ? 'bg-green-100 text-green-700'
              : row.transaction_type === 'SUBTRACT'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {row.transaction_type === 'ADD' ? 'Пополнение' : row.transaction_type === 'SUBTRACT' ? 'Списание' : row.transaction_type}
        </span>
      ),
    },
    {
      header: t('forms.comment') || 'Комментарий',
      accessorKey: 'comment',
      cell: (row: BalanceHistoryItem) => row.comment || '-',
    },
    {
      header: t('forms.date') || 'Дата',
      accessorKey: 'created_at',
      cell: (row: BalanceHistoryItem) => formatDate(row.created_at),
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/suppliers/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {t('supplier.balance_history') || 'История баланса'}
          </h1>
        </div>
      </div>

      <ResourceTable
        columns={columns}
        data={data?.results || []}
        isLoading={isLoading}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalCount={data?.count || 0}
        pageSize={pageSize}
      />
    </div>
  );
}
