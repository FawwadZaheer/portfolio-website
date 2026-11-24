import { useEffect, useState } from 'react'
import { Color } from 'three'

/** Reads the site's 4-colour palette from CSS variables and follows the theme switcher. */
function readPalette() {
  const cs = getComputedStyle(document.documentElement)
  const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback
  const lightest = get('--lightest', '#e0f8d0')
  const light = get('--light', '#88c070')
  const dark = get('--dark', '#346856')
  const darkest = get('--darkest', '#081820')
  const mix = (a, b, t) => '#' + new Color(a).lerp(new Color(b), t).getHexString()
  // Night theme flips light/dark; detect it so the sky stays dark there.
  const isNight = new Color(lightest).getHSL({}).l < 0.3
  return {
    lightest,
    light,
    dark,
    darkest,
    mix,
    isNight,
    sky: lightest,
    grass: light,
    grassDark: mix(light, dark, 0.35),
    path: mix(lightest, light, 0.45),
    water: mix(dark, darkest, 0.25),
    waterLight: mix(dark, light, 0.4),
    sand: mix(lightest, light, 0.25),
    wood: mix(dark, darkest, 0.45),
    stone: mix(light, dark, 0.6),
  }
}

export function usePalette() {
  const [palette, setPalette] = useState(readPalette)
  useEffect(() => {
    const obs = new MutationObserver(() => setPalette(readPalette()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return palette
}
