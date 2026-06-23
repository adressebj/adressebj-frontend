// Génère les icônes PWA + favicon à partir du glyphe de marque officiel
// (le « pin-A » de src/components/ui/Logo.tsx) — pin goutte de localisation,
// « A » à l'intérieur, barre or. Couleurs depuis globals.css.
//
// Sortie : public/icons/icon-{192,512}.png (arrondies), icon-512-maskable.png
// (plein cadre + zone de sécurité), src/app/apple-icon.png, et le PNG source
// du favicon (converti en .ico via ImageMagick par le script appelant).
//
// Usage : node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const C = {
  primary: '#0E6B43',
  light: '#1F9E66',
  dark: '#073D26',
  ivory: '#FAF7F1',
  gold: '#E0A92E',
};

// Le glyphe vit dans un viewBox 0 0 30 34. On le centre dans un carré `size`,
// à la hauteur `glyphH` (px). `maskable` → fond plein cadre carré (le système
// applique son propre masque) ; sinon coins arrondis (squircle) pour les
// plateformes qui affichent l'icône telle quelle (Windows, favicon).
function buildSvg({ size, glyphH, maskable }) {
  const scale = glyphH / 34;
  const gw = 30 * scale;
  const tx = (size - gw) / 2;
  const ty = (size - glyphH) / 2;
  const radius = maskable ? 0 : Math.round(size * 0.22);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.light}"/>
      <stop offset="55%" stop-color="${C.primary}"/>
      <stop offset="100%" stop-color="${C.dark}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#bg)"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <path d="M15 33 C 13 30.5, 4 23.5, 2 15 A 13 13 0 1 1 28 15 C 26 23.5, 17 30.5, 15 33 Z" fill="${C.ivory}"/>
    <path d="M7.5 23 L15 6 L22.5 23" fill="none" stroke="${C.primary}" stroke-width="${3.4}" stroke-linecap="round" stroke-linejoin="round" transform="scale(1)"/>
    <path d="M9.9 17.5 L20.1 17.5" fill="none" stroke="${C.gold}" stroke-width="${3.4}" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function png(svg, out, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log('✔', out.replace(root + '/', ''));
}

await mkdir(resolve(root, 'public/icons'), { recursive: true });

// Icônes « any » (arrondies) — glyphe à ~62 % de la hauteur.
const regular512 = buildSvg({ size: 512, glyphH: 320, maskable: false });
await png(regular512, resolve(root, 'public/icons/icon-512.png'), 512);
await png(regular512, resolve(root, 'public/icons/icon-192.png'), 192);

// Icône maskable — plein cadre, glyphe à ~55 % (dans la zone de sécurité 80 %).
const maskable = buildSvg({ size: 512, glyphH: 280, maskable: true });
await png(maskable, resolve(root, 'public/icons/icon-512-maskable.png'), 512);

// apple-touch-icon (iOS arrondit lui-même) — variante arrondie, 180.
await png(regular512, resolve(root, 'src/app/apple-icon.png'), 180);

// Le favicon (src/app/favicon.ico) se génère depuis icon-512.png via ImageMagick :
//   convert public/icons/icon-512.png -define icon:auto-resize=16,32,48,64 src/app/favicon.ico
