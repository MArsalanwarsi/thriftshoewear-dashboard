import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link, Navigate } from "react-router-dom"
import { LockKeyhole } from "lucide-react"
import AuthFrame from "../components/AuthFrame"
import { clearAuthError, loginUser } from "../store/authSlice"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"

export default function LoginPage() {
  const dispatch = useDispatch()
  const { token, user, status, error } = useSelector((state) => state.auth)
  const [form, setForm] = useState({ email: "", password: "" })

  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  if (token && (user?.role === "admin" || user?.role === "superAdmin")) {
    return <Navigate to="/" replace />
  }

  const submit = (event) => {
    event.preventDefault()
    dispatch(loginUser(form))
  }

  return (
    <AuthFrame title="Admin login" description="Use an approved admin or super admin backend account.">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <Link className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" to="/register">
            Request access
          </Link>
          <Link className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          <LockKeyhole className="size-4" />
          {status === "loading" ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthFrame>
  )
}
