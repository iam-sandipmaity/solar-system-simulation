import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size    = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        🪐
      </div>
    ),
    { width: 32, height: 32 },
  );
}
