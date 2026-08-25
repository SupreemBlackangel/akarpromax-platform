import {
  LandDocumentCategory,
  LandDocumentClassification,
  LandDocumentClassifier,
} from "./contracts";

export interface CategoryRule {
  category: LandDocumentCategory;
  keywords: string[];
  weight: number;
}

const LAND_CATEGORY_RULES: readonly CategoryRule[] = [
  {
    category: "TITLE_DEED",
    weight: 3,
    keywords: [
      "صك",
      "صك ملكية",
      "سند ملكية",
      "ملكية",
      "مالك",
      "مملوك",
      "deed",
      "title deed",
      "ownership",
      "owner",
      "صك الكتروني",
    ],
  },
  {
    category: "SURVEY_PLAN",
    weight: 2,
    keywords: [
      "مسح",
      "مساحة",
      "survey",
      "surveying",
      "boundary",
      "حدود",
      "أعمال مساحية",
      "توقيع مساحي",
      "كروكي",
      "مقاس",
      "زوايا",
    ],
  },
  {
    category: "PARCEL_PLAN",
    weight: 2,
    keywords: [
      "مخطط",
      "تقسيم",
      "قطعة",
      "رقم القطعة",
      "رقم المخطط",
      "plan",
      "parcel",
      "plot",
      "lot",
      "zoning",
      "subdivision",
    ],
  },
  {
    category: "CADASTRAL_DOCUMENT",
    weight: 2,
    keywords: [
      "سجل عقاري",
      "مساحية",
      "cadastre",
      "cadastral",
      "خرائط المساحة",
      "رقم القسيمة",
    ],
  },
  {
    category: "MUNICIPAL_DOCUMENT",
    weight: 2,
    keywords: [
      "بلدية",
      "أمانة",
      "municipal",
      "municipality",
      "رخصة بناء",
      "اشتراطات",
      "تنظيم",
      "الحي",
    ],
  },
  {
    category: "PROPERTY_DOCUMENT",
    weight: 1,
    keywords: [
      "عقار",
      "property",
      "real estate",
      "أرض",
      "land",
      "فيلا",
      "سكني",
      "تجاري",
    ],
  },
  {
    category: "ADDRESS_DOCUMENT",
    weight: 2,
    keywords: [
      "العنوان",
      "العنوان الوطني",
      "address",
      "national address",
      "رقم المبنى",
      "الرمز البريدي",
      "street",
    ],
  },
];

const NOT_LAND_KEYWORDS: readonly string[] = [
  "هوية",
  "بطاقة",
  "جواز",
  "id card",
  "passport",
  "national id",
  "عقد إيجار",
  "lease",
  "insurance",
  "تأمين",
];

export const MAX_RELEVANCE_SOURCE = 100;

export class KeywordLandDocumentClassifier implements LandDocumentClassifier {
  readonly name = "keyword-land-document-classifier";

  classify(text: string): LandDocumentClassification {
    const lower = text.toLowerCase();
    const matchedKeywords: string[] = [];

    let bestCategory: LandDocumentCategory = "UNKNOWN_LAND_DOCUMENT";
    let bestScore = 0;

    for (const rule of LAND_CATEGORY_RULES) {
      let score = 0;
      const hits: string[] = [];
      for (const keyword of rule.keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          score += rule.weight;
          hits.push(keyword);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = rule.category;
        matchedKeywords.length = 0;
        matchedKeywords.push(...hits);
      }
    }

    if (bestScore === 0) {
      return {
        category: "UNKNOWN_LAND_DOCUMENT",
        confidence: 0.1,
        matchedKeywords: [],
      };
    }

    const notLandHits = NOT_LAND_KEYWORDS.filter((k) => lower.includes(k));
    if (notLandHits.length > 0 && bestScore <= 2) {
      return {
        category: "UNKNOWN_LAND_DOCUMENT",
        confidence: 0.3,
        matchedKeywords: [...matchedKeywords, ...notLandHits],
      };
    }

    const confidence = Math.min(0.98, 0.4 + bestScore / 10);
    return { category: bestCategory, confidence, matchedKeywords };
  }
}

export const LAND_CLASSIFIER: LandDocumentClassifier = new KeywordLandDocumentClassifier();
