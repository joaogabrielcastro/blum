import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmationModal from "./ConfirmationModal";

describe("ConfirmationModal", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("não renderiza quando show=false", () => {
    render(
      <ConfirmationModal
        show={false}
        title="Excluir pedido"
        message="Tem certeza?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza no document.body via portal", () => {
    render(
      <div id="app-root" className="page-enter" style={{ transform: "translateY(0)" }}>
        <ConfirmationModal
          show
          title="Excluir pedido"
          message="Tem certeza que deseja excluir este pedido?"
          confirmText="Excluir"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByRole("heading", { name: "Excluir pedido" })).toBeTruthy();
    expect(
      screen.getByText("Tem certeza que deseja excluir este pedido?"),
    ).toBeTruthy();
  });

  it("chama onConfirm e onCancel", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <ConfirmationModal
        show
        title="Finalizar entrega"
        message="Confirmar finalização?"
        confirmText="Finalizar"
        tone="primary"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("fecha com Escape", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <ConfirmationModal
        show
        title="Excluir pedido"
        message="Tem certeza?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
