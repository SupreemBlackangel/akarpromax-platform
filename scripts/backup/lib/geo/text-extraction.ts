import { TextExtractionMethod } from "./contracts";

export interface TextExtractionInput {
  readonly nativeText?: string;
  readonly ocrText?: string;
  readonly visionText?: string;
  readonly isImage?: boolean;
}

export type TextExtractionResult = {
  method: TextExtractionMethod;
  text: string;
  charCount: number;
};

export function extractText(input: TextExtractionInput): TextExtractionResult {
  if (input.nativeText && input.nativeText.trim().length > 0) {
    return {
      method: "native_text",
      text: input.nativeText.trim(),
      charCount: input.nativeText.trim().length,
    };
  }

  if (input.ocrText && input.ocrText.trim().length > 0) {
    return {
      method: "ocr",
      text: input.ocrText.trim(),
      charCount: input.ocrText.trim().length,
    };
  }

  if (input.visionText && input.visionText.trim().length > 0) {
    return {
      method: "vision",
      text: input.visionText.trim(),
      charCount: input.visionText.trim().length,
    };
  }

  return { method: "none", text: "", charCount: 0 };
}
