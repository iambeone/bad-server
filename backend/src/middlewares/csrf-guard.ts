// middlewares/csrf-guard.ts
import { NextFunction, Request, Response } from 'express'

const CSRF_COOKIE_NAME = 'csrfToken'
const CSRF_HEADER_NAME = 'x-csrf-token'

const CSRF_EXCLUDE_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/token',
  '/auth/logout',
]

export const csrfGuard = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/orders') || req.path.startsWith('/upload')) {
    return next();
  }
  const method = req.method.toUpperCase()

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next()
  }

  if (CSRF_EXCLUDE_PATHS.includes(req.path)) {
    return next()
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.header(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' })
  }

  return next()
}
