"use client";
/* eslint-disable @next/next/no-img-element -- Advertising media is uploaded at runtime. */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PERMISSIONS } from "@/src/constants/permissions";
import { PLATFORM_SECTIONS_REGISTRY, AD_PLACEMENTS, PAGE_TYPES_LIST, DEVICE_TYPES, PRICING_MODELS, FREQUENCY_PERIODS, APPROVAL_STATUSES, visibleAdminPlacements } from "@/src/constants/advertising";

type Identity = {
  authenticated: boolean;
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type CampaignCreative = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl: string | null;
  tabletMediaUrl: string | null;
  posterUrl: string | null;
  position: number;
  durationSeconds: number;
  status: string;
};

type CreativeDraft = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl: string;
  tabletMediaUrl: string;
  posterUrl: string;
  durationSeconds: string;
};

const MAX_AD_CREATIVES = 5;
const PAGE_SIZE = 10;

type Campaign = {
  id: string;
  internalName: string;
  advertiserName: string;
  campaignType: string;
  status: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl: string | null;
  tabletMediaUrl: string | null;
  posterUrl: string | null;
  channels: string[];
  eyebrow: { ar: string; en: string; tr: string };
  title: { ar: string; en: string; tr: string };
  accent: { ar: string; en: string; tr: string };
  description: { ar: string; en: string; tr: string };
  cta: { ar: string; en: string; tr: string };
  targetUrl: string;
  creatives: CampaignCreative[];
  countries: string[];
  cities: string[];
  languages: string[];
  devices: string[];
  priority: number;
  weight: number;
  startAt: string | null;
  endAt: string | null;
  sectionScopes: string[];
  pageTypes: string[];
  placements: string[];
  regionIds: string[];
  districtIds: string[];
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  targetAllCountries: boolean;
  targetAllRegions: boolean;
  targetAllCities: boolean;
  targetAllDistricts: boolean;
  entityType: string | null;
  entityIds: string[];
  categoryIds: string[];
  propertyTypes: string[];
  serviceCategories: string[];
  officeTypes: string[];
  toolCategories: string[];
  operatingSystems: string[];
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  daysOfWeek: number[];
  rotationGroup: string | null;
  pricingModel: string;
  price: number;
  budget: number;
  dailyBudget: number;
  spentAmount: number;
  maxImpressions: number;
  maxClicks: number;
  frequencyCapPerUser: number;
  frequencyCapPeriod: string;
  approvalStatus: string;
  isActive: boolean;
  isFeatured: boolean;
  isGlobal: boolean;
  totalImpressions: number;
  totalUniqueImpressions: number;
  totalClicks: number;
  totalUniqueClicks: number;
  totalConversions: number;
  approvedBy: string | null;
  deletedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type Asset = {
  id: string;
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  mediaType: "image" | "video";
  size: number;
  uploadedBy?: string | null;
  createdAt?: string;
};

type FormState = {
  id: string;
  internalName: string;
  advertiserName: string;
  campaignType: string;
  status: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl: string;
  tabletMediaUrl: string;
  posterUrl: string;
  channels: string[];
  eyebrowAr: string; eyebrowEn: string; eyebrowTr: string;
  titleAr: string; titleEn: string; titleTr: string;
  accentAr: string; accentEn: string; accentTr: string;
  descriptionAr: string; descriptionEn: string; descriptionTr: string;
  ctaAr: string; ctaEn: string; ctaTr: string;
  targetUrl: string;
  countries: string[];
  cities: string[];
  languages: string[];
  devices: string[];
  priority: string;
  weight: string;
  startAt: string;
  endAt: string;
  sectionScopes: string[];
  pageTypes: string[];
  placements: string[];
  regionIds: string[];
  districtIds: string[];
  latitude: string;
  longitude: string;
  radiusKm: string;
  targetAllCountries: boolean;
  targetAllRegions: boolean;
  targetAllCities: boolean;
  targetAllDistricts: boolean;
  entityType: string;
  entityIds: string[];
  categoryIds: string[];
  propertyTypes: string[];
  serviceCategories: string[];
  officeTypes: string[];
  toolCategories: string[];
  operatingSystems: string[];
  dailyStartTime: string;
  dailyEndTime: string;
  daysOfWeek: number[];
  rotationGroup: string;
  pricingModel: string;
  price: string;
  budget: string;
  dailyBudget: string;
  maxImpressions: string;
  maxClicks: string;
  frequencyCapPerUser: string;
  frequencyCapPeriod: string;
  approvalStatus: string;
  isActive: boolean;
  isFeatured: boolean;
  isGlobal: boolean;
  creatives: CreativeDraft[];
};

const countries: [string, string][] = [
  ["om", "عُمان"], ["sa", "السعودية"], ["ae", "الإمارات"], ["qa", "قطر"],
  ["kw", "الكويت"], ["bh", "البحرين"], ["eg", "مصر"], ["jo", "الأردن"],
  ["iq", "العراق"], ["lb", "لبنان"], ["ps", "فلسطين"], ["sy", "سوريا"],
  ["ye", "اليمن"], ["ma", "المغرب"], ["dz", "الجزائر"], ["tn", "تونس"],
  ["ly", "ليبيا"], ["sd", "السودان"], ["so", "الصومال"], ["dj", "جيبوتي"],
  ["mr", "موريتانيا"], ["km", "جزر القمر"], ["tr", "تركيا"],
];

const sectionLabels = Object.fromEntries(
  Object.values(PLATFORM_SECTIONS_REGISTRY).map((meta) => [meta.key, meta.label.ar]),
);

const languageLabels: Record<string, string> = { ar: "العربية", en: "English", tr: "Türkçe" };
const deviceLabels: Record<string, string> = { desktop: "كمبيوتر", tablet: "جهاز لوحي", mobile: "هاتف" };
const channelLabels: Record<string, string> = { website: "الموقع", office: "مكتب بروماكس" };
const pageTypeLabels: Record<string, string> = {
  home: "الرئيسية", listing: "القائمة", details: "التفاصيل", "search-results": "نتائج البحث",
  category: "تصنيف", "provider-profile": "ملف مزوّد", "office-profile": "ملف مكتب",
  "tool-details": "تفاصيل أداة", article: "مقال", dashboard: "لوحة", general: "عام",
};
const pricingLabels: Record<string, string> = { cpm: "سعر لكل ألف ظهور", cpc: "سعر للنقرة", fixed: "ثابت" };
const periodLabels: Record<string, string> = { session: "لكل جلسة", day: "يوم", week: "أسبوع", month: "شهر", all: "دائم" };
const dayLabels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function countryName(code: string) {
  return countries.find(([id]) => id === code.toLowerCase())?.[1] ?? code.toUpperCase();
}

function statusLabel(status: string) {
  return ({ active: "نشطة", draft: "مسودة", paused: "متوقفة", expired: "منتهية", archived: "مؤرشفة" } as Record<string, string>)[status] ?? status;
}

function approvalLabel(status: string) {
  return ({ pending: "بانتظار الاعتماد", approved: "معتمدة", rejected: "مرفوضة" } as Record<string, string>)[status] ?? status;
}

function campaignTypeLabel(type: string) {
  return ({ platform: "المنصة", property: "عقار مميز", service: "خدمة", request: "طلب إعلان", house: "إعلان داخلي" } as Record<string, string>)[type] ?? type;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function dateToLocalInput(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
}

function localInputToMySql(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.includes("T") ? trimmed.replace("T", " ") + (trimmed.length === 16 ? ":00" : "") : trimmed;
}

function serialisedToForm(c: Campaign): FormState {
  return {
    id: c.id,
    internalName: c.internalName,
    advertiserName: c.advertiserName,
    campaignType: c.campaignType,
    status: c.status,
    mediaType: c.mediaType,
    mediaUrl: c.mediaUrl,
    mobileMediaUrl: c.mobileMediaUrl || "",
    tabletMediaUrl: c.tabletMediaUrl || "",
    posterUrl: c.posterUrl || "",
    channels: c.channels.length ? c.channels : ["website"],
    eyebrowAr: c.eyebrow.ar, eyebrowEn: c.eyebrow.en, eyebrowTr: c.eyebrow.tr,
    titleAr: c.title.ar, titleEn: c.title.en, titleTr: c.title.tr,
    accentAr: c.accent.ar, accentEn: c.accent.en, accentTr: c.accent.tr,
    descriptionAr: c.description.ar, descriptionEn: c.description.en, descriptionTr: c.description.tr,
    ctaAr: c.cta.ar, ctaEn: c.cta.en, ctaTr: c.cta.tr,
    targetUrl: c.targetUrl,
    countries: c.countries,
    cities: c.cities,
    languages: c.languages,
    devices: c.devices,
    priority: String(c.priority),
    weight: String(c.weight),
    startAt: dateToLocalInput(c.startAt),
    endAt: dateToLocalInput(c.endAt),
    sectionScopes: c.sectionScopes,
    pageTypes: c.pageTypes,
    placements: c.placements,
    regionIds: c.regionIds,
    districtIds: c.districtIds,
    latitude: c.latitude == null ? "" : String(c.latitude),
    longitude: c.longitude == null ? "" : String(c.longitude),
    radiusKm: c.radiusKm == null ? "" : String(c.radiusKm),
    targetAllCountries: c.targetAllCountries,
    targetAllRegions: c.targetAllRegions,
    targetAllCities: c.targetAllCities,
    targetAllDistricts: c.targetAllDistricts,
    entityType: c.entityType || "",
    entityIds: c.entityIds,
    categoryIds: c.categoryIds,
    propertyTypes: c.propertyTypes,
    serviceCategories: c.serviceCategories,
    officeTypes: c.officeTypes,
    toolCategories: c.toolCategories,
    operatingSystems: c.operatingSystems,
    dailyStartTime: c.dailyStartTime || "",
    dailyEndTime: c.dailyEndTime || "",
    daysOfWeek: c.daysOfWeek,
    rotationGroup: c.rotationGroup || "",
    pricingModel: c.pricingModel,
    price: String(c.price),
    budget: String(c.budget),
    dailyBudget: String(c.dailyBudget),
    maxImpressions: String(c.maxImpressions),
    maxClicks: String(c.maxClicks),
    frequencyCapPerUser: String(c.frequencyCapPerUser),
    frequencyCapPeriod: c.frequencyCapPeriod,
    approvalStatus: c.approvalStatus,
    isActive: c.isActive,
    isFeatured: c.isFeatured,
    isGlobal: c.isGlobal,
    creatives: (c.creatives ?? []).map((creative) => ({
      id: creative.id,
      mediaType: creative.mediaType,
      mediaUrl: creative.mediaUrl,
      mobileMediaUrl: creative.mobileMediaUrl || "",
      tabletMediaUrl: creative.tabletMediaUrl || "",
      posterUrl: creative.posterUrl || "",
      durationSeconds: String(creative.durationSeconds || 6),
    })),
  };
}

function emptyForm(countriesList: string[]): FormState {
  return {
    id: "",
    internalName: "حملة جديدة",
    advertiserName: "عقار بروماكس",
    campaignType: "platform",
    status: "draft",
    mediaType: "image",
    mediaUrl: "",
    mobileMediaUrl: "",
    tabletMediaUrl: "",
    posterUrl: "",
    channels: ["website"],
    eyebrowAr: "", eyebrowEn: "", eyebrowTr: "",
    titleAr: "", titleEn: "", titleTr: "",
    accentAr: "", accentEn: "", accentTr: "",
    descriptionAr: "", descriptionEn: "", descriptionTr: "",
    ctaAr: "", ctaEn: "", ctaTr: "",
    targetUrl: "/",
    countries: countriesList,
    cities: [],
    languages: ["ar", "en", "tr"],
    devices: ["desktop", "tablet", "mobile"],
    priority: "100",
    weight: "100",
    startAt: "",
    endAt: "",
    sectionScopes: ["home"],
    pageTypes: [],
    placements: [],
    regionIds: [],
    districtIds: [],
    latitude: "",
    longitude: "",
    radiusKm: "",
    targetAllCountries: false,
    targetAllRegions: true,
    targetAllCities: true,
    targetAllDistricts: true,
    entityType: "",
    entityIds: [],
    categoryIds: [],
    propertyTypes: [],
    serviceCategories: [],
    officeTypes: [],
    toolCategories: [],
    operatingSystems: [],
    dailyStartTime: "",
    dailyEndTime: "",
    daysOfWeek: [],
    rotationGroup: "",
    pricingModel: "fixed",
    price: "0",
    budget: "0",
    dailyBudget: "0",
    maxImpressions: "0",
    maxClicks: "0",
    frequencyCapPerUser: "0",
    frequencyCapPeriod: "day",
    approvalStatus: "pending",
    isActive: true,
    isFeatured: false,
    isGlobal: false,
    creatives: [],
  };
}

function toApiBody(form: FormState) {
  return {
    id: form.id || undefined,
    internalName: form.internalName,
    advertiserName: form.advertiserName,
    campaignType: form.campaignType,
    status: form.status,
    mediaType: form.mediaType,
    mediaUrl: form.mediaUrl,
    mobileMediaUrl: form.mobileMediaUrl || null,
    tabletMediaUrl: form.tabletMediaUrl || null,
    posterUrl: form.posterUrl || null,
    channels: form.channels.length ? form.channels : ["website"],
    eyebrowAr: form.eyebrowAr, eyebrowEn: form.eyebrowEn, eyebrowTr: form.eyebrowTr,
    titleAr: form.titleAr, titleEn: form.titleEn, titleTr: form.titleTr,
    accentAr: form.accentAr, accentEn: form.accentEn, accentTr: form.accentTr,
    descriptionAr: form.descriptionAr, descriptionEn: form.descriptionEn, descriptionTr: form.descriptionTr,
    ctaAr: form.ctaAr, ctaEn: form.ctaEn, ctaTr: form.ctaTr,
    targetUrl: form.targetUrl,
    countries: form.countries,
    cities: form.cities,
    languages: form.languages,
    devices: form.devices,
    priority: form.priority,
    weight: form.weight,
    startAt: localInputToMySql(form.startAt) || null,
    endAt: localInputToMySql(form.endAt) || null,
    sectionScopes: form.sectionScopes,
    pageTypes: form.pageTypes,
    placements: form.placements,
    regionIds: form.regionIds,
    districtIds: form.districtIds,
    latitude: form.latitude === "" ? null : Number(form.latitude),
    longitude: form.longitude === "" ? null : Number(form.longitude),
    radiusKm: form.radiusKm === "" ? null : Number(form.radiusKm),
    targetAllCountries: form.targetAllCountries,
    targetAllRegions: form.targetAllRegions,
    targetAllCities: form.targetAllCities,
    targetAllDistricts: form.targetAllDistricts,
    entityType: form.entityType || null,
    entityIds: form.entityIds,
    categoryIds: form.categoryIds,
    propertyTypes: form.propertyTypes,
    serviceCategories: form.serviceCategories,
    officeTypes: form.officeTypes,
    toolCategories: form.toolCategories,
    operatingSystems: form.operatingSystems,
    dailyStartTime: form.dailyStartTime || null,
    dailyEndTime: form.dailyEndTime || null,
    daysOfWeek: form.daysOfWeek,
    rotationGroup: form.rotationGroup || null,
    pricingModel: form.pricingModel,
    price: form.price,
    budget: form.budget,
    dailyBudget: form.dailyBudget,
    maxImpressions: form.maxImpressions,
    maxClicks: form.maxClicks,
    frequencyCapPerUser: form.frequencyCapPerUser,
    frequencyCapPeriod: form.frequencyCapPeriod,
    approvalStatus: form.approvalStatus,
    isActive: form.isActive,
    isFeatured: form.isFeatured,
    isGlobal: form.isGlobal,
    creatives: form.creatives.map((creative) => ({
      id: creative.id || undefined,
      mediaType: creative.mediaType,
      mediaUrl: creative.mediaUrl,
      mobileMediaUrl: creative.mobileMediaUrl || null,
      tabletMediaUrl: creative.tabletMediaUrl || null,
      posterUrl: creative.posterUrl || null,
      durationSeconds: Number(creative.durationSeconds) || 6,
    })),
  };
}

export default function AdsAdminClient({ initialUser }: { initialUser: { email: string; displayName: string } }) {
  const [identity, setIdentity] = useState<Identity>({
    authenticated: true,
    email: initialUser.email,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeView, setActiveView] = useState<"campaigns" | "media" | "analytics" | "archived">("campaigns");
  const [archivedCampaigns, setArchivedCampaigns] = useState<Campaign[]>([]);
  const [perf, setPerf] = useState<{ name: string; totals: { impressions: number; clicks: number; conversions: number }; daily: Array<{ date: string; impressions: number; clicks: number; conversions: number }> } | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [previewLocale, setPreviewLocale] = useState<"ar" | "en" | "tr">("ar");
  const [form, setForm] = useState<FormState>(emptyForm(["om"]));
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [onlyPending, setOnlyPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = identity.permissions.includes(PERMISSIONS.ADS_CREATE) || identity.permissions.includes(PERMISSIONS.ADS_UPDATE);
  const canPublish = identity.permissions.includes(PERMISSIONS.ADS_PUBLISH);
  const canApprove = identity.permissions.includes(PERMISSIONS.ADS_APPROVE);
  const canUpload = identity.permissions.includes(PERMISSIONS.MEDIA_UPLOAD);
  const canAnalytics = identity.permissions.includes(PERMISSIONS.ADS_ANALYTICS);

  async function loadCampaigns() {
    const response = await fetch("/api/admin/ads", { cache: "no-store" });
    const data = await response.json() as { identity?: Identity; campaigns?: Campaign[]; error?: string };
    if (!response.ok) throw new Error(data.error || "تعذر تحميل الحملات");
    if (data.identity) setIdentity(data.identity);
    setCampaigns(data.campaigns ?? []);
  }

  async function loadArchived() {
    const response = await fetch("/api/admin/ads?view=archived", { cache: "no-store" });
    const data = await response.json() as { campaigns?: Campaign[]; error?: string };
    if (!response.ok) throw new Error(data.error || "تعذر تحميل الأرشيف");
    setArchivedCampaigns(data.campaigns ?? []);
  }

  async function restoreCampaign(id: string, name: string) {
    if (!window.confirm(`استرجاع حملة «${name}» من الأرشيف كمسودة؟`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/ads/restore", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر الاسترجاع");
      await Promise.all([loadArchived(), loadCampaigns()]);
      setMessage("تم استرجاع الحملة كمسودة (غير نشطة).");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر الاسترجاع");
    } finally {
      setBusy(false);
    }
  }

  async function openPerformance(campaign: Campaign) {
    setPerfLoading(true);
    setPerf({ name: campaign.internalName, totals: { impressions: campaign.totalImpressions, clicks: campaign.totalClicks, conversions: campaign.totalConversions }, daily: [] });
    try {
      const response = await fetch(`/api/admin/ads/stats?id=${encodeURIComponent(campaign.id)}&days=30`, { cache: "no-store" });
      const data = await response.json() as { campaign?: { totalImpressions: number; totalClicks: number; totalConversions: number }; daily?: Array<{ date: string; impressions: number; clicks: number; conversions: number }>; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الأداء");
      setPerf({
        name: campaign.internalName,
        totals: {
          impressions: data.campaign?.totalImpressions ?? campaign.totalImpressions,
          clicks: data.campaign?.totalClicks ?? campaign.totalClicks,
          conversions: data.campaign?.totalConversions ?? campaign.totalConversions,
        },
        daily: data.daily ?? [],
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل الأداء");
    } finally {
      setPerfLoading(false);
    }
  }

  async function loadAssets() {
    const response = await fetch("/api/ad-assets", { cache: "no-store" });
    const data = await response.json() as { assets?: Asset[]; error?: string };
    if (!response.ok) throw new Error(data.error || "تعذر تحميل مكتبة الوسائط");
    setAssets(data.assets ?? []);
  }

  useEffect(() => {
    let mounted = true;
    window.queueMicrotask(() => {
      if (!mounted) return;
      Promise.all([loadCampaigns(), loadAssets()])
        .catch((error) => { if (mounted) setMessage(error instanceof Error ? error.message : "تعذر تحميل مركز الإعلانات"); })
        .finally(() => { if (mounted) { setBusy(false); setLoaded(true); } });
    });
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => ({
    active: campaigns.filter((item) => item.status === "active" && item.isActive).length,
    pending: campaigns.filter((item) => item.approvalStatus === "pending").length,
    impressions: campaigns.reduce((sum, item) => sum + item.totalImpressions, 0),
    clicks: campaigns.reduce((sum, item) => sum + item.totalClicks, 0),
  }), [campaigns]);

  const visibleCampaigns = useMemo(
    () => (onlyPending ? campaigns.filter((item) => item.approvalStatus === "pending") : campaigns),
    [campaigns, onlyPending],
  );
  const pageCount = Math.max(1, Math.ceil(visibleCampaigns.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedCampaigns = visibleCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function startCreate(asset?: Asset) {
    const initialCountries = identity.countryCode ? [identity.countryCode.toLowerCase()] : ["om"];
    setForm({
      ...emptyForm(initialCountries),
      priority: String(Math.min(999, Math.max(0, ...campaigns.map((item) => item.priority)) + 1)),
      ...(asset ? { mediaUrl: asset.url, mediaType: asset.mediaType, creatives: [{ id: "", mediaType: asset.mediaType, mediaUrl: asset.url, mobileMediaUrl: "", tabletMediaUrl: "", posterUrl: "", durationSeconds: "6" }] } : {}),
    });
    setPreviewLocale("ar");
    setWizardStep(1);
    setEditing(true);
    setMessage("");
  }

  function startEdit(campaign: Campaign) {
    setForm(serialisedToForm(campaign));
    setPreviewLocale("ar");
    setWizardStep(1);
    setEditing(true);
    setMessage("");
  }

  function toggleList(field: "countries" | "languages" | "devices" | "channels" | "sectionScopes" | "pageTypes" | "placements" | "regionIds" | "districtIds" | "entityIds" | "categoryIds" | "propertyTypes" | "serviceCategories" | "officeTypes" | "toolCategories" | "operatingSystems", value: string) {
    const current = form[field];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setForm({ ...form, [field]: next });
  }

  function toggleDay(value: number) {
    const next = form.daysOfWeek.includes(value) ? form.daysOfWeek.filter((item) => item !== value) : [...form.daysOfWeek, value];
    setForm({ ...form, daysOfWeek: next });
  }

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const creativeLimit = MAX_AD_CREATIVES;

  function addCreative() {
    setForm((current) => {
      if (current.creatives.length >= creativeLimit) return current;
      return {
        ...current,
        creatives: [...current.creatives, { id: "", mediaType: "image", mediaUrl: "", mobileMediaUrl: "", tabletMediaUrl: "", posterUrl: "", durationSeconds: "6" }],
      };
    });
  }

  function updateCreative(index: number, field: keyof CreativeDraft, value: string) {
    setForm((current) => ({
      ...current,
      creatives: current.creatives.map((creative, creativeIndex) => creativeIndex === index ? { ...creative, [field]: value } : creative),
    }));
  }

  function removeCreative(index: number) {
    setForm((current) => ({ ...current, creatives: current.creatives.filter((_, creativeIndex) => creativeIndex !== index) }));
  }

  // Explicit ordering: position in this list IS the stored creative position
  // (the server derives `position` from the array index), so moving a row
  // up/down decides which image is first/second/third in the rotation.
  function moveCreative(index: number, delta: -1 | 1) {
    setForm((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.creatives.length) return current;
      const next = [...current.creatives];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, creatives: next };
    });
  }

  const allowedPlacements = useMemo(() => {
    const scopes = form.sectionScopes.length ? form.sectionScopes : Object.keys(sectionLabels);
    const channels = new Set(form.channels.length ? form.channels : ["website"]);
    return visibleAdminPlacements().filter((meta) => channels.has(meta.channel) && meta.sections.some((section) => scopes.includes(section)));
  }, [form.channels, form.sectionScopes]);

  async function saveCampaign(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ads", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiBody(form)),
      });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الحملة");
      await loadCampaigns();
      setEditing(false);
      setMessage(form.id ? "تم تحديث الحملة بنجاح." : "تم إنشاء الحملة بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function archiveCampaign(id: string) {
    if (!window.confirm("هل تريد أرشفة هذه الحملة؟")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/ads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر أرشفة الحملة");
      await loadCampaigns();
      setMessage("تمت أرشفة الحملة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر أرشفة الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCampaignForever(id: string, name: string) {
    if (!window.confirm(`حذف حملة «${name}» نهائيًا؟ سيُحذف الإعلان وصوره وإحصاءاته ولا يمكن التراجع.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/ads?id=${encodeURIComponent(id)}&hard=1`, { method: "DELETE" });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حذف الحملة");
      await loadCampaigns();
      setMessage("تم حذف الحملة نهائيًا.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حذف الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function setApproval(id: string, approved: boolean) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/ads/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحديث الاعتماد");
      await loadCampaigns();
      setMessage(approved ? "تم اعتماد الحملة." : "تم رفض الحملة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث الاعتماد");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(campaign: Campaign) {
    setBusy(true);
    try {
      const body = toApiBody({ ...serialisedToForm(campaign), isActive: !campaign.isActive });
      const response = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة الحملة");
      await loadCampaigns();
      setMessage(campaign.isActive ? "تم إيقاف الحملة." : "تم تفعيل الحملة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث حالة الحملة");
    } finally {
      setBusy(false);
    }
  }

  async function getVideoDuration(file: File) {
    return new Promise<number>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
      video.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`تعذر قراءة مدة الفيديو: ${file.name}`)); };
      video.src = url;
    });
  }

  async function readUploadResponse<T>(response: Response): Promise<T & { error?: string }> {
    const text = await response.text();
    try { return JSON.parse(text) as T & { error?: string }; }
    catch { return { error: response.status === 413 ? "حجم الملف كبير للرفع المباشر؛ أعد المحاولة وسيتم تقسيمه تلقائيًا." : (text || "تعذر الاتصال بخدمة الرفع.") } as T & { error?: string }; }
  }

  async function uploadFileInParts(file: File, duration?: number): Promise<Asset> {
    const initResponse = await fetch("/api/ad-assets?upload=init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size, duration }) });
    const init = await readUploadResponse<{ id?: string; key?: string; uploadId?: string; mediaType?: "image" | "video"; contentType?: string }>(initResponse);
    if (!initResponse.ok || !init.id || !init.key || !init.uploadId || !init.mediaType || !init.contentType) throw new Error(init.error || `تعذر بدء رفع ${file.name}`);
    const chunkSize = 5 * 1024 * 1024;
    const parts: Array<{ partNumber: number; etag: string }> = [];
    for (let offset = 0, partNumber = 1; offset < file.size; offset += chunkSize, partNumber += 1) {
      const partResponse = await fetch("/api/ad-assets?upload=part", { method: "POST", headers: { "Content-Type": "application/octet-stream", "x-ad-object-key": init.key, "x-ad-upload-id": init.uploadId, "x-ad-part-number": String(partNumber) }, body: file.slice(offset, Math.min(offset + chunkSize, file.size)) });
      const part = await readUploadResponse<{ partNumber?: number; etag?: string }>(partResponse);
      if (!partResponse.ok || !part.etag || !part.partNumber) throw new Error(part.error || `تعذر رفع جزء من ${file.name}`);
      parts.push({ partNumber: part.partNumber, etag: part.etag });
    }
    const completeResponse = await fetch("/api/ad-assets?upload=complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: init.id, key: init.key, uploadId: init.uploadId, fileName: file.name, contentType: init.contentType, mediaType: init.mediaType, size: file.size, parts }) });
    const complete = await readUploadResponse<{ asset?: Asset }>(completeResponse);
    if (!completeResponse.ok || !complete.asset) throw new Error(complete.error || `تعذر حفظ ${file.name}`);
    return complete.asset;
  }

  async function uploadMedia(files: FileList | File[] | undefined) {
    const uploads = files ? Array.from(files) : [];
    if (!uploads.length) return;
    setUploading(true);
    setMessage("");
    try {
      const videoDurations = new Map<File, number>();
      for (const file of uploads) {
        if (file.type.startsWith("video/")) {
          const duration = await getVideoDuration(file);
          if (!Number.isFinite(duration) || duration <= 0 || duration > 15) throw new Error(`الفيديو «${file.name}» أطول من 15 ثانية.`);
          videoDurations.set(file, duration);
        }
      }
      const uploaded: Asset[] = [];
      for (const file of uploads) {
        const duration = videoDurations.get(file);
        uploaded.push(await uploadFileInParts(file, duration));
      }
      setAssets((items) => [...uploaded, ...items]);
      const selected = uploaded[0];
      if (selected && editing) {
        setForm((current) => ({ ...current, mediaUrl: selected.url, mediaType: selected.mediaType }));
      }
      await loadAssets();
      setMessage(uploaded.length === 1 ? "تم رفع الملف واختياره للحملة." : `تم رفع ${uploaded.length} ملفات إلى المكتبة.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الوسائط");
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  }

  async function deleteAsset(asset: Asset) {
    if (!window.confirm(`حذف ${asset.fileName} من المكتبة؟`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/ad-assets?key=${encodeURIComponent(asset.key)}`, { method: "DELETE" });
      const data = response.status === 204 ? {} : await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حذف الملف");
      setAssets((items) => items.filter((item) => item.id !== asset.id));
      setMessage("تم حذف الملف.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حذف الملف");
    } finally {
      setBusy(false);
    }
  }

  const preview = {
    eyebrow: form[`eyebrow${previewLocale === "ar" ? "Ar" : previewLocale === "tr" ? "Tr" : "En"}` as keyof FormState] as string,
    title: form[`title${previewLocale === "ar" ? "Ar" : previewLocale === "tr" ? "Tr" : "En"}` as keyof FormState] as string,
    accent: form[`accent${previewLocale === "ar" ? "Ar" : previewLocale === "tr" ? "Tr" : "En"}` as keyof FormState] as string,
    description: form[`description${previewLocale === "ar" ? "Ar" : previewLocale === "tr" ? "Tr" : "En"}` as keyof FormState] as string,
    cta: form[`cta${previewLocale === "ar" ? "Ar" : previewLocale === "tr" ? "Tr" : "En"}` as keyof FormState] as string,
  };

  if (!busy && !identity.permissions.includes(PERMISSIONS.ADS_VIEW)) {
    return <div className="ads-admin-denied" dir="rtl"><div><span>⌁</span><h1>لا توجد صلاحية لمركز الإعلانات</h1><p>اطلب من المدير العام منحك دور مدير الإعلانات أو صلاحية المشاهدة.</p><Link href="/">العودة إلى المنصة</Link></div></div>;
  }

  return (
    <>
      <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg" hidden onChange={(event) => { void uploadMedia(event.target.files || undefined); event.currentTarget.value = ""; }} />
      <>
          <header className="ads-admin-header">
            <div><p>محرك الإعلانات الذكي</p><h1>مركز إدارة الحملات</h1></div>
            <div><Link href="/" target="_blank">المعاينة المباشرة</Link>{canEdit && <button type="button" onClick={() => startCreate()}>+ حملة جديدة</button>}</div>
          </header>
          <nav className="admin-subnav" aria-label="مركز الإعلانات">
            <button className={activeView === "campaigns" ? "active" : ""} type="button" onClick={() => setActiveView("campaigns")}><span aria-hidden="true">▣</span>الحملات</button>
            <button className={activeView === "media" ? "active" : ""} type="button" onClick={() => setActiveView("media")}><span aria-hidden="true">▧</span>مكتبة الوسائط</button>
            {canAnalytics && <button className={activeView === "analytics" ? "active" : ""} type="button" onClick={() => setActiveView("analytics")}><span aria-hidden="true">↗</span>التحليلات</button>}
            {canEdit && <button className={activeView === "archived" ? "active" : ""} type="button" onClick={() => { setActiveView("archived"); void loadArchived().catch(() => setMessage("تعذر تحميل الأرشيف")); }}><span aria-hidden="true">▤</span>الأرشيف</button>}
          </nav>
          {message && <div className="ads-admin-message" role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

        <div className="ads-stat-grid">
          <article><span>الحملات النشطة</span><strong>{totals.active}</strong><small>حملة منشورة</small></article>
          <article><span>بانتظار الاعتماد</span><strong>{totals.pending}</strong><small>تتطلب مراجعة</small></article>
          <article><span>مرات الظهور</span><strong>{totals.impressions.toLocaleString("ar")}</strong><small>ظهور مؤهل</small></article>
          <article><span>CTR</span><strong>{totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(1) : "0.0"}%</strong><small>{totals.clicks.toLocaleString("ar")} نقرة</small></article>
        </div>

        {activeView === "campaigns" && <section className="ads-panel">
          <div className="ads-panel-title"><div><p>الحملات</p><h2>إعلانات المحرك الذكي</h2></div><span>{visibleCampaigns.length} حملة</span></div>
          <nav className="admin-subnav" aria-label="تصفية الحملات">
            <button type="button" className={onlyPending ? "" : "active"} onClick={() => { setOnlyPending(false); setPage(1); }}>الكل ({campaigns.length})</button>
            <button type="button" className={onlyPending ? "active" : ""} onClick={() => { setOnlyPending(true); setPage(1); }}>طلبات بانتظار الاعتماد ({totals.pending})</button>
          </nav>
          {!loaded ? (
            <div className="admin-skeleton">
              <div className="admin-skeleton-row" />
              <div className="admin-skeleton-row" />
              <div className="admin-skeleton-row" />
            </div>
          ) : (
            <>
              <div className="ads-campaign-list">
                {pagedCampaigns.map((campaign) => <article key={campaign.id}>
                  <div className="ads-campaign-thumb">{campaign.mediaType === "video" ? <video src={campaign.mediaUrl} poster={campaign.posterUrl || undefined} muted preload="metadata" /> : <img src={campaign.mediaUrl} alt="" />}<span>{campaign.mediaType === "video" ? "فيديو" : "صورة"}</span></div>
                  <div className="ads-campaign-main"><span className={`ads-status ads-status-${campaign.status}`}>{statusLabel(campaign.status)}</span><span className={`ads-badge ads-badge-${campaign.approvalStatus}`}>{approvalLabel(campaign.approvalStatus)}</span><strong>{campaign.internalName}</strong><small>{campaign.advertiserName} • {campaignTypeLabel(campaign.campaignType)}</small><small>{campaign.channels.length ? campaign.channels.map((channel) => channelLabels[channel] ?? channel).join(" + ") : "الموقع"}</small><small className="ads-campaign-targets">{campaign.placements.length ? campaign.placements.slice(0, 3).map((placement) => AD_PLACEMENTS[placement]?.label.ar ?? placement).join("، ") : "بدون مواضع"}{campaign.placements.length > 3 ? ` +${campaign.placements.length - 3}` : ""}</small></div>
                  <div><small>الاستهداف</small><strong>{campaign.targetAllCountries ? "جميع الدول" : campaign.countries.length ? campaign.countries.map(countryName).slice(0, 2).join("، ") : "جميع الدول"}</strong></div>
                  <div><small>الظهور / النقر / التحويل</small><strong>{campaign.totalImpressions.toLocaleString("ar")} / {campaign.totalClicks.toLocaleString("ar")} / {campaign.totalConversions.toLocaleString("ar")}</strong></div>
                  <div><small>ترتيب / وزن</small><strong>#{campaign.priority} / {campaign.weight}</strong>{!campaign.isActive && <div className="ads-campaign-paused">متوقفة مؤقتًا</div>}</div>
                  <div className="ads-row-actions">{canApprove && campaign.approvalStatus !== "approved" && <button type="button" onClick={() => void setApproval(campaign.id, true)}>اعتماد</button>}{canApprove && campaign.approvalStatus === "pending" && <button type="button" onClick={() => void setApproval(campaign.id, false)}>رفض</button>}{canAnalytics && <button type="button" onClick={() => void openPerformance(campaign)}>الأداء</button>}{canEdit && <button type="button" onClick={() => startEdit(campaign)}>تعديل</button>}{canPublish && <button type="button" onClick={() => void toggleActive(campaign)}>{campaign.isActive ? "إيقاف" : "تفعيل"}</button>}{canEdit && <button className="danger" type="button" onClick={() => archiveCampaign(campaign.id)}>أرشفة</button>}{canEdit && <button className="danger" type="button" onClick={() => void deleteCampaignForever(campaign.id, campaign.internalName)}>حذف نهائي</button>}</div>
                </article>)}
                {!campaigns.length && <div className="ads-empty"><span>◇</span><strong>لا توجد حملات إعلانية بعد</strong><p>أنشئ أول حملة وحدد الوسائط والترجمات والمواضع والاستهداف والموازنة.</p>{canEdit && <button type="button" onClick={() => startCreate()}>إنشاء الحملة الأولى</button>}</div>}
              </div>
              {pageCount > 1 && (
                <div className="admin-subnav" style={{ justifyContent: "center", marginTop: 14 }}>
                  <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, Math.min(pageCount, p) - 1))}>السابق</button>
                  <span style={{ alignSelf: "center", fontSize: 10, color: "var(--color-text-muted)" }}>صفحة {currentPage} من {pageCount}</span>
                  <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p) + 1)}>التالي</button>
                </div>
              )}
            </>
          )}
        </section>}

        {activeView === "archived" && <section className="ads-panel">
          <div className="ads-campaign-list">
            {archivedCampaigns.map((campaign) => <article key={campaign.id}>
              <div className="ads-campaign-thumb">{campaign.mediaType === "video" ? <video src={campaign.mediaUrl} poster={campaign.posterUrl || undefined} muted preload="metadata" /> : <img src={campaign.mediaUrl} alt="" />}<span>مؤرشفة</span></div>
              <div className="ads-campaign-main"><strong>{campaign.internalName}</strong><small>{campaign.advertiserName}</small><small>{campaign.totalImpressions.toLocaleString("ar")} ظهور • {campaign.totalClicks.toLocaleString("ar")} نقرة</small></div>
              <div className="ads-row-actions">
                <button type="button" onClick={() => void restoreCampaign(campaign.id, campaign.internalName)}>استرجاع</button>
                <button className="danger" type="button" onClick={() => void deleteCampaignForever(campaign.id, campaign.internalName)}>حذف نهائي</button>
              </div>
            </article>)}
            {!archivedCampaigns.length && <div className="ads-empty"><span>▤</span><strong>الأرشيف فارغ</strong><p>الحملات المؤرشفة تظهر هنا ويمكن استرجاعها كمسودة أو حذفها نهائيًا.</p></div>}
          </div>
        </section>}

        {activeView === "media" && <section className="ads-panel">
          <div className="ads-panel-title"><div><p>التخزين</p><h2>مكتبة الصور والفيديو</h2></div>{canUpload && <button type="button" onClick={() => fileInputRef.current?.click()}>رفع ملف</button>}</div>
          {canUpload && <div className={`ads-upload-zone${dragActive ? " drag-active" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); void uploadMedia(event.dataTransfer.files); }}><span>⬆</span><div><strong>{uploading ? "جارٍ رفع الملفات..." : "اسحب الصور والفيديوهات وأفلتها هنا"}</strong><small>رفع متعدد: صور حتى 8MB وفيديو حتى 25MB وبحد أقصى 15 ثانية.</small></div><button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>اختيار ملفات</button></div>}
          <div className="ads-media-grid">{assets.map((asset) => <article key={asset.id}><div>{asset.mediaType === "video" ? <video src={asset.url} muted controls preload="metadata" /> : <img src={asset.url} alt={asset.fileName} />}</div><strong title={asset.fileName}>{asset.fileName}</strong><small>{asset.mediaType === "video" ? "فيديو" : "صورة"} • {formatSize(asset.size)}</small><footer>{canEdit && <button type="button" onClick={() => startCreate(asset)}>إنشاء حملة</button>}{canEdit && <button className="danger" type="button" onClick={() => deleteAsset(asset)}>حذف</button>}</footer></article>)}</div>
          {!assets.length && <div className="ads-empty"><span>▧</span><strong>مكتبة الوسائط فارغة</strong><p>ارفع أول صورة أو فيديو لاستخدامه في الحملات.</p></div>}
        </section>}

        {activeView === "analytics" && canAnalytics && <AnalyticsPanel />}
        </>

      {editing && (
      <div className="ads-dialog-backdrop" onClick={() => setEditing(false)}>
        <form className="ads-dialog ads-wizard" onSubmit={saveCampaign} onClick={(event) => event.stopPropagation()}>
          <div className="ads-dialog-head"><div><p>{form.id ? "تعديل الحملة" : "حملة جديدة"}</p><h2>إعداد حملة المحرك الذكي</h2></div><button type="button" aria-label="إغلاق" onClick={() => setEditing(false)}>×</button></div>
          <nav className="ads-wizard-steps" aria-label="خطوات إعداد الحملة">{["الأساسيات", "الوسائط", "المحتوى", "المواضع", "الاستهداف", "الجدولة والموازنة", "المعاينة"].map((label, index) => <button type="button" key={label} className={wizardStep === index + 1 ? "active" : wizardStep > index + 1 ? "done" : ""} onClick={() => setWizardStep(index + 1)}><span>{index + 1}</span>{label}</button>)}</nav>
          {message && <div className="ads-wizard-message" role="status">{message}</div>}

          <section className="ads-form-section" hidden={wizardStep !== 1}><div><span>1</span><h3>البيانات الأساسية</h3></div><div className="ads-form-grid">
            <label>اسم الحملة الداخلي<input required value={form.internalName} onChange={(event) => setField("internalName", event.target.value)} /></label>
            <label>الجهة المعلنة<input required value={form.advertiserName} onChange={(event) => setField("advertiserName", event.target.value)} /></label>
            <label>نوع الحملة<select value={form.campaignType} onChange={(event) => setField("campaignType", event.target.value)}><option value="platform">إعلان المنصة</option><option value="property">عقار مميز</option><option value="service">خدمة</option><option value="request">طلب إعلان</option><option value="house">إعلان داخلي (House)</option></select></label>
            <label>رابط زر الإجراء<input required dir="ltr" value={form.targetUrl} onChange={(event) => setField("targetUrl", event.target.value)} /></label>
            <label>الحالة<select value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">مسودة</option>{canPublish && <option value="active">نشطة</option>}<option value="paused">متوقفة</option><option value="expired">منتهية</option></select></label>
            <label>حالة الاعتماد{canApprove ? <select value={form.approvalStatus} onChange={(event) => setField("approvalStatus", event.target.value)}>{APPROVAL_STATUSES.map((status) => <option key={status} value={status}>{approvalLabel(status)}</option>)}</select> : <input disabled value={approvalLabel(form.approvalStatus)} />}</label>
            <fieldset className="ads-bool-row"><legend>خيارات الظهور</legend>
              <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => setField("isFeatured", event.target.checked)} />مميز</label>
              <label><input type="checkbox" checked={form.isGlobal} onChange={(event) => setField("isGlobal", event.target.checked)} />عام (كل الأقسام)</label>
              <label><input type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} />مفعّل الآن</label>
            </fieldset>
            <fieldset className="ads-bool-row"><legend>قنوات العرض</legend>
              <label><input type="checkbox" checked={form.channels.includes("website")} onChange={() => toggleList("channels", "website")} />الموقع الإلكتروني</label>
              <label><input type="checkbox" checked={form.channels.includes("office")} onChange={() => toggleList("channels", "office")} />مكتب بروماكس</label>
            </fieldset>
          </div></section>

          <section className="ads-form-section" hidden={wizardStep !== 2}><div><span>2</span><h3>الصورة أو الفيديو</h3></div>
            <div className={`ads-dialog-upload${dragActive ? " drag-active" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); void uploadMedia(event.dataTransfer.files); }}>
              <div className="ads-dialog-media-preview">{form.mediaType === "video" ? <video src={form.mediaUrl} poster={form.posterUrl || undefined} muted controls preload="metadata" /> : <img src={form.mediaUrl || "/placeholder.svg"} alt="معاينة الوسائط" loading="lazy" decoding="async" />}</div>
              <div><strong>{uploading ? "جارٍ رفع الملفات..." : "اسحب الصور والفيديوهات هنا"}</strong><small>ارفع عدة ملفات معًا؛ الفيديو لا يتجاوز 15 ثانية، ويُختار أول ملف للحملة.</small></div>
              {canUpload && <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>اختيار ملفات</button>}
            </div>
            <div className="ads-form-grid">
              <label>نوع الوسائط<select value={form.mediaType} onChange={(event) => setField("mediaType", event.target.value as "image" | "video")}><option value="image">صورة</option><option value="video">فيديو</option></select></label>
              <label>رابط الوسائط الرئيسي<input required dir="ltr" value={form.mediaUrl} onChange={(event) => setField("mediaUrl", event.target.value)} /></label>
              <label>نسخة الهاتف (اختياري)<input dir="ltr" value={form.mobileMediaUrl} onChange={(event) => setField("mobileMediaUrl", event.target.value)} /></label>
              <label>نسخة اللوحي (اختياري)<input dir="ltr" value={form.tabletMediaUrl} onChange={(event) => setField("tabletMediaUrl", event.target.value)} /></label>
              <label>صورة غلاف الفيديو<input dir="ltr" value={form.posterUrl} onChange={(event) => setField("posterUrl", event.target.value)} /></label>
            </div>
            <fieldset className="ads-choice-fieldset">
              <legend>وسائط إضافية (دوران) — {form.creatives.length} / {creativeLimit}</legend>
              {form.creatives.map((creative, index) => (
                <div className="ads-creative-row" key={index}>
                  <span style={{ fontWeight: 800, alignSelf: "center" }}>#{index + 1}</span>
                  <button type="button" disabled={index === 0} title="تقديم الصورة" onClick={() => moveCreative(index, -1)}>▲</button>
                  <button type="button" disabled={index === form.creatives.length - 1} title="تأخير الصورة" onClick={() => moveCreative(index, 1)}>▼</button>
                  <label>الرابط<input dir="ltr" value={creative.mediaUrl} placeholder="https://cdn.example.com/creative.jpg" onChange={(event) => updateCreative(index, "mediaUrl", event.target.value)} /></label>
                  <label>المدة (ثوانٍ)<input type="number" min={3} max={15} value={creative.durationSeconds} onChange={(event) => updateCreative(index, "durationSeconds", event.target.value)} /></label>
                  <label>نسخة الهاتف<input dir="ltr" value={creative.mobileMediaUrl} onChange={(event) => updateCreative(index, "mobileMediaUrl", event.target.value)} /></label>
                  <label>نسخة اللوحي<input dir="ltr" value={creative.tabletMediaUrl} onChange={(event) => updateCreative(index, "tabletMediaUrl", event.target.value)} /></label>
                  <button type="button" onClick={() => removeCreative(index)}>إزالة</button>
                </div>
              ))}
              <div><button type="button" disabled={form.creatives.length >= creativeLimit} onClick={addCreative}>إضافة وسيط</button><small>ترتيب القائمة هو ترتيب العرض (#1 يظهر أولاً) — استخدم ▲▼ لتغيير موضع الصورة. تُدوَّر الوسائط بالتساوي؛ كل حملة تُعرض مرة واحدة لكل جولة (حد أقصى 5 وسائط).</small></div>
            </fieldset>
          </section>

          <section className="ads-form-section" hidden={wizardStep !== 3}><div><span>3</span><h3>المحتوى والترجمات</h3></div>
            <div className="ads-language-columns">
              {(["ar", "en", "tr"] as const).map((language) => {
                const suffix = language === "ar" ? "Ar" : language === "en" ? "En" : "Tr";
                const keyOf = (base: "eyebrow" | "title" | "accent" | "description" | "cta") => `${base}${suffix}` as keyof FormState;
                return <fieldset key={language} dir={language === "ar" ? "rtl" : "ltr"}><legend>{languageLabels[language]}</legend>
                  <label>التصنيف<input required value={form[keyOf("eyebrow")] as string} onChange={(event) => setField(keyOf("eyebrow"), event.target.value)} /></label>
                  <label>العنوان<input required value={form[keyOf("title")] as string} onChange={(event) => setField(keyOf("title"), event.target.value)} /></label>
                  <label>السطر المميز<input required value={form[keyOf("accent")] as string} onChange={(event) => setField(keyOf("accent"), event.target.value)} /></label>
                  <label>الوصف<textarea required rows={3} value={form[keyOf("description")] as string} onChange={(event) => setField(keyOf("description"), event.target.value)} /></label>
                  <label>نص الزر<input required value={form[keyOf("cta")] as string} onChange={(event) => setField(keyOf("cta"), event.target.value)} /></label>
                </fieldset>;
              })}
            </div>
          </section>

          <section className="ads-form-section" hidden={wizardStep !== 4}><div><span>4</span><h3>الأقسام والمواضع</h3></div>
            <fieldset className="ads-choice-fieldset"><legend>الأقسام — إعلان عام يتضمن كل الأقسام</legend><div>{Object.values(PLATFORM_SECTIONS_REGISTRY).map((meta) => <label key={meta.key}><input type="checkbox" checked={form.sectionScopes.includes(meta.key)} onChange={() => toggleList("sectionScopes", meta.key)} />{meta.label.ar}</label>)}</div></fieldset>
            <fieldset className="ads-choice-fieldset"><legend>المواضع — يُرشَّح حسب القناة والأقسام المختارة</legend><div className="ads-placement-grid">{allowedPlacements.map((meta) => <label key={meta.key}><input type="checkbox" checked={form.placements.includes(meta.key)} onChange={() => toggleList("placements", meta.key)} /><strong>{meta.label.ar}</strong><small>{meta.channel === "office" ? "Office" : "Website"} • {meta.shape === "horizontal" ? "أفقي" : meta.shape === "vertical" ? "عمودي" : meta.shape === "floating" ? "عائم" : "منبثق"}{meta.aspectRatio ? ` • ${meta.aspectRatio}` : ""}</small></label>)}</div></fieldset>
            <fieldset className="ads-choice-fieldset"><legend>أنواع الصفحات</legend><div>{PAGE_TYPES_LIST.map((pageType) => <label key={pageType}><input type="checkbox" checked={form.pageTypes.includes(pageType)} onChange={() => toggleList("pageTypes", pageType)} />{pageTypeLabels[pageType] ?? pageType}</label>)}</div></fieldset>
          </section>

          <section className="ads-form-section" hidden={wizardStep !== 5}><div><span>5</span><h3>الاستهداف</h3></div>
            <fieldset className="ads-choice-fieldset"><legend>الدول — عدم تحديد دولة يعني جميع الدول</legend><div>{countries.map(([id, label]) => <label key={id}><input type="checkbox" disabled={Boolean(identity.countryCode && identity.countryCode.toLowerCase() !== id)} checked={form.countries.includes(id)} onChange={() => toggleList("countries", id)} />{label}</label>)}</div></fieldset>
            <div className="ads-target-grid">
              <fieldset className="ads-choice-fieldset"><legend>اللغات</legend><div>{Object.entries(languageLabels).map(([id, label]) => <label key={id}><input type="checkbox" checked={form.languages.includes(id)} onChange={() => toggleList("languages", id)} />{label}</label>)}</div></fieldset>
              <fieldset className="ads-choice-fieldset"><legend>الأجهزة</legend><div>{DEVICE_TYPES.map((device) => <label key={device}><input type="checkbox" checked={form.devices.includes(device)} onChange={() => toggleList("devices", device)} />{deviceLabels[device]}</label>)}</div></fieldset>
              <fieldset className="ads-choice-fieldset"><legend>أنظمة التشغيل (اختياري)</legend><div>{["android", "ios", "windows", "macos", "linux"].map((os) => <label key={os}><input type="checkbox" checked={form.operatingSystems.includes(os)} onChange={() => toggleList("operatingSystems", os)} />{os}</label>)}</div></fieldset>
            </div>
            <label className="ads-wide-field">المدن (اختياري — معرّفات مفصولة بفاصلة)<input dir="ltr" placeholder="om-muscat, sa-riyadh" value={form.cities.join(", ")} onChange={(event) => setField("cities", event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))} /></label>
            <details className="ads-target-details"><summary className="ads-details-summary">الموقع الجغرافي والتجزئة ▼</summary>
              <div className="ads-target-grid">
                <label className="ads-wide-field">المناطق (فاصلة)<input dir="ltr" placeholder="om-muscat-governorate" value={form.regionIds.join(", ")} onChange={(event) => setField("regionIds", event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))} /></label>
                <label className="ads-wide-field">الأحياء/المناطق الفرعية (فاصلة)<input dir="ltr" placeholder="al-khuwair" value={form.districtIds.join(", ")} onChange={(event) => setField("districtIds", event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))} /></label>
                <label>خط العرض (اختياري)<input dir="ltr" type="number" step="any" value={form.latitude} onChange={(event) => setField("latitude", event.target.value)} /></label>
                <label>خط الطول (اختياري)<input dir="ltr" type="number" step="any" value={form.longitude} onChange={(event) => setField("longitude", event.target.value)} /></label>
                <label>نصف القطر (كم)<input dir="ltr" type="number" min="1" value={form.radiusKm} onChange={(event) => setField("radiusKm", event.target.value)} /></label>
                <label>نوع الكيان (اختياري)<input dir="ltr" placeholder="property, office, service..." value={form.entityType} onChange={(event) => setField("entityType", event.target.value)} /></label>
              </div>
              <div className="ads-target-grid">
                <fieldset className="ads-choice-fieldset"><legend>استهداف جميع الدول</legend><div><label><input type="checkbox" checked={form.targetAllCountries} onChange={(event) => setField("targetAllCountries", event.target.checked)} />جميع الدول</label></div></fieldset>
                <fieldset className="ads-choice-fieldset"><legend>تجاوز فلاتر المناطق</legend><div>
                  <label><input type="checkbox" checked={form.targetAllRegions} onChange={(event) => setField("targetAllRegions", event.target.checked)} />جميع المناطق</label>
                  <label><input type="checkbox" checked={form.targetAllCities} onChange={(event) => setField("targetAllCities", event.target.checked)} />جميع المدن</label>
                  <label><input type="checkbox" checked={form.targetAllDistricts} onChange={(event) => setField("targetAllDistricts", event.target.checked)} />جميع الأحياء</label>
                </div></fieldset>
              </div>
            </details>
            <div className="ads-target-grid">
              <label className="ads-wide-field">أنواع العقارات (فاصلة)<input dir="ltr" placeholder="villa, apartment, office, land" value={form.propertyTypes.join(", ")} onChange={(event) => setField("propertyTypes", event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))} /></label>
              <label className="ads-wide-field">تصنيفات الخدمات (فاصلة)<input dir="ltr" placeholder="cleaning, moving, maintenance" value={form.serviceCategories.join(", ")} onChange={(event) => setField("serviceCategories", event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))} /></label>
              <label className="ads-wide-field">معرّفات الكيانات المستهدفة (فاصلة)<input dir="ltr" placeholder="prop-123, office-45" value={form.entityIds.join(", ")} onChange={(event) => setField("entityIds", event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))} /></label>
              <label className="ads-wide-field">التصنيفات (فاصلة)<input dir="ltr" placeholder="residential, commercial" value={form.categoryIds.join(", ")} onChange={(event) => setField("categoryIds", event.target.value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))} /></label>
            </div>
          </section>

          <section className="ads-form-section" hidden={wizardStep !== 6}><div><span>6</span><h3>الجدولة والموازنة</h3></div><div className="ads-form-grid">
            <label>البداية<input type="datetime-local" value={form.startAt} onChange={(event) => setField("startAt", event.target.value)} /></label>
            <label>النهاية<input type="datetime-local" value={form.endAt} onChange={(event) => setField("endAt", event.target.value)} /></label>
            <label>من ساعة (اختياري)<input type="time" value={form.dailyStartTime} onChange={(event) => setField("dailyStartTime", event.target.value)} /></label>
            <label>إلى ساعة (اختياري)<input type="time" value={form.dailyEndTime} onChange={(event) => setField("dailyEndTime", event.target.value)} /></label>
            <label>مجموعة التدوير (اختياري)<input dir="ltr" value={form.rotationGroup} onChange={(event) => setField("rotationGroup", event.target.value)} /></label>
            <fieldset className="ads-bool-row"><legend>أيام العرض</legend>{dayLabels.map((label, index) => <label key={index}><input type="checkbox" checked={form.daysOfWeek.includes(index)} onChange={() => toggleDay(index)} />{label}</label>)}</fieldset>
            <label>ترتيب الظهور<input type="number" min="1" max="999" value={form.priority} onChange={(event) => setField("priority", event.target.value)} /><small>1 يظهر أولاً.</small></label>
            <label>وزن التكرار<input type="number" min="1" max="100" value={form.weight} onChange={(event) => setField("weight", event.target.value)} /></label>
            <label>نموذج التسعير<select value={form.pricingModel} onChange={(event) => setField("pricingModel", event.target.value)}>{PRICING_MODELS.map((model) => <option key={model} value={model}>{pricingLabels[model]}</option>)}</select></label>
            <label>السعر<input type="number" min="0" value={form.price} onChange={(event) => setField("price", event.target.value)} /></label>
            <label>الميزانية الإجمالية<input type="number" min="0" value={form.budget} onChange={(event) => setField("budget", event.target.value)} /></label>
            <label>الميزانية اليومية<input type="number" min="0" value={form.dailyBudget} onChange={(event) => setField("dailyBudget", event.target.value)} /></label>
            <label>أقصى عدد ظهور<input type="number" min="0" value={form.maxImpressions} onChange={(event) => setField("maxImpressions", event.target.value)} /></label>
            <label>أقصى عدد نقرات<input type="number" min="0" value={form.maxClicks} onChange={(event) => setField("maxClicks", event.target.value)} /></label>
            <label>حد التكرار لكل مستخدم<input type="number" min="0" value={form.frequencyCapPerUser} onChange={(event) => setField("frequencyCapPerUser", event.target.value)} /></label>
            <label>فترة حد التكرار<select value={form.frequencyCapPeriod} onChange={(event) => setField("frequencyCapPeriod", event.target.value)}>{FREQUENCY_PERIODS.map((period) => <option key={period} value={period}>{periodLabels[period]}</option>)}</select></label>
          </div></section>

          <section className="ads-form-section" hidden={wizardStep !== 7}><div><span>7</span><h3>المعاينة</h3></div>
            <div className="ads-preview-toolbar">{(["ar", "en", "tr"] as const).map((language) => <button className={previewLocale === language ? "active" : ""} type="button" onClick={() => setPreviewLocale(language)} key={language}>{language.toUpperCase()}</button>)}</div>
            <div className="ads-live-preview" dir={previewLocale === "ar" ? "rtl" : "ltr"}>
              {form.mediaType === "video" ? <video src={form.mediaUrl} poster={form.posterUrl || undefined} autoPlay muted loop playsInline /> : <img src={form.mediaUrl || "/placeholder.svg"} alt="" loading="lazy" decoding="async" />}
              <div><p>{preview.eyebrow}</p><h2>{preview.title}<br /><strong>{preview.accent}</strong></h2><span>{preview.description}</span><b>{preview.cta} ←</b></div>
            </div>
            <div className="ads-preview-meta"><span>{form.placements.length} موضع</span><span>{form.sectionScopes.length} قسم</span><span>{form.channels.length ? form.channels.map((channel) => channelLabels[channel] ?? channel).join(" + ") : "الموقع"}</span><span>{form.devices.join("، ")}</span><span>الموازنة: {form.budget} ريال</span></div>
          </section>

          <footer className="ads-wizard-actions"><button type="button" onClick={() => wizardStep === 1 ? setEditing(false) : setWizardStep((step) => step - 1)}>{wizardStep === 1 ? "إلغاء" : "السابق"}</button>{wizardStep < 7 ? <button className="primary" type="button" onClick={() => setWizardStep((step) => step + 1)}>التالي</button> : <button className="primary" type="submit" disabled={busy || uploading}>{busy ? "جارٍ الحفظ..." : form.id ? "حفظ التعديلات" : "إنشاء الحملة"}</button>}</footer>
        </form>
      </div>
      )}
      {perf && (
        <div className="account-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPerf(null); }}>
          <div className="account-dialog" role="dialog" aria-modal="true" aria-label="أداء الحملة" style={{ width: "min(560px, 96vw)" }}>
            <button className="account-close" type="button" aria-label="إغلاق" onClick={() => setPerf(null)}>×</button>
            <div className="account-panel">
              <p className="account-kicker">أداء الحملة — آخر 30 يومًا</p>
              <h3 style={{ margin: 0 }}>{perf.name}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "12px 0" }}>
                {[["الظهور", perf.totals.impressions], ["النقرات", perf.totals.clicks], ["التحويلات", perf.totals.conversions]].map(([label, value]) => (
                  <div key={String(label)} style={{ background: "var(--color-primary-soft)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                    <b style={{ display: "block", fontSize: 20, color: "var(--color-primary)", fontVariantNumeric: "tabular-nums" }}>{Number(value).toLocaleString("ar")}</b>
                    <small style={{ color: "var(--color-text-muted)", fontWeight: 700 }}>{String(label)}</small>
                  </div>
                ))}
              </div>
              <div style={{ background: "var(--color-primary-soft)", borderRadius: 12, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 800, color: "var(--color-primary)" }}>
                CTR: {perf.totals.impressions > 0 ? ((perf.totals.clicks / perf.totals.impressions) * 100).toFixed(2) : "0.00"}%
              </div>
              {perfLoading ? (
                <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "24px 0" }}>جارٍ التحميل...</p>
              ) : perf.daily.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "24px 0" }}>لا توجد بيانات يومية بعد — تظهر مع أول ظهور للإعلان.</p>
              ) : (() => {
                const max = Math.max(1, ...perf.daily.map((d) => d.impressions));
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, direction: "ltr" }}>
                      {perf.daily.map((d) => (
                        <div key={d.date} title={`${d.date} — ظهور ${d.impressions} • نقرات ${d.clicks}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2, height: "100%" }}>
                          <div style={{ height: `${Math.max(3, Math.round((d.clicks / max) * 100))}%`, background: "var(--accent)", borderRadius: 3 }} />
                          <div style={{ height: `${Math.max(4, Math.round((d.impressions / max) * 100))}%`, background: "var(--color-primary)", borderRadius: 3, opacity: 0.85 }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, fontWeight: 800 }}>
                      <span style={{ color: "var(--color-primary)" }}>■ الظهور</span>
                      <span style={{ color: "var(--accent)" }}>■ النقرات</span>
                      <span style={{ color: "var(--color-text-muted)", marginInlineStart: "auto" }}>{perf.daily[0]?.date} ← {perf.daily[perf.daily.length - 1]?.date}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AnalyticsPanel() {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<{
    campaigns: Array<{
      id: string; internalName: string; advertiserName: string; campaignType: string;
      status: string; approvalStatus: string;
      totalImpressions: number; totalUniqueImpressions: number; totalClicks: number;
      totalUniqueClicks: number; totalConversions: number;
      spentAmount: number; budget: number; dailyBudget: number;
    }>;
    placements: Array<{ placement: string; channel: string; inventoryClass: string; impressions: number }>;
    split: { commercial: number };
    inventory: Array<{
      placement: string; status: "HEALTHY" | "PARTIALLY_FILLED" | "NO_INVENTORY";
      eligibleAds: number;
      commercialImpressions: number; fillRate: number;
    }>;
    today: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/ads/stats", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "تعذر تحميل الإحصائيات");
        if (mounted) setStats(data);
      })
      .catch((err: Error) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setBusy(false); });
    return () => { mounted = false; };
  }, []);

  if (busy) return <section className="ads-panel"><div className="ads-empty"><span>↗</span><strong>جارٍ تحميل التحليلات...</strong></div></section>;
  if (error || !stats) return <section className="ads-panel"><div className="ads-empty"><span>↗</span><strong>تعذر تحميل التحليلات</strong><p>{error}</p></div></section>;

  const totals = stats.campaigns.reduce((acc, c) => ({
    impressions: acc.impressions + c.totalImpressions,
    uniqueImpressions: acc.uniqueImpressions + c.totalUniqueImpressions,
    clicks: acc.clicks + c.totalClicks,
    conversions: acc.conversions + c.totalConversions,
    spent: acc.spent + c.spentAmount,
  }), { impressions: 0, uniqueImpressions: 0, clicks: 0, conversions: 0, spent: 0 });

  const trackedImpressions = stats.split.commercial;
  const commercialFillRate = trackedImpressions > 0 ? 1 : 0;
  const healthStatus: Record<string, string> = {
    HEALTHY: "ممتلئ",
    PARTIALLY_FILLED: "امتلاء جزئي",
    NO_INVENTORY: "بدون مخزون",
  };

  return (
    <section className="ads-panel">
      <div className="ads-panel-title"><div><p>الأداء</p><h2>تحليلات الحملات</h2></div><span>{stats.today}</span></div>
      <div className="ads-stat-grid">
        <article><span>إجمالي الظهور</span><strong>{totals.impressions.toLocaleString("ar")}</strong><small>{totals.uniqueImpressions.toLocaleString("ar")} فريد</small></article>
        <article><span>النقرات</span><strong>{totals.clicks.toLocaleString("ar")}</strong><small>{totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00"}% CTR</small></article>
        <article><span>الظهور المسجلة</span><strong>{stats.split.commercial.toLocaleString("ar")}</strong><small>{Math.round(commercialFillRate * 100)}% نسبة الامتلاء</small></article>
        <article><span>الإنفاق</span><strong>{totals.spent.toLocaleString("ar")}</strong><small>من الميزانيات</small></article>
      </div>
      <div className="ads-analytics-list">
        {stats.campaigns.map((c) => {
          const ctr = c.totalImpressions ? ((c.totalClicks / c.totalImpressions) * 100).toFixed(2) : "0.00";
          return <article key={c.id}><div><strong>{c.internalName}</strong><small>{c.advertiserName} • {statusLabel(c.status)}</small></div><span>{c.totalImpressions.toLocaleString("ar")} ظهور</span><span>{c.totalClicks.toLocaleString("ar")} نقرة</span><span>{c.totalConversions.toLocaleString("ar")} تحويل</span><b>{ctr}% CTR</b></article>;
        })}
        {!stats.campaigns.length && <div className="ads-empty"><span>◇</span><strong>لا توجد بيانات بعد</strong><p>أنشئ حملات وسجّل الظهور والنقرات لترى الأداء هنا.</p></div>}
      </div>
      {stats.inventory.length > 0 && <div className="ads-panel-title"><div><p>المخزون</p><h2>صحة مخزون المواضع</h2></div><span>{stats.inventory.filter((item) => item.status === "HEALTHY").length} سليم</span></div>}
      <div className="ads-placement-bars">{stats.inventory.map((item) => {
        const width = Math.max(3, Math.round(item.fillRate * 100));
        return <div className="ads-placement-bar" key={item.placement}>
          <span title={item.placement}>{AD_PLACEMENTS[item.placement]?.label.ar ?? item.placement}</span>
          <div><i style={{ width: `${width}%` }} /></div>
          <b>{healthStatus[item.status] ?? item.status}</b>
          <small>{item.commercialImpressions.toLocaleString("ar")} ظهور • {item.eligibleAds} إعلان مؤهل</small>
        </div>;
      })}</div>
    </section>
  );
}
