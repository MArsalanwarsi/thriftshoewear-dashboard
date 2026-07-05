import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { Mail } from "lucide-react"
import AuthFrame from "../components/AuthFrame"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { clearAuthError, forgotPassword } from "../store/authSlice"

export default function ForgotPasswordPage() {
  const dispatch = useDispatch()
  const { status, error, message } = useSelector((state) => state.auth)
  const [email, setEmail] = useState("")

  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const submit = (event) => {
    event.preventDefault()
    dispatch(forgotPassword({ email }))
  }

  return (
    <AuthFrame title="Forgot password" description="We will send a password reset link if the email exists.">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
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
          <Mail className="size-4" />
          {status === "loading" ? "Sending..." : "Send reset link"}
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
