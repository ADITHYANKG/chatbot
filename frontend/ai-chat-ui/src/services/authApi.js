export const API_BASE_URL = "http://localhost:8000";

export async function postAuthForm(path, fields, token) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}