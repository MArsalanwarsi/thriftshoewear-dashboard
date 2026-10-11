import * as React from "react"
import { AlertTriangle, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function RejectAccessModal({
  user,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  isSuperAdmin = false,
}) {
  const [reviewNotes, setReviewNotes] = React.useState("")

  React.useEffect(() => {
    if (user) {
      setReviewNotes("")
    }
  }, [user])

  if (!user) return null

  const applicantName =
    user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm({ reviewNotes })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Reject Dashboard Access
            </DialogTitle>
            <DialogDescription>
              Decline administrative access for this user. Their account will remain restricted to a
              standard inactive customer profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <div className="font-semibold text-foreground">{applicantName}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-notes">Reason for Rejection (Included in notice email)</Label>
              <Textarea
                id="reject-notes"
                placeholder="e.g. Identity verification could not be confirmed."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                disabled={loading || !isSuperAdmin}
              />
            </div>

            <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                This action sets the applicant's role to <strong>customer</strong> and status to{" "}
                <strong>inactive</strong>.
              </span>
            </div>

            {!isSuperAdmin && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                Super Admin privileges are required to reject dashboard access requests.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || !isSuperAdmin}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
