'use client';
import { useState, useEffect, use, useMemo } from 'react';
import { MapPin, Clock, Briefcase, MessageCircle, Calendar, ShieldCheck, Phone, Mail, Globe, FolderOpen, ThumbsUp, Quote, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import Tabs, { TabPanel } from '@/src/components/ui/Tabs';
import Button from '@/src/components/ui/Button';
import Skeleton from '@/src/components/ui/Skeleton';
import PageContainer from '@/src/components/layout/PageContainer';
import { RatingStars } from '@services-ui/ServiceCards';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  quality: number | null;
  punctuality: number | null;
  communication: number | null;
  value: number | null;
  recommend: boolean | null;
  createdAt: string | null;
  reviewerName: string | null;
};

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  category: string | null;
  city: string | null;
  year: number | null;
  tags: string[] | null;
  isFeatured: boolean | null;
};

type ProviderService = {
  id: string;
  categoryId: string;
  name: string;
  bookingMode: 'instant' | 'quotes' | 'both';
  instantPrice: number | null;
  currency: string | null;
  pricingUnit: string | null;
};

type Provider = {
  id: string;
  businessName: string;
  bio: string | null;
  categoryId: string | null;
  country: string | null;
  governorate: string | null;
  city: string | null;
  radius: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: string | null;
  isVerified: boolean | null;
  workingHours: Record<string, string> | null;
  availability: boolean | null;
  user: { name: string | null; email: string | null } | null;
  category: { nameAr: string | null; nameEn: string | null } | null;
  portfolio: PortfolioItem[];
  reviews: Review[];
  ratingCount: number;
  jobsCompleted: number;
  specialties: string[];
  services: ProviderService[];
};

type Locale = 'ar' | 'en' | 'tr';

