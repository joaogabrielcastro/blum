/** Tipos compartilhados da API v2 (migração gradual para TypeScript). */

export type UserRole = "admin" | "salesperson";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  name?: string;
  tenantId?: number;
  tenantSlug?: string;
  tenantName?: string;
  isPlatformAdmin?: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface SubscriptionSummary {
  accessBlocked?: boolean;
  hasAccess?: boolean;
  status?: string | null;
  subscriptionStatus?: string | null;
  planSlug?: string | null;
  planName?: string | null;
  isLegacy?: boolean;
  billingEnforced?: boolean;
  features?: string[];
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}

export interface VerifyTokenResponse {
  user?: AuthUser;
  subscription?: SubscriptionSummary | null;
}

export interface ApiErrorBody {
  error?: string | { message?: string };
  message?: string;
  details?: unknown;
  code?: string;
  feature?: string;
  requiredPlan?: string;
  subscription?: SubscriptionSummary;
  stockWarnings?: unknown[];
  requestId?: string;
}

export interface ClientRecord {
  id?: number;
  Id?: number;
  name?: string;
  cnpj?: string;
  [key: string]: unknown;
}

export interface ClientStats {
  totalOrders: number;
  totalSpent: number;
}

export interface ClientOrderSummary {
  id: number;
  orderNumber: string;
  orderDate: string | null;
  seller: unknown;
  status: string;
  totalAmount: number;
  discount: number;
  paymentMethod: string;
  notes: string;
  items: unknown[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductsListResponse {
  data?: unknown[];
  pagination?: PaginationMeta;
}

export interface MonthlySalesSummary {
  year: number;
  month: number;
  orderCount: number;
  totalSales: number;
}

export interface SalesTargetResponse {
  targetAmount?: number | null;
}

export interface CnpjLookupResult {
  nome: string;
  razaoSocial: string;
  nomeFantasia: string;
  telefone: string;
  uf: string;
  email: string;
}

export type OrderQueryParams = Record<string, string | number | boolean | undefined>;

export type ReportStatsFilters = Record<string, string | number | boolean | undefined>;

export interface SaveSalesTargetPayload {
  year: number;
  month: number;
  targetAmount: number;
  sellerUserId?: string | number | null;
}

export interface ProductsExportOptions {
  brandId?: string | number | null;
  q?: string;
}

export interface ConvertOrderOptions {
  confirmStockWarning?: boolean;
}
