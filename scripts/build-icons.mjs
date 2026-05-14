import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dirname, '..', 'public')
const SVG = resolve(PUBLIC, 'favicon.svg')
const SIZES = [16, 32, 48, 128]

const svgBuffer = readFileSync(SVG)

for (const size of SIZES) {
  const out = resolve(PUBLIC, `icon-${size}.png`)
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out)
  console.log(`  wrote ${out} (${size}x${size})`)
}
console.log('done')
