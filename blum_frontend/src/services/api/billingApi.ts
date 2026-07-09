import { API_URL, apiRequest } from "./core";

export const billingApi = {
  getBillingPlans: () => apiRequest(`${API_URL}/billing/plans`),

  getSubscription: () => apiRequest(`${API_URL}/billing/subscription`),

  createCheckoutSession: (planSlug: string) =>
    apiRequest(`${API_URL}/billing/checkout`, {
      method: "POST",
      body: JSON.stringify({ planSlug }),
    }),

  createBillingPortalSession: () =>
    apiRequest(`${API_URL}/billing/portal`, { method: "POST" }),

  changeBillingPlan: (planSlug: string) =>
    apiRequest(`${API_URL}/billing/change-plan`, {
      method: "POST",
      body: JSON.stringify({ planSlug }),
    }),

  cancelSubscription: () =>
    apiRequest(`${API_URL}/billing/cancel`, { method: "POST" }),

  reactivateSubscription: () =>
    apiRequest(`${API_URL}/billing/reactivate`, { method: "POST" }),
};
