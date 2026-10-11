import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { DynamicBreadcrumbs } from "@/components/dynamic-breadcrumbs"

export function SiteHeader() {
  return (
    <header
      data-slot="site-header"
      className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-[orientation=vertical]:h-4"
        />
        <DynamicBreadcrumbs />
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://thriftshoewear.com"
              rel="noopener noreferrer"
              target="_blank"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Storefront ↗
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
