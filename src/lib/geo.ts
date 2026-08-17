// Chernihiv, Ukraine default coords
export const DEFAULT_LAT = 51.4930
export const DEFAULT_LNG = 31.2945

export interface Coords {
  lat: number
  lng: number
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: DEFAULT_LAT, lng: DEFAULT_LNG }),
      { timeout: 8000 }
    )
  })
}
