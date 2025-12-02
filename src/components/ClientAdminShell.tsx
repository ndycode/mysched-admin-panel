"use client"

import React, { useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/TopBar'
export default function ClientAdminShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const handleMobileSidebar = useCallback((open: boolean) => setMobileSidebarOpen(open), [])

  return (
    <>
      <Topbar mobileMenuOpen={mobileSidebarOpen} onMobileMenuToggle={handleMobileSidebar} />
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={handleMobileSidebar} />
      <div className="min-h-screen pt-16 lg:pl-[280px]">
        <main className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
          <div className="space-y-6 sm:space-y-8">{children}</div>
        </main>
      </div>
    </>
  )
}
