import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The requested admin route does not exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Return to Overview</Link>
      </Button>
    </div>
  )
}
