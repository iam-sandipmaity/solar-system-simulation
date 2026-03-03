import type { Metadata } from 'next';
import { Rajdhani } from 'next/font/google';
import './globals.css';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Solar System Simulation',
  description: 'Photorealistic, physics-accurate Solar System simulation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={rajdhani.variable}>
      <body>{children}</body>
    </html>
  );
}