const copy: Record<Locale, {
  back: string;
  eyebrow: string;
  title: string;
  description: string;
  loading: string;
  notFound: string;
  notFoundDesc: string;
  notFoundCta: string;
  verified: string;
  available: string;
  message: string;
  requestService: string;
  jobsDone: string;
  ready: string;
  tabs: { about: string; portfolio: string; reviews: string; contact: string };
  specialties: string;
  about: string;
  noBio: string;
  workHours: string;
  noPortfolio: string;
  noReviews: string;
  recommended: string;
  quality: string;
  punctuality: string;
  communication: string;
  value: string;
  client: string;
  phone: string;
  email: string;
  website: string;
  noContact: string;
}> = {
  ar: {
    back: 'العودة للمحترفين',
    eyebrow: 'المحترفون',
    title: 'تفاصيل المحترف',
    description: 'الملف التعريفي الكامل للمحترف، أعماله وتقييمات عملائه.',
    loading: 'جارٍ تحميل ملف المحترف...',
    notFound: 'المحترف غير موجود',
    notFoundDesc: 'عذرًا، لم نتمكن من العثور على هذا المحترف أو أنه لم يعد متاحًا.',
    notFoundCta: 'تصفح جميع المحترفين',
    verified: 'موثق',
    available: 'متاح الآن',
    message: 'مراسلة',
    requestService: 'طلب خدمة',
    jobsDone: 'عمل مكتمل',
    ready: 'جاهز للاستقبال',
    tabs: { about: 'نبذة', portfolio: 'المحفظة', reviews: 'التقييمات', contact: 'التواصل' },
    specialties: 'التخصصات',
    about: 'نبذة',
    noBio: 'لا يوجد وصف',
    workHours: 'ساعات العمل',
    noPortfolio: 'لا توجد أعمال في المحفظة بعد',
    noReviews: 'لا توجد تقييمات بعد',
    recommended: 'مُوصى به',
    quality: 'الجودة',
    punctuality: 'الالتزام',
    communication: 'التواصل',
    value: 'القيمة',
    client: 'عميل',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    website: 'الموقع الإلكتروني',
    noContact: 'لا توجد معلومات تواصل متاحة',
  },
  en: {
    back: 'Back to professionals',
    eyebrow: 'Professionals',
    title: 'Professional Profile',
    description: 'The full professional profile, portfolio and client reviews.',
    loading: 'Loading professional profile...',
    notFound: 'Professional not found',
    notFoundDesc: 'Sorry, we could not find this professional or they are no longer available.',
    notFoundCta: 'Browse all professionals',
    verified: 'Verified',
    available: 'Available now',
    message: 'Message',
    requestService: 'Request service',
    jobsDone: 'jobs completed',
    ready: 'Ready to serve',
    tabs: { about: 'About', portfolio: 'Portfolio', reviews: 'Reviews', contact: 'Contact' },
    specialties: 'Specialties',
    about: 'About',
    noBio: 'No description',
    workHours: 'Working hours',
    noPortfolio: 'No portfolio items yet',
    noReviews: 'No reviews yet',
    recommended: 'Recommended',
    quality: 'Quality',
    punctuality: 'Punctuality',
    communication: 'Communication',
    value: 'Value',
    client: 'Client',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    noContact: 'No contact information available',
  },
  tr: {
    back: 'Uzmanlara dön',
    eyebrow: 'Uzmanlar',
    title: 'Uzman Profili',
    description: 'Tam uzman profili, portföy ve müşteri değerlendirmeleri.',
    loading: 'Uzman profili yükleniyor...',
    notFound: 'Uzman bulunamadı',
    notFoundDesc: 'Üzgünüz, bu uzman bulunamadı veya artık mevcut değil.',
    notFoundCta: 'Tüm uzmanlara göz at',
    verified: 'Doğrulanmış',
    available: 'Şu an müsait',
    message: 'Mesaj',
    requestService: 'Hizmet iste',
    jobsDone: 'tamamlanan iş',
    ready: 'Hizmete hazır',
    tabs: { about: 'Hakkında', portfolio: 'Portföy', reviews: 'Değerlendirmeler', contact: 'İletişim' },
    specialties: 'Uzmanlıklar',
    about: 'Hakkında',
    noBio: 'Açıklama yok',
    workHours: 'Çalışma saatleri',
    noPortfolio: 'Henüz portföy öğesi yok',
    noReviews: 'Henüz değerlendirme yok',
    recommended: 'Önerilen',
    quality: 'Kalite',
    punctuality: 'Dakiklik',
    communication: 'İletişim',
    value: 'Değer',
    client: 'Müşteri',
    phone: 'Telefon',
    email: 'E-posta',
    website: 'Web sitesi',
    noContact: 'İletişim bilgisi mevcut değil',
  },
};

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, viewer, copy: siteCopy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  const loc: Locale = locale;

  useEffect(() => {
    const controller = new AbortController();

    async function loadProvider() {
      setLoading(true);
      setError(false);

      try {
        const providerResponse = await fetch(`/api/service-providers/${id}`, {
          signal: controller.signal,
        });

        const providerData = await providerResponse.json();

        if (!providerResponse.ok || !providerData.profile) {
          if (!controller.signal.aborted) {
            setError(true);
            setProvider(null);
          }
          return;
        }

        const profile = providerData.profile as Record<string, unknown>;
        const categoryRows = Array.isArray(providerData.categories) ? providerData.categories as Array<Record<string, unknown>> : [];
        const serviceRows: ProviderService[] = categoryRows.map((row) => ({
          id: String(row.id ?? ''),
          categoryId: String(row.category_id ?? ''),
          name: String((loc === 'ar' ? row.category_name_ar : row.category_name_en) || row.category_name_ar || row.category_name_en || row.category_code || ''),
          bookingMode: ['instant', 'quotes', 'both'].includes(String(row.booking_mode)) ? String(row.booking_mode) as ProviderService['bookingMode'] : 'quotes',
          instantPrice: row.instant_price == null ? null : Number(row.instant_price),
          currency: row.currency == null ? null : String(row.currency),
          pricingUnit: row.pricing_unit == null ? null : String(row.pricing_unit),
        }));
        const canonicalReviews: Review[] = (Array.isArray(providerData.reviews) ? providerData.reviews : []).map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ''),
          rating: Number(row.rating ?? 0),
          comment: row.comment == null ? null : String(row.comment),
          quality: row.quality_rating == null ? null : Number(row.quality_rating),
          punctuality: row.punctuality_rating == null ? null : Number(row.punctuality_rating),
          communication: row.communication_rating == null ? null : Number(row.communication_rating),
          value: row.value_rating == null ? null : Number(row.value_rating),
          recommend: row.recommend === true || row.recommend === 1 || row.recommend === '1',
          createdAt: row.created_at == null ? null : String(row.created_at),
          reviewerName: null,
        }));
        const primaryService = serviceRows[0];
        const nextProvider: Provider = {
          id: String(profile.id),
          businessName: String(profile.business_name || profile.display_name_ar || profile.display_name_en || ''),
          bio: String((loc === 'ar' ? profile.bio_ar : profile.bio_en) || profile.bio_ar || profile.bio_en || ''),
          categoryId: primaryService?.categoryId ?? null,
          country: profile.country_code == null ? null : String(profile.country_code),
          governorate: profile.governorate == null ? null : String(profile.governorate),
          city: profile.city_id == null ? null : String(profile.city_id),
          radius: profile.service_radius_km == null ? null : Number(profile.service_radius_km),
          phone: null,
          email: null,
          website: profile.website == null ? null : String(profile.website),
          rating: profile.rating_avg == null ? null : String(profile.rating_avg),
          isVerified: true,
          workingHours: null,
          availability: Number(profile.is_accepting_requests ?? 1) === 1,
          user: { name: String((loc === 'ar' ? profile.display_name_ar : profile.display_name_en) || profile.business_name || ''), email: null },
          category: primaryService ? { nameAr: primaryService.name, nameEn: primaryService.name } : null,
          portfolio: (Array.isArray(providerData.portfolio) ? providerData.portfolio : []).map((row: Record<string, unknown>) => ({
            id: String(row.id ?? ''), title: String(row.title ?? ''), description: row.description == null ? null : String(row.description),
            image: row.image_url == null ? null : String(row.image_url), category: row.category_id == null ? null : String(row.category_id),
            city: row.city_id == null ? null : String(row.city_id), year: row.year == null ? null : Number(row.year),
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : null, isFeatured: row.is_featured === 1 || row.is_featured === true,
          })),
          reviews: canonicalReviews,
          ratingCount: Number(profile.rating_count ?? canonicalReviews.length),
          jobsCompleted: Number(profile.jobs_completed ?? 0),
          specialties: serviceRows.map((service) => service.name),
          services: serviceRows,
        };

        if (!controller.signal.aborted) {
          setProvider(nextProvider);
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === 'AbortError')
        ) {
          setError(true);
          setProvider(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProvider();

    return () => {
      controller.abort();
    };
  }, [id]);

  const tabs = useMemo(
    () => [
      { id: 'about', label: copy[loc].tabs.about },
      { id: 'portfolio', label: copy[loc].tabs.portfolio },
      { id: 'reviews', label: copy[loc].tabs.reviews },
      { id: 'contact', label: copy[loc].tabs.contact },
    ],
    [loc],
  );

  const t = copy[loc];
  const displayName = provider?.user?.name || provider?.businessName;

  return (
    <>
      <PublicPageShell
        locale={loc}
        copy={siteCopy}
        viewer={viewer}
        country={country}
        city={city}
        currentPath={`/providers/${id}`}
        pageHeader={{ eyebrow: t.eyebrow, title: t.title, description: t.description }}
        adLayout={{ mode: 'standard', family: 'provider-detail', entityType: 'provider', entityId: id }}
        onLogin={() => openLogin('login')}
        onLogout={handleLogout}
      >
        <div dir={dir} className="py-8">
          <PageContainer>
            {loading && (
              <div className="grid min-h-[50vh] place-items-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--color-primary)] border-t-transparent" />
                  <p className="text-xs font-bold text-[color:var(--color-text-muted)]">{t.loading}</p>
                </div>
              </div>
            )}

            {!loading && (error || !provider) && (
              <div className="grid min-h-[50vh] place-items-center">
                <div className="text-center max-w-sm">
                  <div className="text-5xl mb-4 opacity-40">🧑‍💼</div>
                  <h1 className="text-xl font-black text-[color:var(--color-text-primary)] mb-2">{t.notFound}</h1>
                  <p className="text-sm font-bold text-[color:var(--color-text-muted)] mb-5">{t.notFoundDesc}</p>
                  <Link href="/providers" className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-5 py-2.5 text-xs font-black text-white">{t.notFoundCta}</Link>
                </div>
              </div>
            )}

            {!loading && provider && (
              <>
                <Link href="/providers" className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-primary)]">
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                  {t.back}
                </Link>

                <div className="mt-5 overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                  <div className="relative h-40 bg-gradient-to-l from-[color:var(--color-primary)] via-[color:var(--color-primary-hover)] to-[#0a3c8f]">
                    <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 p-4">
                      <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-[var(--color-surface)]/20 text-4xl font-black text-white">
                        {displayName ? displayName.slice(0, 1) : '👤'}
                      </div>
                      <div className="pb-1 text-white">
                        <h1 className="text-2xl font-black">{provider.businessName}</h1>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {provider.category?.nameAr && <span className="rounded-full bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs">{provider.category.nameAr}</span>}
                          {provider.isVerified && (
                            <span className="flex items-center gap-1 rounded-full bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs">
                              <ShieldCheck className="h-3 w-3" />{t.verified}
                            </span>
                          )}
                          {provider.availability && (
                            <span className="flex items-center rounded-full bg-[var(--color-success-soft)]0/30 px-2 py-0.5 text-xs">{t.available}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap gap-3">
                      <Button><MessageCircle className="h-4 w-4" />{t.message}</Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {provider.services.map((service) => (
                        <div key={service.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-black text-[color:var(--color-text-primary)]">{service.name}</h3>
                              {service.instantPrice != null && service.currency && (
                                <p className="mt-1 text-sm font-bold text-[color:var(--color-primary)]">{service.instantPrice} {service.currency}</p>
                              )}
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[color:var(--color-text-muted)]">
                              {service.bookingMode === 'both' ? (loc === 'ar' ? 'حجز أو عروض' : 'Book or quote') : service.bookingMode === 'instant' ? (loc === 'ar' ? 'حجز مباشر' : 'Instant') : (loc === 'ar' ? 'طلب عروض' : 'Quotes')}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(service.bookingMode === 'instant' || service.bookingMode === 'both') && service.instantPrice != null && service.currency && (
                              <Link href={`/service-bookings/new?provider=${encodeURIComponent(provider.id)}&category=${encodeURIComponent(service.categoryId)}`} className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-xs font-black text-white">
                                <Calendar className="h-4 w-4" />{loc === 'ar' ? 'احجز الآن' : 'Book now'}
                              </Link>
                            )}
                            {(service.bookingMode === 'quotes' || service.bookingMode === 'both') && (
                              <Link href={`/service-requests/new?category=${encodeURIComponent(service.categoryId)}`} className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-border-strong)] px-4 py-2 text-xs font-black text-[color:var(--color-text-primary)]">
                                {loc === 'ar' ? 'اطلب عروضًا' : 'Request quotes'}
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-6 text-sm">
                      {(() => {
                        const avgRating = provider.rating ? parseFloat(provider.rating) : provider.reviews.length > 0 ? provider.reviews.reduce((s, r) => s + r.rating, 0) / provider.reviews.length : 0;
                        return avgRating > 0 ? (
                          <div className="flex items-center gap-1">
                            <RatingStars value={avgRating} count={provider.ratingCount} locale={loc} />
                            <span className="font-bold text-[color:var(--color-text-primary)]">{avgRating.toFixed(1)} ({provider.ratingCount || provider.reviews.length} {loc === 'ar' ? 'تقييم' : loc === 'tr' ? 'değerlendirme' : 'reviews'})</span>
                          </div>
                        ) : null;
                      })()}
                      {provider.city && <div className="flex items-center gap-1.5 font-bold text-[color:var(--color-text-secondary)]"><MapPin className="h-4 w-4 text-[color:var(--color-primary)]" />{provider.city}{provider.governorate ? `، ${provider.governorate}` : ''}</div>}
                      <div className="flex items-center gap-1.5 font-bold text-[color:var(--color-text-secondary)]"><Briefcase className="h-4 w-4 text-[color:var(--color-primary)]" />{provider.jobsCompleted} {t.jobsDone}</div>
                      {provider.availability && <div className="flex items-center gap-1.5 font-bold text-[var(--color-success)]"><Clock className="h-4 w-4" />{t.ready}</div>}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-[color:var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                  <Tabs items={tabs} activeId={activeTab} onSelect={setActiveTab} ariaLabel={t.title}>
                    <TabPanel id="panel-about" active={activeTab === 'about'}>
                      <div className="space-y-4">
                        {provider.specialties.length > 0 && (
                          <div>
                            <h3 className="mb-2 text-sm font-black text-[color:var(--color-text-primary)]">{t.specialties}</h3>
                            <div className="flex flex-wrap gap-2">
                              {provider.specialties.map((s) => (
                                <span key={s} className="rounded-full bg-[color:var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[color:var(--color-primary)]">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <h3 className="mb-2 text-sm font-black text-[color:var(--color-text-primary)]">{t.about}</h3>
                          <p className="leading-relaxed text-[color:var(--color-text-secondary)]">{provider.bio || t.noBio}</p>
                        </div>
                        {provider.workingHours && Object.keys(provider.workingHours).length > 0 && (
                          <div>
                            <h3 className="mb-2 text-sm font-black text-[color:var(--color-text-primary)]">{t.workHours}</h3>
                            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                              {Object.entries(provider.workingHours).map(([day, hours]) => (
                                <div key={day} className="flex justify-between border-b border-[color:var(--color-border)] pb-1">
                                  <span className="font-bold text-[color:var(--color-text-muted)]">{day}</span>
                                  <span className="font-bold text-[color:var(--color-text-primary)]">{hours}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabPanel>

                    <TabPanel id="panel-portfolio" active={activeTab === 'portfolio'}>
                      {provider.portfolio.length === 0 ? (
                        <p className="py-8 text-center font-bold text-[color:var(--color-text-muted)]">{t.noPortfolio}</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {provider.portfolio.map((item) => (
                            <div key={item.id} className="overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[var(--color-surface)]">
                              {item.image ? (
                                <img src={item.image} alt={item.title} width={400} height={144} loading="lazy" decoding="async" className="h-36 w-full object-cover" />
                              ) : (
                                <div className="grid h-36 w-full place-items-center bg-[color:var(--color-surface-soft)]">
                                  <FolderOpen className="h-10 w-10 text-[color:var(--color-primary)]" />
                                </div>
                              )}
                              <div className="p-3">
                                <h4 className="text-sm font-black text-[color:var(--color-text-primary)]">{item.title}</h4>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                  {item.category && <span className="font-bold text-[color:var(--color-primary)]">{item.category}</span>}
                                  {item.year && <span className="font-bold text-[color:var(--color-text-muted)]">{item.year}</span>}
                                </div>
                                {item.description && <p className="mt-1 line-clamp-2 text-xs font-bold text-[color:var(--color-text-secondary)]">{item.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabPanel>

                    <TabPanel id="panel-reviews" active={activeTab === 'reviews'}>
                      {provider.reviews.length === 0 ? (
                        <p className="py-8 text-center font-bold text-[color:var(--color-text-muted)]">{t.noReviews}</p>
                      ) : (
                        <div className="space-y-4">
                          {provider.reviews.map((review) => (
                            <div key={review.id} className="rounded-2xl border border-[color:var(--color-border)] p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--color-primary-soft)] text-sm font-black text-[color:var(--color-primary)]">
                                    {(review.reviewerName || t.client).slice(0, 1)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[color:var(--color-text-primary)]">{review.reviewerName || t.client}</p>
                                    <RatingStars value={review.rating} locale={loc} />
                                  </div>
                                </div>
                                {review.recommend && (
                                  <span className="flex items-center gap-1 rounded-full bg-[var(--color-success-soft)] px-2 py-1 text-xs font-bold text-[var(--color-success)]">
                                    <ThumbsUp className="h-3 w-3" />{t.recommended}
                                  </span>
                                )}
                              </div>
                              {review.comment && (
                                <p className="mt-2 flex gap-2 text-sm font-bold text-[color:var(--color-text-secondary)]">
                                  <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" />
                                  {review.comment}
                                </p>
                              )}
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[color:var(--color-text-muted)] sm:grid-cols-4">
                                {review.quality != null && <span>{t.quality}: {review.quality}/5</span>}
                                {review.punctuality != null && <span>{t.punctuality}: {review.punctuality}/5</span>}
                                {review.communication != null && <span>{t.communication}: {review.communication}/5</span>}
                                {review.value != null && <span>{t.value}: {review.value}/5</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabPanel>

                    <TabPanel id="panel-contact" active={activeTab === 'contact'}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {provider.phone && (
                          <a href={`tel:${provider.phone}`} className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] p-4 transition hover:bg-[color:var(--color-surface-soft)]">
                            <Phone className="h-5 w-5 text-[color:var(--color-primary)]" />
                            <div>
                              <p className="text-xs font-bold text-[color:var(--color-text-muted)]">{t.phone}</p>
                              <p className="font-medium text-[color:var(--color-text-primary)]" dir="ltr">{provider.phone}</p>
                            </div>
                          </a>
                        )}
                        {provider.email && (
                          <a href={`mailto:${provider.email}`} className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] p-4 transition hover:bg-[color:var(--color-surface-soft)]">
                            <Mail className="h-5 w-5 text-[color:var(--color-primary)]" />
                            <div>
                              <p className="text-xs font-bold text-[color:var(--color-text-muted)]">{t.email}</p>
                              <p className="font-medium text-[color:var(--color-text-primary)]" dir="ltr">{provider.email}</p>
                            </div>
                          </a>
                        )}
                        {provider.website && (
                          <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] p-4 transition hover:bg-[color:var(--color-surface-soft)]">
                            <Globe className="h-5 w-5 text-[color:var(--color-primary)]" />
                            <div>
                              <p className="text-xs font-bold text-[color:var(--color-text-muted)]">{t.website}</p>
                              <p className="font-medium text-[color:var(--color-text-primary)]">{provider.website}</p>
                            </div>
                          </a>
                        )}
                        {!provider.phone && !provider.email && !provider.website && (
                          <p className="font-bold text-[color:var(--color-text-muted)]">{t.noContact}</p>
                        )}
                      </div>
                    </TabPanel>
                  </Tabs>
                </div>
              </>
            )}
          </PageContainer>
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
