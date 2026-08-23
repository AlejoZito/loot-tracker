import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client every `db` repository reads/writes through.
 *
 * Must stay lazy: `createClient` throws without env vars, and this module is imported
 * transitively by code that runs under the sheet datasources and in unit tests.
 *
 * Must not become a Proxy wrapper: a Proxy intercepts the property probing libraries do
 * against a client object, turning a missing-config error into a silent hang.
 *
 * The service-role key bypasses RLS, so this must never be constructed anywhere the key
 * could reach a browser.
 */
let client: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'DATA_SOURCE=db requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
      'Run `vercel env pull` after adding the Supabase integration, or set them in .env — ' +
      'see .env.example.',
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Test seam: drop the memoised client so a later getDb() re-reads the environment. */
export function resetDbClient(): void {
  client = null;
}

/**
 * PostgREST caps a request at 1000 rows silently, so any full-table read must page or it
 * truncates without erroring. Pages until a short read.
 *
 * The query must carry an ordering unique across rows; paging a non-unique sort lets the
 * database return a row twice, or not at all, across two pages.
 */
export async function selectAll<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> },
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}
