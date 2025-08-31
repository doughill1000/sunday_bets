// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  // read validated session from hook
  const { session } = await locals.safeGetSession();
  // hand cookies to the universal loader (so server-side createServerClient can read them)
  return { session, cookies: cookies.getAll(), userId: locals.user?.id ?? null };
};
