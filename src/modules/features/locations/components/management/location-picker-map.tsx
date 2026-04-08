"use client"

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for Leaflet default icon issues in Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

interface LocationPickerMapProps {
    lat: number
    lng: number
    radius: number
    onChange: (lat: number, lng: number) => void
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
        map.setView(center, map.getZoom())
    }, [center, map])
    return null
}

function LocationMarker({ lat, lng, radius, onChange }: LocationPickerMapProps) {
    const map = useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng)
        },
    })

    return (
        <>
            <Marker
                position={[lat, lng]}
                icon={DefaultIcon}
                draggable={true}
                eventHandlers={{
                    dragend: (e) => {
                        const marker = e.target
                        const position = marker.getLatLng()
                        onChange(position.lat, position.lng)
                    }
                }}
            />
            <Circle
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                    fillColor: '#10b981',
                    fillOpacity: 0.2,
                    color: '#10b981',
                    weight: 2,
                    dashArray: '5, 5'
                }}
            />
        </>
    )
}

export default function LocationPickerMap({ lat, lng, radius, onChange }: LocationPickerMapProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return <div className="w-full h-48 bg-slate-100 rounded-xl animate-pulse" />

    return (
        <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 z-0">
            <MapContainer
                center={[lat, lng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <LocationMarker lat={lat} lng={lng} radius={radius} onChange={onChange} />
                <MapUpdater center={[lat, lng]} />
            </MapContainer>
        </div>
    )
}
