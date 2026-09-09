import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PROPERTY_CONTACT_METHOD,
  isValidWhatsappNumber,
  normalizeContactMethod,
  normalizeWhatsappNumber,
  whatsappLink,
} from "../../lib/properties/contact-method";
import { createPropertySchema, updatePropertySchema } from "../../lib/validators/property-validators";
import { stepForField } from "../../lib/validation/propertyFieldSteps";

const base = {
  titleAr: "شقة للبيع في حي الروضة",
  descriptionAr: "شقة واسعة بموقع مميز قريبة من الخدمات والمدارس",
  dealType: "sale" as const,
  category: "residential",
  propertyType: "apartment",
  country: "sa",
  governorate: "MAKKAH",
  city: "JEDDAH",
  price: 500000,
  area: 180,
};

test("a listing defaults to the platform chat thread", () => {
  const parsed = createPropertySchema.safeParse(base);
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.contactMethod, DEFAULT_PROPERTY_CONTACT_METHOD);
  assert.equal(DEFAULT_PROPERTY_CONTACT_METHOD, "chat");
});

test("choosing WhatsApp without a dialable number is rejected on create and on update", () => {
  assert.equal(createPropertySchema.safeParse({ ...base, contactMethod: "whatsapp" }).success, false);
  // A local number is not rescued: guessing the country code would route the
  // visitor to a stranger.
  assert.equal(
    createPropertySchema.safeParse({ ...base, contactMethod: "whatsapp", contactWhatsapp: "0501234567" }).success,
    false,
  );
  assert.equal(updatePropertySchema.safeParse({ contactMethod: "whatsapp" }).success, false);
  assert.equal(
    createPropertySchema.safeParse({ ...base, contactMethod: "whatsapp", contactWhatsapp: "+966 50 123 4567" }).success,
    true,
  );
});

test("an unknown or missing stored method reads as chat", () => {
  assert.equal(normalizeContactMethod(null), "chat");
  assert.equal(normalizeContactMethod("sms"), "chat");
  assert.equal(normalizeContactMethod(" WhatsApp "), "whatsapp");
});

test("wa.me numbers drop separators, the plus and the 00 prefix", () => {
  assert.equal(normalizeWhatsappNumber("+966 50-123 4567"), "966501234567");
  assert.equal(normalizeWhatsappNumber("00966501234567"), "966501234567");
  assert.equal(isValidWhatsappNumber("0501234567"), false);
  assert.equal(isValidWhatsappNumber("966501234567"), true);
});

test("a dead number yields no link, so the page never renders one", () => {
  assert.equal(whatsappLink("0501234567"), null);
  assert.equal(whatsappLink(""), null);
  const link = whatsappLink("+966501234567", "مرحباً");
  assert.equal(link?.startsWith("https://wa.me/966501234567?text="), true);
});

test("a contact error opens the offers step, where the field lives", () => {
  assert.equal(stepForField("contactWhatsapp"), 4);
  assert.equal(stepForField("contactMethod"), 4);
});
