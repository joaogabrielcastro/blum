/**
 * @jest-environment node
 */
import {
  normalizeOrderStatus,
  getOrderStatusMeta,
} from "./orderStatus";

describe("orderStatus", () => {
  it("normaliza aliases EN para PT", () => {
    expect(normalizeOrderStatus("pending")).toBe("Pendente");
    expect(normalizeOrderStatus("completed")).toBe("Entregue");
    expect(normalizeOrderStatus("cancelled")).toBe("Cancelado");
    expect(normalizeOrderStatus("Entregue")).toBe("Entregue");
  });

  it("retorna meta com tone", () => {
    expect(getOrderStatusMeta("pending").label).toBe("Pendente");
    expect(getOrderStatusMeta("pending").tone).toBe("warning");
    expect(getOrderStatusMeta("Entregue").tone).toBe("success");
  });
});
