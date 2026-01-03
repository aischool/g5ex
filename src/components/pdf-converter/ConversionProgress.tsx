
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { ConversionProgress as ConversionProgressType } from "@/types/pdf";

interface ConversionProgressProps {
    progress: ConversionProgressType;
    onCancel?: () => void;
    className?: string;
}

export function ConversionProgress({ progress, onCancel, className }: ConversionProgressProps) {
    const isConverting = progress.status === "converting";
    const isCompleted = progress.status === "completed";
    const isError = progress.status === "error";

    return (
        <div className={cn("w-full max-w-md mx-auto space-y-6", className)}>
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl shadow-primary/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {isConverting && (
                            <div className="bg-primary/10 p-2 rounded-xl">
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            </div>
                        )}
                        {isCompleted && (
                            <div className="bg-emerald-500/10 p-2 rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                        )}
                        {isError && (
                            <div className="bg-destructive/10 p-2 rounded-xl">
                                <XCircle className="h-5 w-5 text-destructive" />
                            </div>
                        )}
                        <div>
                            <h4 className="font-bold text-foreground">
                                {isConverting && "Converting PDF..."}
                                {isCompleted && "Conversion Complete!"}
                                {isError && "Conversion Failed"}
                            </h4>
                            <p className="text-xs font-medium text-muted-foreground">
                                {isConverting && `Processing page ${progress.currentPage} of ${progress.totalPages}`}
                                {isCompleted && "All pages successfully converted"}
                                {isError && (progress.error || "An unexpected error occurred")}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-foreground">{progress.percentage}%</span>
                    </div>
                </div>

                <Progress value={progress.percentage} className="h-2" />

                {isConverting && (
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={onCancel}
                            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
                        >
                            Cancel Operation
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
