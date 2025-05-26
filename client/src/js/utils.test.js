import { describe, it, expect } from 'vitest';

// Simple utility functions for testing
export const calculateDistance = (pos1, pos2) => {
  const dx = pos1.x - pos2.x;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dz * dz);
};

export const isWithinBounds = (position, bounds) => Math.abs(position.x) <= bounds && Math.abs(position.z) <= bounds;

// Tests
describe('Game Utilities', () => {
  it('should calculate distance correctly', () => {
    const pos1 = { x: 0, z: 0 };
    const pos2 = { x: 3, z: 4 };
    const distance = calculateDistance(pos1, pos2);
    expect(distance).toBe(5);
  });

  it('should check bounds correctly', () => {
    const position = { x: 10, z: 15 };
    expect(isWithinBounds(position, 20)).toBe(true);
    expect(isWithinBounds(position, 5)).toBe(false);
  });
}); 