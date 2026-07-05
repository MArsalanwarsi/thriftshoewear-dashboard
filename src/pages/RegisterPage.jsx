import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { UserPlus } from "lucide-react"
import AuthFrame from "../components/AuthFrame"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { clearAuthError, registerDashboardUser } from "../store/authSlice"

export default function RegisterPage() {
  const dispatch = useDispatch()
  const { status, error, message } = useSelector((state) => state.auth)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    primaryPhone: "",
    password: "",
    requestedRole: "admin",
  })

  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const submit = (event) => {
    event.preventDefault()
    dispatch(registerDashboardUser(form))
  }

  return (
    <AuthFrame
      title="Request dashboard access"
      description="A super admin must approve your account before you can login."
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            />
          </div>
        </div>
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
          <Label htmlFor="primaryPhone">Phone</Label>
          <Input
            id="primaryPhone"
            value={form.primaryPhone}
            onChange={(event) => setForm((current) => ({ ...current, primaryPhone: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedRole">Requested role</Label>
          <Select
            value={form.requestedRole}
            onValueChange={(value) => setForm((current) => ({ ...current, requestedRole: value }))}
          >
            <SelectTrigger id="requestedRole">
              <SelectValue placeholder="Requested role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superAdmin">Super admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
            minLength={8}
          />
        </div>
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          <UserPlus className="size-4" />
          {status === "loading" ? "Submitting..." : "Submit request"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already approved?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/login">
            Login
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
