import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fees Hisab — Tuition Fee Management for Teachers',
  description: 'Simple, fast, and accurate tuition fee management for individual teachers. Har Fee. Har Student. Pure Hisab.',
  icons: {
    icon: '/logo.jpg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
