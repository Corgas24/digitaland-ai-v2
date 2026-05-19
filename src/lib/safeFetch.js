/**
 * safeFetch — wrapper que captura 404 do Supabase e loga detalhes para debug.
 * Use em substituição a fetch() direto quando chamar a API Digitaland.
 */
export async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (res.status === 404) {
      const body = await res.json().catch(() => ({}));
      console.error(
        `[safeFetch] 404 on ${url}`,
        body.code ? `code=${body.code}` : '',
        body.message ? `msg=${body.message}` : ''
      );
    }
    return res;
  } catch (err) {
    console.error(`[safeFetch] Network error on ${url}:`, err.message);
    throw err;
  }
}
