import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import { ToastProvider } from "../context/ToastContext";

const mockLogin = jest.fn();
const mockPersistAuthSession = jest.fn();

jest.mock("../services/apiService", () => ({
  login: (...args) => mockLogin(...args),
}));

jest.mock("../utils/authSession", () => ({
  persistAuthSession: (...args) => mockPersistAuthSession(...args),
}));

jest.mock("../utils/tenantHost", () => ({
  resolveTenantSlugFromHost: () => null,
}));

function renderLogin(onLogin = jest.fn()) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Login onLogin={onLogin} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it("renderiza formulário de entrada", async () => {
    renderLogin();
    expect(
      await screen.findByRole("heading", { name: "Entrar" }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/e-mail ou usuário/i)).toBeTruthy();
    expect(screen.getByLabelText(/^senha$/i)).toBeTruthy();
  });

  it("não exibe campo de identificador da empresa", async () => {
    renderLogin();
    expect(screen.queryByLabelText(/identificador da empresa/i)).toBeNull();
    expect(
      await screen.findByText(
        /identificamos sua empresa automaticamente/i,
      ),
    ).toBeTruthy();
  });

  it("faz login e persiste sessão com refresh token", async () => {
    const onLogin = jest.fn();
    const user = userEvent.setup();

    mockLogin.mockResolvedValueOnce({
      token: "access_jwt",
      refreshToken: "refresh_xyz",
      user: { id: 1, username: "admin@test.com", role: "admin" },
    });

    renderLogin(onLogin);

    await user.type(screen.getByLabelText(/e-mail ou usuário/i), "admin@test.com");
    await user.type(screen.getByLabelText(/^senha$/i), "secret123");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "admin@test.com",
        "secret123",
        undefined,
      );
    });

    expect(mockPersistAuthSession).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "access_jwt",
        refreshToken: "refresh_xyz",
      }),
    );
    expect(onLogin).toHaveBeenCalledWith("admin", 1, expect.any(Object));
  });

  it("exibe erro quando login falha", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error("Credenciais inválidas"));

    renderLogin();

    await user.type(screen.getByLabelText(/e-mail ou usuário/i), "bad@test.com");
    await user.type(screen.getByLabelText(/^senha$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(
      await screen.findByText("Credenciais inválidas"),
    ).toBeTruthy();
    expect(mockPersistAuthSession).not.toHaveBeenCalled();
  });
});
