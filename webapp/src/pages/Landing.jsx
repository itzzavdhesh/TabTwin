// Presents the TabTwin landing page and routes guests into session links.
import React from 'react';

export default function Landing() {
  const socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com/itzzavdheshh',
      icon: '🐙',
      bg: 'bg-slate-900 text-white hover:bg-slate-800',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/aavdhesh',
      icon: '💼',
      bg: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    {
      name: 'Twitter / X',
      url: 'https://x.com/Itzzavdheshh',
      icon: '𝕏',
      bg: 'bg-slate-950 text-white hover:bg-slate-800',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/itzzavdheshh?igsi=MTFkNTM5OGljOHV5aQ==',
      icon: '📸',
      bg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white hover:opacity-95',
    },
    {
      name: 'Discord',
      url: 'https://discord.com/users/1385290408698839223',
      icon: '💬',
      bg: 'bg-indigo-600 text-white hover:bg-indigo-700',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/owner-logo.jpg"
              alt="TabTwin Owner Logo"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-teal-500 shadow-sm"
            />
            <span className="text-xl font-extrabold tracking-tight text-slate-950">TabTwin</span>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/itzzavdheshh/TabTwin"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <span>GitHub</span>
            </a>
            <a
              href="/join/demo"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Try Demo Session
            </a>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-grow">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_0.9fr] lg:py-20">
            <div className="flex flex-col justify-center">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600">
                <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
                Real-Time Browser Tab Collaboration
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight text-slate-950 lg:text-6xl">
                Collaborate inside live browser tabs
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                TabTwin allows guests and AI agents to appear directly inside a host's active Chrome
                tab as live ghost collaborators with cursors, annotations, and host-permissioned
                actions.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  className="rounded-xl bg-slate-950 px-6 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-slate-800"
                  href="/join/demo"
                >
                  Join Demo Session
                </a>
                <a
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
                  href="https://github.com/itzzavdheshh/TabTwin"
                  target="_blank"
                  rel="noreferrer"
                >
                  View GitHub Source
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-slate-400 font-mono">
                  host tab: tabtwin.app/live
                </span>
              </div>
              <div className="relative mt-4 h-80 overflow-hidden rounded-xl bg-white text-slate-900 shadow-inner">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Quarterly Launch Roadmap
                </div>
                <div className="space-y-3 p-5 text-sm leading-6">
                  <p className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 font-medium text-teal-900">
                    ✨ Guest highlighted: Launch security review & action items
                  </p>
                  <p className="text-slate-700">
                    AI agent is assisting from the active tab while the host remains in full
                    control.
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    • Ghost cursors synced over WebRTC
                    <br />• E2E encryption active
                  </p>
                </div>
                <div className="absolute left-32 top-36 flex items-center gap-1.5 shadow-md">
                  <div className="h-0 w-0 border-l-[12px] border-r-[4px] border-t-[18px] border-l-blue-600 border-r-transparent border-t-blue-600" />
                  <span className="rounded-md bg-blue-600 px-2 py-1 text-xs font-bold text-white shadow">
                    Avdhesh (Host)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
          {[
            [
              '🚀 Instant Host Session',
              'Install the Chrome MV3 extension, click Start Session, and instantly share your live invite link.',
            ],
            [
              '⚡ Zero Install for Guests',
              'Collaborators open your session link in Chrome, Firefox, Edge, or Safari without installing any extension.',
            ],
            [
              '🔒 Secure & Control First',
              'Hosts retain strict permission overrides over guest clicking, typing, and tab navigation at all times.',
            ],
          ].map(([title, body]) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
            </article>
          ))}
        </section>

        {/* Owner & Developer Showcase Section */}
        <section className="border-t border-slate-200 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl md:p-12">
              <div className="grid gap-10 md:grid-cols-[auto_1fr] md:items-center">
                {/* Logo / Profile Avatar */}
                <div className="relative mx-auto md:mx-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500 opacity-75 blur-md" />
                  <img
                    src="/owner-logo.jpg"
                    alt="Avdhesh Kumar Dadhich Logo"
                    className="relative h-36 w-36 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
                  />
                </div>

                {/* Information */}
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-400">
                    Project Creator & Owner
                  </div>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                    Avdhesh Kumar Dadhich
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Creator of TabTwin • Full-Stack & Browser Extension Developer
                  </p>

                  {/* Contact Info Pills */}
                  <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold">
                    <a
                      href="mailto:aavdhesh.dadhich@gmail.com"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3.5 py-2 text-slate-200 transition hover:bg-white/20 hover:text-white"
                    >
                      <span>✉️</span>
                      <span>aavdhesh.dadhich@gmail.com</span>
                    </a>
                    <a
                      href="tel:7690863039"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3.5 py-2 text-slate-200 transition hover:bg-white/20 hover:text-white"
                    >
                      <span>📞</span>
                      <span>+91 7690863039</span>
                    </a>
                  </div>

                  {/* Social Media Links */}
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Connect & Follow
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {socialLinks.map((link) => (
                        <a
                          key={link.name}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-md transition ${link.bg}`}
                        >
                          <span>{link.icon}</span>
                          <span>{link.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row text-xs">
          <div className="flex items-center gap-3">
            <img src="/owner-logo.jpg" alt="Logo" className="h-6 w-6 rounded-full object-cover" />
            <p>
              © {new Date().getFullYear()} TabTwin by{' '}
              <strong className="text-slate-200">Avdhesh Kumar Dadhich</strong>. All rights
              reserved.
            </p>
          </div>
          <div className="flex gap-4">
            <a
              href="https://github.com/itzzavdheshh/TabTwin"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/aavdhesh"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              LinkedIn
            </a>
            <a
              href="https://x.com/Itzzavdheshh"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Twitter / X
            </a>
            <a href="mailto:aavdhesh.dadhich@gmail.com" className="hover:text-white">
              Contact Owner
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
