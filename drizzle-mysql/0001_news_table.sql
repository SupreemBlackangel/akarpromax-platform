CREATE TABLE `news` (
	`id` varchar(36) NOT NULL,
	`scope` varchar(16) NOT NULL DEFAULT 'global',
	`country_code` varchar(2),
	`city_id` varchar(100),
	`title_ar` varchar(255) NOT NULL,
	`title_en` varchar(255) NOT NULL,
	`title_tr` varchar(255) NOT NULL,
	`link_url` varchar(1024),
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`priority` int NOT NULL DEFAULT 100,
	`start_at` timestamp,
	`end_at` timestamp,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `news_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_scope_country_idx` INDEX(`status`,`scope`,`country_code`)
);
--> statement-breakpoint
INSERT INTO `news` (`id`, `scope`, `country_code`, `city_id`, `title_ar`, `title_en`, `title_tr`, `link_url`, `status`, `priority`) VALUES
  (UUID(), 'global', NULL, NULL, 'منصة عقار بروماكس تستعد لإطلاق تجربة عقارية أوضح في عُمان', 'AkarPromax is preparing a clearer real estate experience in Oman', 'AkarPromax, Umman''da daha anlaşılır bir gayrimenkul deneyimi hazırlıyor', NULL, 'active', 100),
  (UUID(), 'global', NULL, NULL, 'تحديثات السوق والخدمات العقارية أولًا بأول', 'Market and property-service updates, one step at a time', 'Pazar ve gayrimenkul hizmeti güncellemeleri anında', NULL, 'active', 200),
  (UUID(), 'global', NULL, NULL, 'تطبيق AkarPromax Office متصل بالمنصة', 'AkarPromax Office is connected to the platform', 'AkarPromax Office platforma bağlı', NULL, 'active', 300),
  (UUID(), 'country', 'om', NULL, 'سوق مسقط العقاري يشهد إقبالًا متزايدًا على الوحدات السكنية الحديثة', 'Muscat''s property market sees rising demand for modern residential units', 'Maskat gayrimenkul piyasasında modern konutlara talep artıyor', NULL, 'active', 100),
  (UUID(), 'country', 'sa', NULL, 'السعودية تطلق مبادرات جديدة لتطوير القطاع العقاري', 'Saudi Arabia launches new initiatives to develop the real estate sector', 'Suudi Arabistan gayrimenkul sektörünü geliştirmek için yeni girişimler başlattı', NULL, 'active', 100),
  (UUID(), 'city', 'om', 'om-muscat', 'مسقط: إطلاق مشروع تطوير ضواحي العاصمة الجديدة', 'Muscat: new capital suburbs development project launched', 'Maskat: yeni başkent banliyö geliştirme projesi başlatıldı', NULL, 'active', 100),
  (UUID(), 'city', 'ae', 'ae-dubai', 'دبي: طلب قوي على العقارات الفاخرة خلال الربع الجاري', 'Dubai: strong demand for luxury properties this quarter', 'Dubai: bu çeyrekte lüks gayrimenkullere güçlü talep', NULL, 'active', 100);
