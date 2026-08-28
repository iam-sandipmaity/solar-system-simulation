'use client';

import { useSolarStore } from '../SolarStore';
import { spacecraftInfoMap } from '../components/SpacecraftTrajectories';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: '#888', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#eee', fontSize: 12, textAlign: 'right', maxWidth: 160 }}>{value}</span>
    </div>
  );
}

function jdOffsetToDate(jdOff: number): string {
  const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
  const ms = J2000_MS + jdOff * 86_400_000;
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

export function SpacecraftInfoPanel() {
  const { selectedSpacecraftId, setSelectedSpacecraft, showUI } = useSolarStore();

  if (!showUI || !selectedSpacecraftId) return null;

  const info = spacecraftInfoMap.get(selectedSpacecraftId);
  const distStr = info ? `${info.distAU.toFixed(3)} AU` : '…';
  const accent = info?.color ?? '#7ec8ff';

  return (
    <div style={{
      position: 'absolute',
      bottom: 80,
      right: 16,
      width: 290,
      background: 'rgba(0,0,0,0.80)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: 16,
      color: '#fff',
      fontFamily: 'inherit',
      backdropFilter: 'blur(16px)',
      zIndex: 20,
      maxHeight: 'calc(50vh - 80px)',
      overflowY: 'auto',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
            Spacecraft
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{info?.name ?? selectedSpacecraftId}</div>
          <div style={{ fontSize: 12, color: '#f0a030' }}>{info?.agency ?? 'NASA'}</div>
        </div>
        <button
          onClick={() => setSelectedSpacecraft(null)}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: 0 }}
        >
          ×
        </button>
      </div>

      <Row label="Status" value={info?.status ?? '—'} />
      <Row label="Launched" value={info?.launched ?? '—'} />
      <Row label="Target" value={info?.target ?? '—'} />
      <Row label="Distance (Sun)" value={distStr} />
      {info && (
        <>
          <Row label="Ephemeris start" value={jdOffsetToDate(info.jdFirst)} />
          <Row label="Ephemeris end" value={jdOffsetToDate(info.jdLast)} />
          <Row label="Samples" value={info.samples.toLocaleString()} />
        </>
      )}

      {info?.facts && info.facts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Notes
          </div>
          {info.facts.map((fact, i) => (
            <p key={i} style={{ color: '#bbb', fontSize: 12, lineHeight: 1.55, margin: '0 0 8px' }}>
              {fact}
            </p>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 4,
        padding: '6px 9px',
        background: 'rgba(240,160,48,0.07)',
        border: '1px solid rgba(240,160,48,0.18)',
        borderRadius: 8,
        fontSize: 10,
        color: '#aaa',
        lineHeight: 1.6,
      }}>
        Path interpolated from NASA JPL Horizons heliocentric vectors. Before launch the craft is hidden; after the last sample, active missions continue on a linear coast.
      </div>
    </div>
  );
}
