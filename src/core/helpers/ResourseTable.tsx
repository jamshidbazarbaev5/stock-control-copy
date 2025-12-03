import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Edit,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Undo2,
} from "lucide-react";
import { t } from "i18next";
import { DeleteConfirmationModal } from "../components/modals/DeleteConfirmationModal";

interface Column<T> {
  header: string;
  accessorKey: keyof T | string | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
}

interface ResourceTableProps<T extends { id?: number }> {
  data: T[];
  columns: Column<T>[];
  isLoading: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (id: number) => void;
  onRefund?: (item: T) => void;
  onAdd?: () => void;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  expandedRowRenderer?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  canDelete?: (row: T) => boolean;
  canRefund?: (row: T) => boolean;
}

export function ResourceTable<T extends { id?: number }>({
  data,
  columns,
  isLoading,
  onEdit,
  onDelete,
  onRefund,
  onAdd,
  pageSize = 30,
  totalCount = 0,
  onPageChange,
  currentPage = 1,
  expandedRowRenderer,
  onRowClick,
  actions,
  canDelete,
  canRefund,
}: ResourceTableProps<T>) {
  // Handle case when data is undefined
  const tableData = data || [];
  const totalPages = Math.ceil(totalCount / pageSize);

  // State for delete confirmation modal and expanded row
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | undefined>(
    undefined,
  );
  const [expandedRow, setExpandedRow] = useState<number>(-1);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    let startPage = Math.max(currentPage - 1, 2);
    let endPage = Math.min(currentPage + 1, totalPages - 1);

    if (currentPage <= 3) {
      endPage = 4;
    }

    if (currentPage >= totalPages - 2) {
      startPage = totalPages - 3;
    }

    if (startPage > 2) {
      pages.push("...");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  const getRowNumber = (index: number) => {
    return (currentPage - 1) * pageSize + index + 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold"></h2>
        {onAdd && (
          <Button
            onClick={onAdd}
            className="flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <PlusIcon className="h-4 w-4" /> {t("common.create")}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/50">
              <TableHead className="text-xs uppercase text-muted-foreground font-semibold w-[60px] py-4">
                №
              </TableHead>
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className="text-xs uppercase text-muted-foreground font-semibold py-4"
                >
                  {column.header}
                </TableHead>
              ))}
              {(onEdit || onDelete || actions) && (
                <TableHead className="text-xs uppercase text-muted-foreground font-semibold text-right py-4">
                  Действия
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow
                  key={`skeleton-${index}`}
                  className="border-b border-border last:border-0"
                >
                  <TableCell className="w-[60px] py-4">
                    <Skeleton className="h-4 w-8 rounded" />
                  </TableCell>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="py-4">
                      <Skeleton className="h-4 w-full rounded" />
                    </TableCell>
                  ))}
                  {(onEdit || onDelete || actions) && (
                    <TableCell className="w-[100px] py-4">
                      <div className="flex gap-2 justify-end">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        {onDelete && (
                          <Skeleton className="h-8 w-8 rounded-md" />
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : tableData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length +
                    1 +
                    (onEdit || onDelete || onRefund ? 1 : 0)
                  }
                  className="text-center text-muted-foreground py-12"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-muted-foreground text-4xl">📋</div>
                    <p className="font-medium text-foreground">Данные отсутствуют</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tableData.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <TableRow
                    className={`border-b border-border hover:bg-muted/50 transition-colors duration-150 ${expandedRowRenderer || onRowClick ? "cursor-pointer" : ""} ${expandedRow === rowIndex ? "bg-muted/50" : ""}`}
                    onClick={(e) => {
                      if (expandedRowRenderer) {
                        e.stopPropagation();
                        setExpandedRow(
                          expandedRow === rowIndex ? -1 : rowIndex,
                        );
                      }
                      if (onRowClick) {
                        onRowClick(row);
                      }
                    }}
                  >
                    <TableCell className="w-[60px] font-medium text-muted-foreground flex items-center gap-2 py-4">
                      {getRowNumber(rowIndex)}
                      {(row as any)?.store_read?.color && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: (row as any).store_read.color,
                            border: "1px solid #e5e7eb", // Tailwind gray-200
                          }}
                          title={(row as any)?.store_read?.name}
                        />
                      )}
                    </TableCell>
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex} className="py-4 text-foreground">
                        {column.cell
                          ? column.cell(row)
                          : typeof column.accessorKey === "function"
                            ? column.accessorKey(row)
                            : String(
                                typeof column.accessorKey === "string"
                                  ? (row as any)[column.accessorKey] || ""
                                  : row[column.accessorKey as keyof T] || "",
                              )}
                      </TableCell>
                    ))}
                    {(onEdit || onDelete || onRefund || actions) && (
                      <TableCell
                        className="text-right w-[100px] py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-1.5 justify-end">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(row)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onRefund && (!canRefund || canRefund(row)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRefund(row)}
                              className="h-8 w-8 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors rounded-md"
                              title="Refund"
                            >
                              <Undo2 className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          {onDelete &&
                            row.id &&
                            (!canDelete || canDelete(row)) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete(row.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-md"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            )}
                          {actions && actions(row)}
                          {expandedRowRenderer && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRow(
                                  expandedRow === rowIndex ? -1 : rowIndex,
                                );
                              }}
                              className="h-8 w-8 p-0 hover:bg-muted transition-colors rounded-md"
                            >
                              {expandedRow === rowIndex ? (
                                <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedRowRenderer && expandedRow === rowIndex && (
                    <TableRow className="bg-muted/30">
                      <TableCell
                        colSpan={
                          columns.length +
                          1 +
                          (onEdit || onDelete || onRefund ? 1 : 0)
                        }
                        className="border-b border-border py-4"
                      >
                        <div className="px-2">{expandedRowRenderer(row)}</div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages >= 1 && (
        <div className="flex justify-end gap-2 items-center text-sm text-muted-foreground bg-card rounded-lg p-3 border border-border shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
            className="hover:bg-muted disabled:opacity-50 transition-colors rounded-md"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <div className="flex gap-1">
            {getPageNumbers().map((page, index) =>
              typeof page === "number" ? (
                <Button
                  key={index}
                  variant={currentPage === page ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange?.(page)}
                  className={`h-8 w-8 p-0 rounded-md transition-all ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted"
                  }`}
                >
                  {page}
                </Button>
              ) : (
                <span
                  key={index}
                  className="px-2 flex items-center text-muted-foreground/60"
                >
                  {page}
                </span>
              ),
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="hover:bg-muted disabled:opacity-50 transition-colors rounded-md"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (itemToDelete && onDelete) {
            onDelete(itemToDelete);
          }
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
}
