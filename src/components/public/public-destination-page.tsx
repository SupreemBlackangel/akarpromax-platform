"use client";

import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@services-ui/useServicesPage";
import PageContainer from "@/src/components/layout/PageContainer";
import Grid from "@/src/components/layout/Grid";
import { PUBLIC_DESTINATIONS, type PublicDestinationKey } from "@/src/content/public-destinations";

export default function PublicDestinationPage({ destination }: { destination: PublicDestinationKey }) {
  const { locale, viewer, dir, country, city, openLogin, handleLogout, AccountDialog, copy } = useServicesPage();
  const page = PUBLIC_DESTINATIONS[destination];

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath={page.currentPath}
      adLayout={page.adLayout}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
      pageHeader={{
        eyebrow: page.eyebrow[locale],
        title: page.title[locale],
        description: page.description[locale],
      }}
    >
      <PageContainer className="py-8" dir={dir}>
        <div className="space-y-8">
          {page.sections.map((section) => (
            <section key={section.title.en} className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{section.title[locale]}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">{section.description[locale]}</p>
              {section.cards && section.cards.length > 0 && (
                <Grid columns={3} className="mt-6">
                  {section.cards.map((card) => {
                    const external = card.href.startsWith("mailto:") || card.href.startsWith("http");
                    const LinkTag = external ? "a" : Link;
                    const linkProps = external ? { href: card.href, target: card.href.startsWith("http") ? "_blank" : undefined, rel: card.href.startsWith("http") ? "noopener noreferrer" : undefined } : { href: card.href };
                    return (
                      <div key={`${destination}-${card.href}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">{card.title[locale]}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{card.description[locale]}</p>
                        <LinkTag {...linkProps} className="mt-4 inline-flex items-center rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)]">
                          {card.linkLabel[locale]}
                        </LinkTag>
                      </div>
                    );
                  })}
                </Grid>
              )}
            </section>
          ))}
        </div>
      </PageContainer>
      {AccountDialog}
    </PublicPageShell>
  );
}
