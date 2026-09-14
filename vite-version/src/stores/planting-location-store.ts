import { create } from "zustand"
import type { MaterialCoordinate } from "@/app/shop/data/planting-material-types"

interface LocationState {
  location: MaterialCoordinate | null
  status: "idle" | "loading" | "ready" | "error"
  message: string
  requestLocation: () => void
  clearLocation: () => void
}

// Deliberately in memory only. Never persist precise coordinates in storage or URLs.
export const usePlantingLocation = create<LocationState>((set) => ({
  location: null, status: "idle", message: "",
  clearLocation: () => set({ location: null, status: "idle", message: "" }),
  requestLocation: () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      set({ status: "error", message: "Location is unavailable in this browser. Choose a country or region below." })
      return
    }
    set({ status: "loading", message: "Finding your location…" })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => set({ location: { latitude: coords.latitude, longitude: coords.longitude }, status: "ready", message: "Nearby suppliers are ordered by straight-line distance." }),
      (error) => set({ status: "error", message: error.code === 1
        ? "Location permission was declined. You can still choose a country or region below."
        : "Your location could not be found. Choose a country or region below." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  },
}))
