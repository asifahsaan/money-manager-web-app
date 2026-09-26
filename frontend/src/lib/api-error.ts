import { isAxiosError } from 'axios';

// Turns any API failure into a sentence a user can act on.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) return fallback;
  const res = err.response;
  const body = res?.data as { message?: string | string[] } | undefined;
  const serverMessage = Array.isArray(body?.message) ? body?.message.join(', ') : body?.message;

  // No response, or a gateway/proxy error without our JSON body: the server is
  // down or (on the free host) still waking up — not a wrong password.
  if (!res || ([500, 502, 503, 504].includes(res.status) && !serverMessage)) {
    return "Can't reach the server right now. It may be waking up — please try again in a few seconds.";
  }
  if (res.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  return serverMessage ?? fallback;
}
