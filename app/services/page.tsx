"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { translations } from "@/src/data/translations";
import type { Locale } from "@/src/types/site";

type Listing = {
  id: string;
  provider_user_id: string;
  category_id: string;
  titleKey: string | null;
  descriptionKey: string | null;
  price: number;
  currency: string;
  unit: string;
  status: string;
  city_id: string;
  country_code: string;
};

type RequestRow = {
  id: string;
  category_id: string;
  customer_user_id: string;
  titleKey: string | null;
  descriptionKey: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  status: string;
};

type Category = { id: string; code: string; country_code: string };

type Flat = Record<string, string>;

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

export default function ServicesPage() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [flat, setFlat] = useState<Flat>({});
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "requests" | "new-request">("browse");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const t = useCallback(
    (key: string): string => {
      const value = flat[key] ?? translations[locale][key as keyof typeof translations["ar"]] ?? key;
      return typeof value === "string" ? value : key;
    },
    [flat, locale],
  );
  const direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [bundle, listingsData, requestsData, categoriesData] = await Promise.all([
          fetchJson(`/api/i18n/${locale}`),
          fetchJson("/api/services/listings"),
          fetchJson("/api/services/requests"),
          fetchJson("/api/services/categories"),
        ]);
        if (controller.signal.aborted) return;
        setFlat((bundle.translations as Flat) ?? {});
        setListings(Array.isArray(listingsData.listings) ? (listingsData.listings as Listing[]) : []);
        setRequests(Array.isArray(requestsData.requests) ? (requestsData.requests as RequestRow[]) : []);
        setCategories(Array.isArray(categoriesData.categories) ? (categoriesData.categories as Category[]) : []);
      } catch {
        if (!controller.signal.aborted) setMessage(t("services.error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const categoryName = useCallback(
    (categoryId: string) => {
      const category = categories.find((item) => item.id === categoryId);
      if (!category) return "";
      return t(`services.category.${category.code}`);
    },
    [categories, t],
  );

  const listingLabel = useCallback(
    (key: string | null, fallbackCode: string): string => {
      const value = key ? t(key) : "";
      return value !== key ? value : t(`services.category.${fallbackCode}`);
    },
    [t],
  );

  const activeListings = useMemo(() => listings.filter((item) => item.status === "active"), [listings]);
  const openRequests = useMemo(() => requests.filter((item) => item.status === "open"), [requests]);

  async function submitRequest() {
    if (!categoryId || !title.trim()) {
      setMessage(t("services.error"));
      return;
    }
    setMessage("");
    try {
      const res = await fetch("/api/services/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          countryCode: "OM",
          cityId: "om-muscat",
          titleKey: null,
          descriptionKey: null,
          budgetMin: budgetMin ? Number(budgetMin) : null,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          currency: "OMR",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error === "services.unauthorized" ? t("services.error") : (data.error ?? t("services.error")));
        return;
      }
      setMessage(t("services.save"));
      setTitle("");
      setDescription("");
      setBudgetMin("");
      setBudgetMax("");
      setCategoryId("");
      setTab("requests");
      const refreshed = await fetchJson("/api/services/requests");
      setRequests(Array.isArray(refreshed.requests) ? (refreshed.requests as RequestRow[]) : []);
    } catch {
      setMessage(t("services.error"));
    }
  }

  return (
    <div dir={direction} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("services.marketplaceTitle")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("services.marketplaceSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
          </select>
          <Link href="/" className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">
            {t("home.brandTitle")}
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {message && <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">{message}</div>}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          {(["browse", "requests", "new-request"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === item ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"
              }`}
            >
              {item === "browse" ? t("services.browseListings") : item === "requests" ? t("services.requests") : t("services.postRequest")}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t("services.loading")}</p>
        ) : (
          <>
            {tab === "browse" && (
              <div>
                {activeListings.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t("services.empty")}</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeListings.map((listing) => (
                      <div key={listing.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                        <h3 className="font-bold text-gray-900 dark:text-white">{listingLabel(listing.titleKey, listing.category_id)}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {listing.descriptionKey ? t(listing.descriptionKey) : ""}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {listing.price} {listing.currency}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {categoryName(listing.category_id) || listing.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "requests" && (
              <div>
                {openRequests.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t("services.empty")}</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {openRequests.map((request) => (
                      <div key={request.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                        <h3 className="font-bold text-gray-900 dark:text-white">{request.titleKey ? t(request.titleKey) : "—"}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {request.descriptionKey ? t(request.descriptionKey) : ""}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {request.budget_min ?? "—"}–{request.budget_max ?? "—"} {request.currency}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            {request.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "new-request" && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 max-w-xl">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t("services.postRequest")}</h2>
                <label className="block mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t("services.category")}</span>
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                  >
                    <option value="">—</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {t(`services.category.${category.code}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t("services.title")}</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                  />
                </label>
                <label className="block mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t("services.description")}</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t("services.budget")} (min)</span>
                    <input
                      type="number"
                      value={budgetMin}
                      onChange={(event) => setBudgetMin(event.target.value)}
                      className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t("services.budget")} (max)</span>
                    <input
                      type="number"
                      value={budgetMax}
                      onChange={(event) => setBudgetMax(event.target.value)}
                      className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg"
                    />
                  </label>
                </div>
                <button
                  onClick={submitRequest}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {t("services.save")}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
