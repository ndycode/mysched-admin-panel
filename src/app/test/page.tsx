import { notFound } from 'next/navigation'

import { TestClient } from './TestClient'

const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_TEST_PAGE === 'true'

export const dynamic = 'force-dynamic'

export default function TestPage() {
  if (!ENABLED) {
    notFound()
  }

  return <TestClient />
}
