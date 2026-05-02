import { render, screen } from "@testing-library/react";
import App from "./App";
import { ToastProvider } from "./context/ToastContext";

jest.mock("./services/apiService", () => ({
  __esModule: true,
  default: {
    getClients: jest.fn().mockResolvedValue([]),
    getBrands: jest.fn().mockResolvedValue([]),
  },
  verifyToken: jest.fn().mockRejectedValue(new Error("no session")),
}));

describe("App", () => {
  it("renderiza tela de login quando não há sessão", async () => {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    );
    expect(await screen.findByText("Entrar")).toBeTruthy();
  });
});
