"use client";

import type { Locale } from "@/src/types/site";

type SidebarItem = {
  label: string;
  href: string;
  icon?: string;
};

type Props = {
  locale: Locale;
  items: SidebarItem[];
  activeItem?: string;
};

export default function Sidebar({ locale, items, activeItem }: Props) {
  return (
    <aside className="shared-sidebar">
      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${
              activeItem === item.href ? "active" : ""
            }`}
          >
            {item.icon && <span className="sidebar-nav-icon">{item.icon}</span>}
            <span className="sidebar-nav-label">{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
