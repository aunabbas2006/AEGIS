"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const LINKS = [
  { href: "#how-it-works", label: "How it Works" },
  { href: "#features", label: "Features" },
  { href: "#scoring", label: "Scoring" },
  { href: "#why", label: "Why AEGIS" },
];

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/90"
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <ul className="hidden items-center gap-8 text-sm text-muted md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-text">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard"
          className="rounded-full bg-text px-4 py-2 text-sm font-medium text-bg transition-transform hover:scale-105"
        >
          Open Dashboard
        </Link>
      </nav>
    </motion.header>
  );
}
