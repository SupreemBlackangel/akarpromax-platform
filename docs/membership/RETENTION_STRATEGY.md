# RETENTION STRATEGY

## 1. Core Principle

**REAL VALUE LOOPS, NOT DARK PATTERNS.**

### What We Do NOT Do

- ❌ Fake urgency ("Only 2 hours left!")
- ❌ Fake achievements ("You're 90% there!")
- ❌ Notification spam
- ❌ Manipulative messaging
- ❌ Artificial lock-in

### What We DO

- ✅ Real value delivery
- ✅ Transparent progress
- ✅ Genuine milestones
- ✅ Respectful communication
- ✅ Easy exit (if desired)

## 2. Normal User Retention

### Daily Value

- Saved property changes
- New matching properties
- Replies to service requests
- Radar matches

### Weekly Value

- Property market updates
- Service request responses
- Saved tools/results
- Community activity

### Monthly Value

- Important auction updates
- Useful community replies
- Profile progress
- Verification reminders

### Next Best Actions

```
"لديك 5 استفسارات لم تتم الإجابة عليها"
(You have 5 unanswered inquiries)

"3 عقارات تنتهي خلال 48 ساعة"
(3 properties expire within 48 hours)

"أضف 2 مشاريع لتحسين ملفك"
(Add 2 projects to improve your profile)
```

**REAL DATA ONLY.** No fake recommendations.

## 3. Professional Retention

### Daily Value

- Nearby service opportunities
- Quote responses
- New reviews
- Profile views

### Weekly Value

- Performance progress
- Reputation progress
- Availability reminders
- Market trends

### Monthly Value

- Monthly performance report
- Reputation evaluation
- Level progress
- Achievement updates

### Next Best Actions

```
"أكمل ملفك للحصول على المزيد من الطلبات"
(Complete your profile to get more requests)

"أنت قريب من المستوى التالي"
(You're close to the next level)

"أضف 3 أعمال م finished لتحسين تقييمك"
(Add 3 completed jobs to improve your rating)
```

## 4. Office Retention

### Daily Value

- New leads
- Unread inquiries
- Expiring properties
- Radar matches

### Weekly Value

- Profile views
- Response performance
- Reputation progress
- Office sync health

### Monthly Value

- Monthly performance report
- Reputation evaluation
- Level progress
- Team activity

### Next Best Actions

```
"5 عملاء محتملين لم يتواصلوا معهم"
(5 leads not contacted)

"أكمل ملف المكتب لتحسين ظهورك"
(Complete office profile to improve visibility)
```

## 5. Company Retention

### Daily Value

- Profile views
- Quote requests
- Leads
- Reviews

### Weekly Value

- Service opportunities
- Performance metrics
- Reputation progress
- Team activity

### Monthly Value

- Monthly performance report
- Reputation evaluation
- Level progress
- Market analysis

### Next Best Actions

```
"أضف 5 مشاريع لتحسين ملف الشركة"
(Add 5 projects to improve company profile)

"الرد على 3 تقييمات لتحسين التفاعل"
(Respond to 3 reviews to improve engagement)
```

## 6. Next Best Action Engine

### Concept

Instead of dashboards full of numbers, provide actionable insights:

```
"You have 5 unanswered inquiries."
→ Action: Respond to inquiries

"3 properties expire within 48 hours."
→ Action: Renew or remove properties

"Add 2 projects to improve your profile."
→ Action: Add projects

"You are close to Gold."
→ Action: Complete verification
```

### Rules

- **REAL DATA ONLY**
- **No fake recommendations**
- **Actionable**
- **Timely**
- **Respectful**

### Implementation

```
NextBestAction
├── id
├── entity_type (user, professional, organization)
├── entity_id
├── action_type
├── priority (high, medium, low)
├── title_ar/en
├── description_ar/en
├── link
├── created_at
├── expires_at
├── seen_at
├── completed_at
```

## 7. Weekly Digest

### Concept

Weekly summary via Notification Engine:

```
Weekly Digest
├── Profile views
├── Leads
├── Requests
├── Response performance
├── Rating
├── Reputation
├── Progress
├── 1-2 next actions
```

### Delivery

- Email (if enabled)
- In-app notification
- Office notification (if applicable)

### Rules

- **No spam** (max 1 per week)
- **Real data only**
- **Actionable insights**
- **Easy unsubscribe**

## 8. Notification Preferences

### Channels

| Channel | Default | Opt-out |
|---------|---------|---------|
| Email | Enabled | ✓ |
| In-app | Enabled | ✓ |
| Office | Enabled | ✓ |
| Push (future) | Disabled | ✓ |

### Preferences

```
NotificationPreferences
├── user_id
├── channel (email, in_app, office, push)
├── event_type
├── enabled (boolean)
├── quiet_start (time)
├── quiet_end (time)
```

### Event Types

- Property updates
- Service responses
- Review received
- Reputation changes
- Achievement unlocked
- Weekly digest
- System announcements

## 9. Progress Tracking

### Professional Progress

```
التقدم نحو المستوى التالي
(Progress toward next level)

├── قوة الملف: 75% (Profile Strength: 75%)
├── التحقق: 3/5 (Verification: 3/5)
├── التقييم: 4.2/5 (Rating: 4.2/5)
├── الأعمال المكتملة: 8/10 (Completed Jobs: 8/10)
└── الاستجابة: 90% (Response Rate: 90%)
```

### Rules

- **No fake precision** (no "83.7%")
- **Show clear gaps**
- **Provide improvement suggestions**
- **Celebrate milestones**

## 10. Achievement System

### Achievements (Non-Trust)

Achievements track platform usage, NOT trust:

```
Achievement
├── أول عرض سعر (First Quote)
├── 10 أعمال مكتملة (10 Completed Jobs)
├── تقييم 5 نجوم (5-Star Rating)
├── ملف مكتمل (Complete Profile)
├── أول تقييم (First Review)
└── 30 يوم نشط (30 Days Active)
```

### Rules

- **Achievements ≠ Reputation**
- **Achievements are milestones**
- **Celebrated once**
- **Visible on profile**

## 11. Retention Metrics

### Key Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| DAU/MAU | Daily/Monthly active users | > 30% |
| Retention D7 | Users returning after 7 days | > 40% |
| Retention D30 | Users returning after 30 days | > 25% |
| NPS | Net Promoter Score | > 50 |
| Feature adoption | Users using key features | > 60% |

### What We Measure

- Real engagement
- Value delivery
- User satisfaction
- Feature usage

### What We Do NOT Measure

- Vanity metrics
- Fake engagement
- Manipulated numbers

## 12. Exit Strategy

### Easy Exit

Users can:
- Export their data
- Deactivate account
- Delete account
- Download portfolio

### No Lock-in

- No artificial barriers
- No data hostage
- No guilt trips
- No "Are you sure?" spam

### Win-back

- Respectful re-engagement
- Value proposition reminder
- No manipulation

## 13. Communication Rules

### Do

- ✅ Be transparent
- ✅ Provide real value
- ✅ Respect attention
- ✅ Make unsubscribing easy
- ✅ Use clear language

### Do NOT

- ❌ Create fake urgency
- ❌ Use manipulative language
- ❌ Send spam
- ❌ Hide unsubscribe
- ❌ Use dark patterns
