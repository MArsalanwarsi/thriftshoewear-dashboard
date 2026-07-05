import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react"
import {
  createRecord,
  deleteRecord,
  fetchResource,
  runRecordAction,
  updateRecord,
} from "../store/adminSlice"
import { RESOURCE_CONFIG, getInitialFormValues } from "../config/resources"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { Textarea } from "../components/ui/textarea"
import StatusBadge from "../components/StatusBadge"

const ALL_VALUE = "__all"
const NONE_VALUE = "__none"

function valueForSelect(value) {
  return value === undefined || value === null || value === "" ? NONE_VALUE : String(value)
}

function valueFromSelect(value) {
  return value === ALL_VALUE || value === NONE_VALUE ? "" : value
}

function FieldControl({ field, value, onChange, categories = [] }) {
  const id = `field-${field.name}`

  if (field.type === "textarea") {
    return (
      <Textarea
        id={id}
        value={value || ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    )
  }

  if (field.type === "switch") {
    return (
      <div className="flex h-9 items-center gap-3">
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
        <span className="text-sm text-muted-foreground">{value ? "Enabled" : "Disabled"}</span>
      </div>
    )
  }

  if (field.type === "select") {
    return (
      <Select value={valueForSelect(value)} onValueChange={(next) => onChange(valueFromSelect(next))}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {!field.required && <SelectItem value={NONE_VALUE}>Not set</SelectItem>}
          {(field.options || []).map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === "category") {
    return (
      <Select value={valueForSelect(value)} onValueChange={(next) => onChange(valueFromSelect(next))}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {field.allowNone && <SelectItem value={NONE_VALUE}>No parent</SelectItem>}
          {categories.map((category) => (
            <SelectItem key={category._id} value={category._id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      id={id}
      type={field.type || "text"}
      value={value || ""}
      placeholder={field.placeholder}
      min={field.type === "number" ? 0 : undefined}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
    />
  )
}

function FilterSelect({ filter, value, onChange }) {
  return (
    <Select value={value || ALL_VALUE} onValueChange={(next) => onChange(next === ALL_VALUE ? "" : next)}>
      <SelectTrigger className="w-full sm:w-44">
        <SelectValue placeholder={filter.label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All {filter.label.toLowerCase()}</SelectItem>
        {filter.options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RecordFormDialog({
  config,
  categories,
  form,
  mode,
  open,
  selected,
  setForm,
  onClose,
  onSubmit,
  pending,
  error,
}) {
  const fields = config.fields?.filter((field) => !(field.createOnly && mode === "edit")) || []

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `Add ${config.singular}` : `Edit ${config.singular}`}</DialogTitle>
          <DialogDescription>
            Fields match the backend schema for {config.label.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.type === "textarea" ? "space-y-2 md:col-span-2" : "space-y-2"}
              >
                <Label htmlFor={`field-${field.name}`}>
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                <FieldControl
                  field={field}
                  value={form[field.name]}
                  categories={categories}
                  onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
                />
              </div>
            ))}
          </div>
          {selected?.isDeleted && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This record is currently soft deleted. Restore it before expecting it to appear publicly.
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ActionDialog({ actionState, categories, onClose, onSubmit, pending, error }) {
  const { action, form } = actionState || {}
  const fields = action?.fields || []

  return (
    <Dialog open={Boolean(actionState)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{action?.label}</DialogTitle>
          <DialogDescription>Confirm the backend action and provide any required fields.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`action-${field.name}`}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              <FieldControl
                field={{ ...field, name: `action-${field.name}` }}
                value={form[field.name]}
                categories={categories}
                onChange={(value) =>
                  actionState.setForm((current) => ({
                    ...current,
                    form: { ...current.form, [field.name]: value },
                  }))
                }
              />
            </div>
          ))}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ResourcePage({ resource }) {
  const config = RESOURCE_CONFIG[resource]
  const dispatch = useDispatch()
  const resourceState = useSelector((state) => state.admin.resources[resource])
  const categories = useSelector((state) => state.admin.resources.categories.items)
  const mutation = useSelector((state) => state.admin.mutation)
  const currentUser = useSelector((state) => state.auth.user)
  const [params, setParams] = useState(config.defaultParams || { page: 1, limit: 20 })
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState("create")
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState(null)
  const [actionState, setActionState] = useState(null)
  const [actionError, setActionError] = useState(null)

  const pending = mutation.status === "loading"

  const listParams = useMemo(() => {
    const next = { ...params }
    if (search && !config.searchDisabled) next.search = search
    return next
  }, [config.searchDisabled, params, search])

  useEffect(() => {
    dispatch(fetchResource({ resource, params: listParams }))
  }, [dispatch, listParams, resource])

  useEffect(() => {
    if (config.requiresCategories && resource !== "categories") {
      dispatch(fetchResource({ resource: "categories", params: { limit: 100, includeDeleted: "false" } }))
    }
  }, [config.requiresCategories, dispatch, resource])

  const openCreate = () => {
    setFormMode("create")
    setSelected(null)
    setForm(getInitialFormValues(config.fields || []))
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (item) => {
    setFormMode("edit")
    setSelected(item)
    setForm(getInitialFormValues(config.fields || [], item))
    setFormError(null)
    setFormOpen(true)
  }

  const refresh = () => dispatch(fetchResource({ resource, params: listParams }))

  const submitForm = async (event) => {
    event.preventDefault()
    setFormError(null)

    try {
      const payload = config.buildPayload(form, formMode, selected)
      if (formMode === "create") {
        await dispatch(createRecord({ resource, body: payload })).unwrap()
      } else {
        await dispatch(updateRecord({ resource, id: selected._id, body: payload })).unwrap()
      }
      setFormOpen(false)
      refresh()
    } catch (error) {
      setFormError(error.message)
    }
  }

  const removeRecord = async (item) => {
    try {
      await dispatch(deleteRecord({ resource, id: item._id })).unwrap()
      refresh()
    } catch (error) {
      setActionError(error.message)
    }
  }

  const restoreRecord = async (item) => {
    try {
      await dispatch(
        runRecordAction({
          resource,
          endpoint: `${config.endpoint}/${item._id}/restore`,
          body: {},
        }),
      ).unwrap()
      refresh()
    } catch (error) {
      setActionError(error.message)
    }
  }

  const runActionNow = async (item, action, values = {}) => {
    const baseBody = action.body ? action.body(item) : {}
    try {
      await dispatch(
        runRecordAction({
          resource,
          endpoint: action.endpoint(item),
          method: action.method || "PATCH",
          body: { ...baseBody, ...values },
        }),
      ).unwrap()
      setActionState(null)
      refresh()
    } catch (error) {
      setActionError(error.message)
    }
  }

  const startAction = (item, action) => {
    setActionError(null)
    if (!action.fields?.length) {
      runActionNow(item, action)
      return
    }

    setActionState({
      item,
      action,
      form: getInitialFormValues(action.fields),
      setForm: setActionState,
    })
  }

  const submitAction = (event) => {
    event.preventDefault()
    if (!actionState) return
    runActionNow(actionState.item, actionState.action, actionState.form)
  }

  const changePage = (direction) => {
    setParams((current) => ({
      ...current,
      page: Math.max(1, Number(current.page || 1) + direction),
    }))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{config.label}</CardTitle>
              <CardDescription>
                Connected to <code className="rounded bg-muted px-1 py-0.5">{config.endpoint}</code>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={refresh}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              {config.canCreate !== false && (
                <Button type="button" onClick={openCreate}>
                  <Plus className="size-4" />
                  Add {config.singular}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            {!config.searchDisabled && (
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  placeholder={config.searchPlaceholder || "Search..."}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setParams((current) => ({ ...current, page: 1 }))
                  }}
                />
              </div>
            )}
            <div className="flex flex-1 flex-wrap gap-2">
              {(config.filters || []).map((filter) => (
                <FilterSelect
                  key={filter.name}
                  filter={filter}
                  value={params[filter.name] || ""}
                  onChange={(value) =>
                    setParams((current) => ({
                      ...current,
                      page: 1,
                      [filter.name]: value,
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {actionError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resourceState.status === "loading" && !resourceState.items.length && (
                <TableRow>
                  <TableCell colSpan={config.columns.length + 1} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    Loading {config.label.toLowerCase()}
                  </TableCell>
                </TableRow>
              )}
              {resourceState.items.map((item) => (
                <TableRow key={item._id} className={item.isDeleted ? "bg-red-50/40" : undefined}>
                  {config.columns.map((column) => (
                    <TableCell key={column.key} className={column.key === "name" || column.key === "title" ? "font-medium" : undefined}>
                      {column.badge ? <StatusBadge value={column.value(item)} /> : column.value(item)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {config.canEdit !== false && (
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {item.isDeleted ? (
                          <DropdownMenuItem onClick={() => restoreRecord(item)}>
                            <RotateCcw className="size-4" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          config.canDelete !== false && (
                            <DropdownMenuItem variant="destructive" onClick={() => removeRecord(item)}>
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          )
                        )}
                        {!!config.actions?.length && <DropdownMenuSeparator />}
                        {(config.actions || [])
                          .filter((action) => !action.superAdminOnly || currentUser?.role === "superAdmin")
                          .map((action) => (
                          <DropdownMenuItem key={action.label} onClick={() => startAction(item, action)}>
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!resourceState.items.length && resourceState.status !== "loading" && (
                <TableRow>
                  <TableCell colSpan={config.columns.length + 1} className="h-32 text-center text-muted-foreground">
                    No {config.label.toLowerCase()} found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {resourceState.meta?.page || params.page || 1} of {resourceState.meta?.pages || 1}
              {resourceState.meta?.total !== undefined && ` · ${resourceState.meta.total} records`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!resourceState.meta?.hasPrevPage}
                onClick={() => changePage(-1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!resourceState.meta?.hasNextPage}
                onClick={() => changePage(1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {config.fields && (
        <RecordFormDialog
          config={config}
          categories={categories}
          form={form}
          mode={formMode}
          open={formOpen}
          selected={selected}
          setForm={setForm}
          onClose={() => setFormOpen(false)}
          onSubmit={submitForm}
          pending={pending}
          error={formError}
        />
      )}

      <ActionDialog
        actionState={actionState}
        categories={categories}
        onClose={() => setActionState(null)}
        onSubmit={submitAction}
        pending={pending}
        error={actionError}
      />
    </div>
  )
}
