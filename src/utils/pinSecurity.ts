const STORAGE_PIN_KEY = 'finanzo_security_pin';
const STORAGE_PIN_ENABLED_KEY = 'finanzo_pin_enabled';

export interface PinStatus {
  hasPin: boolean;
  isEnabled: boolean;
}

export function getPinStatus(): PinStatus {
  if (typeof window === 'undefined') {
    return { hasPin: false, isEnabled: false };
  }
  const pin = localStorage.getItem(STORAGE_PIN_KEY);
  const enabled = localStorage.getItem(STORAGE_PIN_ENABLED_KEY) === 'true';
  const hasPin = Boolean(pin && /^\d{4}$/.test(pin));
  return {
    hasPin,
    isEnabled: enabled && hasPin,
  };
}

export function savePin(pin: string): void {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('A senha deve conter exatamente 4 dígitos numéricos.');
  }
  localStorage.setItem(STORAGE_PIN_KEY, pin);
  localStorage.setItem(STORAGE_PIN_ENABLED_KEY, 'true');
}

export function verifyPin(inputPin: string): boolean {
  if (typeof window === 'undefined') return true;
  const currentPin = localStorage.getItem(STORAGE_PIN_KEY);
  if (!currentPin) return true;
  return currentPin === inputPin;
}

export function removePin(): void {
  localStorage.removeItem(STORAGE_PIN_KEY);
  localStorage.setItem(STORAGE_PIN_ENABLED_KEY, 'false');
}

export function togglePinEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_PIN_ENABLED_KEY, enabled ? 'true' : 'false');
}
