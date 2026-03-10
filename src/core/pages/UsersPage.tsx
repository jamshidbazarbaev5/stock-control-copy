import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ResourceForm } from "../helpers/ResourceForm";
import { toast } from "sonner";
import {
  type User,
  useUpdateUser,
  useDeleteUser,
  useGetUsers,
} from "../api/user";
import { useTranslation } from "react-i18next";
import {
  Users,
  User as UserIcon,
  Pencil,
  Trash2,
  Plus,
  Phone,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetStores } from "../api/store";

interface ExtendedUser extends User {
  store_read?: {
    id: number;
    name: string;
    address: string;
    phone_number: string;
    budget: string;
    created_at: string;
    is_main: boolean;
    parent_store: number | null;
    owner: number;
  };
  displayId?: number;
  is_mobile_user: boolean;
  is_superuser?: boolean;
}

const userFields = (t: any, stores: any[] = []) => [
  {
    name: "name",
    label: t("forms.fio"),
    type: "text",
    placeholder: t("placeholders.enter_name"),
    required: true,
  },
  {
    name: "phone_number",
    label: t("forms.phone_number"),
    type: "text",
    placeholder: t("placeholders.enter_phone"),
    required: true,
  },
  {
    name: "role",
    label: t("forms.role"),
    type: "select",
    placeholder: t("placeholders.select_role"),
    required: true,
    options: [
      { value: t("roles.admin"), label: t("roles.admin") },
      { value: t("roles.seller"), label: t("roles.seller") },
    ],
  },
  {
    name: "store_write",
    label: t("forms.store"),
    type: "select",
    placeholder: t("placeholders.select_store"),
    required: true,
    options: stores.map((store) => ({
      value: store.id.toString(),
      label: store.name,
    })),
  },
  {
    name: "is_active",
    label: t("forms.status"),
    type: "select",
    placeholder: t("placeholders.select_status"),
    required: true,
    options: [
      { value: true, label: t("common.active") },
      { value: false, label: t("common.inactive") },
    ],
  },
  {
    name: "is_mobile_user",
    label: t("forms.is_mobile_user"),
    type: "select",
    placeholder: t("placeholders.select_device"),
    required: true,
    defaultValue: true,
    options: [
      { value: true, label: t("common.mobile") },
      { value: false, label: t("common.desktop") },
    ],
  },
  {
    name: "can_view_quantity",
    label: t("forms.can_view_quantity"),
    type: "select",
    placeholder: t("placeholders.select_permission"),
    required: true,
    defaultValue: true,
    options: [
      { value: true, label: t("common.yes") },
      { value: false, label: t("common.no") },
    ],
  },
  {
    name: "password",
    label: t("forms.password"),
    type: "password",
    placeholder: t("placeholders.enter_password"),
  },
];

export default function UsersPage() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const { t } = useTranslation();

  const { data: staffsData, isLoading } = useGetUsers({
    params: {
      role: selectedRole === "all" ? undefined : selectedRole,
      store: selectedStore === "all" ? undefined : selectedStore,
      page_size: 1000, // Fetch all users
    },
  });
  const { data: storesData } = useGetStores({});

  // Handle both array and object response formats
  const results: any[] = Array.isArray(staffsData)
    ? staffsData
    : staffsData?.results || [];
  const totalCount = Array.isArray(staffsData)
    ? staffsData.length
    : staffsData?.count || 0;

  const users: ExtendedUser[] = results.map((user, index) => ({
    ...user,
    displayId: index + 1,
  }));

  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: deleteUser } = useDeleteUser();

  const handleEdit = (user: ExtendedUser) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleUpdateSubmit = (data: any) => {
    if (!editingUser?.id) return;

    // Create the update payload
    const updateData: Partial<User> = {
      id: editingUser.id,
      name: data.name || "",
      phone_number: data.phone_number || "",
      role: data.role || "",
      is_active: data.is_active === "true" || data.is_active === true,
      store_write: Number(data.store_write),
      is_mobile_user: data.is_mobile_user === "true" || data.is_mobile_user === true,
      can_view_quantity: data.can_view_quantity === "true" || data.can_view_quantity === true,
    };

    // Only include password if it's provided
    if (data.password) {
      updateData.password = data.password;
    }

    updateUser(updateData as User, {
      onSuccess: () => {
        const message = data.password
          ? t("messages.user_password_updated")
          : t("messages.user_updated");
        toast.success(message);
        setIsFormOpen(false);
        setEditingUser(null);
      },
    });
  };

  const handleDelete = (id: number) => {
    if (!id) return;

    deleteUser(id, {
      onSuccess: () => toast.success(t("messages.user_deleted")),
      onError: () => toast.error(t("messages.delete_failed")),
    });
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "owner":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      case "seller":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const stores = Array.isArray(storesData) ? storesData : storesData?.results || [];

  const handleResetFilters = () => {
    setSelectedRole("all");
    setSelectedStore("all");
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("navigation.users")}</h1>
        </div>
        <Button
          onClick={() => navigate("/create-user")}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("common.create")}
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base sm:text-lg font-medium">
            {t("common.filters")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="w-auto"
          >
            {t("common.reset") || "Сбросить"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("forms.role")}</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("placeholders.select_role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="Продавец">{t("roles.seller")}</SelectItem>
                <SelectItem value="Администратор">{t("roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("forms.store")}</label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("placeholders.select_store")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("forms.all_stores")}</SelectItem>
                {stores.map((store: any) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-[130px]" />
                </div>
              </CardContent>
              <div className="absolute top-3 right-3">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Card
                key={user.id}
                className="relative overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{user.name}</h3>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">{user.phone_number}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getRoleColor(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 py-4 bg-gray-50 flex justify-end gap-2 dark:bg-card">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(user)}
                    className="hover:bg-primary/5 hover:text-primary"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {!user.is_superuser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user.id!)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500">
              {t("common.total")}: {totalCount}
            </p>
          </div>
        </>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <ResourceForm
            fields={userFields(
              t,
              Array.isArray(storesData)
                ? storesData
                : storesData?.results || [],
            )}
            onSubmit={handleUpdateSubmit}
            defaultValues={{
              name: editingUser?.name,
              phone_number: editingUser?.phone_number,
              role: editingUser?.role,
              store_write: editingUser?.store_read?.id?.toString(),
              is_active: editingUser?.is_active !== undefined ? editingUser.is_active.toString() : "true",
              is_mobile_user: editingUser?.is_mobile_user !== undefined ? editingUser.is_mobile_user.toString() : "true",
              can_view_quantity: editingUser?.can_view_quantity !== undefined ? editingUser.can_view_quantity.toString() : "true",
            }}
            isSubmitting={isUpdating}
            title={t("common.edit")}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
