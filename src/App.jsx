import { useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { fetchMe } from "./store/authSlice"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import DashboardLayout from "./layouts/DashboardLayout"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import LoginPage from "./pages/LoginPage"
import OrdersPage from "./pages/OrdersPage"
import OrderDetailPage from "./pages/OrderDetailPage"
import PaymentsPage from "./pages/PaymentsPage"
import CouponsPage from "./pages/CouponsPage"
import CategoriesPage from "./pages/CategoriesPage"
import OverviewPage from "./pages/OverviewPage"
import ProductsPage from "./pages/ProductsPage"
import ProductFormPage from "./pages/ProductFormPage"
import RegisterPage from "./pages/RegisterPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import ResourcePage from "./pages/ResourcePage"
import SettingsPage from "./pages/SettingsPage"
import UsersPage from "./pages/UsersPage"
import AccessRequestsPage from "./pages/AccessRequestsPage"
import VerifyEmailPage from "./pages/VerifyEmailPage"
import { RESOURCE_CONFIG } from "./config/resources"

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
      <Toaster />
    </ThemeProvider>
  )
}

export default App
