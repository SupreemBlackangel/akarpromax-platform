import { getDb } from '@/lib/db';
import { properties } from '@/lib/db/schemas/properties-schema';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type PropertyRow = typeof properties.$inferSelect;
type UserRow = typeof users.$inferSelect;

export interface ContractData {
  propertyId: string;
  buyerId?: string;
  sellerId: string;
  offerTypeCode: string;
  price: number;
  currency: string;
  contractType: 'sale' | 'lease' | 'auction';
  terms?: string;
  additionalClauses?: string[];
  metadata?: Record<string, unknown>;
}

export interface GeneratedContract {
  id: string;
  propertyId: string;
  buyerId: string | null;
  sellerId: string;
  contractType: string;
  content: string;
  fileUrl: string;
  createdAt: Date;
}

export class ContractService {
  async generateContract(data: ContractData): Promise<GeneratedContract> {
    const { db, end } = getDb();
    try {
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, data.propertyId))
        .limit(1);

      if (!property) {
        throw new Error('العقار غير موجود');
      }

      const [seller] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.sellerId))
        .limit(1);

      if (!seller) {
        throw new Error('البائع غير موجود');
      }

      let buyer = null;
      if (data.buyerId) {
        const [buyerResult] = await db
          .select()
          .from(users)
          .where(eq(users.id, data.buyerId))
          .limit(1);
        buyer = buyerResult;
      }

      let content = '';
      let filename = '';

      switch (data.contractType) {
        case 'sale':
          content = this.generateSaleContract(property, seller, buyer, data);
          filename = `sale_contract_${property.id}.pdf`;
          break;
        case 'lease':
          content = this.generateLeaseContract(property, seller, buyer, data);
          filename = `lease_contract_${property.id}.pdf`;
          break;
        case 'auction':
          content = this.generateAuctionContract(property, seller, buyer, data);
          filename = `auction_contract_${property.id}.pdf`;
          break;
        default:
          throw new Error('نوع العقد غير مدعوم');
      }

      const contract = {
        id: `contract_${Date.now()}`,
        propertyId: data.propertyId,
        buyerId: data.buyerId || null,
        sellerId: data.sellerId,
        contractType: data.contractType,
        content,
        fileUrl: `/contracts/${filename}`,
        createdAt: new Date(),
      };

      return contract;
    } finally {
      await end();
    }
  }

  private generateSaleContract(property: PropertyRow, seller: UserRow, buyer: UserRow | null, data: ContractData): string {
    const buyerName = buyer ? buyer.name : 'المشتري (غير محدد)';
    const buyerId = buyer ? buyer.id : '__________';

    return `
عقد بيع عقار

--------------------------------------------------

هذا العقد بين كل من:

الطرف الأول (البائع):
الاسم: ${seller.name}
البريد الإلكتروني: ${seller.email}
رقم الهاتف: ${seller.phone || 'غير محدد'}

الطرف الثاني (المشتري):
الاسم: ${buyerName}
البريد الإلكتروني: ${buyer ? buyer.email : 'غير محدد'}
رقم الهاتف: ${buyer && buyer.phone ? buyer.phone : 'غير محدد'}
الهوية: ${buyerId}

--------------------------------------------------

بخصوص العقار التالي:

العنوان: ${property.titleAr}
الوصف: ${property.descriptionAr}
الفئة: ${property.category}
النوع: ${property.propertyType}
الموقع: ${property.city}, ${property.governorate}, ${property.country}
المساحة: ${property.area} م²
السعر: ${data.price.toLocaleString()} ${data.currency}

--------------------------------------------------

الشروط والأحكام:

1. يقر البائع بأنه المالك الشرعي للعقار المذكور أعلاه.
2. يقر المشتري بأنه قد اطلع على العقار ووافق على حالته.
3. يلتزم البائع بنقل ملكية العقار للمشتري فور استلام كامل المبلغ.
4. يلتزم المشتري بدفع المبلغ المتفق عليه خلال المدة المحددة.
${data.additionalClauses ? data.additionalClauses.map((c, i) => `${i + 5}. ${c}`).join('\n') : ''}
${data.terms ? `\nملاحظات إضافية:\n${data.terms}` : ''}

--------------------------------------------------

توقيع البائع: ________________
توقيع المشتري: ________________
التاريخ: ${new Date().toLocaleDateString('ar-SA')}

هذا العقد ملزم للطرفين بموجب أحكام الشريعة والقوانين المرعية.
`;
  }

  private generateLeaseContract(property: PropertyRow, seller: UserRow, buyer: UserRow | null, data: ContractData): string {
    const tenantName = buyer ? buyer.name : 'المستأجر (غير محدد)';
    const tenantId = buyer ? buyer.id : '__________';

    return `
عقد إيجار عقار

--------------------------------------------------

هذا العقد بين كل من:

الطرف الأول (المؤجر):
الاسم: ${seller.name}
البريد الإلكتروني: ${seller.email}
رقم الهاتف: ${seller.phone || 'غير محدد'}

الطرف الثاني (المستأجر):
الاسم: ${tenantName}
البريد الإلكتروني: ${buyer ? buyer.email : 'غير محدد'}
رقم الهاتف: ${buyer && buyer.phone ? buyer.phone : 'غير محدد'}
الهوية: ${tenantId}

--------------------------------------------------

بخصوص العقار التالي:

العنوان: ${property.titleAr}
الوصف: ${property.descriptionAr}
الفئة: ${property.category}
النوع: ${property.propertyType}
الموقع: ${property.city}, ${property.governorate}, ${property.country}
المساحة: ${property.area} م²
الإيجار الشهري: ${data.price.toLocaleString()} ${data.currency}

--------------------------------------------------

الشروط والأحكام:

1. يقر المؤجر بأنه المالك الشرعي للعقار المذكور أعلاه.
2. يقر المستأجر بأنه قد اطلع على العقار ووافق على حالته.
3. مدة الإيجار: (يحدد لاحقاً) شهراً.
4. يلتزم المستأجر بدفع الإيجار في أول كل شهر.
5. يلتزم المؤجر بصيانة العقار والحفاظ على صلاحيته للسكن.
${data.additionalClauses ? data.additionalClauses.map((c, i) => `${i + 6}. ${c}`).join('\n') : ''}
${data.terms ? `\nملاحظات إضافية:\n${data.terms}` : ''}

--------------------------------------------------

توقيع المؤجر: ________________
توقيع المستأجر: ________________
التاريخ: ${new Date().toLocaleDateString('ar-SA')}

هذا العقد ملزم للطرفين بموجب أحكام الشريعة والقوانين المرعية.
`;
  }

  private generateAuctionContract(property: PropertyRow, seller: UserRow, buyer: UserRow | null, data: ContractData): string {
    const winnerName = buyer ? buyer.name : 'الفائز (غير محدد)';
    const winnerId = buyer ? buyer.id : '__________';

    return `
عقد بيع بالمزاد العلني

--------------------------------------------------

هذا العقد بين كل من:

الطرف الأول (البائع):
الاسم: ${seller.name}
البريد الإلكتروني: ${seller.email}
رقم الهاتف: ${seller.phone || 'غير محدد'}

الطرف الثاني (الفائز بالمزاد):
الاسم: ${winnerName}
البريد الإلكتروني: ${buyer ? buyer.email : 'غير محدد'}
رقم الهاتف: ${buyer && buyer.phone ? buyer.phone : 'غير محدد'}
الهوية: ${winnerId}

--------------------------------------------------

بخصوص العقار التالي الذي تم طرحه في مزاد علني:

العنوان: ${property.titleAr}
الوصف: ${property.descriptionAr}
الفئة: ${property.category}
النوع: ${property.propertyType}
الموقع: ${property.city}, ${property.governorate}, ${property.country}
المساحة: ${property.area} م²
سعر البيع النهائي (أعلى مزايدة): ${data.price.toLocaleString()} ${data.currency}

--------------------------------------------------

الشروط والأحكام:

1. يقر البائع بأنه المالك الشرعي للعقار المذكور أعلاه.
2. يقر الفائز بأنه قد اطلع على العقار ووافق على حالته.
3. تم طرح العقار في مزاد علني وفقاً للشروط المعلنة.
4. يلتزم البائع بنقل ملكية العقار للفائز فور استلام كامل المبلغ.
5. يلتزم الفائز بدفع المبلغ المتفق عليه خلال المدة المحددة في المزاد.
${data.additionalClauses ? data.additionalClauses.map((c, i) => `${i + 6}. ${c}`).join('\n') : ''}
${data.terms ? `\nملاحظات إضافية:\n${data.terms}` : ''}

--------------------------------------------------

توقيع البائع: ________________
توقيع الفائز: ________________
التاريخ: ${new Date().toLocaleDateString('ar-SA')}

هذا العقد ملزم للطرفين بموجب أحكام الشريعة والقوانين المرعية.
`;
  }
}
