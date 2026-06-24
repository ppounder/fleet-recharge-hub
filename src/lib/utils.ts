import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Standard application date format: dd MMM yyyy (e.g. 23 Jun 2026). */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (!isValid(d)) return "—";
  return format(d, "dd MMM yyyy");
}

/** Standard date + time: dd MMM yyyy HH:mm. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (!isValid(d)) return "—";
  return format(d, "dd MMM yyyy HH:mm");
}

/** True when the given date is strictly before today (date-only comparison). */
export function isDateExpired(value: string | number | Date | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (!isValid(d)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}
