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
  GRID_SIZE: 20, // Grid size for snap-to-grid feature (matches background dot pattern)
}

/**
 * Snap a position to the nearest grid point
 */
export function snapToGrid(x: number, y: number, gridSize: number = CONFIG.GRID_SIZE): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}