'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';

interface SecurityAlertProps {
  type?: 'fraud' | 'payment' | 'auction' | 'service' | 'general';
  dismissible?: boolean;
}

export function SecurityAlert({ type = 'general', dismissible = true }: SecurityAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  const syncDismissed = () => {
    const dismissed = localStorage.getItem('security_alert_dismissed');
    if (dismissed === 'true') setIsVisible(false);
  };
  useEffect(() => {
    (async () => { syncDismissed(); })();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('security_alert_dismissed', 'true');
  };

  if (!isVisible) return null;

  const alerts: Record<string, { icon: React.ReactNode; title: string; message: string; color: string }> = {
    fraud: {
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      title: 'تنبيه احتيال',
      message: 'لا تشارك معلوماتك الشخصية أو المالية مع أي طرف خارج المنصة. ابلغ عن أي نشاط مشبوه فوراً.',
      color: 'bg-red-50 border-red-400 text-red-800',
    },
    payment: {
      icon: <Shield className="w-5 h-5 text-yellow-500" />,
      title: 'تنبيه دفع',
      message: 'جميع المدفوعات تتم خارج المنصة. عقار بروماكس غير مسؤول عن أي تحويلات مالية. تحقق من هوية الطرف الآخر.',
      color: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    },
    auction: {
      icon: <AlertTriangle className="w-5 h-5 text-blue-500" />,
      title: 'تنبيه مزاد',
      message: 'المزاد ملزم للبائع والمشتري. تأكد من قدرتك على الالتزام بالبيع أو الشراء قبل المشاركة.',
      color: 'bg-blue-50 border-blue-400 text-blue-800',
    },
    service: {
      icon: <Shield className="w-5 h-5 text-green-500" />,
      title: 'تنبيه خدمات',
      message: 'تحقق من تقييمات وتوثيق الحرفي قبل التعاقد. المنصة غير مسؤولة عن جودة الخدمات المقدمة.',
      color: 'bg-green-50 border-green-400 text-green-800',
    },
    general: {
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      title: 'تنبيه امان',
      message: 'حافظ على سرية حسابك. استخدم كلمة مرور قوية. للابلاغ عن احتيال: report@akarpromax.com',
      color: 'bg-purple-50 border-purple-400 text-purple-800',
    },
  };

  const alert = alerts[type] || alerts.general;

  return (
    <div className={`rounded-lg border p-4 mb-4 ${alert.color} flex items-start justify-between`}>
      <div className="flex items-start gap-3">
        {alert.icon}
        <div>
          <p className="font-semibold text-sm">{alert.title}</p>
          <p className="text-sm">{alert.message}</p>
        </div>
      </div>
      {dismissible && (
        <button onClick={handleDismiss} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
