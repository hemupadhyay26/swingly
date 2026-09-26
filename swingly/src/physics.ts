export interface PendulumState {
  /** Radians from straight down. */
  angle: number;
  /** Radians/second. */
  angularVelocity: number;
}

export interface PendulumConfig {
  /** Arbitrary length unit; larger = slower, wider swing period. */
  length: number;
  gravity: number;
  /** Linear (viscous) damping coefficient. */
  damping: number;
}

/** One damped-pendulum integration step (semi-implicit Euler — stable for this use case). */
export function stepPendulum(state: PendulumState, config: PendulumConfig, dtSeconds: number): PendulumState {
  const { length, gravity, damping } = config;
  const angularAcceleration = -(gravity / length) * Math.sin(state.angle) - damping * state.angularVelocity;
  const angularVelocity = state.angularVelocity + angularAcceleration * dtSeconds;
  const angle = state.angle + angularVelocity * dtSeconds;
  return { angle, angularVelocity };
}

/**
 * Thresholds are deliberately loose (not "basically zero"): angular velocity's peak
 * scales with amplitude * angular frequency (a few rad/s per radian of swing), so a
 * strict near-zero velocity threshold would force the envelope to decay to an
 * imperceptibly tiny amplitude before this ever returns true — producing a long tail
 * of invisible-but-technically-still-swinging motion (looks like it dead-stopped)
 * before handoff to the perpetual idle sway. Settling early, while motion is still
 * small but visible, keeps the transition to idle sway continuous instead.
 */
export function isPendulumSettled(state: PendulumState, angleEpsilon = 0.05, velocityEpsilon = 0.15): boolean {
  return Math.abs(state.angle) < angleEpsilon && Math.abs(state.angularVelocity) < velocityEpsilon;
}
