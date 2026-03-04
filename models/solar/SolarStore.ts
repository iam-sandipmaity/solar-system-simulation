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
  hideSiblingOrbits: boolean;
  showAsteroidBelt: boolean;
  highlightFocusOrbit: boolean;
  showLabels: boolean;
  showUI: boolean;
  cameraView: 'angle' | 'top' | 'side' | 'front' | 'free';
  focusMode: boolean;
  quality: 'low' | 'medium' | 'high';
  cameraMode: 'orbit' | 'free' | 'follow';
  cameraDistance: number;          // current camera→target distance in world units (read-only from CameraController)
  setSelectedPlanet: (id: string | null) => void;
  setSelectedSatellite: (parentId: string | null, satelliteId: string | null) => void;
  toggleOrbits: () => void;
  toggleOrbitFocus: () => void;
  toggleAtmosphere: () => void;
  toggleRotation: () => void;
  toggleSatelliteOrbits: () => void;
  toggleSatelliteFocus: () => void;
  toggleHideSiblingOrbits: () => void;
  toggleAsteroidBelt: () => void;
  toggleHighlightFocusOrbit: () => void;
  toggleShowLabels: () => void;
  toggleUI: () => void;
  setCameraView: (v: 'angle' | 'top' | 'side' | 'front' | 'free') => void;
  toggleFocusMode: () => void;
  setQuality: (q: 'low' | 'medium' | 'high') => void;
  setCameraMode: (m: 'orbit' | 'free' | 'follow') => void;
  setCameraDistance: (d: number) => void;
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
  hideSiblingOrbits: false,
  showAsteroidBelt: true,
  highlightFocusOrbit: true,
  showLabels: true,
  showUI: true,
  cameraView: 'angle',
  focusMode: true,
  quality: 'high',
  cameraMode: 'orbit',
  cameraDistance: 150,

  setSelectedPlanet: (id) => set({ selectedPlanetId: id, selectedSatelliteId: null, selectedParentId: null }),
  setSelectedSatellite: (parentId, satelliteId) =>
    set({ selectedSatelliteId: satelliteId, selectedParentId: parentId, selectedPlanetId: null }),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleOrbitFocus: () => set((s) => ({ orbitFocus: !s.orbitFocus })),
  toggleAtmosphere: () => set((s) => ({ showAtmosphere: !s.showAtmosphere })),
  toggleRotation: () => set((s) => ({ showRotation: !s.showRotation })),
  toggleSatelliteOrbits: () => set((s) => ({ showSatelliteOrbits: !s.showSatelliteOrbits })),
  toggleSatelliteFocus: () => set((s) => ({ satelliteFocus: !s.satelliteFocus })),
  toggleHideSiblingOrbits: () => set((s) => ({ hideSiblingOrbits: !s.hideSiblingOrbits })),
  toggleAsteroidBelt: () => set((s) => ({ showAsteroidBelt: !s.showAsteroidBelt })),
  toggleHighlightFocusOrbit: () => set((s) => ({ highlightFocusOrbit: !s.highlightFocusOrbit })),
  toggleShowLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleUI: () => set((s) => ({ showUI: !s.showUI })),
  setCameraView: (v) => set({ cameraView: v }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setQuality: (q) => set({ quality: q }),
  setCameraMode: (m) => set({ cameraMode: m }),
  setCameraDistance: (d) => set({ cameraDistance: d }),
}));
