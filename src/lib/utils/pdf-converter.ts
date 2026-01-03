import * as pdfjsLib from "pdfjs-dist";
import type { ImageFormat } from "@/types/pdf";

// Use locally hosted worker for better reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface RenderOptions {
    scale?: number;
    format?: ImageFormat;
    quality?: number;
    pageRange?: {
        start: number;
        end: number;
    };
}

export async function convertPdfToImages(
    file: File,
    options: RenderOptions = {},
    onProgress?: (currentPage: number, totalPages: number) => void
): Promise<{ url: string; pageNumber: number; format: ImageFormat }[]> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const images: { url: string; pageNumber: number; format: ImageFormat }[] = [];

    const { scale = 2, format = 'png', quality = 0.92, pageRange } = options;

    const startPage = Math.max(1, pageRange?.start || 1);
    const endPage = Math.min(totalPages, pageRange?.end || totalPages);

    for (let i = startPage; i <= endPage; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context as any,
            viewport: viewport,
        } as any).promise;

        const mimeType = `image/${format}`;
        const url = canvas.toDataURL(mimeType, quality);

        images.push({
            url,
            pageNumber: i,
            format
        });

        if (onProgress) {
            onProgress(i, totalPages);
        }
    }

    return images;
}

export async function getPdfPageCount(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
}
