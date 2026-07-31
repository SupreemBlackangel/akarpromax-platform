export type SponsorStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "approved"
  | "active"
  | "suspended"
  | "expired"
  | "rejected"
  | "archived";

export type SponsorPlan = "free" | "basic" | "professional" | "enterprise" | "custom";

export type SponsorProfile = {
  id: string;
  sponsorCode: string;
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
  status: SponsorStatus;
  verifiedAt: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorUser = {
  id: string;
  sponsorId: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  role: string;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SponsorBranch = {
  id: string;
  sponsorId: string;
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

export type SponsorPlanType = {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxBranches: number;
  maxUsers: number;
  maxProperties: number;
  maxAds: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
};

export type SponsorSubscription = {
  id: string;
  sponsorId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled" | "trial";
  autoRenew: boolean;
  paymentMethod: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorContract = {
  id: string;
  sponsorId: string;
  contractNumber: string;
  titleAr: string;
  titleEn: string;
  fileUrl: string | null;
  signedAt: string | null;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  status: "draft" | "sent" | "signed" | "active" | "expired" | "cancelled";
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorDocument = {
  id: string;
  sponsorId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  notes: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

export type SponsorPayment = {
  id: string;
  sponsorId: string;
  subscriptionId: string | null;
  invoiceId: string | null;
  amount: number;
  currency: string;
  method: string;
  referenceNumber: string | null;
  status: "pending" | "completed" | "failed" | "refunded";
  paidAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type SponsorInvoice = {
  id: string;
  sponsorId: string;
  invoiceNumber: string;
  subscriptionId: string | null;
  contractId: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  paidAt: string | null;
  fileUrl: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorActivityLog = {
  id: string;
  sponsorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdBy: string | null;
  createdAt: string;
};
