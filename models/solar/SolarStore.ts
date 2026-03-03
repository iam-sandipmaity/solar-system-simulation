import { create } from 'zustand';

interface SolarState {
  selectedPlanetId: string | null;
  selectedSatelliteId: string | null;
  selectedParentId:    string | null;
  showOrbits: boolean;
  orbitFocus: boolean;
  showAtmosphere: boolean;
  showRotation: boolean;
  showSatelliteOrbits: boolean;
  satelliteFocus: boolean;
  showAsteroidBelt: boolean;
  showUI: boolean;
  cameraView: 'angle' | 'top' | 'side' | 'front' | 'free';
  focusMode: boolean;
  quality: 'low' | 'medium' | 'high';
  cameraMode: 'orbit' | 'free' | 'follow';
  setSelectedPlanet: (id: string | null) => void;
  setSelectedSatellite: (parentId: string | null, satelliteId: string | null) => void;
  toggleOrbits: () => void;
  toggleOrbitFocus: () => void;
  toggleAtmosphere: () => void;
  toggleRotation: () => void;
  toggleSatelliteOrbits: () => void;
  toggleSatelliteFocus: () => void;
  toggleAsteroidBelt: () => void;
  toggleUI: () => void;
  setCameraView: (v: 'angle' | 'top' | 'side' | 'front' | 'free') => void;
  toggleFocusMode: () => void;
  setQuality: (q: 'low' | 'medium' | 'high') => void;
  setCameraMode: (m: 'orbit' | 'free' | 'follow') => void;
}

export const useSolarStore = create<SolarState>((set) => ({
  selectedPlanetId:    null,
  selectedSatelliteId: null,
  selectedParentId:    null,
  showOrbits: true,
  orbitFocus: false,
  showAtmosphere: false,
  showRotation: true,
  showSatelliteOrbits: true,
  satelliteFocus: false,
  showAsteroidBelt: true,
  showUI: true,
  cameraView: 'angle',
  focusMode: true,
  quality: 'high',
  cameraMode: 'orbit',

  setSelectedPlanet: (id) => set({ selectedPlanetId: id, selectedSatelliteId: null, selectedParentId: null }),
  setSelectedSatellite: (parentId, satelliteId) =>
    set({ selectedSatelliteId: satelliteId, selectedParentId: parentId, selectedPlanetId: null }),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleOrbitFocus: () => set((s) => ({ orbitFocus: !s.orbitFocus })),
  toggleAtmosphere: () => set((s) => ({ showAtmosphere: !s.showAtmosphere })),
  toggleRotation: () => set((s) => ({ showRotation: !s.showRotation })),
  toggleSatelliteOrbits: () => set((s) => ({ showSatelliteOrbits: !s.showSatelliteOrbits })),
  toggleSatelliteFocus: () => set((s) => ({ satelliteFocus: !s.satelliteFocus })),
  toggleAsteroidBelt: () => set((s) => ({ showAsteroidBelt: !s.showAsteroidBelt })),
  toggleUI: () => set((s) => ({ showUI: !s.showUI })),
  setCameraView: (v) => set({ cameraView: v }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setQuality: (q) => set({ quality: q }),
  setCameraMode: (m) => set({ cameraMode: m }),
}));
