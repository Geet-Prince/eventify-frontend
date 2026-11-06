'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { name: 'Events', href: '/events', icon: 'catalog' },
    { name: 'Book Pass', href: '/', icon: 'ticket' },
    { name: 'Gate Scanner', href: '/scanner', icon: 'qr' },
    { name: 'Club Dashboard', href: '/dashboard', icon: 'chart' },
    { name: 'Club Portal', href: '/login', icon: 'lock' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#090d16]/85 backdrop-blur-md border-b border-[#23314d]/80 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-[#2563eb]/25 group-hover:scale-105 transition-transform duration-200">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#f8fafc] group-hover:text-white transition-colors">
                Eventify
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/25 tracking-wide">
                CAMPUS GATE
              </span>
            </div>
            <p className="text-[10px] text-[#64748b] leading-none hidden sm:block">Digital Pass & Turnstile Hub</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30 shadow-xs'
                    : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#141c2e] border border-transparent'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Quick Right Action & Mobile Toggle */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/scanner"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#141c2e] hover:bg-[#1b263e] border border-[#23314d] text-[#f8fafc] transition-all hover:border-[#3b82f6]/50 cursor-pointer shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span>Gate Access</span>
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#141c2e] border border-[#23314d] focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-[#23314d] space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30'
                    : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#141c2e]'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
