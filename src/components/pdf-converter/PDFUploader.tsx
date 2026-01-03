import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, X, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PDFUploaderProps {
    onFileSelect: (file: File) => void;
    className?: string;
}

export function PDFUploader({ onFileSelect, className }: PDFUploaderProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                const file = acceptedFiles[0];
                setSelectedFile(file);
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
        },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024, // 50MB
    });

    const handleRemoveFile = () => {
        setSelectedFile(null);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    };

    if (selectedFile) {
        return (
            <Card className={cn("border-border/40 overflow-hidden shadow-lg", className)}>
                <CardContent className="p-0">
                    <div className="bg-primary/5 p-8 flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary relative">
                            <FileText className="h-10 w-10" />
                            <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-foreground truncate max-w-[280px]">
                                {selectedFile.name}
                            </p>
                            <p className="text-sm font-semibold text-muted-foreground">
                                {formatFileSize(selectedFile.size)} • PDF Document
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveFile}
                            className="rounded-full border-primary/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all active:scale-95"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Remove File
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("border-border/40 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500", className)}>
            <CardContent className="p-2">
                <div
                    {...getRootProps()}
                    className={cn(
                        "flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-border/50 p-12 transition-all duration-300 cursor-pointer group",
                        isDragActive
                            ? "border-primary bg-primary/5 scale-[0.98]"
                            : "hover:border-primary/40 hover:bg-muted/30"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className={cn(
                        "h-24 w-24 bg-muted rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary relative overflow-hidden",
                        isDragActive ? "scale-110 bg-primary/15 text-primary" : "text-muted-foreground"
                    )}>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <UploadCloud className="h-10 w-10 relative z-10" />
                    </div>

                    <div className="mt-8 text-center space-y-2">
                        <h3 className="text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {isDragActive ? "Ready to drop!" : "Import PDF"}
                        </h3>
                        <p className="text-muted-foreground font-semibold leading-relaxed max-w-[240px]">
                            Drag and drop your file here or <span className="text-primary hover:underline">browse</span>
                        </p>
                    </div>

                    <div className="mt-8 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Max 50MB</span>
                        <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                        <span>PDF Format Only</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
