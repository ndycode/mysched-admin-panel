function applySecurityHeaders(res: Response): Response {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

export function ok<T>(data: T, init: ResponseInit = {}) {
  const res = Response.json(data as unknown, { status: 200, ...init });
  return applySecurityHeaders(res);
}
export function bad(msg: string, details?: unknown, status = 400) {
  const res = Response.json({ error: msg, details } as const, { status });
  return applySecurityHeaders(res);
}
export function dbConflict(message = 'Already exists') {
  return bad(message, undefined, 409);
}
