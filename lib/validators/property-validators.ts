import { z } from 'zod';
import { ACCEPTED_PROPERTY_CATEGORIES, isAcceptedPropertyType } from '@/lib/taxonomy/property-taxonomy';

export const propertyDealTypeSchema = z.enum(['sale', 'rent']);

// Categories and types come from the one taxonomy the platform and the office
// application share (lib/taxonomy/property-taxonomy.ts). The lists that used to
// be spelled out here accepted sixteen types where the office offered
// twenty-seven; every code they accepted is still accepted, as a legacy alias.
export const propertyCategorySchema = z
  .string()
  .refine((value) => ACCEPTED_PROPERTY_CATEGORIES.includes(value), { message: 'فئة عقارية غير معروفة' });
export const propertyTypeSchema = z
  .string()
  .refine((value) => isAcceptedPropertyType(value), { message: 'نوع عقار غير معروف' });
export const propertyStatusSchema = z.enum([
  'draft', 'pending_review', 'approved', 'rejected', 'sold', 'rented', 'archived'
]);
export const propertyRequestStatusSchema = z.enum([
  'active', 'matched', 'offer_received', 'offer_accepted', 'closed', 'cancelled'
]);
export const propertyOfferStatusSchema = z.enum([
  'pending', 'accepted', 'rejected', 'withdrawn', 'expired'
]);

export const propertyOfferInputSchema = z.object({
  id: z.string().uuid().optional(),
  offerTypeId: z.string().uuid(),
  marketingMethod: z.enum(['direct', 'auction']).default('direct'),
  auctionType: z.enum(['fixed', 'open']).optional(),
  price: z.number().positive(),
  currency: z.string().default('SAR'),
  negotiable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  details: z.record(z.string(), z.any()).optional(),
}).superRefine((offer, ctx) => {
  if (offer.marketingMethod === 'auction' && !offer.auctionType) {
    ctx.addIssue({
      code: 'custom',
      path: ['auctionType'],
      message: 'نوع المزاد مطلوب عند اختيار التسويق بالمزاد',
    });
  }
  if (offer.marketingMethod === 'direct' && offer.auctionType) {
    ctx.addIssue({
      code: 'custom',
      path: ['auctionType'],
      message: 'نوع المزاد غير مسموح مع التسويق المباشر',
    });
  }
});

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
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
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
  offers: z.array(propertyOfferInputSchema).max(11).optional(),
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
  budget: z.number().positive().nullable().optional(),
  area: z.number().positive().nullable().optional(),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  description: z.string().min(10).max(2000),
});

export const createPropertyOfferSchema = z.object({
  propertyId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  message: z.string().min(10).max(2000),
  notes: z.string().max(500).optional(),
});
