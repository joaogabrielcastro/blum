import { clientsApi } from "./clientsApi";
import { productsApi } from "./productsApi";
import { ordersApi } from "./ordersApi";
import { brandsApi } from "./brandsApi";
import { purchasesApi } from "./purchasesApi";
import { teamApi } from "./teamApi";
import { reportsApi } from "./reportsApi";
import { billingApi } from "./billingApi";
import { platformApi } from "./platformApi";
import { externalApi } from "./externalApi";

const apiService = {
  ...clientsApi,
  ...productsApi,
  ...ordersApi,
  ...brandsApi,
  ...purchasesApi,
  ...teamApi,
  ...reportsApi,
  ...billingApi,
  ...platformApi,
  ...externalApi,
};

export default apiService;

export {
  clientsApi,
  productsApi,
  ordersApi,
  brandsApi,
  purchasesApi,
  teamApi,
  reportsApi,
  billingApi,
  platformApi,
  externalApi,
};
