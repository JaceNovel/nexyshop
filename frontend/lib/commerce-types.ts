export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  vipLevel: VipLevelName;
  createdAt: string;
};

export type ProductAvailability =
  | "available"
  | "unavailable"
  | "high_demand"
  | "maintenance"
  | "slow_delivery"
  | "fast_delivery";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: "Game Credits" | "Gift Cards" | "Game Keys";
  imageUrl: string;
  price: number;
  officialPrice?: number;
  currency: "USD" | "EUR" | "XOF";
  availability: ProductAvailability;
  avgDeliveryMinutes: number;
  successRate: number;
  lastUpdated: string;
  purchasedByCurrentUser?: boolean;
};

export type ReviewStatus = "pending" | "approved" | "hidden" | "deleted";

export type Review = {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  avatarUrl: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  proofUrl?: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: string;
  adminReply?: string;
};

export type OrderStatus =
  | "payment_pending"
  | "payment_received"
  | "verification"
  | "supplier_submitted"
  | "manual_processing"
  | "delivery_in_progress"
  | "delivered"
  | "failed"
  | "refunded";

export type OrderEvent = {
  id: string;
  status: OrderStatus;
  title: string;
  message: string;
  createdAt: string;
  visibleToCustomer: boolean;
};

export type Order = {
  id: string;
  reference: string;
  productId: string;
  productName: string;
  amount: number;
  currency: "USD" | "EUR" | "XOF";
  paymentMethod: string;
  status: OrderStatus;
  estimatedDelivery: string;
  events: OrderEvent[];
};

export type WalletTransactionType =
  | "deposit"
  | "purchase"
  | "cashback"
  | "refund"
  | "bonus"
  | "admin_debit"
  | "admin_correction";

export type WalletTransaction = {
  id: string;
  type: WalletTransactionType;
  amount: number;
  currency: "USD" | "EUR" | "XOF";
  reason: string;
  createdAt: string;
  adminReason?: string;
};

export type Wallet = {
  userId: string;
  balance: number;
  currency: "USD" | "EUR" | "XOF";
  transactions: WalletTransaction[];
};

export type VipLevelName = "Bronze" | "Silver" | "Gold" | "Diamond" | "Elite";

export type VipLevel = {
  name: VipLevelName;
  minOrders: number;
  minSpend: number;
  cashbackPercent: number;
  discountPercent: number;
  perks: string[];
};

export type ResellerStatus = "pending" | "accepted" | "refused" | "suspended";

export type Reseller = {
  id: string;
  shopName: string;
  country: string;
  whatsapp: string;
  email: string;
  website?: string;
  estimatedVolume: string;
  requestedProducts: string[];
  status: ResellerStatus;
  marginPercent: number;
  creditLimit: number;
  balance: number;
};

export type PlayerLookupResult = {
  game: "freefire" | "pubg" | "codm" | "mobile_legends";
  uid: string;
  nickname: string;
  server?: string;
  level?: number;
  avatarUrl?: string;
  manualFallback?: boolean;
};

export type Badge = {
  id: string;
  label: string;
  description: string;
  tone: "red" | "violet" | "emerald" | "amber" | "blue";
};

export type Coupon = {
  id: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
};
