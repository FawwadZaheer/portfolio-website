import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace, NearestFilter } from 'three'

/**
 * Draws pixel-font text onto a canvas texture (so signs are lit, occluded and crisp).
 * lines: [{ text, size, color? }] drawn top to bottom, centred.
 */
export function useTextTexture({ width = 512, height = 256, bg, fg, lines, border = true }) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    return { canvas, texture }
  }, [width, height])

  const key = JSON.stringify([bg, fg, lines, border])

  useEffect(() => {
    let cancelled = false
    const draw = () => {
      if (cancelled) return
      const c = canvas.getContext('2d')
      c.fillStyle = bg
      c.fillRect(0, 0, width, height)
      if (border) {
        c.strokeStyle = fg
        c.lineWidth = Math.max(6, width / 64)
        c.strokeRect(c.lineWidth, c.lineWidth, width - c.lineWidth * 2, height - c.lineWidth * 2)
      }
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      const total = lines.reduce((a, l) => a + l.size * 1.7, 0)
      let y = (height - total) / 2
      for (const l of lines) {
        c.font = `${l.size}px "Press Start 2P", "Courier New", monospace`
        c.fillStyle = l.color || fg
        y += l.size * 0.85
        c.fillText(l.text, width / 2, y, width * 0.9)
        y += l.size * 0.85
      }
      texture.needsUpdate = true
    }
    draw()
    // redraw once the pixel font has loaded
    document.fonts?.load('32px "Press Start 2P"').then(draw).catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, canvas, texture])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

export function pixelate(tex) {
  tex.magFilter = NearestFilter
  return tex
}
