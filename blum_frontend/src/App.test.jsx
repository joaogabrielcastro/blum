import { render, screen } from "@testing-library/react";
import App from "./App";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";

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
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "Entrar" }),
    ).toBeTruthy();
  });
});
