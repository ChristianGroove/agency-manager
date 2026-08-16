import { describe, it, expect } from "vitest"
import {
    computeZoomPosition,
    parseAndSanitizeVideoUrl,
    initializeCarousel,
    navigateCarousel,
    clampPinchScale,
    getClippedLensPosition,
    getZoomImageSource,
    ZoomCoordinates,
    CarouselState
} from "./gallery-carousel"

describe("GalleryCarousel Adversarial & Unit Test Suite", () => {
    describe("Swipe gestures, navigation and boundary wrapping", () => {
        const sampleState: CarouselState = {
            images: [
                { id: "img-1", url: "https://example.com/1.jpg", order_index: 0, is_cover: true },
                { id: "img-2", url: "https://example.com/2.jpg", order_index: 1, is_cover: false },
                { id: "img-3", url: "https://example.com/3.jpg", order_index: 2, is_cover: false },
            ],
            currentIndex: 2,
            showArrows: true,
            showThumbnails: true,
            isFallbackPlaceholder: false,
        }

        it("wraps to 0 when navigating next from the last slide ((current + 1) % total)", () => {
            const next = navigateCarousel(sampleState, "next")
            expect(next.currentIndex).toBe(0)
        })

        it("wraps to last index when navigating prev from index 0", () => {
            const startState = { ...sampleState, currentIndex: 0 }
            const prev = navigateCarousel(startState, "prev")
            expect(prev.currentIndex).toBe(2)
        })

        it("clamps numeric slide index within valid bounds", () => {
            const over = navigateCarousel(sampleState, 99)
            expect(over.currentIndex).toBe(2)

            const under = navigateCarousel(sampleState, -10)
            expect(under.currentIndex).toBe(0)
        })
    })

    describe("Edge cases: Zero photos and Single photo", () => {
        it("handles zero photos gracefully with fallback placeholder without crashing", () => {
            const emptyState = initializeCarousel([])
            expect(emptyState.images).toHaveLength(1)
            expect(emptyState.images[0].url).toContain("fallback-item.webp")
            expect(emptyState.showArrows).toBe(false)
            expect(emptyState.showThumbnails).toBe(false)
            expect(emptyState.isFallbackPlaceholder).toBe(true)
        })

        it("handles undefined or null photos array with fallback", () => {
            const nullState = initializeCarousel(undefined as any)
            expect(nullState.images).toHaveLength(1)
            expect(nullState.isFallbackPlaceholder).toBe(true)
            expect(nullState.showArrows).toBe(false)
        })

        it("hides navigation arrows and thumbnail strip for single photo item", () => {
            const singleState = initializeCarousel([
                { id: "single", url: "https://example.com/single.jpg", is_cover: true, order_index: 0 }
            ])
            expect(singleState.showArrows).toBe(false)
            expect(singleState.showThumbnails).toBe(false)
            expect(singleState.isFallbackPlaceholder).toBe(false)
        })
    })

    describe("Image Zoom & Magnifier lens calculations", () => {
        const container: ZoomCoordinates = {
            x: 300,
            y: 200,
            containerWidth: 600,
            containerHeight: 400
        }

        it("normalises coordinates to percentage clamped [0, 100%]", () => {
            const center = computeZoomPosition(container, 2.5, false)
            expect(center.enabled).toBe(true)
            expect(center.bgPositionXPercent).toBe(50)
            expect(center.bgPositionYPercent).toBe(50)

            const outOfBoundsLeft = computeZoomPosition({ ...container, x: -100 }, 2.5, false)
            expect(outOfBoundsLeft.bgPositionXPercent).toBe(0)

            const outOfBoundsRight = computeZoomPosition({ ...container, x: 9999 }, 2.5, false)
            expect(outOfBoundsRight.bgPositionXPercent).toBe(100)
        })

        it("clips 150px lens within [0, containerSize - lensSize]", () => {
            const lensSize = 150
            const containerWidth = 600
            const maxPos = containerWidth - lensSize // 450

            expect(getClippedLensPosition(0, lensSize, containerWidth)).toBe(0)
            expect(getClippedLensPosition(75, lensSize, containerWidth)).toBe(0)
            expect(getClippedLensPosition(300, lensSize, containerWidth)).toBe(225)
            expect(getClippedLensPosition(600, lensSize, containerWidth)).toBe(maxPos)
            expect(getClippedLensPosition(900, lensSize, containerWidth)).toBe(maxPos)
        })

        it("clamps mobile pinch scale strictly between 1.0x and 3.5x", () => {
            expect(clampPinchScale(0.1)).toBe(1.0)
            expect(clampPinchScale(1.0)).toBe(1.0)
            expect(clampPinchScale(2.5)).toBe(2.5)
            expect(clampPinchScale(3.5)).toBe(3.5)
            expect(clampPinchScale(5.0)).toBe(3.5)
        })

        it("disables zoom strictly on video slides", () => {
            const videoZoom = computeZoomPosition(container, 2.5, true)
            expect(videoZoom.enabled).toBe(false)
            expect(videoZoom.zoomScale).toBe(1.0)
        })

        it("swaps Unsplash images to high-resolution master asset on zoom", () => {
            const url = "https://images.unsplash.com/photo-1?w=1200&q=80"
            const zoomed = getZoomImageSource(true, url)
            expect(zoomed).toContain("w=3000")
            expect(zoomed).toContain("q=100")

            const normal = getZoomImageSource(false, url)
            expect(normal).toBe(url)
        })
    })

    describe("Video URL parsing and sanitization", () => {
        it("parses standard and short YouTube URLs into nocookie embeds with autoplay & mute", () => {
            const ytStandard = parseAndSanitizeVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
            expect(ytStandard.isValid).toBe(true)
            expect(ytStandard.platform).toBe("youtube")
            expect(ytStandard.videoId).toBe("dQw4w9WgXcQ")
            expect(ytStandard.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1")

            const ytShort = parseAndSanitizeVideoUrl("https://youtu.be/dQw4w9WgXcQ")
            expect(ytShort.isValid).toBe(true)
            expect(ytShort.videoId).toBe("dQw4w9WgXcQ")

            const ytEmbed = parseAndSanitizeVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")
            expect(ytEmbed.isValid).toBe(true)
            expect(ytEmbed.videoId).toBe("dQw4w9WgXcQ")
        })

        it("parses Vimeo URLs and injects dnt=1 privacy parameter", () => {
            const vimeo = parseAndSanitizeVideoUrl("https://vimeo.com/76979871")
            expect(vimeo.isValid).toBe(true)
            expect(vimeo.platform).toBe("vimeo")
            expect(vimeo.videoId).toBe("76979871")
            expect(vimeo.embedUrl).toBe("https://player.vimeo.com/video/76979871?dnt=1&autoplay=1&muted=1&playsinline=1")
        })

        it("handles direct MP4 and WebM video files", () => {
            const mp4 = parseAndSanitizeVideoUrl("https://cdn.example.com/video.mp4")
            expect(mp4.isValid).toBe(true)
            expect(mp4.platform).toBe("mp4")

            const webm = parseAndSanitizeVideoUrl("https://cdn.example.com/clip.webm")
            expect(webm.isValid).toBe(true)
            expect(webm.platform).toBe("mp4")
        })

        it("rejects audio-only links (Spotify, SoundCloud, MP3)", () => {
            const spotify = parseAndSanitizeVideoUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")
            expect(spotify.isValid).toBe(false)
            expect(spotify.error).toContain("Audio-only links are not supported")

            const soundcloud = parseAndSanitizeVideoUrl("https://soundcloud.com/artist/track")
            expect(soundcloud.isValid).toBe(false)
            expect(soundcloud.error).toContain("Audio-only links are not supported")

            const mp3 = parseAndSanitizeVideoUrl("https://example.com/audio.mp3")
            expect(mp3.isValid).toBe(false)
            expect(mp3.error).toContain("Audio-only links are not supported")
        })

        it("rejects invalid, malformed, or empty URLs", () => {
            expect(parseAndSanitizeVideoUrl("").isValid).toBe(false)
            expect(parseAndSanitizeVideoUrl(undefined).isValid).toBe(false)
            expect(parseAndSanitizeVideoUrl("https://example.com/page.html").isValid).toBe(false)
        })
    })
})
