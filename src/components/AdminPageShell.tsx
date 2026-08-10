"use client";

import type { Locale, ViewerContext } from "@/src/types/site";
import type { Translation } from "@/src/types/site";
import Header from "@/src/components/shared/Header";
import Sidebar from "@/src/components/shared/Sidebar";

type Props = {
  locale: Locale;
  copy: Translation;
  viewer: ViewerContext;
  activeSection?: string;
  onLogin: () => void;
  onLogout: () => void;
  children: React.ReactNode;
};

const adminSidebarItems = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Properties", href: "/admin/properties", icon: "🏢" },
  { label: "Services", href: "/admin/services", icon: "🔧" },
  { label: "News", href: "/admin/news", icon: "📰" },
  { label: "Advertisers", href: "/admin/advertisers", icon: "🤝" },
  { label: "Ads", href: "/admin/ads", icon: "📢" },
  { label: "Settings", href: "/admin/settings", icon: "⚙️" },
];

export default function AdminPageShell({
  locale,
  copy,
  viewer,
  activeSection,
  onLogin,
  onLogout,
  children,
}: Props) {
  return (
    <div className="admin-page-shell">
      <Header
        locale={locale}
        copy={copy}
        viewer={viewer}
        onLogin={onLogin}
        onLogout={onLogout}
      />
      <div className="admin-layout">
        <Sidebar
          locale={locale}
          items={adminSidebarItems}
          activeItem={activeSection}
        />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
