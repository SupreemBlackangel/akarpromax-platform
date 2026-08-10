export type AdvertiserStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "approved"
  | "active"
  | "suspended"
  | "expired"
  | "rejected"
  | "archived";

export type AdvertiserProfile = {
  id: string;
  advertiserCode: string;
  companyNameAr: string;
  companyNameEn: string;
  logoUrl: string | null;
  coverUrl: string | null;
  commercialRegistration: string | null;
  taxNumber: string | null;
  countryCode: string;
  cityId: string | null;
  districtId: string | null;
  governorate: string | null;
  village: string | null;
  street: string | null;
  addressAr: string | null;
  addressEn: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: AdvertiserStatus;
  verifiedAt: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdvertiserUser = {
  id: string;
  advertiserId: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  role: string;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AdvertiserBranch = {
  id: string;
  advertiserId: string;
  nameAr: string;
  nameEn: string;
  countryCode: string;
  cityId: string;
  districtId: string | null;
  governorate: string | null;
  village: string | null;
  street: string | null;
  addressAr: string | null;
  addressEn: string | null;
  phone: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};
