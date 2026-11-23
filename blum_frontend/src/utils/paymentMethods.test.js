import {
  hasPaymentMethod,
  needsPaymentRegistration,
  paymentOptionsForOrder,
} from "./paymentMethods";

describe("paymentMethods", () => {
  it("hasPaymentMethod ignora vazio", () => {
    expect(hasPaymentMethod(null)).toBe(false);
    expect(hasPaymentMethod("")).toBe(false);
    expect(hasPaymentMethod("pix")).toBe(true);
  });

  it("needsPaymentRegistration cobre pedido sem forma e carteira", () => {
    expect(needsPaymentRegistration(null)).toBe(true);
    expect(needsPaymentRegistration("")).toBe(true);
    expect(needsPaymentRegistration("carteira")).toBe(true);
    expect(needsPaymentRegistration("pix")).toBe(false);
    expect(needsPaymentRegistration("boleto")).toBe(false);
  });

  it("restringe PIX/dinheiro quando há desconto geral", () => {
    expect(
      paymentOptionsForOrder({ discount: 2, paymentMethod: "" }).map(
        (o) => o.value,
      ),
    ).toEqual(["pix", "dinheiro"]);
    expect(
      paymentOptionsForOrder({ discount: 0, paymentMethod: "carteira" }).map(
        (o) => o.value,
      ),
    ).toEqual(["boleto", "pix", "cheque", "dinheiro"]);
  });
});
