export type ImageFormat = "png" | "jpeg" | "webp";

export interface ConversionOptions {
    format: ImageFormat;
    quality: number;
    dpi: number;
    pageRange?: {
        start: number;
        end: number;
    };
}

export interface ConvertedImage {
    id: string;
    url: string;
    pageNumber: number;
    format: ImageFormat;
    size: number;
}

export type ConversionStatus = "idle" | "converting" | "completed" | "error";

export interface ConversionProgress {
    currentPage: number;
    totalPages: number;
    percentage: number;
    status: ConversionStatus;
    error?: string;
}
