# REGISTRATION FLOWS

## 1. Normal User Registration

### Flow

```
1. User visits /register
2. Enters: email OR phone + password + name (optional)
3. System validates input
4. System creates user:
   - role: "user" (forced)
   - status: "pending_verification"
   - isActive: true
5. System sends email verification token
6. User sees: "Check your email"
7. User clicks verification link
8. System activates account:
   - status: "active"
   - email_verified_at: now
9. User redirected to /onboarding
10. Onboarding completes
11. User is NORMAL_USER
```

### Database

```typescript
// users table
{
  id: uuid,
  email: "user@example.com",
  name: "Ahmed",
  passwordHash: "bcrypt...",
  role: "user",
  status: "pending_verification",
  isActive: true,
  preferredLanguage: "ar",
  createdAt: now
}

// verification_challenges table
{
  id: uuid,
  userId: "user-uuid",
  purpose: "signup",
  channel: "email",
  destination: "user@example.com",
  tokenHash: "sha256...",
  expiresAt: now + 24h
}
```

### States

```
PENDING_VERIFICATION → ACTIVE
```

## 2. Professional Upgrade

### Pre-conditions

- User must be ACTIVE
- User must have verified email
- User must not already have ProfessionalProfile

### Flow

```
1. User clicks "أصبح مهني" (Become Professional)
2. System checks eligibility
3. Professional Upgrade Wizard starts:
   Step 1: Activity Type
     - Individual professional
     - Business owner
   Step 2: Specializations
     - Select categories
     - Select specializations
   Step 3: Service Areas
     - Country, city, district
     - Service radius
   Step 4: Professional Bio
     - Bio (ar/en)
     - Experience
   Step 5: Portfolio
     - Add portfolio items
     - Upload images
   Step 6: Experience/Certificates
     - Years of experience
     - Certificates
     - Upload documents
   Step 7: Verification Data
     - Phone verification
     - Identity document upload
     - License upload (optional)
   Step 8: Review & Submit
     - Review all information
     - Submit for approval
4. System creates ProfessionalProfile:
   - status: "draft" → "submitted"
5. System creates VerificationRecords:
   - email: "verified" (if already verified)
   - phone: "pending" (if not verified)
   - identity: "pending"
6. System creates ReputationProfile:
   - level: "new"
   - score: 0
7. System creates ActivityState:
   - state: "active"
8. System creates ProfileStrength:
   - score: computed from completed fields
9. User sees: "تم إرسال طلبك"
10. Admin reviews application
11. Admin approves → status: "approved"
12. User becomes PROFESSIONAL
```

### Database

```typescript
// service_provider_profiles table
{
  id: uuid,
  userId: "user-uuid",
  displayNameAr: "أحمد",
  displayNameEn: "Ahmed",
  bioAr: "...",
  bioEn: "...",
  countryCode: "OM",
  cityId: "muscat",
  status: "submitted",
  createdAt: now
}

// verification_records table
{
  id: uuid,
  entityType: "professional",
  entityId: "provider-uuid",
  type: "email",
  status: "verified",
  verifiedAt: now
},
{
  id: uuid,
  entityType: "professional",
  entityId: "provider-uuid",
  type: "identity",
  status: "pending"
}

// reputation_profiles table
{
  id: uuid,
  entityType: "professional",
  entityId: "provider-uuid",
  level: "new",
  score: 0,
  lastEvaluatedAt: now
}

// activity_states table
{
  id: uuid,
  entityType: "professional",
  entityId: "provider-uuid",
  state: "active",
  lastMeaningfulActionAt: now
}

// profile_strength table
{
  id: uuid,
  entityType: "professional",
  entityId: "provider-uuid",
  score: 45,
  completedFields: ["bio", "location"],
  missingFields: ["portfolio", "certificates"]
}
```

### States

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED
```

## 3. Real Estate Organization Creation

### Pre-conditions

- User must be ACTIVE
- User must have verified email

### Flow

```
1. User clicks "إنشاء مكتب عقاري" (Create Real Estate Office)
2. Organization Wizard starts:
   Step 1: Organization Type
     - Real Estate
   Step 2: Basic Info
     - Trade name (ar/en)
     - Country: Oman
     - City: Muscat
   Step 3: Registration Data
     - Commercial registration number
     - Tax number
     - Registration date
   Step 4: Licenses
     - License type
     - License number
     - Expiry date
     - Document upload
   Step 5: Address/Location
     - Full address
     - Latitude/longitude
     - Map picker
   Step 6: Branches
     - Add branches (optional)
     - Branch details
   Step 7: Specializations/Services
     - Property types
     - Service areas
   Step 8: Branding
     - Logo upload
     - Cover image upload
     - Description
   Step 9: Contact
     - Contact person
     - Email
     - Phone
     - WhatsApp
   Step 10: Verification Documents
     - Upload verification documents
     - Declaration
   Step 11: Review & Submit
     - Review all information
     - Submit for approval
3. System creates Organization:
   - type: "real_estate"
   - status: "pending_review"
4. System creates OrganizationMembership:
   - role: "owner"
