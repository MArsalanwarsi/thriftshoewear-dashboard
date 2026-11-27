"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error?.message || "An unexpected dashboard error occurred while rendering this view."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to Overview</Link>
        </Button>
      </div>
    </div>
  )
}
