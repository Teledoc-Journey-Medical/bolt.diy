import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { requireAuth } from '~/lib/auth';
import { translations } from '~/lib/i18n/pt-BR';

export const meta: MetaFunction = () => {
  return [
    { title: translations.app.title }, 
    { name: 'description', content: translations.app.description }
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Verifica autenticação
  await requireAuth(request);
  return json({});
};

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
