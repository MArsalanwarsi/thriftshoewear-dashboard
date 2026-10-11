import * as React from "react"
import { AlertCircle, Loader2, Shield } from "lucide-react"
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

export function EditRoleModal({
  user,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  isSuperAdmin = false,
}) {
  const [role, setRole] = React.useState("customer")

  React.useEffect(() => {
    if (user) {
      setRole(user.role || "customer")
    }
  }, [user])

  if (!user) return null

  const userName =
    user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm(role)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Update Account Role
            </DialogTitle>
            <DialogDescription>
              Assign system privileges and administrative permissions for this user account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <div className="font-semibold text-foreground">{userName}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              <div className="text-xs text-muted-foreground">
                Current Role: <span className="font-semibold uppercase">{user.role}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-role">New Role *</Label>
              <Select value={role} onValueChange={setRole} disabled={loading || !isSuperAdmin}>
                <SelectTrigger id="change-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer (Storefront Shopper)</SelectItem>
                  <SelectItem value="admin">Admin (Operational Dashboard Access)</SelectItem>
                  <SelectItem value="superAdmin">
                    Super Admin (Full System & Access Control)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "superAdmin" && (
              <div className="flex items-start gap-2 rounded-md bg-purple-50 dark:bg-purple-950/40 p-3 text-xs text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                <AlertCircle className="size-4 shrink-0 text-purple-600 mt-0.5" />
                <span>
                  Super Admins hold root privileges, including reviewing access requests, modifying
                  staff permissions, and managing sensitive store configs.
                </span>
              </div>
            )}

            {!isSuperAdmin && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                Only Super Admins can alter account roles.
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
            <Button type="submit" disabled={loading || !isSuperAdmin}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Role Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
