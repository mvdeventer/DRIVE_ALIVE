const STORAGE_KEY = 'payment_session_id';

const isGatewayCheckoutId = (value: string): boolean => value.startsWith('cs_');

export function storePaymentSessionId(paymentSessionId: string): void {
  localStorage.setItem(STORAGE_KEY, paymentSessionId);
}

export function clearPaymentSessionId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function resolvePaymentSessionId(
  params?: Record<string, unknown> | null
): string | null {
  const fromParams = params?.payment_session_id ?? params?.session_id;
  if (typeof fromParams === 'string' && fromParams && !isGatewayCheckoutId(fromParams)) {
    return fromParams;
  }

  const query = new URLSearchParams(window.location.search);
  for (const candidate of [query.get('ref'), query.get('session_id')]) {
    if (candidate && !isGatewayCheckoutId(candidate)) return candidate;
  }

  return localStorage.getItem(STORAGE_KEY);
}