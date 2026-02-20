"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  X,
  FileText,
  UploadCloud,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDataUpdateModalStore } from "@/stores/data-update-modal-store";
import { getLatestDateFromDb } from "@/lib/api/daily";
import { CSV_SOURCE_URL } from "./constants";
import {
  updateDataFromCSV,
  forceUpdateDataFromCSV,
} from "./csv-uploader";

type ProgressVariant = "idle" | "done" | "error";

/** append = 최신일 이후만 추가, replace = 지정 구간 삭제 후 재업로드 */
export type UpsertMode = "append" | "replace";

export function DataUpdateModal() {
  const router = useRouter();
  const { open, closeModal } = useDataUpdateModalStore();

  /** DB에 저장된 최신 집계일(YYYY-MM-DD). getLatestDateFromDb()로 조회 */
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [upsertMode, setUpsertMode] = useState<UpsertMode>("append");
  const [upsertStart, setUpsertStart] = useState("");
  const [upsertEnd, setUpsertEnd] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressVariant, setProgressVariant] = useState<ProgressVariant>("idle");
  const [progressStage, setProgressStage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressDetail, setProgressDetail] = useState("");

  const resetProgress = useCallback(() => {
    setProgressVisible(false);
    setProgressVariant("idle");
    setProgressStage("");
    setProgressPercent(0);
    setProgressDetail("");
  }, []);

  const resetUpsertRange = useCallback(() => {
    setUpsertMode("append");
    setUpsertStart("");
    setUpsertEnd("");
  }, []);

  useEffect(() => {
    if (!open) return;
    resetProgress();
    resetUpsertRange();
    setIsImporting(false);
    setLatestDate(null);
    getLatestDateFromDb()
      .then(setLatestDate)
      .catch(() => setLatestDate(null));
  }, [open, resetProgress, resetUpsertRange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) closeModal();
    },
    [closeModal],
  );

  const handleCsvClick = useCallback(() => {
    window.open(CSV_SOURCE_URL, "_blank");
  }, []);

  const handleImportClick = useCallback(async () => {
    if (upsertMode === "replace") {
      if (!upsertStart || !upsertEnd) {
        setProgressVisible(true);
        setProgressVariant("error");
        setProgressStage("오류");
        setProgressDetail("시작일과 종료일을 모두 선택해주세요.");
        return;
      }
      if (upsertStart > upsertEnd) {
        setProgressVisible(true);
        setProgressVariant("error");
        setProgressStage("오류");
        setProgressDetail("시작일이 종료일보다 클 수 없습니다.");
        return;
      }
    }

    setIsImporting(true);
    setProgressVisible(true);
    setProgressVariant("idle");
    setProgressStage("준비 중...");
    setProgressPercent(0);
    setProgressDetail("");

    const onProgress = (info: {
      stage: string;
      percent: number;
      detail?: string;
    }) => {
      setProgressStage(info.stage);
      setProgressPercent(info.percent);
      setProgressDetail(info.detail ?? "");
    };

    try {
      if (upsertMode === "replace") {
        await forceUpdateDataFromCSV(upsertStart, upsertEnd, onProgress);
      } else {
        await updateDataFromCSV(onProgress);
      }
      setProgressVariant("done");
      setProgressPercent(100);
      setProgressStage("업로드 완료");
      const toastMsg =
        upsertMode === "replace"
          ? "강제 업데이트가 완료되었습니다"
          : "데이터 업데이트가 완료되었습니다";
      if (typeof window !== "undefined") {
        localStorage.setItem("data-update-toast", toastMsg);
      }
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setProgressVariant("error");
      setProgressStage("오류 발생");
      setProgressDetail(msg);
      setIsImporting(false);
    }
  }, [upsertMode, upsertStart, upsertEnd, closeModal, router]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[480px] max-w-[92vw] gap-0 overflow-hidden rounded-[20px] border border-white/70 bg-white/88 p-0 shadow-xl backdrop-blur-[24px] dark:border-white/10 dark:bg-zinc-900/90"
      >
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-5">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <Database className="h-5 w-5 text-primary" />
            Data Import
          </DialogTitle>
          <button
            type="button"
            onClick={closeModal}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="닫기"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </DialogHeader>

        <div className="px-6 pb-6 pt-1">
          <p className="mb-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            <a
              href="https://redash.dable.io/queries/12601/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 font-mono text-xs font-bold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
            >
              &lt;/&gt;
            </a>
            {" "}를 통해 데이터를 조회하여 데이터를 CSV에 입력합니다
          </p>
          <p className="mb-5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            Google Sheets CSV 데이터를 데이터베이스에 동기화합니다.
          </p>

          {latestDate != null && (
            <p className="mb-5 text-[13px] text-slate-500 dark:text-slate-400">
              현재 {latestDate}까지의 데이터가 집계되어 있습니다.
            </p>
          )}

          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <label className="flex cursor-pointer select-none items-center gap-2.5">
              <input
                type="checkbox"
                checked={upsertMode === "replace"}
                onChange={(e) =>
                  setUpsertMode(e.target.checked ? "replace" : "append")
                }
                className="sr-only"
              />
              <span
                className={cn(
                  "relative inline-flex h-[22px] w-10 shrink-0 rounded-full transition-colors",
                  upsertMode === "replace"
                    ? "bg-amber-500"
                    : "bg-slate-300 dark:bg-slate-600",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 size-[18px] rounded-full bg-white shadow-sm transition-transform",
                    upsertMode === "replace" && "translate-x-[18px]",
                  )}
                />
              </span>
              <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                강제 업데이트
              </span>
            </label>
            {upsertMode === "replace" && (
              <div className="mt-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-end gap-2.5">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      시작일
                    </label>
                    <input
                      type="date"
                      value={upsertStart}
                      onChange={(e) => setUpsertStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-[13px] text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <span className="shrink-0 pb-2.5 font-mono text-sm font-semibold text-slate-400">
                    ~
                  </span>
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      종료일
                    </label>
                    <input
                      type="date"
                      value={upsertEnd}
                      onChange={(e) => setUpsertEnd(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-[13px] text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-[15px] w-[15px] shrink-0" />
                  지정 기간의 기존 데이터를 삭제 후 재업로드합니다.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleCsvClick}
              disabled={isImporting}
              className="flex-1 gap-2 rounded-xl py-3.5 font-semibold"
            >
              <FileText className="h-[18px] w-[18px]" />
              CSV
            </Button>
            <Button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className={cn(
                "flex-1 gap-2 rounded-xl py-3.5 font-semibold",
                upsertMode === "replace" &&
                  "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700",
              )}
            >
              {upsertMode === "replace" ? (
                <AlertTriangle className="h-[18px] w-[18px]" />
              ) : (
                <UploadCloud className="h-[18px] w-[18px]" />
              )}
              {upsertMode === "replace" ? "강제 Import" : "IMPORT"}
            </Button>
          </div>

          {progressVisible && (
            <div
              className={cn(
                "mt-5 rounded-xl border p-4",
                progressVariant === "done" &&
                  "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30",
                progressVariant === "error" &&
                  "border-red-200 bg-red-50/80 dark:border-red-900/30 dark:bg-red-950/20",
                progressVariant === "idle" &&
                  "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50",
              )}
            >
              <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                <span
                  className={cn(
                    "inline-block size-2 rounded-full",
                    progressVariant === "idle" && "animate-pulse bg-primary",
                    progressVariant === "done" && "bg-emerald-500",
                    progressVariant === "error" && "bg-red-500",
                  )}
                />
                {progressStage}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    progressVariant === "idle" &&
                      "bg-gradient-to-r from-primary to-primary/80",
                    progressVariant === "done" &&
                      "bg-gradient-to-r from-emerald-500 to-emerald-400",
                    progressVariant === "error" &&
                      "bg-gradient-to-r from-red-500 to-red-400",
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {progressDetail && (
                <p className="mt-2 text-right font-mono text-[11px] tabular-nums text-slate-400">
                  {progressDetail}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
