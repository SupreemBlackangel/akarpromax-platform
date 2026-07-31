INSERT INTO roles (id, name_ar, name_en, permissions, created_at) VALUES
  ('admin', 'مدير', 'Admin', '["*"]', NOW()),
  ('member', 'عضو', 'Member', '["property.create","property.edit","property.delete","ad.view"]', NOW()),
  ('editor', 'محرر', 'Editor', '["content.edit","ad.manage","sponsor.manage"]', NOW());

INSERT INTO sponsor_plans (id, name_ar, name_en, code, price_monthly, price_yearly, currency, max_branches, max_users, max_properties, max_ads, features, is_active, sort_order, created_at) VALUES
  ('plan-free', 'مجاني', 'Free', 'free', 0, 0, 'OMR', 1, 1, 3, 0, '["إعلان واحد","رعاية بسيطة","دعم عبر البريد"]', 1, 0, NOW()),
  ('plan-basic', 'أساسي', 'Basic', 'basic', 99, 999, 'OMR', 3, 5, 20, 5, '["5 إعلانات","رعاية متوسطة","3 فروع","دعم فني","تقارير أساسية"]', 1, 1, NOW()),
  ('plan-professional', 'احترافي', 'Professional', 'professional', 299, 2999, 'OMR', 10, 20, 100, 20, '["20 إعلان","رعاية متقدمة","10 فروع","دعم فني","تقارير متقدمة","API مخصص"]', 1, 2, NOW()),
  ('plan-enterprise', 'مؤسسي', 'Enterprise', 'enterprise', 999, 9999, 'OMR', 999, 999, 9999, 999, '["إعلانات غير محدودة","رعاية حصرية","فروع غير محدودة","دعم فني مخصص","تقارير شاملة","API كامل","مدير حساب مخصص"]', 1, 3, NOW());
