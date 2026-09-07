export interface GridPosition {
  x: number;
  y: number;
}

export interface MoveDirection {
  dy: number;
  dx: number;
}

/** Return a movement direction only when target is orthogonally adjacent. */
export function getMoveDirection(
  current: GridPosition,
  target: GridPosition,
): MoveDirection | null {
  const dy = target.y - current.y;
  const dx = target.x - current.x;

  if (Math.abs(dy) + Math.abs(dx) !== 1) return null;
  return { dy, dx };
}
