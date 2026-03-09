import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const SPLASH_DIR = path.join(PUBLIC_DIR, 'splash');
const ICON_SVG = path.join(ICONS_DIR, 'icon.svg');

const ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

const SPLASH_SCREENS = [
    { w: 1290, h: 2796, name: 'apple-splash-1290x2796.png' },
    { w: 1170, h: 2532, name: 'apple-splash-1170x2532.png' },
    { w: 750, h: 1334, name: 'apple-splash-750x1334.png' },
    { w: 1668, h: 2388, name: 'apple-splash-1668x2388.png' },
];

async function generateAssets() {
    console.log('Generating PWA Icons...');
    const svgBuffer = await fs.readFile(ICON_SVG);

    // 1. Generate normal icons
    for (const size of ICON_SIZES) {
        const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}x${size}.png`;
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(ICONS_DIR, filename));
        console.log(`Created ${filename}`);
    }

    // 2. Generate shortcut icons (we'll just use 96x96 with a smaller inner icon)
    // For shortcuts, we'll just reuse 96x96 for now to keep it simple
    await fs.copyFile(path.join(ICONS_DIR, 'icon-96v96.png'.replace('v', 'x')), path.join(ICONS_DIR, 'shortcut-dashboard.png'));
    await fs.copyFile(path.join(ICONS_DIR, 'icon-96v96.png'.replace('v', 'x')), path.join(ICONS_DIR, 'shortcut-feedback.png'));
    await fs.copyFile(path.join(ICONS_DIR, 'icon-96v96.png'.replace('v', 'x')), path.join(ICONS_DIR, 'shortcut-upload.png'));

    // 3. Generate splash screens
    console.log('Generating iOS Splash Screens...');
    for (const screen of SPLASH_SCREENS) {
        // Determine the shorter side for icon size
        const iconSize = Math.floor(Math.min(screen.w, screen.h) * 0.3);

        // Create background with gradient (we'll do a solid color for simplicity using sharp, or we can composite)
        // Sharp SVG composition
        const bgSvg = `<svg width="${screen.w}" height="${screen.h}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${screen.w}" height="${screen.h}" fill="url(#grad)" />
    </svg>`;

        const resizedIconBuffer = await sharp(svgBuffer)
            .resize(iconSize, iconSize)
            .toBuffer();

        await sharp(Buffer.from(bgSvg))
            .composite([{ input: resizedIconBuffer, gravity: 'center' }])
            .png()
            .toFile(path.join(SPLASH_DIR, screen.name));

        console.log(`Created ${screen.name}`);
    }

    console.log('✅ PWA asset generation complete.');
}

generateAssets().catch(console.error);
