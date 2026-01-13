const API_BASE =
  // process.env.NEXT_PUBLIC_API_URL || 
  "http://localhost:9090";


const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/public/otp/request",
  "/public/otp/verify",
  "/public/otp/resend",
  "/api/customer/menu",
  "/api/customer/orders",
  "/api/customer/orders/items",
  "/api/customer/orders/bill",
];


function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("access_token");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }
  return token;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isPublic = PUBLIC_ROUTES.some((route) =>
    path.startsWith(route)
  );

  const token = !isPublic ? getAccessToken() : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

 if (res.status === 401 && !isPublic && typeof window !== "undefined") {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
  throw new Error("Session expired. Please login again.");
}

 if (!res.ok) {
  const raw = await res.text();

  throw {
    status: res.status,
    message: raw || "Backend error",
  };
}



  if (res.status === 204) {
    return {} as T;
  }
  

  return res.json();
}
