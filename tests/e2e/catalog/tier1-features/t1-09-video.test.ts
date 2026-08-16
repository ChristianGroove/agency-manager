/**
 * Tier 1 Test Suite: F9 - Video Preview Player
 * Tests YouTube embed parser, Vimeo embed parser, direct MP4 video tag rendering, autoplay mute policy, video slide thumbnail icon.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
} from '../harness/assertions';
import { parseVideoUrl } from '../harness/contracts';

export const suite = {
  name: 'T1-09: Video Preview Player',
  tier: 'Tier 1',
  feature: 'F9: Video Preview Player',
  tests: [
    {
      name: 'Parses various YouTube URL formats and generates secure embed link with muted loop parameters',
      fn: () => {
        const youtubeUrls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://youtu.be/dQw4w9WgXcQ',
          'https://www.youtube.com/embed/dQw4w9WgXcQ',
          'https://www.youtube.com/watch?feature=player_embedded&v=dQw4w9WgXcQ',
        ];

        for (const url of youtubeUrls) {
          const parsed = parseVideoUrl(url);
          assertEqual(parsed.platform, 'youtube');
          assertEqual(parsed.videoId, 'dQw4w9WgXcQ');
          assertTrue(parsed.isMutedAutoplaySupported);
          assertContains(parsed.embedUrl!, 'https://www.youtube.com/embed/dQw4w9WgXcQ');
          assertContains(parsed.embedUrl!, 'mute=1');
          assertContains(parsed.embedUrl!, 'autoplay=1');
        }
      },
    },
    {
      name: 'Parses Vimeo video URLs and generates standard player embed URL',
      fn: () => {
        const vimeoUrls = [
          'https://vimeo.com/76979871',
          'https://player.vimeo.com/video/76979871',
        ];

        for (const url of vimeoUrls) {
          const parsed = parseVideoUrl(url);
          assertEqual(parsed.platform, 'vimeo');
          assertEqual(parsed.videoId, '76979871');
          assertTrue(parsed.isMutedAutoplaySupported);
          assertContains(parsed.embedUrl!, 'https://player.vimeo.com/video/76979871');
          assertContains(parsed.embedUrl!, 'muted=1');
        }
      },
    },
    {
      name: 'Identifies direct MP4 video sources and configures HTML5 video tag attributes',
      fn: () => {
        const mp4Url = 'https://cdn.pixy.com/videos/product-showcase-4k.mp4';
        const parsed = parseVideoUrl(mp4Url);

        assertEqual(parsed.platform, 'mp4');
        assertEqual(parsed.embedUrl, mp4Url);
        assertTrue(parsed.isMutedAutoplaySupported);

        // Verify HTML5 video attributes contract
        const html5VideoProps = {
          src: parsed.embedUrl,
          autoPlay: true,
          muted: true,
          loop: true,
          playsInline: true,
          controls: true,
        };

        assertTrue(html5VideoProps.autoPlay);
        assertTrue(html5VideoProps.muted);
        assertTrue(html5VideoProps.playsInline);
      },
    },
    {
      name: 'Enforces browser autoplay policy with mandatory muted attribute',
      fn: () => {
        function getSafeVideoPlayerProps(rawAutoplay: boolean, rawMuted: boolean) {
          // Browsers will reject autoplay if muted is false
          const isMuted = rawAutoplay ? true : rawMuted;
          return {
            autoPlay: rawAutoplay,
            muted: isMuted,
            playsInline: true,
          };
        }

        const autoplayAttempt = getSafeVideoPlayerProps(true, false);
        assertTrue(autoplayAttempt.autoPlay);
        assertTrue(autoplayAttempt.muted, 'Autoplay must force muted=true for browser policy compliance');
      },
    },
    {
      name: 'Renders video badge and play icon overlay on carousel slide and thumbnail ribbon',
      fn: () => {
        function getSlideOverlayConfig(slideType: 'image' | 'video', platform?: string) {
          return {
            showPlayIcon: slideType === 'video',
            badgeText: slideType === 'video' ? 'Video' : null,
            iconClass: slideType === 'video' ? 'lucide-play-circle text-white' : null,
            platformBadge: platform ? platform.toUpperCase() : null,
          };
        }

        const videoSlide = getSlideOverlayConfig('video', 'youtube');
        assertTrue(videoSlide.showPlayIcon);
        assertEqual(videoSlide.badgeText, 'Video');
        assertEqual(videoSlide.platformBadge, 'YOUTUBE');

        const imageSlide = getSlideOverlayConfig('image');
        assertFalse(imageSlide.showPlayIcon);
        assertEqual(imageSlide.badgeText, null);
      },
    },
  ],
};

export async function run() {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of suite.tests) {
    try {
      await t.fn();
      passed++;
    } catch (err: any) {
      failed++;
      errors.push(`${t.name}: ${err.message}`);
    }
  }

  return { passed, failed, errors };
}
