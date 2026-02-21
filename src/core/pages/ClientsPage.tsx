import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResourceTable } from "../helpers/ResourseTable";
import {
  type Client,
  useGetClients,
  useDeleteClientCustom,
  useIncrementBalance,
  useClientCashOut,
  useMassPayment,
} from "../api/client";
import { useGetStores } from "../api/store";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { MoreHorizontal, Wallet, History, DollarSign, Plus, CreditCard, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

const formSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  store: z.number().optional(),
  payment_method: z.enum(["Наличные", "Карта", "Click", "Перечисление"]),
});

type FormData = z.infer<typeof formSchema>;

interface BalanceIncrementDialogProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
}

function BalanceIncrementDialog({
                                  clientId,
                                  isOpen,
                                  onClose,
                                }: BalanceIncrementDialogProps) {
  const { t } = useTranslation();
  const incrementBalance = useIncrementBalance();
  const { data: currentUser } = useCurrentUser();
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      store: undefined,
      payment_method: "Наличные",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const storeId = currentUser?.is_superuser ? data.store : currentUser?.store_read?.id;
      await incrementBalance.mutateAsync({
        id: clientId,
        amount: data.amount,
        store: storeId!,
        payment_method: data.payment_method,
      });
      toast.success(t("messages.success.balance_incremented"));
      form.reset();
      onClose();
      // Refresh the page to get fresh data
      window.location.reload();
    } catch (error) {
      toast.error(t("messages.error.balance_increment"));
      console.error("Failed to increment balance:", error);
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
          <DialogHeader>
            <DialogTitle>{t("forms.increment_balance")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {currentUser?.is_superuser && (
                  <FormField
                      control={form.control}
                      name="store"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.store")}</FormLabel>
                            <FormControl>
                              <Select
                                  value={field.value?.toString()}
                                  onValueChange={(val) => field.onChange(parseInt(val))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("placeholders.select_store")} />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {stores.map((store) => (
                                      <SelectItem key={store.id} value={store.id!.toString()}>
                                        {store.name}
                                      </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                      )}
                  />
              )}
              <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("forms.amount")}</FormLabel>
                        <FormControl>
                          <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                              }
                          />
                        </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.payment_method")}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("placeholders.select_payment_method")} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="Наличные">{t("payment_types.cash")}</SelectItem>
                              <SelectItem value="Карта">{t("payment_types.card")}</SelectItem>
                              <SelectItem value="Click">{t("payment_types.click")}</SelectItem>
                              <SelectItem value="Перечисление">Перечисление</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                  )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={incrementBalance.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}

// Cash-out dialog
const cashOutSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  store: z.number().min(1, "Store is required"),
  payment_method: z.enum(["Наличные", "Карта", "Click", "Перечисление"]),
});

type CashOutForm = z.infer<typeof cashOutSchema>;

// Mass payment dialog
const massPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(["Наличные", "Карта", "Click", "Перечисление", "Валюта"]),
  usd_rate_at_payment: z.number().min(0.01, "USD rate must be greater than 0"),
});

type MassPaymentForm = z.infer<typeof massPaymentSchema>;

interface CashOutDialogProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
}

// Create Debt dialog
const createDebtSchema = z.object({
  total_amount: z.number().min(0.01, "Amount must be greater than 0"),
  store: z.number().optional(),
  due_date: z.string().min(1, "Due date is required"),
  debt_type: z.enum(["USD", "UZS"]),
});

type CreateDebtForm = z.infer<typeof createDebtSchema>;

interface CreateDebtDialogProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
}

