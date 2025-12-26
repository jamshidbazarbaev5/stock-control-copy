import { useState, useEffect } from 'react';
import { ResourceTable } from '../helpers/ResourseTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useGetProductMovements,
  useGetStockNames,
  type ProductMovement,
} from '../api/product-movement';
import { useGetStores } from '../api/store';
import { useGetProducts, type Product } from '../api/product';
import { useDebounce } from '../hooks/useDebounce';
import { useCurrentUser } from '../hooks/useCurrentUser';

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

export default function ProductMovementsPage() {
  const { data: currentUser } = useCurrentUser();

  // Pagination
  const [page, setPage] = useState(1);

  // Filter states
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [selectedStockName, setSelectedStockName] = useState<string>('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Product search
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const debouncedProductSearch = useDebounce(productSearchQuery, 300);

  // Fetch stores
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  // Fetch products based on search
  const { data: productsData, isLoading: isSearchingProducts } = useGetProducts({
    params: {
      product_name: debouncedProductSearch,
    },
    enabled: debouncedProductSearch.length > 0,
  });
  const searchResults = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];

  // Fetch stock names when product and store are selected
  const { data: stockNamesData } = useGetStockNames(
    selectedProductId,
    selectedStore ? Number(selectedStore) : undefined
  );
  const stockNames = stockNamesData?.stock_names || [];

  // Fetch product movements
  const { data: movementsData, isLoading } = useGetProductMovements({
    page,
    product_id: selectedProductId,
    store_id: selectedStore ? Number(selectedStore) : undefined,
    stock_name: selectedStockName || undefined,
    document_type: selectedDocumentType || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const movements = movementsData?.movements || [];
  const totalCount = movementsData?.count || 0;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedProductId, selectedStore, selectedStockName, selectedDocumentType, dateFrom, dateTo]);

  // Reset stock name when product changes
  useEffect(() => {
    setSelectedStockName('');
  }, [selectedProductId]);

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setSelectedProductName(product.product_name);
    setProductSearchQuery('');
    setShowProductDropdown(false);
  };

  // Clear product selection
  const handleClearProduct = () => {
    setSelectedProductId(undefined);
    setSelectedProductName('');
    setProductSearchQuery('');
    setSelectedStockName('');
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedStore('');
    setSelectedProductId(undefined);
    setSelectedProductName('');
    setProductSearchQuery('');
    setSelectedStockName('');
    setSelectedDocumentType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Table columns
  const columns = [
    {
      header: 'Операция',
      accessorKey: 'operation',
      cell: (row: ProductMovement) => row.operation || '-',
    },
    {
      header: 'Товар',
      accessorKey: 'product',
      cell: (row: ProductMovement) => row.product || '-',
    },
    {
      header: 'Магазин',
      accessorKey: 'store',
      cell: (row: ProductMovement) => row.store || '-',
    },
    {
      header: 'Начальный остаток',
      accessorKey: 'opening_balance',
      cell: (row: ProductMovement) => row.opening_balance || '0',
    },
    {
      header: 'Приход',
      accessorKey: 'quantity_in',
      cell: (row: ProductMovement) => (
        <span className="text-green-600 font-medium">
          {row.quantity_in || '0'}
        </span>
      ),
    },
    {
      header: 'Расход',
      accessorKey: 'quantity_out',
      cell: (row: ProductMovement) => (
        <span className="text-red-600 font-medium">
          {row.quantity_out || '0'}
        </span>
      ),
    },
    {
      header: 'Конечный остаток',
      accessorKey: 'closing_balance',
      cell: (row: ProductMovement) => (
        <span className="font-semibold">
          {row.closing_balance || '0'}
        </span>
      ),
    },
    {
      header: 'Дата',
      accessorKey: 'date',
      cell: (row: ProductMovement) => formatDate(row.date),
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Движение товаров</h1>
        <Button onClick={handleClearFilters} variant="outline">
          Очистить фильтры
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3">Фильтры</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Product Search */}
          <div className="relative">
            {selectedProductId ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm">
                  {selectedProductName}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearProduct}
                  className="h-9 px-2"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <>
                <Input
                  type="text"
                  placeholder="Поиск товара..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                />
                {showProductDropdown && productSearchQuery && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isSearchingProducts ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Поиск...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((product) => (
                        <div
                          key={product.id}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                          onClick={() => handleSelectProduct(product)}
                        >
                          <div className="font-medium">{product.product_name}</div>
                          {product.category_read?.category_name && (
                            <div className="text-xs text-muted-foreground">
                              {product.category_read.category_name}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Товары не найдены
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Store Select */}
          {currentUser?.is_superuser && (
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите магазин" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все магазины</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={String(store.id)}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Stock Name Select */}
          <Select
            value={selectedStockName}
            onValueChange={setSelectedStockName}
            disabled={!selectedProductId || stockNames.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !selectedProductId
                    ? 'Сначала выберите товар'
                    : stockNames.length === 0
                      ? 'Нет партий'
                      : 'Выберите партию'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все партии</SelectItem>
              {stockNames.map((stockName) => (
                <SelectItem key={stockName} value={stockName}>
                  {stockName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Document Type Select */}
          <Select
            value={selectedDocumentType}
            onValueChange={setSelectedDocumentType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="income">Приход</SelectItem>
              <SelectItem value="sale">Продажа</SelectItem>
              <SelectItem value="transfer">Перемещение</SelectItem>
              <SelectItem value="writeoff">Списание</SelectItem>
              <SelectItem value="recycling">Переработка</SelectItem>
              <SelectItem value="refund">Возврат</SelectItem>
              <SelectItem value="extra">Доп. косылган количества</SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Дата от"
          />

          {/* Date To */}
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Дата до"
          />
        </div>
      </Card>

      {/* Click outside to close dropdown */}
      {showProductDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProductDropdown(false)}
        />
      )}

      {/* Table */}
      <ResourceTable
        data={movements}
        columns={columns}
        isLoading={isLoading}
        currentPage={page}
        onPageChange={setPage}
        totalCount={totalCount}
        pageSize={30}
      />
    </div>
  );
}
