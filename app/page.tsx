import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 32px',
      fontFamily: 'inherit',
    }}>
      <div style={{ maxWidth: 720, width: '100%', textAlign: 'center' }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 16,
          background: 'linear-gradient(90deg, #facc15, #f97316, #ef4444)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Solar System Simulation
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 48 }}>
          A photorealistic, physics-accurate simulation of our Solar System built with
          real NASA/ESA orbital data and high-quality planet textures.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {/* Solar System card */}
          <div style={{
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 20,
            padding: 24,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {/* Saturn planet SVG */}
            <svg width="44" height="40" viewBox="0 0 48 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="pg" cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor="#f0d080"/>
                  <stop offset="55%" stopColor="#c8842a"/>
                  <stop offset="100%" stopColor="#7a4010"/>
                </radialGradient>
              </defs>
              {/* Back ring */}
              <ellipse cx="24" cy="28" rx="23" ry="6.5" stroke="#b8820a" strokeWidth="2.5" fill="none" opacity="0.45"/>
              {/* Planet */}
              <circle cx="24" cy="22" r="13" fill="url(#pg)"/>
              {/* Surface bands */}
              <ellipse cx="24" cy="19" rx="13" ry="2.5" fill="#7a4010" opacity="0.35"/>
              <ellipse cx="24" cy="24" rx="13" ry="2" fill="#7a4010" opacity="0.25"/>
              {/* Front ring (lower arc over planet) */}
              <path d="M1 28 Q24 38 47 28" stroke="#d4a030" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
            </svg>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Solar System</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, flex: 1, margin: 0, lineHeight: 1.6 }}>
              Explore all 8 planets with accurate elliptical orbits, PBR textures,
              atmospheric effects, and real Keplerian physics.
            </p>
            <Link
              href="/solar"
              style={{
                marginTop: 8,
                display: 'inline-block',
                background: 'linear-gradient(90deg, #eab308, #f97316)',
                color: '#000',
                fontWeight: 600,
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Launch Simulation →
            </Link>
          </div>

          {/* Coming soon card */}
          <div style={{
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 20,
            padding: 24,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            opacity: 0.5,
          }}>
          {/* Rocket SVG */}
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Body */}
              <path d="M22 4C22 4 31 12 31 24H13C13 12 22 4 22 4Z" fill="#374151" stroke="#4b5563" strokeWidth="1"/>
              {/* Nose cone highlight */}
              <path d="M22 4C22 4 27 10 28 18H22V4Z" fill="#4b5563" opacity="0.5"/>
              {/* Window */}
              <circle cx="22" cy="17" r="4" stroke="#6b7280" strokeWidth="1.5"/>
              <circle cx="22" cy="17" r="2" fill="#1f2937"/>
              {/* Left fin */}
              <path d="M13 24L6 34H14V24Z" fill="#1f2937" stroke="#374151" strokeWidth="0.8"/>
              {/* Right fin */}
              <path d="M31 24L38 34H30V24Z" fill="#1f2937" stroke="#374151" strokeWidth="0.8"/>
              {/* Bottom body */}
              <rect x="13" y="24" width="18" height="10" rx="1" fill="#2d3748"/>
              {/* Exhaust flame */}
              <path d="M16 34C16 34 14 40 22 42C30 40 28 34 28 34" fill="#f97316" opacity="0.75"/>
              <path d="M18 34C18 34 17 38 22 40C27 38 26 34 26 34" fill="#facc15" opacity="0.6"/>
            </svg>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Spacecraft Trajectories</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, flex: 1, margin: 0, lineHeight: 1.6 }}>
              Coming soon — Voyager, New Horizons, and other historic mission paths
              plotted through the Solar System.
            </p>
            <span style={{
              display: 'inline-block',
              border: '1px solid #4b5563',
              color: '#6b7280',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: 14,
              cursor: 'not-allowed',
            }}>
              Coming Soon
            </span>
          </div>
        </div>

        <div style={{ marginTop: 48, color: '#4b5563', fontSize: 12 }}>
          Textures from Solar System Scope · Orbital data from NASA JPL Horizons
        </div>
      </div>
    </main>
  );
}
