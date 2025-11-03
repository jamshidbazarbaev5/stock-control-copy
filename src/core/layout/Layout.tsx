import {
  ShoppingBag,
  User2,
  List as ListView,
  Ruler,
  Package,
  ArrowLeftRight,
  Menu,
  X,
  UserCheck,
  Receipt,
  PlusCircle,
  BanknoteIcon,
  LogOut,
  User,
  ChevronDown,
  type LucideIcon,
  CreditCard,
  // PrinterCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLogout } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  WideDialog,
  WideDialogContent,
  WideDialogHeader,
  WideDialogTitle,
  WideDialogFooter,
} from "@/components/ui/wide-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetCurrencies } from "../api/currency";
import {
  useCreateCurrencyRate,
  useGetCurrencyRates,
} from "../api/currency-rate";
import { ThemeToggle } from "../components/ThemeToggle";
import { toast } from "sonner";

type NavItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  id?: string;
  submenu?: NavItem[];
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [currencyRate, setCurrencyRate] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { mutate: logout } = useLogout();
  const { data: userData } = useCurrentUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCloseShift = async () => {
    if (userData?.has_active_shift) {
      // Navigate to close shift page - we'll get the shift ID from the API
      // For now, we'll use a placeholder ID and the CloseShift page will fetch the active shift
      navigate(`/close-shift/active`);
    }
  };

  // API hooks
  const { data: currencies } = useGetCurrencies();
  const { data: currencyRates } = useGetCurrencyRates();
  const createCurrencyRate = useCreateCurrencyRate();

  const handleCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCurrency || !currencyRate) {
      toast.error("Please select a currency and enter a rate");
      return;
    }

    setLoading(true);
    try {
      await createCurrencyRate.mutateAsync({
        currency: parseInt(selectedCurrency),
        rate: currencyRate,
      });

      toast.success("Currency rate created successfully");
      setCurrencyModalOpen(false);
      setSelectedCurrency("");
      setCurrencyRate("");
      // Reload page to update currency rates across the application
      window.location.reload();
    } catch (error: unknown) {
      const errorMessage =
        (error as any)?.response?.data?.detail ||
        "Failed to create currency rate";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setCurrencyModalOpen(false);
    setSelectedCurrency("");
    setCurrencyRate("");
  };

  // Mobile user redirection logic
  useEffect(() => {
    if (userData?.is_mobile_user && userData?.has_active_shift) {
      const currentPath = location.pathname;
      // Allow mobile users to stay on specific pages
      const allowedPaths = [
        "/create-sale",
        "/sales",
        "/debts/:id/payments",
        "/clients",
        "/create-client",
        "/debts",
        "/expense",
        "/create-expense",
        "/pos-fullscreen",
        "/pos",
        "/dashboard",
        "/product-stock-balance",
        "/close-shift/active",
        "/create-expense",
      ];

      // Check for exact matches or dynamic routes
      const isAllowed =
        allowedPaths.some((path) => currentPath.startsWith(path)) ||
        currentPath.startsWith("/edit-client/");

      if (!isAllowed) {
        navigate("/create-sale");
      }
    }
  }, [
    userData?.is_mobile_user,
    userData?.has_active_shift,
    location.pathname,
    navigate,
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set active submenu based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    navItems.forEach((item: NavItem) => {
      if (
        item.id &&
        item.submenu &&
        item.submenu.some((subItem) => subItem.href === currentPath)
      ) {
        setActiveSubmenu(item.id);
      }
    });
  }, [location.pathname]);

  const navItems: NavItem[] = (() => {
    const baseItems: NavItem[] = [
      {
        icon: Package,
        label: t("navigation.dashobard"),
        href: "/dashboard",
      },
      // Add POS navigation for non-superusers
      ...(!currentUser?.is_superuser
        ? [
            {
              icon: Ruler,
              label: t("navigation.pos"),
              href: "/pos-fullscreen",
            },
          ]
        : []),

      {
        icon: Package,
        label: t("navigation.revaluations"),
        href: "/revaluations",
      },
      {
        icon: Package,
        label: t("navigation.writeoff"),
        href: "/writeoffs",
      },
      {
        icon: ArrowLeftRight,
        label: t("navigation.transfers"),
        href: "/transfers",
      },

      {
        icon: ArrowLeftRight,
        label: t("navigation.smena"),
        href: "/shifts",
      },

      { icon: Package, label: t("navigation.stocks"), href: "/stock" },
      ...(currentUser?.can_view_quantity !== false
        ? [
            {
              icon: Package,
              label: t("navigation.stock_balance"),
              href: "/product-stock-balance",
            },
          ]
        : []),
      { icon: ShoppingBag, label: t("navigation.sale"), href: "/sales" },
      { icon: UserCheck, label: t("navigation.clients"), href: "/clients" },
      { icon: ShoppingBag, label: t("navigation.debt"), href: "/debts" },
      {
        icon: BanknoteIcon,
        label: t("navigation.expense"),
        href: "/expense",
      },
      {
        icon: BanknoteIcon,
        label: t("navigation.income"),
        href: "/income",
      },
      {
        icon: ArrowLeftRight,
        label: t("navigation.recyclings"),
        href: "/recyclings",
      },
      {
        icon: CreditCard,
        label: t("navigation.exchange_loans"),
        href: "/exchange-loans",
      },
    ];

    // Add money to budget - only for superuser
    if (currentUser?.is_superuser) {
      baseItems.push({
        icon: PlusCircle,
        label: t("navigation.add_money"),
        href: "/finance",
      });
    }

    // Settings section - not for "Администратор" and customized for "Продавец"
    if (currentUser?.role === "Продавец") {
      const prodavecItems = [
        {
          icon: Package,
          label: t("navigation.dashobard"),
          href: "/dashboard",
        },
        { icon: ShoppingBag, label: t("navigation.sale"), href: "/sales" },
        ...(currentUser?.can_view_quantity !== false
          ? [
              {
                icon: Package,
                label: t("navigation.stock_balance"),
                href: "/product-stock-balance",
              },
            ]
          : []),
        { icon: UserCheck, label: t("navigation.clients"), href: "/clients" },
        { icon: ShoppingBag, label: t("navigation.debt"), href: "/debts" },
        {
          icon: BanknoteIcon,
          label: t("navigation.expense"),
          href: "/expense",
        },
      ];

      // Add POS navigation only for non-mobile users and non-superusers
      if (!userData?.is_mobile_user && !userData?.is_superuser) {
        prodavecItems.splice(1, 0, {
          icon: Ruler,
          label: t("navigation.pos"),
          href: "/pos-fullscreen",
        });
      }

      return prodavecItems;
    }

    // Add settings section for all roles except "Администратор"
    if (currentUser?.role !== "Администратор") {
      baseItems.push({
        icon: Package,
        label: t("navigation.settings"),
        id: "settings",
        submenu: [
          {
            icon: ShoppingBag,
            label: t("navigation.stores"),
            href: "/stores",
          },
          {
            icon: ArrowLeftRight,
            label: t("navigation.check"),
            href: "/receipt-designer",
          },
          {
            icon: ListView,
            label: t("navigation.categories"),
            href: "/categories",
          },
          {
            icon: Ruler,
            label: t("navigation.measurements"),
            href: "/measurements",
          },
          {
            icon: BanknoteIcon,
            label: t("navigation.currencies"),
            href: "/currencies",
          },
          {
            icon: ShoppingBag,
            label: t("navigation.products"),
            href: "/products",
          },

          {
            icon: ListView,
            label: t("navigation.suppliers"),
            href: "/suppliers",
          },
          {
            icon: Receipt,
            label: t("navigation.cash_inflow_names"),
            href: "/cash-inflow-names",
          },
          {
            icon: Receipt,
            label: t("navigation.expense_name"),
            href: "/expense-name",
          },
          { icon: User2, label: t("navigation.users"), href: "/users" },
          {
            icon: User2,
            label: t("navigation.sponsors"),
            href: "/sponsors",
          },
          {
            icon: ListView,
            label: t("navigation.attributes"),
            href: "/attributes",
          },
          {
            icon: Ruler,
            label: t("navigation.labelSizes"),
            href: "/label-sizes",
          },
          {
            icon: Receipt,
            label: t("navigation.cassas"),
            href: "/cassas",
          },
        ],
      });
    }

    return baseItems;
  })();

  return (
    <div className="h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Mobile Header */}
      <header className="md:hidden shadow-sm px-4 py-2 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-foreground">Stock-control</div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {/* Mobile Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <User size={18} className="text-emerald-600" />
              </div>
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-[998]"
                  onClick={() => setDropdownOpen(false)}
                />
                {/* Dropdown Content */}
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border py-3 z-[999]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentUser && (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <User size={24} className="text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 text-lg">
                              {currentUser.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {currentUser.phone_number}
                            </div>
                            <div className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full mt-1">
                              {currentUser.role}
                            </div>
                          </div>
                        </div>
                        {currentUser.store_read && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              Store Information
                            </div>
                            <div className="text-sm font-medium text-gray-800">
                              {currentUser.store_read.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {currentUser.store_read.address}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="py-1">
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDropdownOpen(false);
                            navigate("/profile");
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer"
                          style={{ pointerEvents: "auto" }}
                        >
                          <User size={16} className="text-gray-500" />
                          {t("common.profile")}
                        </button>
                        {userData?.has_active_shift &&
                          !currentUser?.is_superuser && (
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDropdownOpen(false);
                                handleCloseShift();
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition-colors cursor-pointer"
                              style={{ pointerEvents: "auto" }}
                            >
                              <LogOut size={16} className="text-orange-500" />
                              Закрыть смену
                            </button>
                          )}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors cursor-pointer"
                          style={{ pointerEvents: "auto" }}
                        >
                          <LogOut size={16} className="text-red-500" />
                          {t("common.logout")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-gray-600" />
            ) : (
              <Menu size={24} className="text-gray-600" />
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row relative mt-14 md:mt-0">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        {/* Sidebar - Desktop and Mobile */}
        <aside
          className={`
          ${mobileMenuOpen ? "block" : "hidden"}
          md:block
          w-full shadow-lg
          fixed md:sticky
          top-[3.5rem] md:top-0
          h-[calc(100vh-3.5rem)] md:h-screen
          z-50
          transition-all duration-300 ease-in-out
          ${isCollapsed ? "md:w-20" : "md:w-72"}
          flex-shrink-0
          flex flex-col
        `}
        >
          {/* Desktop Logo and Language Switcher */}
          <div className="hidden md:block px-6 py-6 border-b border-sidebar-border ">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isCollapsed && (
                  <div className="font-semibold text-sidebar-foreground">
                    Stock-control
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
              >
                <Menu size={20} className="text-sidebar-accent-foreground" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-3 py-4 flex flex-col  relative z-50 h-[calc(100vh-6rem)] overflow-y-auto">
            {navItems.map((item, index) => (
              <div key={index}>
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => {
                        if (item.id) {
                          setActiveSubmenu(
                            activeSubmenu === item.id ? null : item.id,
                          );
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-1 transition-colors
                        ${
                          activeSubmenu === item.id
                            ? "-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground"
                        }`}
                    >
                      <item.icon
                        size={20}
                        className={
                          activeSubmenu === item.id
                            ? "text-emerald-500"
                            : "text-gray-500"
                        }
                      />
                      {!isCollapsed && (
                        <>
                          <span className="font-medium">{item.label}</span>
                          <svg
                            className={`ml-auto h-5 w-5 transform transition-transform ${
                              activeSubmenu === item.id ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                    {activeSubmenu === item.id && (
                      <div
                        className={`ml-2 ${
                          isCollapsed
                            ? "absolute left-full top-0 ml-2 bg-sidebar shadow-lg rounded-lg p-2 min-w-[200px] max-h-[80vh] overflow-y-auto"
                            : ""
                        }`}
                      >
                        {item.submenu.map((subItem, subIndex) => (
                          <a
                            key={subIndex}
                            href={subItem.href}
                            onClick={(e) => {
                              e.preventDefault();
                              setMobileMenuOpen(false);
                              if (subItem.href) navigate(subItem.href);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-1 transition-colors
                              ${
                                location.pathname === subItem.href
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground"
                              }`}
                          >
                            <subItem.icon
                              size={20}
                              className={
                                location.pathname === subItem.href
                                  ? "text-emerald-500"
                                  : "text-gray-500"
                              }
                            />
                            <span className="font-medium">{subItem.label}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      if (item.href) navigate(item.href);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-1 transition-colors
                      ${
                        location.pathname === item.href
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground"
                      }`}
                  >
                    <item.icon
                      size={20}
                      className={
                        location.pathname === item.href
                          ? "text-emerald-500"
                          : "text-gray-500"
                      }
                    />
                    {!isCollapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </a>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 transition-all duration-300 overflow-x-auto ">
          <div className="h-full flex flex-col min-w-[320px]">
            <div className=" px-4 md:px-6 py-4 flex items-center justify-end gap-4 sticky top-0 z-30 border-b border-border">
              {currentUser?.is_superuser && (
                <>
                  <button
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition mr-2"
                    onClick={() => setCurrencyModalOpen(true)}
                  >
                    {t("currency.set")}
                  </button>

                  <WideDialog
                    open={currencyModalOpen}
                    onOpenChange={handleModalClose}
                  >
                    <WideDialogContent className="max-w-2xl">
                      <WideDialogHeader>
                        <WideDialogTitle>{t("currency.set")}</WideDialogTitle>
                      </WideDialogHeader>

                      <div className="space-y-6 p-6">
                        {/* Current Rates Display */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">
                            Текущий курсы
                          </h3>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {(Array.isArray(currencyRates)
                              ? currencyRates
                              : currencyRates?.results
                            )?.map((rate) => {
                              return (
                                <div
                                  key={rate.id || rate.created_at}
                                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                >
                                  <span className="font-medium">
                                    {rate.currency_detail?.name} (
                                    {rate.currency_detail?.short_name})
                                  </span>
                                  <span>{rate.rate}</span>
                                </div>
                              );
                            })}
                            {(!(Array.isArray(currencyRates)
                              ? currencyRates
                              : currencyRates?.results) ||
                              (Array.isArray(currencyRates)
                                ? currencyRates
                                : currencyRates?.results || []
                              ).length === 0) && (
                              <p className="text-gray-500 text-center py-4">
                                No exchange rates set yet
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Create New Rate Form */}
                        <form
                          onSubmit={handleCurrencySubmit}
                          className="space-y-4"
                        >
                          <h3 className="text-lg font-medium">
                            Создать новый курс
                          </h3>

                          {/* Currency Selection */}
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Валюта
                            </label>
                            <Select
                              value={selectedCurrency}
                              onValueChange={setSelectedCurrency}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выбырать курс" />
                              </SelectTrigger>
                              <SelectContent>
                                {(Array.isArray(currencies)
                                  ? currencies
                                  : currencies?.results
                                )
                                  ?.filter((currency) => !currency.is_base)
                                  ?.map((currency) => (
                                    <SelectItem
                                      key={currency.id}
                                      value={currency.id!.toString()}
                                    >
                                      {currency.name} ({currency.short_name})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Rate Input */}
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Курс
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="12800.00"
                              value={currencyRate}
                              onChange={(e) => setCurrencyRate(e.target.value)}
                              required
                            />
                          </div>
                        </form>
                      </div>

                      <WideDialogFooter className="p-6 pt-0">
                        <Button
                          variant="outline"
                          onClick={handleModalClose}
                          disabled={loading}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          onClick={handleCurrencySubmit}
                          disabled={
                            loading || !selectedCurrency || !currencyRate
                          }
                        >
                          {loading ? t("common.saving") : t("common.save")}
                        </Button>
                      </WideDialogFooter>
                    </WideDialogContent>
                  </WideDialog>
                </>
              )}

              <div className="hidden md:flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>

              {/* Desktop Profile Dropdown */}
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(!dropdownOpen);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User size={18} className="text-emerald-600" />
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border py-3 z-[9999]"
                    style={{ zIndex: 9999 }}
                  >
                    {currentUser && (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                              <User size={24} className="text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 text-lg">
                                {currentUser.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {currentUser.phone_number}
                              </div>
                              <div className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full mt-1">
                                {currentUser.role}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(false);
                              navigate("/profile");
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <User size={16} className="text-gray-500" />
                            <span className="font-medium">
                              {t("common.profile")}
                            </span>
                          </button>
                          {userData?.has_active_shift &&
                            !currentUser?.is_superuser && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDropdownOpen(false);
                                  handleCloseShift();
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition-colors"
                              >
                                <LogOut size={16} className="text-orange-500" />
                                <span className="font-medium">
                                  Закрыть смену
                                </span>
                              </button>
                            )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(false);
                              handleLogout();
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                          >
                            <LogOut size={16} className="text-red-500" />
                            <span className="font-medium">
                              {t("common.logout")}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div
                className="max-w-[1920px] mx-auto "
                style={{ background: "l" }}
              >
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
