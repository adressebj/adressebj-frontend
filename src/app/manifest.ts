import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AdresseBJ',
    short_name: 'AdresseBJ',
    description: 'Ton adresse numérique au Bénin',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF7F1',
    theme_color: '#0E6B43',
    orientation: 'portrait',
    lang: 'fr',
    categories: ['utilities', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
