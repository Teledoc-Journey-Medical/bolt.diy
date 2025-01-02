import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

// Loader para tratar requisições a rotas inexistentes
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  // Lista de caminhos sensíveis que devem retornar 403 ao invés de 404
  const sensitiveFiles = ['.env', '.DS_Store', 'server-status', 'login.action'];
  
  // Se for um arquivo sensível, retorna 403
  if (sensitiveFiles.some(file => url.pathname.includes(file))) {
    throw json({ message: "Acesso negado" }, { status: 403 });
  }

  // Para outros caminhos, retorna 404
  throw json({ message: "Página não encontrada" }, { status: 404 });
}

// Componente para exibir a página de erro
export default function CatchAllRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-gray-600">{data?.message || "Página não encontrada"}</p>
        <a
          href="/"
          className="mt-4 inline-block px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Voltar para o início
        </a>
      </div>
    </div>
  );
}
