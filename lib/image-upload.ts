import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', extension: 'jpg', matches: (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', extension: 'png', matches: (b: Buffer) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/gif', extension: 'gif', matches: (b: Buffer) => b.length >= 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii')) },
  { mime: 'image/webp', extension: 'webp', matches: (b: Buffer) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
] as const

export async function saveEventImage(file: File): Promise<string> {
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error('File size must be between 1 byte and 5 MB')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = IMAGE_SIGNATURES.find(signature => signature.matches(buffer))
  if (!detected || file.type !== detected.mime) {
    throw new Error('File content is not a supported JPEG, PNG, WebP, or GIF image')
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'events')
  await mkdir(uploadDir, { recursive: true })

  const safeName = `${randomUUID()}.${detected.extension}`
  await writeFile(path.join(uploadDir, safeName), buffer, { flag: 'wx' })
  return `/uploads/events/${safeName}`
}