function CreateDebtDialog({ clientId, isOpen, onClose }: CreateDebtDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  const createDebt = useMutation({
    mutationFn: async (data: { client_write: number; store_write: number; total_amount: number; due_date: string; debt_type: string }) => {
      const response = await api.post('/debts/create/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const userStoreId = currentUser?.store_read?.id;

  const form = useForm<CreateDebtForm>({
    resolver: zodResolver(createDebtSchema),
    defaultValues: { total_amount: 0, store: userStoreId || undefined, due_date: "", debt_type: "UZS" },
  });

  const onSubmit = async (data: CreateDebtForm) => {
    try {
      const storeId = currentUser?.is_superuser ? data.store : userStoreId;
      await createDebt.mutateAsync({
        client_write: clientId,
        store_write: storeId!,
        total_amount: data.total_amount,
        due_date: data.due_date,
        debt_type: data.debt_type,
      });
      toast.success(t("messages.success.debt_created", "Debt created successfully"));
      form.reset();
      onClose();
    } catch (error) {
      toast.error(t("messages.error.debt_create", "Failed to create debt"));
      console.error("Failed to create debt:", error);
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
          <DialogHeader>
            <DialogTitle>{t("common.create_debt", "Create Debt")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {currentUser?.is_superuser && (
                  <FormField
                      control={form.control}
                      name="store"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.store")}</FormLabel>
                            <FormControl>
                              <Select
                                  value={field.value?.toString()}
                                  onValueChange={(val) => field.onChange(parseInt(val))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("placeholders.select_store")} />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {stores.map((store) => (
                                      <SelectItem key={store.id} value={store.id!.toString()}>
                                        {store.name}
                                      </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                      )}
                  />
              )}
              <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.amount")}</FormLabel>
                        <FormControl>
                          <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.due_date", "Due Date")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="debt_type"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.debt_type", "Тип долга")}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("placeholders.select_debt_type", "Выберите тип")} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="UZS">UZS</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                  )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createDebt.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}

function CashOutDialog({ clientId, isOpen, onClose }: CashOutDialogProps) {
  const { t } = useTranslation();
  const cashOut = useClientCashOut();
  const { data: currentUser } = useCurrentUser();
  const { data: storesData } = useGetStores({});
  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];
  const form = useForm<CashOutForm>({
    resolver: zodResolver(cashOutSchema),
    defaultValues: { amount: 0, store: undefined, payment_method: "Наличные" },
  });

  const onSubmit = async (data: CashOutForm) => {
    try {
      await cashOut.mutateAsync({
        id: clientId,
        amount: data.amount,
        store: data.store,
        payment_method: data.payment_method,
      });
      toast.success(t("common.payment_successful", "Успешно"));
      form.reset();
      onClose();
      // Refresh the page to get fresh data
      window.location.reload();
    } catch (error) {
      toast.error(t("common.payment_failed", "Ошибка"));
      console.error("Failed to cash out:", error);
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
          <DialogHeader>
            <DialogTitle>Обналичичка</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {currentUser?.is_superuser && (
                  <FormField
                      control={form.control}
                      name="store"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("forms.store")}</FormLabel>
                            <FormControl>
                              <Select
                                  value={field.value?.toString()}
                                  onValueChange={(val) => field.onChange(parseInt(val))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("placeholders.select_store")} />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {stores.map((store) => (
                                      <SelectItem key={store.id} value={store.id!.toString()}>
                                        {store.name}
                                      </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                      )}
                  />
              )}
              <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.amount")}</FormLabel>
                        <FormControl>
                          <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.payment_method")}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("placeholders.select_payment_method")} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="Наличные">{t("payment_types.cash")}</SelectItem>
                              <SelectItem value="Карта">{t("payment_types.card")}</SelectItem>
                              <SelectItem value="Click">{t("payment_types.click")}</SelectItem>
                              <SelectItem value="Перечисление">Перечисление</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                  )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={cashOut.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}

// Mass Payment Dialog
interface MassPaymentDialogProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
}

function MassPaymentDialog({ clientId, isOpen, onClose, client }: MassPaymentDialogProps) {
  const { t } = useTranslation();
  const massPayment = useMassPayment();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Наличные");
  const [storeData, setStoreData] = useState<any>(null);

  // Get the latest USD rate from currency rates
  const { data: currencyRates } = useQuery<Array<{ id: number; rate: string; currency_detail: any }>>({
    queryKey: ["currency-rates"],
    queryFn: async () => {
      const response = await api.get("/currency/rates/");
      return response.data;
    },
  });

  const usdRate = currencyRates?.[0] ? parseFloat(currencyRates[0].rate) : 0;

  // Fetch store data when dialog opens for Магазин type
  useEffect(() => {
    if (isOpen && client?.type === "Магазин" && (client as any)?.linked_store) {
      const fetchStoreData = async () => {
        try {
          const response = await api.get(`/store/${(client as any).linked_store}/`);
          const storeInfo = response?.data || response;
          setStoreData(storeInfo);
        } catch (error) {
          console.error("Failed to fetch store data:", error);
        }
      };
      fetchStoreData();
    } else {
      setStoreData(null);
    }
  }, [isOpen, client]);

  const getAvailableBalance = () => {
    if (client?.type !== "Магазин" || !storeData?.budgets || !selectedPaymentMethod) {
      return 0;
    }

    const budget = storeData.budgets.find(
      (b: any) => b.budget_type === selectedPaymentMethod
    );
    return budget ? Number(budget.amount) : 0;
  };

  const form = useForm<MassPaymentForm>({
    resolver: zodResolver(massPaymentSchema),
    defaultValues: {
      amount: 0,
      payment_method: "Наличные",
      usd_rate_at_payment: usdRate || 0,
    },
  });

  // Update the USD rate when it changes
  useEffect(() => {
    if (usdRate > 0) {
      form.setValue("usd_rate_at_payment", usdRate);
    }
  }, [usdRate, form]);

  const onSubmit = async (data: MassPaymentForm) => {
    try {
      await massPayment.mutateAsync({
        id: clientId,
        amount: data.amount,
        payment_method: data.payment_method,
        usd_rate_at_payment: data.usd_rate_at_payment,
      });
      toast.success(t("common.mass_payment_successful", "Массовая оплата успешна"));
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to process mass payment:", error);
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
          <DialogHeader>
            <DialogTitle>{t("common.mass_payment", "Массовая оплата")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {client?.type === "Магазин" && selectedPaymentMethod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="text-sm text-blue-700">
                    <div className="font-semibold mb-2">{t("forms.available_balance") || "Available Balance"}</div>
                    <div className="text-lg font-bold text-blue-900">
                      {getAvailableBalance().toLocaleString()}
                      {selectedPaymentMethod === "Валюта" ? " $" : ""}
                    </div>
                  </div>
                </div>
              )}
              <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.amount")}</FormLabel>
                        <FormControl>
                          <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.payment_method")}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedPaymentMethod(value);
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("placeholders.select_payment_method")} />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="Наличные">{t("payment_types.cash")}</SelectItem>
                              <SelectItem value="Карта">{t("payment_types.card")}</SelectItem>
                              <SelectItem value="Click">{t("payment_types.click")}</SelectItem>
                              <SelectItem value="Перечисление">Перечисление</SelectItem>
                              <SelectItem value="Валюта">Валюта</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="usd_rate_at_payment"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.usd_rate", "Курс USD")}</FormLabel>
                        <FormControl>
                          <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {t("common.current_usd_rate", "Текущий курс")}: {usdRate}
                        </p>
                      </FormItem>
                  )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={massPayment.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [cashOutClientId, setCashOutClientId] = useState<number | null>(null);
  const [createDebtClientId, setCreateDebtClientId] = useState<number | null>(null);
  const [massPaymentClientId, setMassPaymentClientId] = useState<number | null>(null);
  const [massPaymentClient, setMassPaymentClient] = useState<Client | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; flip?: boolean } | null>(null);
  const { data: clientsData, isLoading } = useGetClients({
    params: {
      page,
      ...(selectedType === "all" ? {} : { type: selectedType }),
      ...(searchQuery ? { name: searchQuery } : {}),
    },
  });
  const deleteClient = useDeleteClientCustom();
  const { data: currentUser } = useCurrentUser();
  const clients = Array.isArray(clientsData)
      ? clientsData
      : clientsData?.results || [];
  const totalCount = Array.isArray(clientsData)
      ? clients.length
      : clientsData?.count || 0;

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedType, searchQuery]);

  const columns :any = [
    {
      header: t("forms.client_type"),
      accessorKey: "type",
    },
    {
      header: t("forms.name"),
      accessorKey: (row: Client) =>
          row.type === "Юр.лицо"
              ? row.name + " (" + row.ceo_name + ")"
              : row.name,
    },
    {
      header: t("forms.phone"),
      accessorKey: "phone_number",
    },
    {
      header: t("forms.address"),
      accessorKey: "address",
    },
    {
      header: t("forms.balance_uzs"),
      accessorKey: (row: Client) => ((row as any).balance_uzs ? `${Number((row as any).balance_uzs).toLocaleString()} UZS` : "-"),
    },
    {
      header: t("forms.balance_usd"),
      accessorKey: (row: Client) => ((row as any).balance_usd ? `${Number((row as any).balance_usd).toLocaleString()} USD` : "-"),
    },

  ];

  const handleDelete = async (id: number) => {
    try {
      await deleteClient.mutateAsync(id);
      toast.success(
          t("messages.success.deleted", { item: t("navigation.clients") }),
      );
    } catch (error) {
      toast.error(
          t("messages.error.delete", { item: t("navigation.clients") }),
      );
      console.error("Failed to delete client:", error);
    }
  };

  return (
      <div className="container py-8 px-4">
        <div className="mb-4 flex gap-4">
          <div className="relative w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search", "Поиск по имени...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-1/2">
              <SelectValue placeholder={t("forms.select_client_type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="Физ.лицо">{t("forms.individual")}</SelectItem>
              <SelectItem value="Юр.лицо">{t("forms.legal_entity")}</SelectItem>
              <SelectItem value="Магазин">Магазин</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ResourceTable<Client>
            data={clients}
            columns={columns}
            isLoading={isLoading}
            onAdd={() => navigate('/create-client')}
            onEdit={(client) => navigate(`/edit-client/${client.id}`)}
            onDelete={handleDelete}
            totalCount={totalCount}
            pageSize={30}
            currentPage={page}
            onPageChange={(newPage) => setPage(newPage)}
            actions={(client: Client) => (
                <div className="relative" style={{ position: 'static' }}>
                  <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const dropdownHeight = 280; // Approximate dropdown height
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const spaceAbove = rect.top;

                        // Check if there's not enough space below but enough above
                        const flip = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

                        if (flip) {
                          setDropdownPosition({ top: rect.top, right: window.innerWidth - rect.right, flip: true });
                        } else {
                          setDropdownPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right, flip: false });
                        }
                        if (client.id !== undefined) {
                          setOpenDropdown(openDropdown === client.id ? null : client.id);
                        }
                      }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {openDropdown === client.id && (
                      <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdown(null)}
                        />
                        <div
                            className="fixed w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700"
                            style={{
                              top: dropdownPosition?.flip ? undefined : dropdownPosition?.top,
                              bottom: dropdownPosition?.flip ? window.innerHeight - dropdownPosition!.top : undefined,
                              right: dropdownPosition?.right,
                            }}
                        >
                          {client.type === "Юр.лицо" && (
                              <button
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(null);
                                    navigate(`/clients/${client.id}/history`);
                                  }}
                              >
                                <History className="h-4 w-4 mr-2" />
                                {t("common.history")}
                              </button>
                          )}
                          <button
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(null);
                                navigate(`/debts/${client.id}`);
                              }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Долги
                          </button>
                          <button
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(null);
                                if (client.id) setCreateDebtClientId(client.id);
                              }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("common.create_debt", "Create Debt")}
                          </button>
                          <button
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(null);
                                if (client.id) {
                                  setMassPaymentClientId(client.id);
                                  setMassPaymentClient(client);
                                }
                              }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t("common.mass_payment", "Массовая оплата")}
                          </button>
                          {currentUser && (
                              <>
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      if (client.id) setSelectedClientId(client.id);
                                    }}
                                >
                                  <Wallet className="h-4 w-4 mr-2" />
                                  {t("common.increment_balance")}
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      if (client.id) setCashOutClientId(client.id);
                                    }}
                                >
                                  <Wallet className="h-4 w-4 mr-2" />
                                  Обналичичка
                                </button>
                              </>
                          )}
                        </div>
                      </>
                  )}
                </div>
            )}
        />
        {selectedClientId && (
            <BalanceIncrementDialog
                clientId={selectedClientId}
                isOpen={!!selectedClientId}
                onClose={() => setSelectedClientId(null)}
            />
        )}
        {cashOutClientId && (
            <CashOutDialog
                clientId={cashOutClientId}
                isOpen={!!cashOutClientId}
                onClose={() => setCashOutClientId(null)}
            />
        )}
        {createDebtClientId && (
            <CreateDebtDialog
                clientId={createDebtClientId}
                isOpen={!!createDebtClientId}
                onClose={() => setCreateDebtClientId(null)}
            />
        )}
        {massPaymentClientId && (
            <MassPaymentDialog
                clientId={massPaymentClientId}
                client={massPaymentClient || undefined}
                isOpen={!!massPaymentClientId}
                onClose={() => {
                  setMassPaymentClientId(null);
                  setMassPaymentClient(null);
                }}
            />
        )}
      </div>
  );
}
