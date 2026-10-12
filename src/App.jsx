import { lazy, Suspense, useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { fetchMe } from "./store/authSlice"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import DashboardLayout from "./layouts/DashboardLayout"
import PageLoader from "./components/PageLoader"
import { RESOURCE_CONFIG } from "./config/resources"

const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"))
const LoginPage = lazy(() => import("./pages/LoginPage"))
const OrdersPage = lazy(() => import("./pages/OrdersPage"))
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"))
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"))
const CouponsPage = lazy(() => import("./pages/CouponsPage"))
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"))
const OverviewPage = lazy(() => import("./pages/OverviewPage"))
const ProductsPage = lazy(() => import("./pages/ProductsPage"))
const ProductFormPage = lazy(() => import("./pages/ProductFormPage"))
const RegisterPage = lazy(() => import("./pages/RegisterPage"))
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"))
const ResourcePage = lazy(() => import("./pages/ResourcePage"))
const SettingsPage = lazy(() => import("./pages/SettingsPage"))
const UsersPage = lazy(() => import("./pages/UsersPage"))
const AccessRequestsPage = lazy(() => import("./pages/AccessRequestsPage"))
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"))

function RequireAuth({ children }) {
  const token = useSelector((state) => state.auth.token)
  const user = useSelector((state) => state.auth.user)
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin"

  if (!token) return <Navigate to="/login" replace />
  if (user && !isAdmin) return <Navigate to="/login" replace />

  return children
}

function App() {
  const dispatch = useDispatch()
  const token = useSelector((state) => state.auth.token)

  useEffect(() => {
    if (token) {
      dispatch(fetchMe())
    }
  }, [dispatch, token])

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductFormPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/access-requests" element={<AccessRequestsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {Object.entries(RESOURCE_CONFIG)
              .filter(
                ([resource]) =>
                  !["products", "orders", "payments", "coupons", "categories"].includes(
                    resource
                  ) && !["users", "settings"].includes(resource)
              )
              .map(([resource, config]) => (
                <Route
                  key={resource}
                  path={config.route}
                  element={<ResourcePage resource={resource} />}
                />
              ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </ThemeProvider>
  )
}

export default App

