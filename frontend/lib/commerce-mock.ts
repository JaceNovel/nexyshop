import type { Badge, Order, Product, Reseller, Review, User, VipLevel, Wallet } from "@/lib/commerce-types";

export const commerceUser: User = {
  id: "user_001",
  name: "Astral Player",
  email: "player@astral4gamer.com",
  avatarUrl: "/freefire-media/2085077343-avatar.jpg",
  vipLevel: "Gold",
  createdAt: "2026-05-14"
};

export const vipLevels: VipLevel[] = [
  { name: "Bronze", minOrders: 1, minSpend: 0, cashbackPercent: 1, discountPercent: 0, perks: ["Cashback de depart", "Badge profil"] },
  { name: "Silver", minOrders: 8, minSpend: 75, cashbackPercent: 2, discountPercent: 1, perks: ["Promotions privees", "Cashback ameliore"] },
  { name: "Gold", minOrders: 20, minSpend: 220, cashbackPercent: 3, discountPercent: 2, perks: ["Support prioritaire", "Acces ventes flash"] },
  { name: "Diamond", minOrders: 45, minSpend: 650, cashbackPercent: 5, discountPercent: 3, perks: ["Coupons exclusifs", "Priorite livraison"] },
  { name: "Elite", minOrders: 100, minSpend: 1500, cashbackPercent: 7, discountPercent: 5, perks: ["Gestionnaire prioritaire", "Offres VIP"] }
];

export const commerceProducts: Product[] = [
  { id: "p_ff_mena", slug: "free-fire-mena", name: "Free Fire MENA", category: "Game Credits", imageUrl: "/signup-hero.png", price: 1.01, officialPrice: 1.25, currency: "USD", availability: "fast_delivery", avgDeliveryMinutes: 4, successRate: 99.1, lastUpdated: "2026-06-23T09:30:00Z", purchasedByCurrentUser: true },
  { id: "p_pubg_uc", slug: "pubg-mobile-uc", name: "PUBG Mobile UC", category: "Game Credits", imageUrl: "/pubg-1920x1080-wallpaper-md5gr1zzjd6ic2va.jpg", price: 0.93, officialPrice: 1.2, currency: "USD", availability: "available", avgDeliveryMinutes: 12, successRate: 97.8, lastUpdated: "2026-06-23T09:21:00Z", purchasedByCurrentUser: true },
  { id: "p_codm", slug: "codm-cp", name: "CODM CP Instant", category: "Game Credits", imageUrl: "/image.png", price: 2.45, officialPrice: 2.9, currency: "USD", availability: "high_demand", avgDeliveryMinutes: 18, successRate: 96.4, lastUpdated: "2026-06-23T08:45:00Z" },
  { id: "p_netflix", slug: "netflix-gift-card", name: "Netflix Gift Card", category: "Gift Cards", imageUrl: "/unnamed.png", price: 5.56, officialPrice: 6.2, currency: "USD", availability: "available", avgDeliveryMinutes: 8, successRate: 98.2, lastUpdated: "2026-06-23T07:12:00Z" },
  { id: "p_game_key", slug: "premium-game-key", name: "Premium Game Key", category: "Game Keys", imageUrl: "/the-death-star-sabotage-event-for-fortnite-begins-on-july-7-cover684382a44e794.jpg", price: 12.49, officialPrice: 15, currency: "USD", availability: "slow_delivery", avgDeliveryMinutes: 30, successRate: 94.6, lastUpdated: "2026-06-23T06:40:00Z" }
];

