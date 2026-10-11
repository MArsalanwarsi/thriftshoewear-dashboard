import * as React from "react"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function ApproveAccessModal({
  user,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  isSuperAdmin = false,
}) {
  const [role, setRole] = React.useState("admin")
  const [reviewNotes, setReviewNotes] = React.useState("")

  React.useEffect(() => {
    if (user) {
      setRole(user.dashboardAccess?.requestedRole || "admin")
      setReviewNotes("")
    }
  }, [user])

  if (!user) return null

  const applicantName =
    user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm({ role, reviewNotes })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Approve Dashboard Access
            </DialogTitle>
            <DialogDescription>
              Grant administrative access to this applicant. An automated onboarding confirmation
              will be dispatched to their registered email address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <div className="font-semibold text-foreground">{applicantName}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              <div className="text-xs text-muted-foreground">
                Requested Role:{" "}
                <span className="font-mono font-medium text-foreground">
                  {user.dashboardAccess?.requestedRole || "admin"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-role">Assigned Staff Role *</Label>
              <Select value={role} onValueChange={setRole} disabled={loading || !isSuperAdmin}>
                <SelectTrigger id="approve-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-blue-600" />
                      <span>Admin (Standard Operational Privileges)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="superAdmin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-purple-600" />
                      <span>Super Admin (Full Administrative Authority)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-notes">Review Notes / Remarks (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="e.g. Authorized for order fulfillment and inventory intake."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                disabled={loading || !isSuperAdmin}
              />
            </div>

            {!isSuperAdmin && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                Super Admin privileges are required to approve dashboard access requests.
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading || !isSuperAdmin}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
