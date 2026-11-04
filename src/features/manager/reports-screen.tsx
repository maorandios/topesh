"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import {
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Filter,
  MapPin,
  MessageCircle,
  Search,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useManagerDb } from "@/data/browser-store"
import {
  emptyWorkDiarySearchFilters,
  getManagerDiary,
  searchWorkDiaries,
  validateWorkDiarySearchDates,
  workDiarySearchOptions,
  type ManagerDiarySummary,
  type WorkDiarySearchFilters,
} from "@/data/manager"
import { findCompany, findCustomer } from "@/data/lookups"
import {
  emptyReportFilters,
  resolveFilterLabels,
  type ReportFilterLabels,
  type ReportResult,
} from "@/data/reports"
import type { MockDb } from "@/data/seed"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { DiaryPanel, diaryStatusLabel } from "@/features/manager/diary-panel"
import {
  FilterTriggerControl,
  MobileFilterPicker,
} from "@/features/manager/mobile-filters/picker-overlay"
import { useDevSession } from "@/features/dev-role/dev-session"
import { diaryFileBasename } from "@/features/manager/reports/diary-filename"
import { reportStamp } from "@/features/manager/reports/download"
import { buildDiariesZipBlob, diariesZipBasename, exportDiariesZip } from "@/features/manager/reports/export-diaries-zip"
import { buildDiaryPdfBytes, exportDiaryPdf } from "@/features/manager/reports/export-diary-pdf"
import { buildReportPdfBytes, exportReportPdf } from "@/features/manager/reports/export-pdf"
import {
  canShareFilesWithWhatsApp,
  downloadShareFile,
  openWhatsAppChat,
  shareFileNative,
  WHATSAPP_MESSAGE,
} from "@/features/manager/reports/share-whatsapp"
import { he } from "@/i18n/he"
import { BidiText } from "@/lib/bidi"
import {
  formatMonthTitle,
  formatWorkDate,
  formatWorkDateNumeric,
  jerusalemToday,
  parseIsoDate,
  toIsoDate,
} from "@/lib/format"
import { cn } from "cn"

const filterControlClass =
  "h-[calc(2.25rem*1.1*1.1)] w-full min-w-0 rounded-md border border-border bg-card px-4 text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-card"

const HEBREW_WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] as const

type ExportMode = "list" | "contents"
type ExportChannel = "pdf" | "whatsapp"

export function ReportsScreen() {
  const query = useManagerDb()
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  return <ReportsReady db={query.db} />
}

