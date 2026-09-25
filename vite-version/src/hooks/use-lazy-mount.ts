import { useEffect, useRef, useState } from "react"

/**
 * Mounts an expensive child (a Leaflet map instance, in practice) only once the element scrolls
 * near the viewport, then keeps it mounted permanently — avoids initializing every map on a page
 * with several of them at once (WebGL/DOM cost, network requests) while never thrashing an
 * already-mounted map. `rootMargin` widens the trigger area so mounting starts slightly before
 * the element is actually visible.
 */
export function useLazyMount<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T | null>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (shouldMount) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin, shouldMount])

  return { ref, shouldMount }
}
