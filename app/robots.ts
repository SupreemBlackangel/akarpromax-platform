import type { MetadataRoute } from "next";

/**
 * Crawl policy: public discovery surfaces are indexable; account, admin,
 * API and messaging surfaces are not. Served at /robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/dashboard",
          "/messages",
          "/onboarding",
          "/login",
          "/register",
          "/reset-password",
          "/forgot-password",
          "/verify-email",
          "/verify-otp",
        ],
      },
    ],
    sitemap: "https://akarpromax.com/sitemap.xml",
  };
}
