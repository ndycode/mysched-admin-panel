// Unique per Node.js process (resets every `npm run dev` start)
export const BOOT_ID = Math.random().toString(36).slice(2)
export const BOOT_COOKIE = 'x-boot'
