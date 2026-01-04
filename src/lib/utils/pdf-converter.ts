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
    maskWatermark?: boolean;
}

// Helper function for manual Gaussian blur (StackBlur algorithm optimization)
function stackBlurCanvasRGBA(context: CanvasRenderingContext2D, top_x: number, top_y: number, width: number, height: number, radius: number) {
    if (isNaN(radius) || radius < 1) return;
    radius |= 0;

    var imageData = context.getImageData(top_x, top_y, width, height);
    var pixels = imageData.data;

    var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum,
        r_out_sum, g_out_sum, b_out_sum, a_out_sum,
        r_in_sum, g_in_sum, b_in_sum, a_in_sum,
        pr, pg, pb, pa, rbs;

    var div = radius + radius + 1;
    // var w4 = width << 2; // Removed unused
    var widthMinus1 = width - 1;
    var heightMinus1 = height - 1;
    var radiusPlus1 = radius + 1;
    var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

    var stackStart = new BlurStack();
    var stack = stackStart;
    var stackEnd: BlurStack | null = null; // Initialized
    for (i = 1; i < div; i++) {
        stack = stack.next = new BlurStack();
        if (i == radiusPlus1) stackEnd = stack;
    }
    stack.next = stackStart;

    // Ensure stackEnd is assigned (it will be in the loop if radius >= 1, but TS needs to know)
    if (!stackEnd) stackEnd = stack;

    var stackIn: BlurStack | null = null;
    var stackOut: BlurStack | null = null;

    var mul_table = [
        512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
        454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
        482, 454, 428, 405, 383, 364, 346, 328, 312, 298, 284, 271, 259, 496, 475, 456,
        437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
        497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 346, 338, 328,
        320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
        446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
        329, 323, 317, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
        505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
        399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 346, 341, 337, 332, 328,
        324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
        268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
        451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
        385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
        332, 329, 326, 323, 320, 317, 314, 312, 309, 307, 304, 302, 299, 297, 294, 292,
        289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259
    ];

    var shg_table = [
        9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
        17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
        19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
        20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
        21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
        21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
        22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
        22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
        23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
        23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
        24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24
    ];

    yi = 0;
    yw = 0; // Initialized

    for (y = 0; y < height; y++) {
        r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;

        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for (i = 0; i < radiusPlus1; i++) {
            stack.r = pr;
            stack.g = pg;
            stack.b = pb;
            stack.a = pa;
            stack = stack.next as BlurStack;
        }

        for (i = 1; i < radiusPlus1; i++) {
            p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
            r_sum += (stack.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
            g_sum += (stack.g = (pg = pixels[p + 1])) * rbs;
            b_sum += (stack.b = (pb = pixels[p + 2])) * rbs;
            a_sum += (stack.a = (pa = pixels[p + 3])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;
            a_in_sum += pa;

            stack = stack.next as BlurStack;
        }


        stackIn = stackStart;
        stackOut = stackEnd;
        for (x = 0; x < width; x++) {
            pixels[yi] = (r_sum * mul_table[radius] >> shg_table[radius]);
            pixels[yi + 1] = (g_sum * mul_table[radius] >> shg_table[radius]);
            pixels[yi + 2] = (b_sum * mul_table[radius] >> shg_table[radius]);
            pixels[yi + 3] = (a_sum * mul_table[radius] >> shg_table[radius]);

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;
            a_sum -= a_out_sum;

            r_out_sum -= stackIn.r;
            g_out_sum -= stackIn.g;
            b_out_sum -= stackIn.b;
            a_out_sum -= stackIn.a;

            p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

            r_in_sum += (stackIn.r = pixels[p]);
            g_in_sum += (stackIn.g = pixels[p + 1]);
            b_in_sum += (stackIn.b = pixels[p + 2]);
            a_in_sum += (stackIn.a = pixels[p + 3]);

            r_sum += r_in_sum;
            g_sum += g_in_sum;
            b_sum += b_in_sum;
            a_sum += a_in_sum;

            stackIn = stackIn.next as BlurStack;

            pr = stackOut.r;
            pg = stackOut.g;
            pb = stackOut.b;
            pa = stackOut.a;

            r_out_sum += pr;
            g_out_sum += pg;
            b_out_sum += pb;
            a_out_sum += pa;

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;
            a_in_sum -= pa;

            stackOut = stackOut.next as BlurStack;

            yi += 4;
        }
        yw += width;
    }

    for (x = 0; x < width; x++) {
        g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;

        yi = x << 2;
        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for (i = 0; i < radiusPlus1; i++) {
            stack.r = pr;
            stack.g = pg;
            stack.b = pb;
            stack.a = pa;
            stack = stack.next as BlurStack;
        }

        yp = width;

        for (i = 1; i <= radius; i++) {
            yi = (yp + x) << 2;

            r_sum += (stack.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
            g_sum += (stack.g = (pg = pixels[yi + 1])) * rbs;
            b_sum += (stack.b = (pb = pixels[yi + 2])) * rbs;
            a_sum += (stack.a = (pa = pixels[yi + 3])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;
            a_in_sum += pa;

            if (i < heightMinus1) {
                yp += width;
            }

            stack = stack.next as BlurStack;
        }

        yi = x;
        stackIn = stackStart;
        stackOut = stackEnd;
        for (y = 0; y < height; y++) {
            p = yi << 2;
            pixels[p] = (r_sum * mul_table[radius] >> shg_table[radius]);
            pixels[p + 1] = (g_sum * mul_table[radius] >> shg_table[radius]);
            pixels[p + 2] = (b_sum * mul_table[radius] >> shg_table[radius]);
            pixels[p + 3] = (a_sum * mul_table[radius] >> shg_table[radius]);

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;
            a_sum -= a_out_sum;

            r_out_sum -= stackIn.r;
            g_out_sum -= stackIn.g;
            b_out_sum -= stackIn.b;
            a_out_sum -= stackIn.a;

            p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

            r_in_sum += (stackIn.r = pixels[p]);
            g_in_sum += (stackIn.g = pixels[p + 1]);
            b_in_sum += (stackIn.b = pixels[p + 2]);
            a_in_sum += (stackIn.a = pixels[p + 3]);

            r_sum += r_in_sum;
            g_sum += g_in_sum;
            b_sum += b_in_sum;
            a_sum += a_in_sum;

            stackIn = stackIn.next as BlurStack;

            pr = stackOut.r;
            pg = stackOut.g;
            pb = stackOut.b;
            pa = stackOut.a;

            r_out_sum += pr;
            g_out_sum += pg;
            b_out_sum += pb;
            a_out_sum += pa;

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;
            a_in_sum -= pa;

            stackOut = stackOut.next as BlurStack;

            yi += width;
        }
    }

    context.putImageData(imageData, top_x, top_y);
}

class BlurStack {
    r: number = 0;
    g: number = 0;
    b: number = 0;
    a: number = 0;
    next: BlurStack | null = null;
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

        if (options.maskWatermark) {
            // Revert to fixed mask logic but with BLUR
            // 40% width, 10% height (Reduced by half as requested)
            const maskWidth = Math.min(300, Math.floor(canvas.width * 0.4));
            const maskHeight = Math.min(75, Math.floor(canvas.height * 0.1));
            const maskX = canvas.width - maskWidth;
            const maskY = canvas.height - maskHeight;

            try {
                // Apply manual Gaussian blur
                stackBlurCanvasRGBA(context, maskX, maskY, maskWidth, maskHeight, 40); // 40px radius
            } catch (e) {
                console.error("Blur failed, falling back to fill", e);
                context.fillStyle = 'white'; // fallback
                context.fillRect(maskX, maskY, maskWidth, maskHeight);
            }
        }

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
