import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { BadgeCheck, Loader2 } from "lucide-react"
import AuthFrame from "../components/AuthFrame"
import { Button } from "../components/ui/button"
import { clearAuthError, verifyEmail } from "../store/authSlice"

export default function VerifyEmailPage() {
  const { token } = useParams()
  const dispatch = useDispatch()
  const { status, error, message } = useSelector((state) => state.auth)

  useEffect(() => {
    dispatch(verifyEmail(token))
    return () => dispatch(clearAuthError())
  }, [dispatch, token])

  return (
    <AuthFrame title="Email verification" description="Confirming your dashboard email address.">
      <div className="space-y-4">
        {status === "loading" && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Verifying email
          </div>
        )}
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <BadgeCheck className="mr-2 inline size-4" />
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Button asChild className="w-full">
          <Link to="/login">Go to login</Link>
        </Button>
      </div>
    </AuthFrame>
  )
}
