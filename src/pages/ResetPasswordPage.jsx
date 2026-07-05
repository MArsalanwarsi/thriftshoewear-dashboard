import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { KeyRound } from "lucide-react"
import AuthFrame from "../components/AuthFrame"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { clearAuthError, resetPassword } from "../store/authSlice"

export default function ResetPasswordPage() {
  const { token } = useParams()
  const dispatch = useDispatch()
  const { status, error, message } = useSelector((state) => state.auth)
  const [password, setPassword] = useState("")

  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const submit = (event) => {
    event.preventDefault()
    dispatch(resetPassword({ token, password }))
  }

  return (
    <AuthFrame title="Reset password" description="Create a new password for your dashboard account.">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          <KeyRound className="size-4" />
          {status === "loading" ? "Saving..." : "Reset password"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/login">
            Back to login
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
