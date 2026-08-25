import { DocumentCategory, DocumentClassificationResult } from "./contracts";

export interface CategoryRule {
  category: DocumentCategory;
  keywords: string[];
  weight: number;
}

export const CLASSIFICATION_RULES: readonly CategoryRule[] = [
  {
    category: "title_deed",
    weight: 3,
    keywords: [
      "deed",
      "title deed",
      "ownership",
      "صك",
      "صك ملكية",
      "سند ملكية",
      "ملكية",
      "مالك",
      "مملوك",
    ],
  },
  {
    category: "land_plan",
    weight: 2,
    keywords: [
      "plan",
      "land plan",
      "zoning",
      "مخطط",
      "مخطط أرض",
      "خريطة",
      "مصور",
      "تقسيم",
      "نظام الحماية",
      "نظام اخر",
    ],
  },
  {
    category: "survey",
    weight: 2,
    keywords: [
      "survey",
      "surveying",
      "boundary",
      "topographic",
      "مسح",
      "مساحة",
      "حدود",
      "أعمال مساحية",
      "مقاس",
    ],
  },
  {
    category: "address_document",
    weight: 2,
    keywords: [
      "address",
      "residence",
      "العنوان",
      "سكن",
      "عنوان وطني",
      "إقامة",
      "حائز",
    ],
  },
  {
    category: "contract",
    weight: 1,
    keywords: [
      "contract",
      "agreement",
      "lease",
      "rental",
      "عقد",
      "اتفاقية",
      "إيجار",
      "بيع",
      "شراء",
    ],
  },
  {
    category: "identification",
    weight: 1,
    keywords: [
      "id",
      "national id",
      "passport",
      "هوية",
      "بطاقة",
      "جواز",
      "رقم مدني",
      "سجل مدني",
    ],
  },
];

export function classifyDocument(text: string): DocumentClassificationResult {
  const lower = text.toLowerCase();
  let bestCategory: DocumentCategory = "other";
  let bestScore = 0;
  const matched: string[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;
    const hits: string[] = [];
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        score += rule.weight;
        hits.push(keyword);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
      matched.length = 0;
      matched.push(...hits);
    }
  }

  const confidence = bestScore > 0 ? Math.min(1, 0.3 + bestScore / 10) : 0.1;
  return { category: bestCategory, confidence, matchedKeywords: matched };
}
