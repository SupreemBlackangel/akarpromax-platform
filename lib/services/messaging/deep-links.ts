export function getDeepLink(context: string, contextId: string | null): string | null {
  if (!contextId) return null;

  switch (context) {
    case 'property':
      return `/properties/${contextId}`;
    case 'property_request':
      return `/dashboard/properties/property-requests`;
    case 'service':
      return `/service-requests/${contextId}`;
    case 'service_request':
      return `/service-requests/${contextId}`;
    case 'professional':
      return `/providers/${contextId}`;
    case 'office':
      return `/offices/${contextId}`;
    case 'company':
      return `/companies/${contextId}`;
    case 'organization':
      return `/organizations/${contextId}`;
    default:
      return null;
  }
}

export function getContextLabel(context: string): string {
  const labels: Record<string, string> = {
    property: 'عقار',
    property_request: 'طلب عقار',
    service: 'خدمة',
    service_request: 'طلب خدمة',
    professional: 'مهني',
    office: 'مكتب عقاري',
    company: 'شركة',
    organization: 'منظمة',
    general: 'عام',
  };
  return labels[context] || context;
}

export function getContextIcon(context: string): string {
  const icons: Record<string, string> = {
    property: '🏠',
    property_request: '📋',
    service: '🛠️',
    service_request: '📝',
    professional: '👤',
    office: '🏢',
    company: '🏭',
    organization: '🏛️',
    general: '💬',
  };
  return icons[context] || '💬';
}

export function getContextColor(context: string): string {
  const colors: Record<string, string> = {
    property: 'blue',
    property_request: 'indigo',
    service: 'green',
    service_request: 'emerald',
    professional: 'purple',
    office: 'orange',
    company: 'gray',
    organization: 'teal',
    general: 'gray',
  };
  return colors[context] || 'gray';
}
