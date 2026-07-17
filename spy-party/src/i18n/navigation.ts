import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation wrappers. Use these instead of `next/link` and
// `next/navigation` for any internal navigation so the active locale prefix is
// preserved automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
