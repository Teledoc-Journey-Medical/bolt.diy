import { ActionFunctionArgs } from "@remix-run/cloudflare";
import { logout } from "~/lib/auth";

export async function action({ request }: ActionFunctionArgs) {
  return logout();
}