5. System creates VerificationRecords:
   - email: "verified"
   - organization: "pending"
   - license: "pending"
6. System creates ReputationProfile:
   - level: "new"
7. System creates ActivityState:
   - state: "active"
8. System creates ProfileStrength:
   - score: computed
9. User sees: "تم إرسال طلب المنشأة"
10. Admin reviews application
11. Admin approves → status: "active"
12. Organization becomes active
```

### Database

```typescript
// organizations table
{
  id: uuid,
  nameAr: "مكتب العقارات",
  nameEn: "Real Estate Office",
  slug: "real-estate-office",
  type: "real_estate",
  classification: "startup",
  countryCode: "OM",
  cityId: "muscat",
  status: "pending_review",
  createdAt: now
}

// organization_members table
{
  id: uuid,
  organizationId: "org-uuid",
  userId: "user-uuid",
  role: "owner",
  status: "active",
  joinedAt: now
}

// verification_records table
{
  id: uuid,
  entityType: "organization",
  entityId: "org-uuid",
  type: "email",
  status: "verified"
},
{
  id: uuid,
  entityType: "organization",
  entityId: "org-uuid",
  type: "organization",
  status: "pending"
},
{
  id: uuid,
  entityType: "organization",
  entityId: "org-uuid",
  type: "license",
  status: "pending"
}
```

### States

```
PENDING_REVIEW → ACTIVE / SUSPENDED / DELETED
```

## 4. Business Organization Creation

### Pre-conditions

- User must be ACTIVE
- User must have verified email

### Flow

```
1. User clicks "إنشاء شركة" (Create Company)
2. Organization Wizard starts:
   Step 1: Organization Type
     - Business
   Step 2: Basic Info
     - Company name (ar/en)
     - Country
     - City
   Step 3: Registration Data
     - Commercial registration
     - Tax number
   Step 4: Licenses
     - License type
     - License number
     - Document upload
   Step 5: Address/Location
     - Full address
     - Map picker
   Step 6: Branches
     - Add branches (optional)
   Step 7: Specializations/Services
     - Categories
     - Services offered
   Step 8: Branding
     - Logo upload
     - Cover image upload
     - Description
   Step 9: Contact
     - Contact person
     - Email
     - Phone
   Step 10: Verification Documents
     - Upload verification documents
   Step 11: Review & Submit
3. System creates Organization:
   - type: "business"
   - status: "pending_review"
4. (Same as Real Estate from here)
```

## 5. Progressive Onboarding

### Concept

Onboarding is NOT a one-time event. It's progressive:

```
Day 1: Basic profile
Day 7: Add portfolio
Day 30: Complete verification
Day 90: Build reputation
```

### Onboarding Checklist

```
☐ إكمال الملف الشخصي (Complete profile)
☐ التحقق من البريد (Verify email)
☐ التحقق من الهاتف (Verify phone)
☐ إضافة صورة شخصية (Add photo)
☐ إضافة أعمال (Add portfolio)
☐ الحصول على أول تقييم (Get first review)
```

### Progress Tracking

```typescript
OnboardingProgress = {
  userId: uuid
  completedSteps: ["email", "profile", "photo"]
  missingSteps: ["portfolio", "verification", "review"]
  lastReminderAt: timestamp
  nextReminderAt: timestamp
}
```

## 6. Eligibility Checks

### Professional Upgrade Eligibility

```typescript
function canUpgradeToProfessional(user: User): boolean {
  return (
    user.status === "active" &&
    user.emailVerifiedAt !== null &&
    !hasProfessionalProfile(user.id)
  );
}
```

### Organization Creation Eligibility

```typescript
function canCreateOrganization(user: User): boolean {
  return (
    user.status === "active" &&
    user.emailVerifiedAt !== null
  );
}
```

### Multi-Organization Eligibility

```typescript
function canCreateAnotherOrganization(user: User): boolean {
  const membershipCount = getMembershipCount(user.id);
  return membershipCount < MAX_ORGANIZATIONS_PER_USER; // default: 5
}
```

## 7. Error Handling

### Validation Errors

```typescript
{
  error: "VALIDATION_ERROR",
  details: {
    email: "Email already exists",
    phone: "Phone number is invalid"
  }
}
```

### Eligibility Errors

```typescript
{
  error: "NOT_ELIGIBLE",
  reason: "Email verification required"
}
```

### Duplicate Errors

```typescript
{
  error: "ALREADY_EXISTS",
  message: "Professional profile already exists"
}
```

## 8. Rollback

### Registration Rollback

If registration fails:
1. Delete created user
2. Delete verification challenge
3. Return error

### Upgrade Rollback

If upgrade fails:
1. Delete created ProfessionalProfile
2. Delete created VerificationRecords
3. Delete created ReputationProfile
4. Delete created ActivityState
5. Delete created ProfileStrength
6. Return error

### Organization Rollback

If organization creation fails:
1. Delete created Organization
2. Delete created OrganizationMembership
3. Delete created VerificationRecords
4. Delete created ReputationProfile
5. Delete created ActivityState
6. Delete created ProfileStrength
7. Return error
