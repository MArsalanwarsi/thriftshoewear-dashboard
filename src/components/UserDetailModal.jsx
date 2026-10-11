import * as React from "react"
import { Calendar, CheckCircle2, Mail, MapPin, Phone, Shield, User, XCircle } from "lucide-react"
import { formatDate } from "@/lib/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import StatusBadge from "@/components/StatusBadge"
import { AccessStatusBadge, RoleBadge } from "@/components/UserBadges"

export function UserDetailModal({ user, open, onOpenChange }) {
  if (!user) return null

  const displayName =
    user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-14 border shadow-xs">
              <AvatarImage src={user.avatar?.url} alt={displayName} />
              <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold leading-none">{displayName}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <RoleBadge role={user.role} />
                <StatusBadge value={user.status} />
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="size-3.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <XCircle className="size-3.5" /> Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-sm">
          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Email Address</div>
                <div className="font-medium text-foreground">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Primary Phone</div>
                <div className="font-medium text-foreground">
                  {user.primaryPhone || "Not provided"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Customer Segment</div>
                <div className="font-medium capitalize text-foreground">
                  {user.customerType || "retail"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Member Since</div>
                <div className="font-medium text-foreground">{formatDate(user.createdAt)}</div>
              </div>
            </div>
          </div>

          {/* Dashboard Access Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3.5" /> Dashboard Access State
            </h4>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Access Request Status</span>
                <AccessStatusBadge status={user.dashboardAccess?.status} />
              </div>
              {user.dashboardAccess?.requestedRole && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Requested Role</span>
                  <span className="font-mono font-medium">{user.dashboardAccess.requestedRole}</span>
                </div>
              )}
              {user.dashboardAccess?.requestedAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Requested At</span>
                  <span>{formatDate(user.dashboardAccess.requestedAt)}</span>
                </div>
              )}
              {user.dashboardAccess?.approvedAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Approved At</span>
                  <span className="text-emerald-600 font-medium">
                    {formatDate(user.dashboardAccess.approvedAt)}
                  </span>
                </div>
              )}
              {user.dashboardAccess?.rejectedAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Rejected At</span>
                  <span className="text-destructive font-medium">
                    {formatDate(user.dashboardAccess.rejectedAt)}
                  </span>
                </div>
              )}
              {user.dashboardAccess?.reviewNotes && (
                <div className="pt-2 border-t text-xs">
                  <span className="text-muted-foreground block mb-1">Review Notes:</span>
                  <p className="bg-muted p-2 rounded text-foreground italic">
                    "{user.dashboardAccess.reviewNotes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Addresses */}
          {user.addresses && user.addresses.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Addresses ({user.addresses.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.addresses.map((addr, idx) => (
                  <div key={addr._id || idx} className="rounded-lg border p-3 text-xs space-y-1">
                    <div className="font-semibold">{addr.fullName}</div>
                    <div className="text-muted-foreground">{addr.addressLine1}</div>
                    {addr.addressLine2 && (
                      <div className="text-muted-foreground">{addr.addressLine2}</div>
                    )}
                    <div>
                      {addr.city}, {addr.province} {addr.postalCode}
                    </div>
                    <div className="text-muted-foreground">{addr.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
