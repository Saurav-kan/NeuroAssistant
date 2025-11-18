import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

const pdfRegistry = new Map<string, PDFDocumentProxy>();

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf");

let pdfjsModulePromise: Promise<PdfJsModule> | null = null;
let workerSrcPromise: Promise<string> | null = null;

const isBrowser = typeof window !== "undefined";

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!isBrowser) {
    throw new Error("PDF loading is only supported in the browser.");
  }

  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist/legacy/build/pdf").then(
      async (module) => {
        if (!workerSrcPromise) {
          workerSrcPromise = import(
            "pdfjs-dist/build/pdf.worker.min.mjs?url"
          ).then((m) => m.default as string);
        }

        if (module.GlobalWorkerOptions) {
          module.GlobalWorkerOptions.workerSrc = await workerSrcPromise;
        }

        return module;
      }
    );
  }

  return pdfjsModulePromise;
}

export interface LoadedPdfMeta {
  id: string;
  pageCount: number;
}

export interface PageImageOptions {
  scale?: number;
}

export async function loadPdfFromArrayBuffer(
  buffer: ArrayBuffer,
  id: string
): Promise<LoadedPdfMeta> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: buffer });
  const doc = await task.promise;
  pdfRegistry.set(id, doc);

  return {
    id,
    pageCount: doc.numPages,
  };
}

export function releasePdf(id: string) {
  const handle = pdfRegistry.get(id);
  if (handle) {
    handle.destroy();
    pdfRegistry.delete(id);
  }
}

function getPdfOrThrow(id: string): PDFDocumentProxy {
  const handle = pdfRegistry.get(id);
  if (!handle) {
    throw new Error(`PDF with id "${id}" is not loaded.`);
  }
  return handle;
}

async function getPage(id: string, pageNumber: number): Promise<PDFPageProxy> {
  const doc = getPdfOrThrow(id);
  if (pageNumber < 1 || pageNumber > doc.numPages) {
    throw new Error(`Page ${pageNumber} is out of range.`);
  }
  return doc.getPage(pageNumber);
}

export async function getPageText(
  id: string,
  pageNumber: number
): Promise<string> {
  const page = await getPage(id, pageNumber);
  const content = await page.getTextContent();
  return content.items
    .map((item) => {
      if ("str" in item) {
        return item.str;
      }
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getPageImage(
  id: string,
  pageNumber: number,
  options: PageImageOptions = {}
): Promise<string> {
  const page = await getPage(id, pageNumber);
  const scale = options.scale ?? 1.5;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to get canvas context.");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  }).promise;

  return canvas.toDataURL("image/png");
}

export function isPdfLoaded(id: string): boolean {
  return pdfRegistry.has(id);
}
