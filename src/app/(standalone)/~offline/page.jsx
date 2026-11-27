import Link from "next/link"
import { WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Offline Mode",
  description: "Offline fallback view for Thrift Shoe Wear Admin Portal.",
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <WifiOff className="size-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">You&apos;re currently offline</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cached dashboard views remain browsable, while write mutations and order updates are paused until your connection returns.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Button asChild>
            <Link href="/">Return to Overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Go to Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
