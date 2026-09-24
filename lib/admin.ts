export type Admin = { id: string; name: string; mobile: string };

export function getAdmin(): Admin | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("akg_admin") || "null");
  } catch {
    return null;
  }
}

export function logoutAdmin() {
  localStorage.removeItem("akg_admin");
  window.location.href = "/admin/login";
}
