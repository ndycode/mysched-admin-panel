export function ok<T>(data: T, init: ResponseInit = {}) {
  return Response.json(data as unknown, { status: 200, ...init });
}
export function bad(msg: string, details?: unknown, status = 400) {
  return Response.json({ error: msg, details } as const, { status });
}
export function dbConflict(message = 'Already exists') {
  return bad(message, undefined, 409);
}
