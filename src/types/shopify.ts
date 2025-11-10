/**
 * Shopify Integration TypeScript Types
 *
 * Types for Shopify OAuth flow, Admin API interactions, and data structures
 */

// OAuth Flow Types
export interface ShopifyOAuthParams {
  shop: string;           // Shop domain (e.g., "mystore.myshopify.com")
  code?: string;          // Authorization code (returned in callback)
  hmac: string;           // HMAC signature for validation
  timestamp: string;      // Request timestamp
  state?: string;         // CSRF protection state
  host?: string;          // Base64 encoded host
}

export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
}

// Script Tag Types
export interface ScriptTagParams {
  event: 'onload';
  src: string;            // URL to tracking.js script
  display_scope: 'all' | 'online_store' | 'order_status';
}

export interface ShopifyScriptTag {
  id: number;
  src: string;
  event: string;
  created_at: string;
  updated_at: string;
  display_scope: string;
}

// Order Types
export interface ShopifyLineItem {
  id: number;
  variant_id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  variant_title: string | null;
  vendor: string;
  product_id: number;
  requires_shipping: boolean;
  taxable: boolean;
  gift_card: boolean;
  name: string;
  properties: Array<{ name: string; value: string }>;
}

export interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
  number: number;
  note: string | null;
  token: string;
  gateway: string;
  test: boolean;
  total_price: string;
  subtotal_price: string;
  total_weight: number;
  total_tax: string;
  taxes_included: boolean;
  currency: string;
  financial_status: string;
  confirmed: boolean;
  total_discounts: string;
  buyer_accepts_marketing: boolean;
  name: string;
  referring_site: string | null;
  landing_site: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  total_price_usd: string;
  checkout_token: string;
  reference: string | null;
  user_id: number | null;
  location_id: number | null;
  source_identifier: string | null;
  source_url: string | null;
  processed_at: string;
  device_id: number | null;
  phone: string | null;
  customer_locale: string;
  app_id: number;
  browser_ip: string | null;
  landing_site_ref: string | null;
  order_number: number;
  line_items: ShopifyLineItem[];
  tags: string;
  note_attributes: Array<{ name: string; value: string }>;
}

// Product Types
export interface ShopifyProductVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
  position: number;
  inventory_policy: string;
  compare_at_price: string | null;
  fulfillment_service: string;
  inventory_management: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode: string | null;
  grams: number;
  image_id: number | null;
  weight: number;
  weight_unit: string;
  inventory_item_id: number;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string | null;
  template_suffix: string | null;
  status: string;
  published_scope: string;
  tags: string;
  admin_graphql_api_id: string;
  variants: ShopifyProductVariant[];
  options: Array<{
    id: number;
    product_id: number;
    name: string;
    position: number;
    values: string[];
  }>;
  images: Array<{
    id: number;
    product_id: number;
    position: number;
    created_at: string;
    updated_at: string;
    alt: string | null;
    width: number;
    height: number;
    src: string;
    variant_ids: number[];
  }>;
  image: {
    id: number;
    product_id: number;
    position: number;
    created_at: string;
    updated_at: string;
    alt: string | null;
    width: number;
    height: number;
    src: string;
    variant_ids: number[];
  } | null;
}

// Webhook Types
export interface ShopifyWebhookPayload {
  topic: string;
  shop_domain: string;
  api_version: string;
}

export interface ShopifyUninstallWebhook extends ShopifyWebhookPayload {
  id: number;
  name: string;
  email: string;
  domain: string;
  province: string;
  country: string;
  address1: string;
  zip: string;
  city: string;
  source: string | null;
  phone: string;
  latitude: number;
  longitude: number;
  primary_locale: string;
  address2: string | null;
  created_at: string;
  updated_at: string;
  country_code: string;
  country_name: string;
  currency: string;
  customer_email: string;
  timezone: string;
  iana_timezone: string;
  shop_owner: string;
  money_format: string;
  money_with_currency_format: string;
  weight_unit: string;
  province_code: string | null;
  taxes_included: boolean;
  auto_configure_tax_inclusivity: boolean | null;
  tax_shipping: boolean | null;
  county_taxes: boolean;
  plan_display_name: string;
  plan_name: string;
  has_discounts: boolean;
  has_gift_cards: boolean;
  myshopify_domain: string;
  google_apps_domain: string | null;
  google_apps_login_enabled: boolean | null;
  money_in_emails_format: string;
  money_with_currency_in_emails_format: string;
  eligible_for_payments: boolean;
  requires_extra_payments_agreement: boolean;
  password_enabled: boolean;
  has_storefront: boolean;
  eligible_for_card_reader_giveaway: boolean;
  finances: boolean;
  primary_location_id: number;
  cookie_consent_level: string;
  force_ssl: boolean;
  checkout_api_supported: boolean;
  multi_location_enabled: boolean;
  setup_required: boolean;
  pre_launch_enabled: boolean;
  enabled_presentment_currencies: string[];
}

// Service Response Types
export interface ScriptInjectionResult {
  success: boolean;
  scriptTagId?: string;
  error?: string;
}

export interface OrderSyncResult {
  success: boolean;
  ordersSynced: number;
  errors: number;
  executionTime: number;
}

// Error Types
export interface ShopifyAPIError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
