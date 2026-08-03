"use client";

import { useState, useCallback, useEffect } from "react";
import { translations } from "@/src/data/translations";
import type { Locale } from "@/src/types/site";

type AdSlotActionConfig = {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  descriptionKey?: string;
  onClick: (slotData: AdSlotData) => Promise<void> | void;
  ariaLabelKey: string;
  disabled?: boolean;
};

type AdSlotData = {
  slotId: string;
  slotCode: string;
  pageType: string;
  pageUrl: string;
  adPosition: string;
  country: string;
  region?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  language: string;
  userId?: string;
  advertiserId?: string;
};

type FloatingAdSlotActionsProps = {
  slotData: AdSlotData;
  locale: Locale;
  onRequest: (slotData: AdSlotData) => Promise<void>;
  onViewDetails: (slotData: AdSlotData) => Promise<void>;
  onContact: (slotData: AdSlotData) => Promise<void>;
  position?: "left" | "right";
};

const actionConfigs: AdSlotActionConfig[] = [
  {
    id: "request",
    icon: <span aria-hidden="true">➕</span>,
    labelKey: "ads.requestSlot",
    descriptionKey: "ads.requestSlotDesc",
    ariaLabelKey: "ads.requestSlotAria",
    onClick: async (slotData) => {
      // This will be overridden by the parent's onRequest
    },
  },
  {
    id: "details",
    icon: <span aria-hidden="true">ℹ️</span>,
    labelKey: "ads.viewSlotDetails",
    descriptionKey: "ads.viewSlotDetailsDesc",
    ariaLabelKey: "ads.viewSlotDetailsAria",
    onClick: async (slotData) => {
      // This will be overridden by the parent's onViewDetails
    },
  },
  {
    id: "contact",
    icon: <span aria-hidden="true">📧</span>,
    labelKey: "ads.contactAdvertising",
    descriptionKey: "ads.contactAdvertisingDesc",
    ariaLabelKey: "ads.contactAdvertisingAria",
    onClick: async (slotData) => {
      // This will be overridden by the parent's onContact
    },
  },
];

const fallbackTranslations: Record<string, Record<Locale, string>> = {
  "ads.requestSlot": { ar: "اطلب هذه المساحة", en: "Request this space", tr: "Bu alanı talep et" },
  "ads.requestSlotDesc": { ar: "احجز هذه المساحة الإعلانية", en: "Reserve this ad space", tr: "Bu reklam alanını rezerve edin" },
  "ads.requestSlotAria": { ar: "طلب حجز هذه المساحة الإعلانية", en: "Request to book this ad space", tr: "Bu reklam alanını talep et" },
  "ads.viewSlotDetails": { ar: "تفاصيل المساحة", en: "Space details", tr: "Alan detayları" },
  "ads.viewSlotDetailsDesc": { ar: "عرض تفاصيل المساحة الإعلانية", en: "View ad space details", tr: "Reklam alanı detaylarını görüntüle" },
  "ads.viewSlotDetailsAria": { ar: "عرض تفاصيل المساحة الإعلانية", en: "View ad space details", tr: "Reklam alanı detaylarını gör" },
  "ads.contactAdvertising": { ar: "تواصل مع الإعلانات", en: "Contact advertising", tr: "Reklamla iletişim" },
  "ads.contactAdvertisingDesc": { ar: "تواصل مع إدارة الإعلانات", en: "Contact advertising management", tr: "Reklam yönetimiyle iletişime geç" },
  "ads.contactAdvertisingAria": { ar: "التواصل مع إدارة الإعلانات", en: "Contact advertising management", tr: "Reklam yönetimiyle iletişim kur" },
  "ads.loading": { ar: "جاري التحميل...", en: "Loading...", tr: "Yükleniyor..." },
  "ads.success": { ar: "تم الإرسال بنجاح", en: "Sent successfully", tr: "Başarıyla gönderildi" },
  "ads.error": { ar: "حدث خطأ، حاول مرة أخرى", en: "An error occurred, please try again", tr: "Bir hata oluştu, lütfen tekrar deneyin" },
};

