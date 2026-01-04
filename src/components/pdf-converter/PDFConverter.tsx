import { useState } from "react";
import { Zap, DownloadCloud, FileDigit, Settings2 } from "lucide-react";
import { PDFUploader } from "./PDFUploader";
import { ConversionProgress } from "./ConversionProgress";
import { ImageGallery } from "./ImageGallery";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConversionProgress as ConversionProgressType, ConvertedImage, ConversionOptions as ConversionOptionsType } from "@/types/pdf";

export function PDFConverter() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [pageRange, setPageRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
    const [maskWatermark, setMaskWatermark] = useState<boolean>(true);
    const [progress, setProgress] = useState<ConversionProgressType>({
        currentPage: 0,
        totalPages: 0,
        percentage: 0,
        status: "idle",
    });
    const [images, setImages] = useState<ConvertedImage[]>([]);

    const [totalPages, setTotalPages] = useState<number>(0);

    const handleFileSelect = async (file: File) => {
        setSelectedFile(file);
        setImages([]);
        setPageRange({ start: "", end: "" });
        setMaskWatermark(true);
        setTotalPages(0);
        setProgress({
            currentPage: 0,
            totalPages: 0,
            percentage: 0,
            status: "idle",
        });

        try {
            const { getPdfPageCount } = await import("@/lib/utils/pdf-converter");
            const count = await getPdfPageCount(file);
            setTotalPages(count);
        } catch (error) {
            console.error("Failed to get page count:", error);
        }
    };

    const handleConvert = async (options: Partial<ConversionOptionsType>) => {
        if (!selectedFile) return;

        try {
            setProgress({
                currentPage: 0,
                totalPages: 0,
                percentage: 0,
                status: "converting",
            });

            const { convertPdfToImages } = await import("@/lib/utils/pdf-converter");

            const start = pageRange.start ? parseInt(pageRange.start) : undefined;
            const end = pageRange.end ? parseInt(pageRange.end) : undefined;

            const convertedImages = await convertPdfToImages(
                selectedFile,
                {
                    format: options.format || "png",
                    scale: (options.dpi || 150) / 72, // Convert DPI to scale
                    quality: (options.quality || 90) / 100,
                    pageRange: (start || end) ? { start: start || 1, end: end || 9999 } : undefined,
                    maskWatermark: maskWatermark,
                },
                (current, total) => {
                    setProgress({
                        currentPage: current,
                        totalPages: total,
                        percentage: Math.round((current / total) * 100),
                        status: "converting",
                    });
                }
            );

            setImages(convertedImages.map((img, idx) => ({
                id: `img-${Date.now()}-${idx}`,
                url: img.url,
                pageNumber: img.pageNumber,
                format: img.format,
                size: 0,
            })));

            setProgress(prev => ({
                ...prev,
                status: "completed",
                percentage: 100
            }));
        } catch (error) {
            console.error("Conversion error:", error);
            setProgress({
                currentPage: 0,
                totalPages: 0,
                percentage: 0,
                status: "error",
                error: error instanceof Error ? error.message : "An error occurred",
            });
        }
    };


    const handleDownloadAll = async () => {
        if (images.length === 0) return;

        // Check for File System Access API support
        if ("showDirectoryPicker" in window) {
            try {
                const directoryHandle = await (window as any).showDirectoryPicker();

                for (const image of images) {
                    const fileName = `page-${image.pageNumber}.${image.format}`;
                    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();

                    const response = await fetch(image.url);
                    const blob = await response.blob();

                    await writable.write(blob);
                    await writable.close();
                }
            } catch (error) {
                if ((error as any).name === "AbortError") return;
                console.error("Failed to save to folder:", error);
                // Fallback to individual downloads if folder selection fails/is unsupported
                performStandardDownload();
            }
        } else {
            performStandardDownload();
        }
    };

    const performStandardDownload = () => {
        images.forEach((image) => {
            const link = document.createElement("a");
            link.href = image.url;
            link.download = `page-${image.pageNumber}.${image.format}`;
            link.click();
        });
    };

    return (
        <div className="space-y-8 p-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <PDFUploader onFileSelect={handleFileSelect} />

                {selectedFile && (progress.status === "idle" || progress.status === "completed") && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings2 className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold text-foreground">Conversion Settings</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start-page">Start Page</Label>
                                    <Input
                                        id="start-page"
                                        type="number"
                                        placeholder="1"
                                        min={1}
                                        value={pageRange.start}
                                        onChange={(e) => setPageRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end-page">End Page</Label>
                                    <Input
                                        id="end-page"
                                        type="number"
                                        placeholder={totalPages ? `Max: ${totalPages}` : "All"}
                                        min={1}
                                        max={totalPages || undefined}
                                        value={pageRange.end}
                                        onChange={(e) => setPageRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                    {totalPages > 0 && <p className="text-[10px] text-muted-foreground mt-1 text-right">Total: {totalPages} pages</p>}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 bg-background/50 p-3 rounded-xl border border-border/50">
                                <input
                                    type="checkbox"
                                    id="mask-watermark"
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={maskWatermark}
                                    onChange={(e) => setMaskWatermark(e.target.checked)}
                                />
                                <Label htmlFor="mask-watermark" className="text-sm font-medium cursor-pointer">
                                    Remove Bottom Watermark (e.g. NotebookLM)
                                </Label>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={() => handleConvert({ format: "png", quality: 90, dpi: 150 })}
                                className="px-12 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-3"
                            >
                                <Zap className="h-6 w-6" />
                                {images.length > 0 ? "Regenerate Images" : "Convert to Images"}
                            </button>
                        </div>
                    </div>
                )}

                {progress.status !== "idle" && progress.status !== "completed" && (
                    <div className="animate-in zoom-in duration-300">
                        <ConversionProgress
                            progress={progress}
                            onCancel={() => {
                                setProgress({
                                    currentPage: 0,
                                    totalPages: 0,
                                    percentage: 0,
                                    status: "idle",
                                });
                            }}
                        />
                    </div>
                )}

                {images.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Generated Gallery</h3>
                            <button
                                onClick={handleDownloadAll}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-xs shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                            >
                                <DownloadCloud className="h-4 w-4" />
                                Download All
                            </button>
                        </div>
                        <ImageGallery images={images} />
                    </div>
                )}

                {progress.status === "idle" && !selectedFile && (
                    <div className="bg-muted/5 border-2 border-dashed border-border/40 rounded-[2.5rem] h-64 flex flex-col items-center justify-center text-center p-8">
                        <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                            <FileDigit className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">Drop your PDF here</h3>
                        <p className="text-[10px] font-bold text-muted-foreground mt-4 max-w-[200px] leading-relaxed">Fast and secure conversion. No files leave your device.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
