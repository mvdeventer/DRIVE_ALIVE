const isGatewayCheckoutId = (value: string): boolean => value.startsWith('cs_');

export function storePaymentSessionId(_paymentSessionId: string): void {}

export function clearPaymentSessionId(): void {}

export function resolvePaymentSessionId(
  params?: Record<string, unknown> | null
): string | null {
  const fromParams = params?.payment_session_id ?? params?.session_id;
  return typeof fromParams === 'string' && fromParams && !isGatewayCheckoutId(fromParams)
    ? fromParams
    : null;
}