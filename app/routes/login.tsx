import { ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData } from "@remix-run/react";
import { createCookie } from "@remix-run/cloudflare";
import { translations } from "~/lib/i18n/pt-BR";

// Cookie para armazenar a sessão
const sessionCookie = createCookie("bolt_session", {
  secrets: ["sua-chave-secreta"], // Troque por uma chave segura
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30, // 30 dias
});

// Configurações de autenticação
const AUTH_CONFIG = {
  username: "admin", // Troque pelo usuário desejado
  password: "bolt123", // Troque pela senha desejada
};

// Action para processar o login
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");

  if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
    return redirect("/", {
      headers: {
        "Set-Cookie": await sessionCookie.serialize({ authenticated: true }),
      },
    });
  }

  return json({ error: translations.auth.error });
}

// Componente de login
export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bolt-elements-background-depth-1">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-bolt-elements-background-depth-2 p-8 shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-bolt-elements-text">
            {translations.auth.title}
          </h2>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="username" className="text-bolt-elements-text">
                {translations.auth.username}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-bolt-elements-border bg-bolt-elements-background-depth-3 px-3 py-2 text-bolt-elements-text focus:border-bolt-elements-border-focus focus:outline-none focus:ring-1 focus:ring-bolt-elements-border-focus"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-bolt-elements-text">
                {translations.auth.password}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full rounded-md border border-bolt-elements-border bg-bolt-elements-background-depth-3 px-3 py-2 text-bolt-elements-text focus:border-bolt-elements-border-focus focus:outline-none focus:ring-1 focus:ring-bolt-elements-border-focus"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="text-red-500 text-sm text-center">
              {actionData.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full rounded-md bg-bolt-elements-primary px-4 py-2 text-white hover:bg-bolt-elements-primary-hover focus:outline-none focus:ring-2 focus:ring-bolt-elements-primary focus:ring-offset-2"
            >
              {translations.auth.submit}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
