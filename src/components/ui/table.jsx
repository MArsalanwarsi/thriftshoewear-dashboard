import { cn } from "../../lib/utils"

function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />
}

function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}

function TableFooter({ className, ...props }) {
  return <tfoot className={cn("border-t bg-muted/50 font-medium", className)} {...props} />
}

function TableRow({ className, ...props }) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-muted/50", className)} {...props} />
}

function TableHead({ className, ...props }) {
  return <th className={cn("h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground", className)} {...props} />
}

function TableCell({ className, ...props }) {
  return <td className={cn("px-3 py-3 align-middle", className)} {...props} />
}

function TableCaption({ className, ...props }) {
  return <caption className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
