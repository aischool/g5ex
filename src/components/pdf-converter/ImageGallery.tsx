import { useState, useEffect } from "react";
import { Download, Eye, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConvertedImage } from "@/types/pdf";

interface ImageGalleryProps {
    images: ConvertedImage[];
    className?: string;
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<ConvertedImage | null>(null);

    const handleDownload = async (image: ConvertedImage) => {
        // Check for File System Access API support for 'showSaveFilePicker'
        if ("showSaveFilePicker" in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: `page-${image.pageNumber}.${image.format}`,
                    types: [{
                        description: 'Image file',
                        accept: { [`image/${image.format}`]: [`.${image.format}`] },
                    }],
                });

                const writable = await handle.createWritable();
                const response = await fetch(image.url);
                const blob = await response.blob();

                await writable.write(blob);
                await writable.close();
            } catch (error) {
                if ((error as any).name === "AbortError") return;
                console.error("Failed to save file:", error);
                // Fallback to standard download if showSaveFilePicker fails or is not supported
                const link = document.createElement("a");
                link.href = image.url;
                link.download = `page-${image.pageNumber}.${image.format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            // Fallback for browsers not supporting showSaveFilePicker
            const link = document.createElement("a");
            link.href = image.url;
            link.download = `page-${image.pageNumber}.${image.format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage) return;
        const currentIndex = images.findIndex(img => img.id === selectedImage.id);
        if (currentIndex < images.length - 1) {
            setSelectedImage(images[currentIndex + 1]);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedImage) return;
        const currentIndex = images.findIndex(img => img.id === selectedImage.id);
        if (currentIndex > 0) {
            setSelectedImage(images[currentIndex - 1]);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!selectedImage) return;
        if (e.key === 'ArrowRight') {
            const currentIndex = images.findIndex(img => img.id === selectedImage.id);
            if (currentIndex < images.length - 1) {
                setSelectedImage(images[currentIndex + 1]);
            }
        } else if (e.key === 'ArrowLeft') {
            const currentIndex = images.findIndex(img => img.id === selectedImage.id);
            if (currentIndex > 0) {
                setSelectedImage(images[currentIndex - 1]);
            }
        } else if (e.key === 'Escape') {
            setSelectedImage(null);
        }
    };

    // Add keyboard event listener
    useEffect(() => {
        if (selectedImage) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedImage, images]);


    return (
        <>
            <Card className={cn("border-border/40 bg-muted/5 shadow-inner", className)}>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((image) => (
                            <div
                                key={image.id}
                                className="group relative bg-card rounded-xl overflow-hidden shadow-sm border border-border/50 hover:shadow-xl transition-all duration-300 cursor-pointer"
                                onClick={() => setSelectedImage(image)}
                            >
                                <img
                                    src={image.url}
                                    alt={`Page ${image.pageNumber}`}
                                    className="w-full h-auto block p-2"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                    <span className="text-white font-black text-2xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        {image.pageNumber}
                                    </span>
                                    <div className="flex items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full bg-white/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(image);
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white rounded-full bg-white/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Open in new tab
                                                const win = window.open();
                                                if (win) {
                                                    win.document.write(`<img src="${image.url}" style="max-width: 100%; height: auto;" />`);
                                                }
                                            }}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col z-50 animate-in fade-in duration-200 p-4 md:p-8"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="flex-1 flex flex-col max-h-screen relative" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4 bg-background/50 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-md sticky top-0 z-10">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-foreground">Page {selectedImage.pageNumber}</h3>
                                <p className="text-muted-foreground text-xs font-medium">High Definition Preview</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedImage(null)}
                                className="h-10 w-10 rounded-full hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Image Container with Navigation */}
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/20 rounded-xl border border-border/20 relative group/modal">

                            {/* Previous Button */}
                            {images.findIndex(img => img.id === selectedImage.id) > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-4 z-20 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/modal:opacity-100"
                                    title="Previous (Left Arrow)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                            )}

                            <img
                                src={selectedImage.url}
                                alt={`Page ${selectedImage.pageNumber}`}
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                            />

                            {/* Next Button */}
                            {images.findIndex(img => img.id === selectedImage.id) < images.length - 1 && (
                                <button
                                    onClick={handleNext}
                                    className="absolute right-4 z-20 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-sm opacity-0 group-hover/modal:opacity-100"
                                    title="Next (Right Arrow)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-4 flex items-center justify-center gap-4 bg-background/50 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-md sticky bottom-0 z-10">
                            <Button
                                onClick={() => handleDownload(selectedImage)}
                                className="gap-2 shadow-lg shadow-primary/20"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const win = window.open();
                                    if (win) {
                                        win.document.write(`<img src="${selectedImage.url}" style="max-width: 100%; height: auto;" />`);
                                    }
                                }}
                                className="gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                Raw View
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
