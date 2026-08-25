import { z } from 'zod';

export const propertyDealTypeSchema = z.enum(['sale', 'rent', 'both']);
export const propertyCategorySchema = z.enum(['residential', 'commercial', 'industrial', 'land', 'agricultural']);
export const propertyTypeSchema = z.enum([
  'villa', 'apartment', 'townhouse', 'duplex', 'penthouse',
  'shop', 'warehouse', 'office', 'building', 'factory',
  'land', 'farm', 'ranch',
  'hotel', 'resort', 'restaurant'
]);
export const propertyStatusSchema = z.enum([
  'draft', 'pending_review', 'approved', 'rejected', 'sold', 'rented', 'archived'
]);
export const propertyRequestStatusSchema = z.enum([
  'active', 'matched', 'offer_received', 'offer_accepted', 'closed', 'cancelled'
]);
export const propertyOfferStatusSchema = z.enum([
  'pending', 'accepted', 'rejected', 'withdrawn', 'expired'
]);

export const createPropertySchema = z.object({
  titleAr: z.string().min(5).max(200),
  titleEn: z.string().max(200).optional(),
  descriptionAr: z.string().min(20).max(5000),
  descriptionEn: z.string().max(5000).optional(),
  dealType: propertyDealTypeSchema,
  category: propertyCategorySchema,
  propertyType: propertyTypeSchema,
  country: z.string().min(2).max(100),
  governorate: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(500).optional(),
  price: z.number().positive(),
  currency: z.string().default('SAR'),
  area: z.number().positive(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  floor: z.number().int().min(-10).max(100).optional(),
  totalFloors: z.number().int().min(0).max(100).optional(),
  yearBuilt: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  facade: z.string().max(50).optional(),
  direction: z.string().max(50).optional(),
  referenceNumber: z.string().max(50).optional(),
  advertisingLicense: z.string().max(50).optional(),
  officeId: z.string().uuid().optional(),
  media: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'video']),
    altText: z.string().max(200).optional(),
  })).max(20).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertySearchSchema = z.object({
  dealType: propertyDealTypeSchema.optional(),
  category: propertyCategorySchema.optional(),
  propertyType: propertyTypeSchema.optional(),
  country: z.string().optional(),
  governorate: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().positive().optional(),
  minArea: z.number().min(0).optional(),
  maxArea: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  search: z.string().optional(),
  status: propertyStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'price', 'area', 'views']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createPropertyRequestSchema = z.object({
  dealType: propertyDealTypeSchema,
  propertyType: propertyTypeSchema,
  country: z.string().min(2).max(100),
  governorate: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  budget: z.number().positive().optional(),
  area: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  description: z.string().min(10).max(2000),
});

export const createPropertyOfferSchema = z.object({
  propertyId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  message: z.string().min(10).max(2000),
  notes: z.string().max(500).optional(),
});