function getTranslation(key: string, locale: Locale, fallbackObj: typeof fallbackTranslations): string {
  const translation = translations[locale]?.[key as keyof typeof translations["ar"]];
  if (translation && typeof translation === "string") return translation;
  return fallbackObj[key]?.[locale] ?? key;
}

export default function FloatingAdSlotActions({
  slotData,
  locale,
  onRequest,
  onViewDetails,
  onContact,
  position = "left",
}: FloatingAdSlotActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const actions: AdSlotActionConfig[] = [
    {
      ...actionConfigs[0],
      onClick: onRequest,
    },
    {
      ...actionConfigs[1],
      onClick: onViewDetails,
    },
    {
      ...actionConfigs[2],
      onClick: onContact,
    },
  ];

  const handleActionClick = useCallback(
    async (action: AdSlotActionConfig) => {
      if (action.disabled || loadingAction) return;

      setLoadingAction(action.id);
      try {
        await action.onClick(slotData);
        setToast({ message: getTranslation("ads.success", locale, fallbackTranslations), type: "success" });
      } catch (error) {
        console.error(`Action ${action.id} failed:`, error);
        setToast({ message: getTranslation("ads.error", locale, fallbackTranslations), type: "error" });
      } finally {
        setLoadingAction(null);
        setTimeout(() => setToast(null), 3000);
      }
    },
    [loadingAction, locale, slotData]
  );

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const isRTL = locale === "ar";
  const containerPosition = position ?? (isRTL ? "left" : "right");

  return (
    <>
      <div
        className="floating-ad-slot-actions"
        style={{
          position: "fixed",
          [containerPosition]: 20,
          bottom: "calc(24px + env(safe-area-inset-bottom))",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "center",
          pointerEvents: "none",
        }}
        role="group"
        aria-label={getTranslation("ads.floatingActionsAria", locale, { "ads.floatingActionsAria": { ar: "إجراءات المساحة الإعلانية", en: "Ad space actions", tr: "Reklam alanı eylemleri" } })}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled || loadingAction === action.id}
            onClick={() => handleActionClick(action)}
            className="floating-ad-action-btn"
            style={{
              pointerEvents: "auto",
              width: "100%",
              maxWidth: "calc(100vw - 40px)",
              boxSizing: "border-box",
            }}
            aria-label={getTranslation(action.ariaLabelKey, locale, fallbackTranslations)}
            title={getTranslation(action.descriptionKey ?? action.labelKey, locale, fallbackTranslations)}
          >
            <span className="floating-ad-action-icon" aria-hidden="true">
              {action.icon}
            </span>
            <span className="floating-ad-action-label">
              {loadingAction === action.id
                ? getTranslation("ads.loading", locale, fallbackTranslations)
                : getTranslation(action.labelKey, locale, fallbackTranslations)}
            </span>
            {loadingAction === action.id && (
              <span className="floating-ad-action-spinner" aria-hidden="true">⏳</span>
            )}
          </button>
        ))}
      </div>

      {toast && (
        <div
          className="floating-ad-toast"
          style={{
            position: "fixed",
            [containerPosition]: 20,
            bottom: "calc(24px + env(safe-area-inset-bottom) + 160px)",
            zIndex: 1000,
            pointerEvents: "none",
            animation: "fadeIn 0.3s ease-out",
          }}
          role="alert"
          aria-live="polite"
        >
          <div
            className={`floating-ad-toast-content ${toast.type}`}
            style={{
              pointerEvents: "auto",
              padding: "12px 16px",
              borderRadius: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              background: toast.type === "success" ? "#0b214c" : "#c0392b",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              maxWidth: "calc(100vw - 40px)",
              boxSizing: "border-box",
            }}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}