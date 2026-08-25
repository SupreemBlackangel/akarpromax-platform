/**
 * The PDF.js worker is loaded for its side effect only: production bundlers
 * otherwise leave PDF.js looking for `pdf.worker.mjs` beside the generated
 * server chunk, where it does not exist. The package ships no types for that
 * entry point, so it is declared here rather than silently imported as `any`.
 */
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
