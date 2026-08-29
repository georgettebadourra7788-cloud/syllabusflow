"use client";

import Link from "next/link";
import { signInWithPopup, signOut } from "firebase/auth";
import { getFirebaseAuth, googleAuthProvider } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/syllabus", label: "Generator" },
  { href: "/upgrade", label: "Upgrade" },
];

async function handleSignIn() {
  try {
    await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
  } catch (error) {
    console.error("Sign-in failed:", error);
  }
}

export function Navbar() {
  const { user, loading } = useAuthUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
            S
          </span>
          SyllabusFlow
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>

        {!loading && user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span>
            <button
              onClick={() => signOut(getFirebaseAuth())}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-300 disabled:opacity-60"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
