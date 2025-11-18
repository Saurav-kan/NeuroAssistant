declare module "pdfjs-dist/legacy/build/pdf" {
  export * from "pdfjs-dist/types/src/pdf";
}

declare module "*?url" {
  const src: string;
  export default src;
}

