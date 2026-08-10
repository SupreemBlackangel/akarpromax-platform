"use client";

import Link from "next/link";

export default function SettingsAdminClient() {
  return (
    <>
      <header className="advertiser-admin-header">
        <div><p>إعدادات النظام</p><h1>الإعدادات</h1></div>
        <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
      </header>

      <section className="admin-panel">
        <div className="admin-panel-title"><div><p>الإعدادات</p><h2>الأقسام المتاحة</h2></div></div>
        <div className="admin-empty"><span>◇</span><strong>لا توجد أقسام إعدادات بعد</strong></div>
      </section>
    </>
  );
}
