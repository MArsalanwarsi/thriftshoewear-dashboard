import { Navigate, Route, Routes } from "react-router-dom"
import { useSelector } from "react-redux"
import AppShell from "./components/AppShell"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import LoginPage from "./pages/LoginPage"
import OverviewPage from "./pages/OverviewPage"
import RegisterPage from "./pages/RegisterPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import ResourcePage from "./pages/ResourcePage"
import SettingsPage from "./pages/SettingsPage"
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
  return (
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
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        {Object.entries(RESOURCE_CONFIG).map(([resource, config]) => (
          <Route
            key={resource}
            path={config.route}
            element={<ResourcePage resource={resource} />}
          />
        ))}
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
