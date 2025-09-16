// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
  // You could also check session here if you only want
  // logged-in users to be redirected
  throw redirect(302, '/picks');
};
