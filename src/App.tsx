import "./App.css";
import "./index.css";
import "./i18n";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "./core/pages/login";
import { LanguageProvider } from "./core/context/LanguageContext";
import { AuthProvider } from "./core/context/AuthContext";
import { PrivateRoute } from "./core/components/PrivateRoute";
import CreateUser from "./core/pages/create-user";
import CreateStore from "./core/pages/create-store";
import { ProfilePage } from "./core/pages/ProfilePage";
import CreateCategory from "./core/pages/create-category";
import EditCategory from "./core/pages/edit-category";
import UsersPage from "./core/pages/UsersPage";
import StoresPage from "./core/pages/StoresPage";
import CategoriesPage from "./core/pages/CategoriesPage";
import ProductsPage from "./core/pages/ProductsPage";
import CreateProduct from "./core/pages/create-product";
import StocksPage from "./core/pages/StocksPage";
import CreateStock from "./core/pages/create-stock";
import Layout from "./core/layout/Layout";
import MeasurementsPage from "./core/pages/MeasurementsPage";
import ShiftsPage from "./core/pages/ShiftsPage";
import EditShiftPage from "./core/pages/EditShiftPage";
import CreateMeasurement from "./core/pages/create-measurement";
import CurrenciesPage from "./core/pages/CurrenciesPage";
import CreateCurrency from "./core/pages/create-currency";
import SuppliersPage from "./core/pages/SuppliersPage";
import CreateSupplier from "./core/pages/create-supplier";
import SupplierDetailPage from "./core/pages/SupplierDetailPage";
import TransfersPage from "./core/pages/TransfersPage";
import CreateTransfer from "./core/pages/create-transfer";
import RecyclingsPage from "./core/pages/RecyclingsPage";
import CreateRecycling from "./core/pages/create-recycling";
import ClientsPage from "./core/pages/ClientsPage";
import CreateClient from "./core/pages/create-client";
import EditClient from "./core/pages/edit-client";
import ClientHistoryPage from "./core/pages/ClientHistoryPage";
import SalesPage from "./core/pages/SalesPage";
import { Toaster } from "sonner";
import { ErrorModal } from "./core/components/ErrorModal";
import DebtsPage from "./core/pages/DebtsPage";
import StaffPage from "./core/pages/StaffPage";
import CreateStaff from "./core/pages/create-staff";
// import DebtPaymentHistoryPage from "./core/pages/DebtPaymentHistoryPage";
import IncomeDetailsPage from "./core/pages/IncomeDetailsPage";
// import EditSale from "÷./core/pages/edit-sale";
import DebtDetailsPage from "./core/pages/DebtDetailsPage";
import CreateSale from "./core/pages/create-sale";
import ExpenseNamesPage from "./core/pages/ExpenseNamesPage";
import CreateExpenseName from "./core/pages/create-expense-name";
import ExpensesPage from "./core/pages/ExpensesPage";
import CreateExpense from "./core/pages/create-expense";
import AddMoney from "./core/pages/add-money";
import CashInflowNamesPage from "./core/pages/CashInflowNamesPage";
import EditExpensePage from "./core/pages/edit-expense";
import CashInflowHistoryPage from "./core/pages/CashInflowHistoryPage";
import EditMoney from "./core/pages/edit-money";
import EditProduct from "./core/pages/edit-product";
import StockPriceHistoryPage from "./core/pages/StockPriceHistoryPage";
import EditStock from "./core/pages/edit-stock-2";
import ReceiptDesignerPage from "./pages/ReceiptDesignerPage";
import IncomePage from "./core/pages/IncomePage";
// import EditSale from "./core/pages/edit-sale";
import DashboardPage from "./core/pages/DashboardPage";
import EditTransfer from "./core/pages/edit-transfer";
import ProductStockBalancePage from "./core/pages/ProductStockBalancePage";
import DebtPaymentsPage from "./core/pages/DebtPaymentsPage";
import SponsorsPage from "./core/pages/SponsorsPage";
import CreateSponsorPage from "./core/pages/create-sponsor";
import EditSponsorPage from "./core/pages/edit-sponsor";
import SponsorLoansPage from "./core/pages/SponsorLoansPage";
import LoanPaymentsPage from "./core/pages/LoanPaymentsPage";
import LabelSizesPage from "./core/pages/LabelSizesPage";
import CreateLabelSize from "./core/pages/create-label-size";
import PrintBarcodePage from "./core/pages/PrintBarcodePage";
import POSPage from "./core/pages/POSPage";
import ProtectedRoute from "@/components/ProtectedRoute.tsx";
import CassasPage from "@/core/pages/Cassa.tsx";
import RevaluationHistoryPage from "@/pages/RevaluationHistoryPage";
import CreateCassaPage from "@/core/pages/CreateCassa.tsx";
import AttributesPage from "@/pages/AttributesPage";
import AttributeFormPage from "@/pages/AttributeFormPage";
import CloseShiftPage from "./core/pages/CloseShiftPage";
import { DefaultRedirect } from "./core/components/DefaultRedirect";
import ExchangeLoansPage from "./core/pages/ExchangeLoansPage";
import CreateExchangeLoanPage from "./core/pages/CreateExchangeLoanPage";
import EditExchangeLoanPage from "./core/pages/EditExchangeLoanPage";
import ExchangeLoanPaymentsPage from "./core/pages/ExchangeLoanPaymentsPage";
import WriteOffsPage from "@/core/pages/WriteOffsPage.tsx";
import WriteoffDetailPage from "@/core/pages/WriteoffDetailPage.tsx";
import StockDebtPaymentHistoryPage from "@/core/pages/StockDebtPaymentHistoryPage.tsx";
import EditStockEntry from "@/core/pages/EditStockEntry.tsx";
import SupplierBalanceHistoryPage from "./core/pages/SupplierBalanceHistoryPage";
import ActivityPage from "./core/pages/ActivityPage";
import ProductMovementsPage from "./core/pages/ProductMovementsPage";
import StockReturnsHistoryPage from "./core/pages/StockReturnsHistoryPage";
import VehiclesPage from "./core/pages/VehiclesPage";
import CreateVehicle from "./core/pages/create-vehicle";
import EditVehicle from "./core/pages/edit-vehicle";
import DriversPage from "./core/pages/DriversPage";
import CreateDriver from "./core/pages/create-driver";
import EditDriver from "./core/pages/edit-driver";
import VehicleIncomesPage from "./core/pages/VehicleIncomesPage";
import CreateVehicleIncome from "./core/pages/create-vehicle-income";
import EditVehicleIncome from "./core/pages/edit-vehicle-income";
// import W9FormDemo from "./core/pages/W9FormDemo";
// import CreateSalePos from "./core/pages/create-sale-2";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes wrapped in Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout>
                    <Outlet />
                  </Layout>
                </ProtectedRoute>
              }
            >
              {/* Routes accessible only by Администратор */}
              <Route
                path="/create-user"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateUser />
                  </PrivateRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <UsersPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-store"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateStore />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stores"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <StoresPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-category"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateCategory />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-category/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditCategory />
                  </PrivateRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CategoriesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/attributes"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <AttributesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/attributes/new"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <AttributeFormPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/attributes/:id/edit"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <AttributeFormPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/measurements/create"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateMeasurement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/measurements"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <MeasurementsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/currencies/create"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateCurrency />
                  </PrivateRoute>
                }
              />
              <Route
                path="/currencies"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CurrenciesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ProductsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-product"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateProduct />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stock"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <StocksPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-stock"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <CreateStock />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-stock/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditStock />
                  </PrivateRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <SuppliersPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-supplier"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateSupplier />
                  </PrivateRoute>
                }
              />
              <Route
                path="/suppliers/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <SupplierDetailPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/suppliers/:supplierId/stock-entries/:stockEntryId/payments"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <StockDebtPaymentHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/suppliers/:supplierId/stock-entries/:stockEntryId/edit"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditStockEntry />
                  </PrivateRoute>
                }
              />
              <Route
                path="/suppliers/:supplierId/stock-entries/:stockEntryId/returns"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <StockReturnsHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/suppliers/:id/balance-history"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <SupplierBalanceHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ClientsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-client"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <CreateClient />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-client/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <EditClient />
                  </PrivateRoute>
                }
              />
              <Route
                path="/clients/:id/history"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ClientHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transfers"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <TransfersPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-transfer"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateTransfer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/recyclings"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <RecyclingsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-recycling"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateRecycling />
                  </PrivateRoute>
                }
              />
              <Route
                path="/debts"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <DebtsPage />
                  </PrivateRoute>
                }
              />
              {/* <Route path="/debts/:id/history" element={<PrivateRoute allowedRoles={["Администратор"]}><DebtPaymentHistoryPage /></PrivateRoute>} /> */}
              <Route
                path="/debts/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <DebtDetailsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/expense-name"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ExpenseNamesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-expense-name"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateExpenseName />
                  </PrivateRoute>
                }
              />
              <Route
                path="/expense"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <ExpensesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-expense"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <CreateExpense />
                  </PrivateRoute>
                }
              />
              <Route
                path="/activity"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <ActivityPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/product-movements"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ProductMovementsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <StaffPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-debt/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <DebtDetailsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-staff"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateStaff />
                  </PrivateRoute>
                }
              />
              <Route
                path="/add-money"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <AddMoney />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-expense/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditExpensePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/cash-inflow-names"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CashInflowNamesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/finance"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CashInflowHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-money/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditMoney />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-product/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditProduct />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stocks/:id/history"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <StockPriceHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/income"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <IncomePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-transfers/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditTransfer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/income/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <IncomeDetailsPage />
                  </PrivateRoute>
                }
              />
                <Route
                    path="/writeoffs"
                    element={
                        <PrivateRoute allowedRoles={["Администратор"]}>
                            <WriteOffsPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/writeoffs/:id"
                    element={
                        <PrivateRoute allowedRoles={["Администратор"]}>
                            <WriteoffDetailPage />
                        </PrivateRoute>
                    }
                />

              {/* Vehicle, Driver, and Vehicle Income Management Routes */}
              <Route
                path="/vehicles"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <VehiclesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-vehicle"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateVehicle />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-vehicle/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditVehicle />
                  </PrivateRoute>
                }
              />
              <Route
                path="/drivers"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <DriversPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-driver"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateDriver />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-driver/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditDriver />
                  </PrivateRoute>
                }
              />
              <Route
                path="/vehicle-incomes"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <VehicleIncomesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-vehicle-income"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateVehicleIncome />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit-vehicle-income/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditVehicleIncome />
                  </PrivateRoute>
                }
              />

              {/* Routes accessible by both Администратор and Продавец */}
              <Route
                path="/sales"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <SalesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-sale"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <CreateSale />
                  </PrivateRoute>
                }
              />
              {/*<Route*/}
              {/*  path="/edit-sale/:id"*/}
              {/*  element={*/}
              {/*    <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>*/}
              {/*      <EditSale />*/}
              {/*    </PrivateRoute>*/}
              {/*  }*/}
              {/*/>*/}
              <Route
                path="/profile"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <ProfilePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <DashboardPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/product-stock-balance"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <ProductStockBalancePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/debts/:id/payments"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <DebtPaymentsPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/sponsors"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <SponsorsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-sponsor"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateSponsorPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/sponsors/edit/:id"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditSponsorPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/sponsors/:id/loans/:currency"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <SponsorLoansPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/sponsors/:id/loans/:loanId/payments"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <LoanPaymentsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/label-sizes"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <LabelSizesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-label-size"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateLabelSize />
                  </PrivateRoute>
                }
              />
              <Route
                path="/print-barcode/:productId"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <PrintBarcodePage />
                  </PrivateRoute>
                }
              />
              {/* Routes accessible by all authenticated users */}
              {/* <Route path="/loans" element={<PrivateRoute allowedRoles={["Администратор"]}><LoanSponsorsPage /></PrivateRoute>} /> */}
              {/* <Route path="/loans/create" element={<PrivateRoute allowedRoles={["Администратор"]}><CreateLoanSponsor /></PrivateRoute>} /> */}
              {/* <Route path="/loan-payments" element={<PrivateRoute allowedRoles={["Администратор"]}><LoanPaymentsPage /></PrivateRoute>} /> */}
              {/* <Route path="/loans/:loanId/payments" element={<PrivateRoute allowedRoles={["Администратор"]}><LoanPaymentsPage /></PrivateRoute>} /> */}
              {/* Routes accessible by all authenticated users */}
              {/* Default route */}
              <Route
                path="/pos"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <POSPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/cassas"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CassasPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-cassa"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateCassaPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/shifts"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <ShiftsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/shifts/:id/edit"
                element={
                  <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                    <EditShiftPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/close-shift/:shiftId"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CloseShiftPage />
                  </PrivateRoute>
                }
              />
              {/* <Route
                path="/pos-create"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                   <CreateSalePos/>
                  </PrivateRoute>
                }
              /> */}
              <Route path="/" element={<DefaultRedirect />} />
              <Route
                path="/receipt-designer"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ReceiptDesignerPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/revaluations"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <RevaluationHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/exchange-loans"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ExchangeLoansPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/exchange-loans/create"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <CreateExchangeLoanPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/exchange-loans/:id/edit"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <EditExchangeLoanPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/exchange-loans/:id/payments"
                element={
                  <PrivateRoute allowedRoles={["Администратор"]}>
                    <ExchangeLoanPaymentsPage />
                  </PrivateRoute>
                }
              />

            </Route>

            {/* Fullscreen POS route - outside Layout wrapper for touch interface */}
            <Route
              path="/pos-fullscreen"
              element={
                <PrivateRoute allowedRoles={["Администратор", "Продавец"]}>
                  <POSPage />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster />
          <ErrorModal />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
