export type PanelPartner = {
  id?: number;
  name: string;
  company_name?: string | null;
  email: string;
  status?: string;
  allowed_scope?: string;
  allowed_games?: string[];
  margin_percent: number;
  minimum_topup: number;
  low_balance_threshold: number;
  wallet: { balance: number; currency: string };
};

export type PanelProduct = {
  id: number;
  name: string;
  image_url?: string | null;
  price: number;
  currency: string;
  variations: Array<{ variation_id: string; name: string; price: number; currency: string }>;
};

export type PanelTopupCustomer = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export type PanelApiKey = {
  name: string;
  key?: string;
  prefix?: string;
  source?: string;
  active?: boolean;
  shareable_for_integration?: boolean;
  production_only?: boolean;
  recoverable?: boolean;
  created_at?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
};

export type PanelStats = {
  orders_today: number;
  orders_this_month: number;
  success_rate: number | null;
  catalog_products: number;
  wallet_balance: number;
  topups_this_month: number;
  spend_this_month: number;
};

export type PanelOrder = {
  id: number;
  external_reference: string;
  partner_reference?: string | null;
  product_id: number;
  product_name?: string | null;
  status: string;
  amount: number;
  supplier_cost: number;
  margin_amount: number;
  currency: string;
  created_at?: string | null;
};

export type PanelTransaction = {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  currency: string;
  reference?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
};

export type PanelDocumentationEndpoint = {
  method: string;
  path: string;
  description: string;
};

export type PanelDocumentation = {
  base_url: string;
  panel_url?: string;
  endpoints: PanelDocumentationEndpoint[];
};

export type PanelOverview = {
  partner: PanelPartner;
  api_keys: {
    sandbox: PanelApiKey;
    live: PanelApiKey | null;
  };
  stats: PanelStats;
  recent_orders: PanelOrder[];
  recent_transactions: PanelTransaction[];
  documentation: PanelDocumentation;
};