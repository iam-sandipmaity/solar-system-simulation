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
              Explore all 8 planets — Mercury to Neptune — plus dwarf planets, and
              over 20 moons including the Moon, Titan, Ganymede, Europa, Io, Triton
              and more. Features real-scale elliptical orbits, PBR textures, axial
              tilt, atmospheric glow, asteroid belt, and live Keplerian physics driven
              by NASA JPL orbital data.
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

        {/* Attribution + copyright — in-flow so they never overlap on mobile */}
        <div style={{
          marginTop: 48,
          paddingBottom: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          color: '#4b5563',
          fontSize: 12,
          textAlign: 'center',
          lineHeight: 1.8,
        }}>
          <div>Textures from Solar System Scope · Orbital data from NASA JPL Horizons</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 10,
            color: 'rgba(255,255,255,0.28)',
            fontSize: 11,
            letterSpacing: '0.04em',
            userSelect: 'none',
          }}>
        <span>© {new Date().getFullYear()} Sandip Maity</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <a
          href="https://sandipmaity.me"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}
        >
          sandipmaity.me
        </a>
        <span style={{ opacity: 0.4 }}>·</span>
        <a
          href="https://github.com/iam-sandipmaity/solar-system-simulation"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
              -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
              .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
              -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
              .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
              .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
              0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
          </div>
        </div>
      </div>
    </main>
  );
}

