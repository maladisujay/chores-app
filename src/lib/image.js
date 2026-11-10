// Downscale + re-encode photos on the device before upload (fast on mobile data,
// tiny storage use, strips EXIF/location metadata).
export async function compressImage(file, maxSide = 1600, quality = 0.8) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    bitmap = await new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = () => rej(new Error("Couldn't read that image. Try a different photo."))
      img.src = URL.createObjectURL(file)
    })
  }
  const w = bitmap.width, h = bitmap.height
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
  if (!blob) throw new Error("Couldn't process that image.")
  return blob
}
