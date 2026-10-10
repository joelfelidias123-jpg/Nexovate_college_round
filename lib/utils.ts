<<<<<<< HEAD
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
=======
export { cn } from "cn"
>>>>>>> 43677247bb14603ef680a7c448f57d7ec43dcd41
