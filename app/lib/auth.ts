import { createCookie, redirect } from "@remix-run/cloudflare";

// Cookie para armazenar a sessão
export const sessionCookie = createCookie("bolt_session", {
  secrets: ["sua-chave-secreta"], // Troque por uma chave segura
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30, // 30 dias
});

// Middleware para verificar autenticação
export async function requireAuth(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const session = await sessionCookie.parse(cookieHeader);

  if (!session?.authenticated) {
    throw redirect("/login");
  }

  return session;
}

// Helper para fazer logout
export async function logout() {
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionCookie.serialize({}, { maxAge: 0 }),
    },
  });
}
