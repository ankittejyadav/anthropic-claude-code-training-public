"use client"

import { Button } from "@/components/Button"
import {
  EXPORT_COLUMNS,
  EXPORT_DEFAULT_COLUMNS,
  type ExportColumn,
} from "@/lib/csv"
import * as Dialog from "@radix-ui/react-dialog"
import { Download, X } from "lucide-react"
import { useState } from "react"

const LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Created (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

type Scope = "filter" | "all"

/**
 * Export options for /payments. The server decides what is valid; this only
 * builds the request. `query` is the page's current filter string. Counts come
 * from the server, so the number shown is the number in the file.
 */
export function ExportDialog({
  query,
  filteredCount,
  allCount,
}: {
  query: string
  filteredCount: number
  allCount: number
}) {
  const [selected, setSelected] = useState<Set<ExportColumn>>(
    () => new Set(EXPORT_DEFAULT_COLUMNS),
  )
  const [scope, setScope] = useState<Scope>("filter")

  // Keep the table's column order, whatever order the boxes were ticked in.
  const columns = EXPORT_COLUMNS.filter((column) => selected.has(column))
  const canDownload = columns.length > 0
  const rowCount = scope === "all" ? allCount : filteredCount

  const toggle = (column: ExportColumn) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })

  const params = new URLSearchParams(query)
  params.delete("page")
  params.set("columns", columns.join(","))
  params.set("scope", scope)
  const href = `/api/payments/export?${params.toString()}`

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-950/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Export payments
            </Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-gray-500">
            Choose the columns and the rows to include.
          </Dialog.Description>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {EXPORT_COLUMNS.map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    name="columns"
                    value={column}
                    checked={selected.has(column)}
                    onChange={() => toggle(column)}
                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                  />
                  {LABELS[column]}
                  {column === "last4" && (
                    <span className="text-xs text-gray-500">(off by default)</span>
                  )}
                </label>
              ))}
            </div>
            {!canDownload && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-500" role="alert">
                Select at least one column.
              </p>
            )}
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Rows
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="scope"
                  value="filter"
                  checked={scope === "filter"}
                  onChange={() => setScope("filter")}
                  className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                />
                Current filter ({filteredCount.toLocaleString()} payments)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                />
                All payments ({allCount.toLocaleString()} payments)
              </label>
            </div>
          </fieldset>

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            {canDownload ? (
              <Button asChild>
                <a href={href} download>
                  <Download className="size-4 shrink-0" aria-hidden="true" />
                  Download {rowCount.toLocaleString()} rows
                </a>
              </Button>
            ) : (
              <Button disabled>Download</Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