export const reviews: Review[] = [
  { id: "r_1", productId: "p_ff_mena", userId: "u_1", userName: "Ibrahim K.", avatarUrl: "/freefire-media/2085077343-avatar.jpg", rating: 5, comment: "Recharge recue rapidement, interface claire et support reactif.", verifiedPurchase: true, status: "approved", createdAt: "2026-06-21T12:30:00Z", adminReply: "Merci pour ton retour, bonne game." },
  { id: "r_2", productId: "p_ff_mena", userId: "u_2", userName: "Amina T.", avatarUrl: "/freefire-media/319484208331211-removebg-preview.png", rating: 4, comment: "Bon prix et livraison propre. J'aurais aime plus de details sur le suivi.", verifiedPurchase: true, status: "pending", createdAt: "2026-06-22T18:11:00Z" },
  { id: "r_3", productId: "p_pubg_uc", userId: "u_3", userName: "Kevin M.", avatarUrl: "/freefire-media/39388339-removebg-preview.png", rating: 5, comment: "UC recus en quelques minutes, parfait.", verifiedPurchase: true, status: "approved", createdAt: "2026-06-20T08:05:00Z" }
];

export const orders: Order[] = [
  {
    id: "7",
    reference: "AST-2026-0007",
    productId: "p_ff_mena",
    productName: "Free Fire MENA - 110 Diamonds",
    amount: 1.01,
    currency: "USD",
    paymentMethod: "Mobile Money",
    status: "delivery_in_progress",
    estimatedDelivery: "1-15 min",
    events: [
      { id: "e1", status: "payment_pending", title: "Paiement en attente", message: "Nous attendons la confirmation du paiement.", createdAt: "2026-06-23T10:00:00Z", visibleToCustomer: true },
      { id: "e2", status: "payment_received", title: "Paiement recu", message: "Le paiement est confirme.", createdAt: "2026-06-23T10:02:00Z", visibleToCustomer: true },
      { id: "e3", status: "verification", title: "Verification", message: "Les informations joueur sont verifiees.", createdAt: "2026-06-23T10:03:00Z", visibleToCustomer: true },
      { id: "e4", status: "delivery_in_progress", title: "Livraison en cours", message: "La commande est en traitement. Tu recevras une confirmation des que la livraison est terminee.", createdAt: "2026-06-23T10:04:00Z", visibleToCustomer: true }
    ]
  }
];

export const wallet: Wallet = {
  userId: "user_001",
  balance: 18.75,
  currency: "USD",
  transactions: [
    { id: "w1", type: "deposit", amount: 15, currency: "USD", reason: "Recharge wallet", createdAt: "2026-06-21T10:00:00Z" },
    { id: "w2", type: "cashback", amount: 0.45, currency: "USD", reason: "Cashback VIP Gold", createdAt: "2026-06-22T14:00:00Z" },
    { id: "w3", type: "purchase", amount: -1.01, currency: "USD", reason: "Achat Free Fire", createdAt: "2026-06-23T10:05:00Z" }
  ]
};

export const resellers: Reseller[] = [
  { id: "res_1", shopName: "Madicegame", country: "Togo", whatsapp: "+22890000000", email: "madicegame@example.com", website: "https://madicegame.example", estimatedVolume: "50-100 commandes/mois", requestedProducts: ["Free Fire", "PUBG"], status: "pending", marginPercent: 10, creditLimit: 100, balance: 0 },
  { id: "res_2", shopName: "Games Kinbo", country: "Benin", whatsapp: "+22990000000", email: "contact@gameskinbo.example", estimatedVolume: "200+ commandes/mois", requestedProducts: ["Free Fire"], status: "accepted", marginPercent: 8, creditLimit: 500, balance: 120 }
];

export const badges: Badge[] = [
  { id: "b1", label: "Premier achat", description: "Attribue apres la premiere commande livree.", tone: "emerald" },
  { id: "b2", label: "Client VIP", description: "Membre du programme VIP Astral.", tone: "violet" },
  { id: "b3", label: "Gagnant tournoi", description: "A remporte un tournoi officiel.", tone: "amber" },
  { id: "b4", label: "Revendeur certifie", description: "Partenaire revendeur approuve.", tone: "blue" }
];

export const livePurchases = [
  { id: "n1", name: "Ibrahim", product: "10800 CP", verb: "vient d'acheter" },
  { id: "n2", name: "Amina", product: "Diamonds Free Fire", verb: "a recu ses" },
  { id: "n3", name: "Kevin", product: "PUBG UC", verb: "vient d'acheter" }
];