function ReportsReady({ db }: { db: MockDb }) {
  const desktop = useDesktop()
  const session = useDevSession()
  const [filters, setFilters] = useState<WorkDiarySearchFilters>(() => emptyWorkDiarySearchFilters())
  const [draftFilters, setDraftFilters] = useState<WorkDiarySearchFilters>(() => emptyWorkDiarySearchFilters())
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [openDiaryId, setOpenDiaryId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportMode, setExportMode] = useState<ExportMode>("list")
  const [exportChannel, setExportChannel] = useState<ExportChannel>("pdf")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [loaded, setLoaded] = useState({ key: "", extra: 0 })

  const options = workDiarySearchOptions(db, filters)
  const draftOptions = workDiarySearchOptions(db, draftFilters)
  const dateError = validateWorkDiarySearchDates(filters.from, filters.to)
  const draftDateError = validateWorkDiarySearchDates(draftFilters.from, draftFilters.to)
  const diaries = useMemo(() => searchWorkDiaries(db, filters), [db, filters])
  const filterKey = JSON.stringify(filters)
  const extra = loaded.key === filterKey ? loaded.extra : 0
  const visibleDiaries = diaries.slice(0, 30 + extra)
  const selectedDiaries = useMemo(
    () => diaries.filter((diary) => selectedIds.has(diary.id)),
    [diaries, selectedIds]
  )
  const openDiary = openDiaryId ? getManagerDiary(db, openDiaryId) : null
  const allSelected = diaries.length > 0 && selectedDiaries.length === diaries.length
  const someSelected = selectedDiaries.length > 0 && !allSelected
  const canExport = selectedDiaries.length > 0 && !exporting
  const hasActiveFilters = isFilterActive(filters)
  const hasActiveSheetFilters = hasActiveSheetFilter(filters)

  useEffect(() => {
    const visible = new Set(diaries.map((diary) => diary.id))
    // Keep selection in sync with the visible result set after filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prune stale selected ids
    setSelectedIds((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const id of prev) {
        if (visible.has(id)) next.add(id)
        else changed = true
      }
      return changed || next.size !== prev.size ? next : prev
    })
  }, [diaries])

  const patchFilters = (patch: Partial<WorkDiarySearchFilters>) => {
    setFilters((prev) => normalizeCascade(db, { ...prev, ...patch }))
  }

  const patchDraft = (patch: Partial<WorkDiarySearchFilters>) => {
    setDraftFilters((prev) => normalizeCascade(db, { ...prev, ...patch }))
  }

  const clearFilters = () => {
    setFilters(emptyWorkDiarySearchFilters())
    setDraftFilters(emptyWorkDiarySearchFilters())
    setSelectedIds(new Set())
    setSelectMode(false)
    setLoaded({ key: "", extra: 0 })
    setMobileFiltersOpen(false)
  }

  const openMobileFilters = () => {
    setDraftFilters(filters)
    setMobileFiltersOpen(true)
  }

  const applyMobileFilters = () => {
    if (draftDateError) return
    setFilters(draftFilters)
    setMobileFiltersOpen(false)
  }

  const clearSheetFilters = () => {
    setFilters((prev) => ({
      ...emptyWorkDiarySearchFilters(),
      workOrderNumber: prev.workOrderNumber,
    }))
    setDraftFilters((prev) => ({
      ...emptyWorkDiarySearchFilters(),
      workOrderNumber: prev.workOrderNumber,
    }))
  }

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(diaries.map((diary) => diary.id)) : new Set())
  }

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedIds(next)
    if (next.size === 0) setSelectMode(false)
  }

  const enterSelectMode = (id: string) => {
    setSelectMode(true)
    setSelectedIds(new Set(selectedIds).add(id))
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const openExportModal = (channel: ExportChannel) => {
    if (selectedDiaries.length === 0) {
      toast.info(he.manager.reports.exportNeedSelection)
      return
    }
    setExportChannel(channel)
    setExportMode("list")
    setExportOpen(true)
  }

  const runExport = async () => {
    if (selectedDiaries.length === 0) {
      toast.info(he.manager.reports.exportNeedSelection)
      return
    }
    const mode = exportMode
    const channel = exportChannel
    // WhatsApp must open in the same tick as the click — after await, browsers block popups.
    const whatsappNativeShare = channel === "whatsapp" && canShareFilesWithWhatsApp()
    if (channel === "whatsapp" && !whatsappNativeShare) {
      openWhatsAppChat(WHATSAPP_MESSAGE)
    }
    setExportOpen(false)
    setExporting(true)
    try {
      const pdfOptions = { generatedBy: session.user?.fullName ?? "" }
      if (channel === "whatsapp") {
        let file: File
        if (mode === "list") {
          const { result, labels } = buildAppliedExport(db, filters, selectedDiaries)
          const bytes = await buildReportPdfBytes(result, labels, pdfOptions)
          file = new File(
            [new Uint8Array(bytes)],
            `topesh-report-${result.type}-${reportStamp()}.pdf`,
            { type: "application/pdf" }
          )
        } else {
          const details = selectedDiaries
            .map((summary) => getManagerDiary(db, summary.id))
            .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail))
          if (details.length === 0) {
            toast.info(he.manager.reports.exportNeedSelection)
            return
          }
          if (details.length === 1) {
            const bytes = await buildDiaryPdfBytes(details[0]!, pdfOptions)
            file = new File(
              [new Uint8Array(bytes)],
              `${diaryFileBasename(details[0]!)}.pdf`,
              { type: "application/pdf" }
            )
          } else {
            const blob = await buildDiariesZipBlob(details, "pdf", pdfOptions)
            file = new File([blob], `${diariesZipBasename(details)}.zip`, {
              type: "application/zip",
            })
          }
        }
        if (whatsappNativeShare) {
          try {
            await shareFileNative(file, WHATSAPP_MESSAGE)
            toast.success(he.manager.reports.whatsAppDone)
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return
            downloadShareFile(file)
            openWhatsAppChat(WHATSAPP_MESSAGE)
            toast.success(he.manager.reports.whatsAppDoneAttach)
          }
        } else {
          downloadShareFile(file)
          toast.success(he.manager.reports.whatsAppDoneAttach)
        }
      } else if (mode === "list") {
        const { result, labels } = buildAppliedExport(db, filters, selectedDiaries)
        await exportReportPdf(result, labels, pdfOptions)
        toast.success(he.manager.reports.exportPdfDone)
      } else {
        const details = selectedDiaries
          .map((summary) => getManagerDiary(db, summary.id))
          .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail))
        if (details.length === 0) {
          toast.info(he.manager.reports.exportNeedSelection)
          return
        }
        if (details.length === 1) await exportDiaryPdf(details[0]!, pdfOptions)
        else await exportDiariesZip(details, "pdf", pdfOptions)
        toast.success(he.manager.reports.exportDiariesDone)
      }
    } catch {
      toast.error(
        channel === "whatsapp"
          ? he.manager.reports.whatsAppFailed
          : he.manager.reports.exportPdfFailed
      )
    } finally {
      setExporting(false)
    }
  }

  const toolbar = (
    <ResultsToolbar
      matchingCount={diaries.length}
      selectedCount={selectedDiaries.length}
      canExport={canExport}
      exporting={exporting}
      onExportPdf={() => openExportModal("pdf")}
      onSendWhatsApp={() => openExportModal("whatsapp")}
    />
  )

  const loadMore =
    visibleDiaries.length < diaries.length ? (
      <Button
        type="button"
        size="touch"
        variant="outline"
        className="self-center"
        onClick={() => setLoaded({ key: filterKey, extra: extra + 50 })}
      >
        {he.manager.dashboard.loadMore}
      </Button>
    ) : null

  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={filters.workOrderNumber}
              placeholder={he.manager.reports.searchFree}
              className="h-[calc(2.25rem*1.1*1.1)] rounded-md border-border bg-card pe-3 ps-9 text-sm shadow-none"
              onChange={(event) => patchFilters({ workOrderNumber: event.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            className={cn(
              "h-[calc(2.25rem*1.1*1.1)] shrink-0",
              hasActiveSheetFilters && "border-primary text-foreground"
            )}
            onClick={openMobileFilters}
          >
            <Filter className="size-4" aria-hidden />
            {he.manager.reports.filters}
          </Button>
          {hasActiveSheetFilters ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-[calc(2.25rem*1.1*1.1)] shrink-0 border-primary text-foreground"
              onClick={clearSheetFilters}
            >
              <X className="size-4" aria-hidden />
              {he.manager.reports.exportCancel}
            </Button>
          ) : null}
        </div>

        <div className="hidden lg:block">
          <FilterPanel
            filters={filters}
            options={options}
            dateError={dateError}
            hasActiveFilters={hasActiveFilters}
            onPatch={patchFilters}
            onClear={clearFilters}
          />
        </div>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent
            side="bottom"
            className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0"
          >
            <SheetHeader className="shrink-0 border-b border-border px-4 py-3">
              <SheetTitle>{he.manager.reports.filters}</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <FilterPanel
                filters={draftFilters}
                options={draftOptions}
                dateError={draftDateError}
                hasActiveFilters={isFilterActive(draftFilters)}
                onPatch={patchDraft}
                onClear={() => setDraftFilters(emptyWorkDiarySearchFilters())}
                compact
              />
            </div>
            <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-[calc(2.25rem*1.1*1.1)] w-[30%]"
                onClick={() => setDraftFilters(emptyWorkDiarySearchFilters())}
              >
                {he.nav.clearFilters}
              </Button>
              <Button
                type="button"
                className="h-[calc(2.25rem*1.1*1.1)] w-[70%]"
                disabled={Boolean(draftDateError)}
                onClick={applyMobileFilters}
              >
                {he.nav.applyFilters}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <div className="flex flex-col gap-3">
          <DiaryResultsTable
            diaries={visibleDiaries}
            selectedIds={selectedIds}
            allSelected={allSelected}
            someSelected={someSelected}
            toolbar={toolbar}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            onOpen={setOpenDiaryId}
          />

          {diaries.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-8 text-center lg:hidden">
              <p className="text-sm font-medium text-foreground">{he.manager.reports.empty}</p>
              <p className="mt-1 text-sm text-muted-foreground">{he.manager.reports.emptyHint}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:hidden">
              {selectMode ? (
                <div
                  className={cn(
                    "app-sticky-bar sticky z-20 -mx-4 border-b border-border px-4 py-2",
                    "top-[calc(3.5rem+env(safe-area-inset-top))]"
                  )}
                >
                  <div className="rounded-md border border-border bg-card px-2 py-2">
                    <MobileSelectToolbar
                      selectedCount={selectedDiaries.length}
                      canExport={canExport}
                      exporting={exporting}
                      onCancel={exitSelectMode}
                      onExportPdf={() => openExportModal("pdf")}
                      onSendWhatsApp={() => openExportModal("whatsapp")}
                    />
                  </div>
                </div>
              ) : null}
              <div className="rounded-md border border-border bg-card">
                <ul>
                  {visibleDiaries.map((diary) => (
                    <li key={diary.id} className="border-b border-border last:border-b-0">
                      <DiaryResultRow
                        diary={diary}
                        selectMode={selectMode}
                        selected={selectedIds.has(diary.id)}
                        onToggle={(checked) => toggleOne(diary.id, checked)}
                        onEnterSelectMode={() => enterSelectMode(diary.id)}
                        onOpen={setOpenDiaryId}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {loadMore}
        </div>
      </div>

      <DiaryPanel db={db} diary={openDiary} onOpenChange={(open) => { if (!open) setOpenDiaryId(null) }} />

      {desktop ? (
        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {exportChannel === "whatsapp"
                  ? he.manager.reports.exportModalTitleWhatsApp
                  : he.manager.reports.exportModalTitlePdf}
              </DialogTitle>
              <DialogDescription>
                {exportChannel === "whatsapp"
                  ? he.manager.reports.exportModalBodyWhatsApp
                  : he.manager.reports.exportModalBody}
              </DialogDescription>
            </DialogHeader>
            <ExportModePicker exportMode={exportMode} onExportModeChange={setExportMode} />
            <DialogFooter className="sm:justify-start">
              <Button type="button" onClick={() => void runExport()}>
                {exportChannel === "whatsapp"
                  ? he.manager.reports.whatsAppConfirm
                  : he.manager.reports.exportConfirm}
              </Button>
              <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>
                {he.manager.reports.exportCancel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={exportOpen} onOpenChange={setExportOpen} showSwipeHandle swipeDirection="down">
          <DrawerContent className="overflow-hidden" dir="rtl">
            <DrawerHeader className="text-start md:text-start">
              <DrawerTitle className="text-start">
                {exportChannel === "whatsapp"
                  ? he.manager.reports.exportModalTitleWhatsApp
                  : he.manager.reports.exportModalTitlePdf}
              </DrawerTitle>
              <DrawerDescription className="text-start">
                {exportChannel === "whatsapp"
                  ? he.manager.reports.exportModalBodyWhatsApp
                  : he.manager.reports.exportModalBody}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <ExportModePicker exportMode={exportMode} onExportModeChange={setExportMode} />
              <div className="flex flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-[calc(2.25rem*1.1*1.1)] w-[30%]"
                  onClick={() => setExportOpen(false)}
                >
                  {he.manager.reports.exportCancel}
                </Button>
                <Button
                  type="button"
                  className="h-[calc(2.25rem*1.1*1.1)] w-[70%]"
                  onClick={() => void runExport()}
                >
                  {exportChannel === "whatsapp"
                    ? he.manager.reports.whatsAppConfirm
                    : he.manager.reports.exportConfirm}
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </PageFrame>
  )
}

function ExportModePicker({
  exportMode,
  onExportModeChange,
}: {
  exportMode: ExportMode
  onExportModeChange: (mode: ExportMode) => void
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={he.manager.reports.exportModalBody}>
      <ExportModeOption
        pressed={exportMode === "list"}
        title={he.manager.reports.exportModeList}
        hint={he.manager.reports.exportModeListHint}
        onClick={() => onExportModeChange("list")}
      />
      <ExportModeOption
        pressed={exportMode === "contents"}
        title={he.manager.reports.exportModeContents}
        hint={he.manager.reports.exportModeContentsHint}
        onClick={() => onExportModeChange("contents")}
      />
    </div>
  )
}

function ExportModeOption({
  pressed,
  title,
  hint,
  onClick,
}: {
  pressed: boolean
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      className={cn(
        "flex items-start gap-3 rounded-md border border-border px-3 py-3 text-start transition-colors",
        pressed ? "bg-muted/40" : "bg-card hover:bg-muted/30"
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          "mt-1.5 size-2.5 shrink-0 rounded-full",
          pressed ? "bg-primary" : "border border-border bg-transparent"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

function ResultsToolbar({
  matchingCount,
  selectedCount,
  canExport,
  exporting,
  onExportPdf,
  onSendWhatsApp,
}: {
  matchingCount: number
  selectedCount: number
  canExport: boolean
  exporting: boolean
  onExportPdf: () => void
  onSendWhatsApp: () => void
}) {
  return (
    <div
      role="toolbar"
      aria-label={he.manager.reports.resultsTitle}
      className="inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-card"
    >
      <ToolbarAction
        label={exporting ? "..." : he.manager.reports.exportPdf}
        icon={FileText}
        disabled={!canExport}
        onClick={onExportPdf}
      />
      <ToolbarAction
        label={exporting ? "..." : he.manager.reports.sendWhatsApp}
        icon={MessageCircle}
        disabled={!canExport}
        onClick={onSendWhatsApp}
      />
      <ToolbarStat
        label={he.manager.reports.matchingCount}
        value={matchingCount}
      />
      <ToolbarStat
        label={he.manager.reports.selectedCount}
        value={selectedCount}
      />
    </div>
  )
}

function MobileSelectToolbar({
  selectedCount,
  canExport,
  exporting,
  onCancel,
  onExportPdf,
  onSendWhatsApp,
}: {
  selectedCount: number
  canExport: boolean
  exporting: boolean
  onCancel: () => void
  onExportPdf: () => void
  onSendWhatsApp: () => void
}) {
  return (
    <div
      role="toolbar"
      aria-label={he.manager.reports.resultsTitle}
      className="flex w-full items-stretch gap-1"
    >
      <span className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 text-sm text-foreground">
        <CheckSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">
          {he.manager.reports.selectedCount}
          <span className="text-muted-foreground"> · </span>
          <span className="font-semibold tabular-nums">{selectedCount}</span>
        </span>
      </span>
      <button
        type="button"
        className="pressable inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 text-sm whitespace-nowrap text-foreground transition-colors hover:bg-background/60"
        onClick={onCancel}
      >
        <X className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {he.manager.reports.exportCancel}
      </button>
      <button
        type="button"
        disabled={!canExport}
        className={cn(
          "pressable inline-flex min-h-11 min-w-0 flex-[1.2] items-center justify-center gap-1.5 rounded-md px-1.5 text-sm font-medium whitespace-nowrap transition-colors",
          canExport
            ? "text-primary hover:bg-background/60"
            : "cursor-not-allowed text-muted-foreground/50"
        )}
        onClick={onExportPdf}
      >
        <FileText className="size-3.5 shrink-0" aria-hidden />
        {exporting ? "..." : he.manager.reports.exportPdfShort}
      </button>
      <button
        type="button"
        disabled={!canExport}
        className={cn(
          "pressable inline-flex min-h-11 min-w-0 flex-[1.2] items-center justify-center gap-1.5 rounded-md px-1.5 text-sm font-medium whitespace-nowrap transition-colors",
          canExport
            ? "text-primary hover:bg-background/60"
            : "cursor-not-allowed text-muted-foreground/50"
        )}
        onClick={onSendWhatsApp}
      >
        <MessageCircle className="size-3.5 shrink-0" aria-hidden />
        {exporting ? "..." : he.manager.reports.sendWhatsAppShort}
      </button>
    </div>
  )
}

function ToolbarAction({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string
  icon: LucideIcon
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "pressable inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-xs whitespace-nowrap transition-colors",
        "border-s border-border first:border-s-0",
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : "bg-transparent text-foreground hover:bg-muted/70 dark:hover:bg-white/10"
      )}
      onClick={onClick}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  )
}

function ToolbarStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex h-8 shrink-0 items-center gap-1 border-s border-border px-3 text-xs whitespace-nowrap text-muted-foreground">
      {label}:
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  )
}

function FilterPanel({
  filters,
  options,
  dateError,
  hasActiveFilters,
  onPatch,
  onClear,
  compact = false,
}: {
  filters: WorkDiarySearchFilters
  options: ReturnType<typeof workDiarySearchOptions>
  dateError: string | null
  hasActiveFilters: boolean
  onPatch: (patch: Partial<WorkDiarySearchFilters>) => void
  onClear: () => void
  compact?: boolean
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-border bg-muted/40 px-4 py-4 sm:px-5",
        compact ? "overflow-visible border-0 bg-transparent px-0 py-0" : "overflow-x-auto"
      )}
    >
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "min-w-[56rem] grid-cols-4")}>
        <FilterField label={he.manager.reports.from} icon={CalendarDays}>
          <FilterDate
            title={he.manager.reports.from}
            value={filters.from}
            placeholder={he.manager.dashboard.pickDate}
            onValueChange={(from) => onPatch({ from })}
          />
        </FilterField>
        <FilterField label={he.manager.reports.to} icon={CalendarDays}>
          <FilterDate
            title={he.manager.reports.to}
            value={filters.to}
            placeholder={he.manager.dashboard.pickDate}
            onValueChange={(to) => onPatch({ to })}
          />
        </FilterField>
        <FilterField label={he.manager.reports.company} icon={Building2}>
          <MultiFilterSelect
            title={he.manager.reports.company}
            values={filters.companyIds}
            options={options.companies}
            onValuesChange={(companyIds) => onPatch({ companyIds })}
          />
        </FilterField>
        <FilterField label={he.manager.reports.customer} icon={Users}>
          <MultiFilterSelect
            title={he.manager.reports.customer}
            values={filters.customerIds}
            options={options.customers}
            onValuesChange={(customerIds) => onPatch({ customerIds })}
          />
        </FilterField>
        <FilterField label={he.manager.reports.site} icon={MapPin}>
          <MultiFilterSelect
            title={he.manager.reports.site}
            values={filters.siteIds}
            options={options.sites}
            onValuesChange={(siteIds) => onPatch({ siteIds })}
          />
        </FilterField>
        <FilterField label={he.manager.reports.workOrder} icon={Search}>
          <Input
            value={filters.workOrderNumber}
            placeholder={he.manager.reports.workOrderPlaceholder}
            className={filterControlClass}
            onChange={(event) => onPatch({ workOrderNumber: event.target.value })}
          />
        </FilterField>
        <FilterField label={he.manager.reports.leader} icon={UserRound}>
          <MultiFilterSelect
            title={he.manager.reports.leader}
            values={filters.teamLeaderIds}
            options={options.leaders}
            onValuesChange={(teamLeaderIds) => onPatch({ teamLeaderIds })}
          />
        </FilterField>
        <div className={cn("flex min-w-0 items-stretch gap-2", compact && "flex-col")}>
          <div className="min-w-0 flex-1">
            <FilterField label={he.manager.reports.status} icon={ClipboardList}>
              <MultiFilterSelect
                title={he.manager.reports.status}
                values={filters.statuses}
                options={[
                  { value: "pending", label: he.leader.status.pending },
                  { value: "submitted", label: he.leader.status.submitted },
                ]}
                onValuesChange={(statuses) =>
                  onPatch({ statuses: statuses as WorkDiarySearchFilters["statuses"] })
                }
              />
            </FilterField>
          </div>
          {compact ? null : (
            <div className="flex w-[40%] shrink-0 flex-col justify-end">
              <Button
                type="button"
                disabled={!hasActiveFilters}
                className="h-[calc(2.25rem*1.1*1.1)] w-full gap-1.5 rounded-md px-2 text-xs"
                onClick={onClear}
              >
                <X className="size-3.5" aria-hidden />
                {he.manager.reports.clearFilters}
              </Button>
            </div>
          )}
        </div>
      </div>

      {dateError === "range" ? (
        <p className="mt-3 text-sm text-destructive">{he.manager.reports.dateRangeError}</p>
      ) : null}
    </section>
  )
}

function DiaryResultsTable({
  diaries,
  selectedIds,
  allSelected,
  someSelected,
  toolbar,
  onToggleAll,
  onToggleOne,
  onOpen,
}: {
  diaries: ManagerDiarySummary[]
  selectedIds: Set<string>
  allSelected: boolean
  someSelected: boolean
  toolbar: ReactNode
  onToggleAll: (checked: boolean) => void
  onToggleOne: (id: string, checked: boolean) => void
  onOpen: (id: string) => void
}) {
  const columns = he.manager.reports.columns
  const headers: Array<{ key: string; label: string }> = [
    { key: "select", label: "" },
    { key: "index", label: columns.index },
    { key: "date", label: columns.date },
    { key: "company", label: columns.company },
    { key: "customer", label: columns.customer },
    { key: "site", label: columns.site },
    { key: "subSite", label: columns.subSite },
    { key: "leader", label: columns.leader },
    { key: "workOrder", label: columns.workOrder },
    { key: "status", label: columns.status },
  ]

  return (
    <div className="hidden rounded-md border border-border bg-card lg:block">
      <table className="w-full min-w-[74rem] table-fixed border-collapse text-[11px] leading-4">
        <colgroup>
          <col className="w-10" />
          <col className="w-10" />
          <col className="w-[7rem]" />
          <col />
          <col />
          <col />
          <col />
          <col />
          <col className="w-[7rem]" />
          <col className="w-[7.5rem]" />
        </colgroup>
        <thead className="app-sticky-bar sticky top-0 z-30">
          <tr className="text-foreground">
            <th colSpan={headers.length} className="px-3 pt-3 pb-1.5 font-normal">
              <div className="flex justify-end">{toolbar}</div>
            </th>
          </tr>
          <tr className="border-b border-border text-foreground">
            {headers.map((header) => (
              <th
                key={header.key}
                className="px-2 pt-1.5 pb-2.5 text-center font-medium whitespace-nowrap first:ps-3 last:pe-3"
              >
                {header.key === "select" ? (
                  <RowCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    ariaLabel={he.manager.reports.selectAll}
                    disabled={diaries.length === 0}
                    onChange={onToggleAll}
                  />
                ) : (
                  header.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {diaries.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{he.manager.reports.empty}</p>
                <p className="mt-1">{he.manager.reports.emptyHint}</p>
              </td>
            </tr>
          ) : (
            diaries.map((diary, index) => {
              const selected = selectedIds.has(diary.id)
              return (
                <tr
                  key={diary.id}
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer border-b border-border/80 last:border-b-0 hover:bg-muted/40",
                    selected && "bg-muted/30",
                    diary.status === "cancelled" && "text-muted-foreground [&>td:not(:last-child)]:line-through"
                  )}
                  onClick={() => onOpen(diary.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key !== "Enter" && event.key !== " ") return
                    event.preventDefault()
                    onOpen(diary.id)
                  }}
                >
                  <Cell>
                    <RowCheckbox
                      checked={selected}
                      ariaLabel={he.manager.reports.selectRow}
                      onChange={(checked) => onToggleOne(diary.id, checked)}
                    />
                  </Cell>
                  <Cell className="tabular-nums text-muted-foreground">{index + 1}</Cell>
                  <Cell className="whitespace-nowrap">
                    <BidiText>{formatWorkDateNumeric(diary.workDate)}</BidiText>
                  </Cell>
                  <Cell value={diary.companyName} />
                  <Cell value={diary.customerName} />
                  <Cell value={diary.siteName} />
                  <Cell value={diary.subSiteName || "—"} />
                  <Cell value={diary.teamLeaderName} />
                  <Cell className="whitespace-nowrap">
                    <BidiText>{diary.workOrderNumber}</BidiText>
                  </Cell>
                  <Cell className="whitespace-nowrap">{diaryStatusLabel(diary.status)}</Cell>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function diaryStatusDotClass(diary: ManagerDiarySummary) {
  if (diary.duplicatedFromId) return "bg-sky-500"
  if (diary.status === "pending") return "bg-orange-500"
  if (diary.status === "submitted") return "bg-emerald-500"
  if (diary.status === "cancelled") return "bg-zinc-500"
  return null
}

function DiaryResultRow({
  diary,
  selectMode,
  selected,
  onToggle,
  onEnterSelectMode,
  onOpen,
}: {
  diary: ManagerDiarySummary
  selectMode: boolean
  selected: boolean
  onToggle: (checked: boolean) => void
  onEnterSelectMode: () => void
  onOpen: (id: string) => void
}) {
  const statusDot = diaryStatusDotClass(diary)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const startLongPress = () => {
    if (selectMode) return
    longPressTriggeredRef.current = false
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      onEnterSelectMode()
      longPressTimerRef.current = null
    }, 420)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-[calc(0.75rem*1.15*1.15)] text-sm",
        selected && "bg-muted/30",
        diary.status === "cancelled" && "text-muted-foreground"
      )}
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      onContextMenu={(event) => {
        event.preventDefault()
        if (!selectMode) onEnterSelectMode()
      }}
    >
      <button
        type="button"
        className={cn(
          "min-w-0 flex-1 text-start",
          diary.status === "cancelled" && "line-through"
        )}
        onClick={() => {
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false
            return
          }
          if (selectMode) {
            onToggle(!selected)
            return
          }
          onOpen(diary.id)
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          {statusDot ? (
            <span className={cn("size-2 shrink-0 rounded-full", statusDot)} aria-hidden />
          ) : null}
          <span className="min-w-0 truncate font-medium">
            <BidiText>{formatWorkDateNumeric(diary.workDate)}</BidiText>
            <span className="text-muted-foreground"> · </span>
            <span>{diary.siteName}</span>
          </span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {diary.customerName} · {diary.teamLeaderName}
        </span>
      </button>
      {selectMode ? (
        <RowCheckbox
          checked={selected}
          round
          ariaLabel={he.manager.reports.selectRow}
          onChange={onToggle}
        />
      ) : null}
    </div>
  )
}

function RowCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  round = false,
  ariaLabel,
  onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  round?: boolean
  ariaLabel: string
  onChange: (checked: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-[1.125rem] shrink-0 cursor-pointer appearance-none border border-border bg-background checked:border-primary checked:bg-primary checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%222.2%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M3.5%208.5%206.5%2011.5%2012.5%204.5%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat disabled:cursor-not-allowed accent-primary",
        round ? "rounded-full" : "rounded-[4px]"
      )}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate && !checked
      }}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}

function FilterField({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="inline-flex items-center gap-1 text-start text-[11px] font-semibold text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {label}
      </span>
      <div className="w-full">{children}</div>
    </div>
  )
}

function useDesktop() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(min-width: 1024px)")
      query.addEventListener("change", onStoreChange)
      return () => query.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  )
}

function MultiFilterSelect({
  title,
  values,
  options,
  onValuesChange,
}: {
  title: string
  values: string[]
  options: Array<{ value: string; label: string }>
  onValuesChange: (values: string[]) => void
}) {
  const desktop = useDesktop()
  const [open, setOpen] = useState(false)
  const selectedLabels = options.filter((option) => values.includes(option.value)).map((option) => option.label)
  const hasSelection = values.length > 0
  const summary =
    selectedLabels.length === 0
      ? he.manager.reports.all
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} ${he.manager.reports.selectedOptions}`

  const toggle = (value: string, checked: boolean) => {
    if (checked) onValuesChange([...values, value])
    else onValuesChange(values.filter((item) => item !== value))
  }

  const triggerClass = cn(
    filterControlClass,
    "relative flex cursor-pointer items-center pe-9 ps-4 text-start"
  )

  if (!desktop) {
    return (
      <>
        <FilterTriggerControl
          className={filterControlClass}
          label={summary}
          active={hasSelection}
          resetLabel={he.manager.reports.selectReset}
          onOpen={() => setOpen(true)}
          onReset={() => onValuesChange([])}
        />
        <MobileFilterPicker
          open={open}
          title={title}
          onClose={() => setOpen(false)}
          footer={
            <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                className="h-[calc(2.25rem*1.1*1.1)] w-full"
                onClick={() => setOpen(false)}
              >
                {he.close}
              </Button>
            </div>
          }
        >
          <div className="px-2 pb-2">
            {options.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {he.manager.reports.emptyOptions}
              </p>
            ) : (
              <ul className="flex flex-col">
                {options.map((option) => {
                  const checked = values.includes(option.value)
                  return (
                    <li key={option.value} className="border-b border-border/60 last:border-b-0">
                      <div className="flex items-center gap-3 px-3 py-3.5">
                        <button
                          type="button"
                          className="pressable min-w-0 flex-1 text-start text-sm font-medium"
                          onClick={() => toggle(option.value, !checked)}
                        >
                          <span className="truncate">{option.label}</span>
                        </button>
                        <RowCheckbox
                          checked={checked}
                          round
                          ariaLabel={option.label}
                          onChange={(next) => toggle(option.value, next)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </MobileFilterPicker>
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass}>
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-48 rounded-md p-1.5">
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{he.manager.reports.emptyOptions}</div>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={values.includes(option.value)}
              className="rounded-md px-3 py-2"
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => toggle(option.value, checked === true)}
            >
              <span className="truncate">{option.label}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterDate({
  title,
  value,
  placeholder,
  onValueChange,
}: {
  title: string
  value: string
  placeholder: string
  onValueChange: (value: string) => void
}) {
  const desktop = useDesktop()
  const [open, setOpen] = useState(false)
  const triggerClass = cn(
    filterControlClass,
    "relative flex cursor-pointer items-center pe-9 ps-4 text-start"
  )
  const displayLabel = value ? formatWorkDate(value) : placeholder
  const calendar = (
    <>
      <HebrewCalendar
        value={value}
        onSelect={(next) => {
          onValueChange(next)
          setOpen(false)
        }}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 w-full text-xs"
          onClick={() => {
            onValueChange("")
            setOpen(false)
          }}
        >
          {he.manager.dashboard.clearDate}
        </Button>
      ) : null}
    </>
  )

  if (!desktop) {
    return (
      <>
        <FilterTriggerControl
          className={filterControlClass}
          label={displayLabel}
          muted={!value}
          active={Boolean(value)}
          resetLabel={he.manager.reports.selectReset}
          onOpen={() => setOpen(true)}
          onReset={() => onValueChange("")}
        />
        <MobileFilterPicker open={open} title={title} onClose={() => setOpen(false)}>
          <div className="flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
            {calendar}
          </div>
        </MobileFilterPicker>
      </>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={triggerClass}>
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
          {displayLabel}
        </span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-auto rounded-md p-3">
        {calendar}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HebrewCalendar({
  value,
  onSelect,
}: {
  value: string
  onSelect: (value: string) => void
}) {
  const selected = parseIsoDate(value)
  const initial = selected ?? parseIsoDate(jerusalemToday()) ?? new Date()
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1))
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null
    return index - firstDay + 1
  })

  return (
    <div className="w-[16.5rem]" dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="חודש הבא"
        >
          <ChevronRight className="size-4" />
        </button>
        <p className="text-sm font-semibold">{formatMonthTitle(year, month)}</p>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="חודש קודם"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {HEBREW_WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />
          const iso = toIsoDate(new Date(year, month, day))
          const active = value === iso
          return (
            <button
              key={iso}
              type="button"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full text-sm tabular-nums hover:bg-muted",
                active && "bg-primary text-primary-foreground hover:bg-primary"
              )}
              onClick={() => onSelect(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Cell({
  value,
  children,
  className,
}: {
  value?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <td className={cn("px-2 py-2 text-center first:ps-3 last:pe-3", className)}>
      {children ?? (
        <span className="mx-auto block max-w-full truncate text-center" title={value}>
          {value}
        </span>
      )}
    </td>
  )
}

function buildAppliedExport(
  db: MockDb,
  applied: WorkDiarySearchFilters,
  diaries: ManagerDiarySummary[]
): { result: ReportResult; labels: ReportFilterLabels } {
  const filters = {
    ...emptyReportFilters(),
    from: applied.from,
    to: applied.to,
    workOrderNumber: applied.workOrderNumber,
    status: (applied.statuses.length === 1 ? applied.statuses[0]! : "all") as
      | "all"
      | "pending"
      | "submitted"
      | "cancelled",
  }
  const labels = resolveFilterLabels(db, filters)
  return {
    result: {
      type: "diaries",
      filters,
      matchingDiaryCount: diaries.length,
      diaries,
      summary: [],
      details: [],
      dateRangeError: null,
    },
    labels: {
      ...labels,
      company: applied.companyIds
        .map((id) => findCompany(db, id)?.name ?? "")
        .filter(Boolean)
        .join(", "),
      customer: applied.customerIds
        .map((id) => findCustomer(db, id)?.name ?? "")
        .filter(Boolean)
        .join(", "),
      site: applied.siteIds
        .map((id) => db.sites.find((site) => site.id === id)?.name ?? "")
        .filter(Boolean)
        .join(", "),
      teamLeader: applied.teamLeaderIds
        .map((id) => db.users.find((user) => user.id === id)?.fullName ?? "")
        .filter(Boolean)
        .join(", "),
    },
  }
}

function hasActiveSheetFilter(filters: WorkDiarySearchFilters) {
  return Boolean(
    filters.from ||
      filters.to ||
      filters.companyIds.length > 0 ||
      filters.customerIds.length > 0 ||
      filters.siteIds.length > 0 ||
      filters.teamLeaderIds.length > 0 ||
      filters.statuses.length > 0
  )
}

function isFilterActive(filters: WorkDiarySearchFilters) {
  return hasActiveSheetFilter(filters) || Boolean(filters.workOrderNumber.trim())
}

function normalizeCascade(db: MockDb, filters: WorkDiarySearchFilters): WorkDiarySearchFilters {
  let next = { ...filters }
  if (next.companyIds.length > 0) {
    next = {
      ...next,
      customerIds: next.customerIds.filter((id) => customerMatchesCompanies(db, id, next.companyIds)),
    }
  }
  if (next.siteIds.length > 0) {
    next = {
      ...next,
      siteIds: next.siteIds.filter((id) => siteMatchesFilters(db, id, next)),
    }
  }
  return next
}

function customerMatchesCompanies(db: MockDb, customerId: string, companyIds: string[]) {
  if (companyIds.length === 0) return true
  const customer = db.customers.find((item) => item.id === customerId)
  if (customer?.companyId && companyIds.includes(customer.companyId)) return true
  return db.diaries.some(
    (diary) => diary.customerId === customerId && companyIds.includes(diary.companyId)
  )
}

function siteMatchesFilters(db: MockDb, siteId: string, filters: WorkDiarySearchFilters) {
  const site = db.sites.find((item) => item.id === siteId)
  if (filters.customerIds.length > 0) {
    if (site?.customerId && filters.customerIds.includes(site.customerId)) return true
    return db.diaries.some(
      (diary) => diary.siteId === siteId && filters.customerIds.includes(diary.customerId)
    )
  }
  if (filters.companyIds.length > 0) {
    if (site?.customerId) {
      const customer = db.customers.find((item) => item.id === site.customerId)
      if (customer?.companyId && filters.companyIds.includes(customer.companyId)) return true
    }
    return db.diaries.some(
      (diary) => diary.siteId === siteId && filters.companyIds.includes(diary.companyId)
    )
  }
  return Boolean(site)
}
