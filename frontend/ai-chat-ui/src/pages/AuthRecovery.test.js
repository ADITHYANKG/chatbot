import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import PasswordInput from "../components/PasswordInput";

function renderPage(page, authValue, initialEntry) {
  return render(
    <AuthContext.Provider value={authValue}>
      <ThemeContext.Provider value={{ darkMode: false }}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/forgot-password" element={page} />
            <Route path="/reset-password" element={page} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("forgot password shows the same generic confirmation after submitting an email", async () => {
  const requestPasswordReset = jest.fn().mockResolvedValue({
    message: "If a verified account exists for that email, a reset link has been sent.",
  });
  renderPage(<ForgotPassword />, { requestPasswordReset }, "/forgot-password");

  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "person@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

  expect(await screen.findByRole("status")).toHaveTextContent(/if a verified account exists/i);
  expect(requestPasswordReset).toHaveBeenCalledWith("person@example.com");
});

test("reset password submits the token and matching new password", async () => {
  const resetPassword = jest.fn().mockResolvedValue({ message: "Password reset successfully." });
  renderPage(<ResetPassword />, { resetPassword }, "/reset-password#token=one-time-token");

  fireEvent.change(screen.getByLabelText("New password", { exact: true }), { target: { value: "New-password123!" } });
  fireEvent.change(screen.getByLabelText("Confirm password", { exact: true }), { target: { value: "New-password123!" } });
  fireEvent.click(screen.getByRole("button", { name: /update password/i }));

  await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("one-time-token", "New-password123!"));
  expect(await screen.findByRole("status")).toHaveTextContent(/password reset successfully/i);
});

test("password input reveals the password and reports each requirement", () => {
  render(
    <PasswordInput
      id="test-password"
      label="Password"
      value="Valid-pass123!"
      onChange={jest.fn()}
      darkMode={false}
      autoComplete="new-password"
      showRequirements
    />
  );

  const passwordInput = screen.getByLabelText("Password");
  expect(passwordInput).toHaveAttribute("type", "password");
  expect(screen.getAllByRole("listitem").every((item) => item.className.includes("text-success"))).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(passwordInput).toHaveAttribute("type", "text");
  fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
  expect(passwordInput).toHaveAttribute("type", "password");
});