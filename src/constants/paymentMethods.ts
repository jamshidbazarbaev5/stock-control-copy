import {
  Wallet,
  CreditCard,
  SmartphoneNfc,
  Landmark,
  DollarSign,
  ShoppingBag,
  Banknote,
  type LucideIcon,
} from 'lucide-react';

// ── Payment method string constants ──────────────────────────────────
export const PAYMENT_METHODS = {
  CASH: 'Наличные',
  CARD: 'Карта',
  CLICK: 'Click',
  TRANSFER: 'Перечисление',
  CURRENCY: 'Валюта',
  UZUM_NASIYA: 'Uzum nasiya',
  PAYME: 'Payme',
} as const;

// ── Union type derived from constants ────────────────────────────────
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

// ── Options arrays for forms / selects ───────────────────────────────
/** All payment methods including Валюта */
export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.CARD,
  PAYMENT_METHODS.CLICK,
  PAYMENT_METHODS.TRANSFER,
  PAYMENT_METHODS.CURRENCY,
  PAYMENT_METHODS.UZUM_NASIYA,
  PAYMENT_METHODS.PAYME,
];

/** Basic payment methods (without Валюта) — for most forms */
export const BASIC_PAYMENT_METHODS: PaymentMethod[] = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.CARD,
  PAYMENT_METHODS.CLICK,
  PAYMENT_METHODS.TRANSFER,
  PAYMENT_METHODS.UZUM_NASIYA,
  PAYMENT_METHODS.PAYME,
];

// ── Icon configuration ───────────────────────────────────────────────
export interface PaymentIconConfig {
  icon: LucideIcon;
  colorClass: string;
}

export const PAYMENT_ICON_MAP: Record<PaymentMethod, PaymentIconConfig> = {
  [PAYMENT_METHODS.CASH]: { icon: Wallet, colorClass: 'text-green-600' },
  [PAYMENT_METHODS.CARD]: { icon: CreditCard, colorClass: 'text-blue-600' },
  [PAYMENT_METHODS.CLICK]: { icon: SmartphoneNfc, colorClass: 'text-purple-600' },
  [PAYMENT_METHODS.TRANSFER]: { icon: Landmark, colorClass: 'text-orange-500' },
  [PAYMENT_METHODS.CURRENCY]: { icon: DollarSign, colorClass: 'text-yellow-600' },
  [PAYMENT_METHODS.UZUM_NASIYA]: { icon: ShoppingBag, colorClass: 'text-pink-600' },
  [PAYMENT_METHODS.PAYME]: { icon: Banknote, colorClass: 'text-cyan-600' },
};

// ── Badge / color configuration ──────────────────────────────────────
export const PAYMENT_COLOR_MAP: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.CASH]: 'bg-green-100 text-green-800 border-green-200',
  [PAYMENT_METHODS.CARD]: 'bg-blue-100 text-blue-800 border-blue-200',
  [PAYMENT_METHODS.CLICK]: 'bg-purple-100 text-purple-800 border-purple-200',
  [PAYMENT_METHODS.TRANSFER]: 'bg-orange-100 text-orange-800 border-orange-200',
  [PAYMENT_METHODS.CURRENCY]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [PAYMENT_METHODS.UZUM_NASIYA]: 'bg-pink-100 text-pink-800 border-pink-200',
  [PAYMENT_METHODS.PAYME]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

// ── Helpers ──────────────────────────────────────────────────────────
export function isCurrencyMethod(method: string): boolean {
  return method === PAYMENT_METHODS.CURRENCY;
}

export function getPaymentIcon(method: string): PaymentIconConfig {
  return (
    PAYMENT_ICON_MAP[method as PaymentMethod] ?? {
      icon: DollarSign,
      colorClass: 'text-gray-500',
    }
  );
}

export function getPaymentColor(method: string): string {
  return (
    PAYMENT_COLOR_MAP[method as PaymentMethod] ??
    'bg-gray-100 text-gray-800 border-gray-200'
  );
}

// ── Translation keys ─────────────────────────────────────────────────
export const PAYMENT_TRANSLATION_KEYS: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.CASH]: 'payment_types.cash',
  [PAYMENT_METHODS.CARD]: 'payment_types.card',
  [PAYMENT_METHODS.CLICK]: 'payment_types.click',
  [PAYMENT_METHODS.TRANSFER]: 'payment_types.transfer',
  [PAYMENT_METHODS.CURRENCY]: 'payment_types.currency',
  [PAYMENT_METHODS.UZUM_NASIYA]: 'payment_types.uzum_nasiya',
  [PAYMENT_METHODS.PAYME]: 'payment_types.payme',
};
