import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CONFIG = {
    TABLE_WIDTH: 256,
    TABLE_HEIGHT: 200,
    TABLE_PADDING: 24,
    ENUM_WIDTH: 192,
    ENUM_HEIGHT: 128,
    ENUM_PADDING: 24,
}