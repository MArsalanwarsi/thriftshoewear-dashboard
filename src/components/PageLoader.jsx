import { Loader2 } from "lucide-react"

export default function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 p-8">
      <Loader2 className="size-8 animate-spin text-primary" />
      <span className="text-sm font-medium text-muted-foreground animate-pulse">
        Loading...
      </span>
    </div>
  )
}
