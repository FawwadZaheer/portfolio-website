import { useEffect, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useTypewriter(text, speed = 45) {
  const reduce = prefersReducedMotion()
  const [count, setCount] = useState(reduce ? text.length : 0)

  useEffect(() => {
    if (reduce) return
    setCount(0)
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id)
          return c
        }
        return c + 1
      })
    }, speed)
    return () => clearInterval(id)
  }, [text, speed, reduce])

  return text.slice(0, count)
}

/** True while the element is (nearly) on screen. Used to pause WebGL rendering off-screen. */
export function useInView(ref, rootMargin = '120px') {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return inView
}

/** Id of the section currently under the sticky header, for the nav's active state. */
export function useScrollSpy(ids) {
  const [active, setActive] = useState(null)
  const key = ids.join(',')
  useEffect(() => {
    const els = key.split(',').map((id) => document.getElementById(id)).filter(Boolean)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const visible = new Map()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting))
        const first = els.find((el) => visible.get(el.id))
        setActive(first ? first.id : null)
      },
      // A thin band just below the header: whichever section crosses it is "current".
      { rootMargin: '-30% 0px -60% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [key])
  return active
}

/**
 * Fades elements marked .reveal in as they scroll into view. Content is only hidden once this
 * has run (html.reveal-ready), so the page is fully readable without JavaScript, and nothing
 * moves for people who ask for reduced motion.
 */
export function useReveal() {
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return
    const root = document.documentElement
    const els = [...document.querySelectorAll('.reveal:not(.is-visible)')]
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('is-visible')
          io.unobserve(e.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    // Anything already on screen shows immediately, without animating.
    const vh = window.innerHeight
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < vh) el.classList.add('is-visible')
      else io.observe(el)
    })
    root.classList.add('reveal-ready')
    return () => {
      io.disconnect()
      root.classList.remove('reveal-ready')
      els.forEach((el) => el.classList.add('is-visible'))
    }
  }, [])
}
