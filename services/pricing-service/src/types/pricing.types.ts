import { SupportedCurrency } from '@eliteepay/shared';

export interface PriceConfig {
  id: string;
  key: string;
  name: string;
  description?: string | undefined;
  currency: SupportedCurrency;
  amountMinor: number; // In minor units (kobo, cents)
  isActive: boolean;
  validFrom?: string | undefined;
  validTo?: string | undefined;
  metadata?: Record<string, any> | undefined;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreatePriceRequest {
  key: string;
  name: string;
  description?: string;
  currency: SupportedCurrency;
  amount: number; // In major units (naira, dollars)
  isActive?: boolean;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePriceRequest {
  name?: string;
  description?: string;
  amount?: number; // In major units
  isActive?: boolean;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, any>;
}

export interface PriceQuery {
  page?: number;
  limit?: number;
  currency?: SupportedCurrency;
  isActive?: boolean;
  key?: string;
  validAt?: string; // ISO date string
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PriceHistory {
  id: string;
  priceId: string;
  key: string;
  amountMinor: number;
  currency: SupportedCurrency;
  changedAt: string;
  changedBy: string;
  changeReason?: string;
  previousAmountMinor?: number;
}

export interface CurrencyRate {
  id: string;
  baseCurrency: SupportedCurrency;
  quoteCurrency: SupportedCurrency;
  rate: number;
  fetchedAt: string;
  source: string; // 'fixer', 'exchangerate-api', 'manual'
  isActive: boolean;
}

export interface CurrencyRateQuery {
  baseCurrency?: SupportedCurrency;
  quoteCurrency?: SupportedCurrency;
  source?: string;
  isActive?: boolean;
}

export interface ExchangeRateResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface PriceSnapshot {
  priceKey: string;
  amountMinor: number;
  currency: SupportedCurrency;
  snapshotAt: string;
  transactionId?: string;
}

export interface PricingServiceStats {
  totalPrices: number;
  activePrices: number;
  currenciesSupported: number;
  lastPriceUpdate: string;
  lastRateUpdate: string;
}

// Database mapping types
export interface DatabasePrice {
  id: string;
  key: string;
  name: string;
  description?: string | undefined;
  currency: SupportedCurrency;
  amount_minor: number;
  is_active: boolean;
  valid_from?: string | undefined;
  valid_to?: string | undefined;
  metadata?: Record<string, any> | undefined;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DatabasePriceHistory {
  id: string;
  price_id: string;
  key: string;
  amount_minor: number;
  currency: SupportedCurrency;
  changed_at: string;
  changed_by: string;
  change_reason?: string | undefined;
  previous_amount_minor?: number | undefined;
}

export interface DatabaseCurrencyRate {
  id: string;
  base_currency: SupportedCurrency;
  quote_currency: SupportedCurrency;
  rate: number;
  fetched_at: string;
  source: string;
  is_active: boolean;
}

// Redis event types
export interface PricingUpdatedEvent {
  type: 'pricing.updated';
  data: {
    priceKey: string;
    oldAmountMinor?: number;
    newAmountMinor: number;
    currency: SupportedCurrency;
    updatedBy: string;
    updatedAt: string;
  };
  correlationId: string;
  timestamp: string;
}

export interface CurrencyRateUpdatedEvent {
  type: 'currency.rate.updated';
  data: {
    baseCurrency: SupportedCurrency;
    quoteCurrency: SupportedCurrency;
    oldRate?: number;
    newRate: number;
    source: string;
    updatedAt: string;
  };
  correlationId: string;
  timestamp: string;
}
