import { db, type Pharmacy } from '@/db'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

const buildOverpassQuery = (bounds?: { south: number; west: number; north: number; east: number }): string => {
    const bbox = bounds
        ? `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
        : '4.0,2.5,14.0,15.0'

    return `
    [out:json][timeout:30];
    (
      node["amenity"="pharmacy"](${bbox});
      way["amenity"="pharmacy"](${bbox});
      node["shop"="chemist"](${bbox});
    );
    out body center;
  `
}

export interface OpenStreetMapPharmacy {
    id: number
    type: string
    lat: number
    lon: number
    tags: {
        name?: string
        'addr:street'?: string
        'addr:city'?: string
        'addr:state'?: string
        'addr:housenumber'?: string
        phone?: string
        opening_hours?: string
        website?: string
    }
    center?: {
        lat: number
        lon: number
    }
}

const parseOSMResponse = (data: any): OpenStreetMapPharmacy[] => {
    if (!data?.elements) return []

    return data.elements.map((el: any) => ({
        id: el.id,
        type: el.type,
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        tags: el.tags || {},
        center: el.center
    }))
}

const osmToPharmacy = (osm: OpenStreetMapPharmacy, index: number): Omit<Pharmacy, 'id'> => {
    const address = [
        osm.tags['addr:housenumber'],
        osm.tags['addr:street']
    ].filter(Boolean).join(' ') || 'Address not available'

    return {
        name: osm.tags.name || `Pharmacy ${index + 1}`,
        address,
        city: osm.tags['addr:city'] || 'Unknown City',
        state: osm.tags['addr:state'] || 'Nigeria',
        latitude: osm.lat,
        longitude: osm.lon,
        phone: osm.tags.phone,
        hours: osm.tags.opening_hours,
        isOpen24Hours: osm.tags.opening_hours?.toLowerCase().includes('24')
    }
}

export const fetchPharmaciesFromOSM = async (
    bounds?: { south: number; west: number; north: number; east: number }
): Promise<Pharmacy[]> => {
    try {
        const query = buildOverpassQuery(bounds)

        const response = await fetch(OVERPASS_API, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`)
        }

        const data = await response.json()
        const osmPharmacies = parseOSMResponse(data)

        const pharmacies = osmPharmacies
            .filter(p => p.lat && p.lon)
            .map((p, i) => osmToPharmacy(p, i))

        return pharmacies as Pharmacy[]
    } catch (error) {
        console.error('Failed to fetch pharmacies from OSM:', error)
        throw error
    }
}

export const refreshPharmacyData = async (): Promise<number> => {
    try {
        const pharmacies = await fetchPharmaciesFromOSM()

        await db.pharmacies.clear()

        for (const pharmacy of pharmacies) {
            await db.pharmacies.add(pharmacy)
        }

        localStorage.setItem('echorx-pharmacies-updated', new Date().toISOString())

        return pharmacies.length
    } catch (error) {
        console.error('Failed to refresh pharmacy data:', error)
        throw error
    }
}

export const fetchNearbyPharmacies = async (
    lat: number,
    lng: number,
    radiusKm: number = 10
): Promise<Pharmacy[]> => {
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))

    const bounds = {
        south: lat - latDelta,
        west: lng - lngDelta,
        north: lat + latDelta,
        east: lng + lngDelta
    }

    return fetchPharmaciesFromOSM(bounds)
}

export const getLastUpdateTime = (): Date | null => {
    const timestamp = localStorage.getItem('echorx-pharmacies-updated')
    return timestamp ? new Date(timestamp) : null
}

export const shouldRefreshData = (): boolean => {
    const lastUpdate = getLastUpdateTime()
    if (!lastUpdate) return true

    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceUpdate > 7
}
