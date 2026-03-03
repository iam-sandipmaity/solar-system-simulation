import { create } from 'zustand';

interface TimeState {
  simulationDays: number;    // days elapsed since epoch
  timeScale: number;         // simulation days per real second
  paused: boolean;
  setTimeScale: (scale: number) => void;
  setPaused: (paused: boolean) => void;
  tick: (realDeltaSeconds: number) => void;
  reset: () => void;
}

// J2000 epoch = Jan 1.5 2000 (Jan 1, 2000, 12:00 TT)
// Days from J2000 to current date (March 3, 2026)
const J2000_TO_NOW_DAYS = 9558; // approximate

export const useTimeStore = create<TimeState>((set) => ({
  simulationDays: J2000_TO_NOW_DAYS,
  timeScale: 1,       // 1 sim-day per real second (slow, user can increase)
  paused: false,

  setTimeScale: (scale) => set({ timeScale: scale }),
  setPaused: (paused) => set({ paused }),
  tick: (realDeltaSeconds) =>
    set((state) =>
      state.paused
        ? state
        : { simulationDays: state.simulationDays + realDeltaSeconds * state.timeScale },
    ),
  reset: () => set({ simulationDays: J2000_TO_NOW_DAYS }),
}));

/** Convert simulation days since J2000 to a human-readable date string */
export function simDaysToDate(simDays: number): string {
  const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const ms = j2000.getTime() + simDays * 86_400_000;
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
