"use client";

import { useActionState } from "react";
import { loginWithMittwald } from "@/lib/actions/mittwald-login";
import type { FormState } from "@schema";

const initialState: FormState = {};

export function MittwaldMailboxLoginForm() {
  const [state, action, pending] = useActionState(loginWithMittwald, initialState);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f7f9fa] px-5 py-12 text-[#202b33] dark:bg-[#0c1421] dark:text-white">
      <div className="w-full max-w-md">
        <header className="mb-9 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#55B8B6] text-white">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4.5 7 7.5 6 7.5-6" />
            </svg>
          </div>
          <p className="text-3xl font-light tracking-[0.12em]">16:NEUN</p>
          <h1 className="mt-3 text-xl font-semibold">Webmail</h1>
          <p className="mt-2 text-sm text-[#667785] dark:text-[#adc1cd]">
            Anmeldung mit Ihrem bestehenden E-Mail-Postfach
          </p>
        </header>

        <form action={action} className="space-y-5 rounded-2xl border border-[#dce6e9] bg-white p-8 shadow-sm dark:border-[#243549] dark:bg-[#152234]">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="mailbox-login-email">E-Mail-Adresse</label>
            <input
              id="mailbox-login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="name@beispiel.de"
              className="w-full rounded-lg border border-[#cbd7da] bg-transparent px-4 py-3 text-base outline-none focus:border-[#369997] dark:border-[#476071]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="mailbox-login-password">Passwort</label>
            <input
              id="mailbox-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              className="w-full rounded-lg border border-[#cbd7da] bg-transparent px-4 py-3 text-base outline-none focus:border-[#369997] dark:border-[#476071]"
            />
          </div>

          {state.error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              Die Anmeldung ist fehlgeschlagen. Bitte Zugangsdaten prüfen.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[#42a9a7] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#318f8d] disabled:opacity-60"
          >
            {pending ? "Anmeldung wird geprüft…" : "Anmelden"}
          </button>
        </form>

        <footer className="mt-6 text-center text-xs text-[#7b8994] dark:text-[#adc1cd]">
          Ihre E-Mails bleiben bei Ihrem bestehenden Mailanbieter.
          <p className="mt-2">
            <a className="underline" href="https://github.com/16NEUN/Kurrier" rel="noreferrer">Open-Source-Informationen</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
