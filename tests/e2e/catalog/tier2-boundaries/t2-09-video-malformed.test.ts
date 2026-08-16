/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-09-video-malformed
 * Feature: F9 - Video Preview Player
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface VideoEmbedResult {
  isValid: boolean;
  provider?: 'youtube' | 'vimeo' | 'mp4';
  embedUrl?: string;
  sandboxAttributes?: string;
  error?: string;
}

export function parseAndSanitizeVideoUrl(rawUrl?: string): VideoEmbedResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Video URL is required' };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.includes('spotify.com') || trimmed.includes('soundcloud.com') || trimmed.endsWith('.mp3')) {
    return { isValid: false, error: 'Audio-only links are not supported as product video previews' };
  }

  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      isValid: true,
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      sandboxAttributes: 'allow-scripts allow-same-origin allow-presentation allow-popups',
    };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      isValid: true,
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1`,
      sandboxAttributes: 'allow-scripts allow-same-origin allow-presentation',
    };
  }

  if (trimmed.match(/^https?:\/\/.+\.mp4(?:\?.*)?$/i)) {
    return {
      isValid: true,
      provider: 'mp4',
      embedUrl: encodeURI(trimmed),
    };
  }

  return { isValid: false, error: `Invalid or unsupported video URL format: ${trimmed}` };
}

export const suite = {
  name: 'T2-09: Video Player URL Hardening & Iframe Sandbox',
  tier: 'Tier 2',
  feature: 'F9: Video Preview Player',
  tests: [
    {
      name: 'Invalid YouTube URL string is rejected with descriptive error',
      fn: async () => {
        const res = parseAndSanitizeVideoUrl('https://youtube.com/not-a-valid-video');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Invalid or unsupported video URL format');
      },
    },
    {
      name: 'Valid YouTube standard and short URL formats generate secure nocookie embed URLs',
      fn: async () => {
        const resStandard = parseAndSanitizeVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(resStandard.isValid).toBe(true);
        expect(resStandard.provider).toBe('youtube');
        expect(resStandard.embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');

        const resShort = parseAndSanitizeVideoUrl('https://youtu.be/dQw4w9WgXcQ');
        expect(resShort.isValid).toBe(true);
        expect(resShort.embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      },
    },
    {
      name: 'Audio-only links (Spotify/Soundcloud/MP3) are rejected',
      fn: async () => {
        const resAudio = parseAndSanitizeVideoUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
        expect(resAudio.isValid).toBe(false);
        expect(resAudio.error).toContain('Audio-only links are not supported');

        const resMp3 = parseAndSanitizeVideoUrl('https://example.com/podcast.mp3');
        expect(resMp3.isValid).toBe(false);
        expect(resMp3.error).toContain('Audio-only links are not supported');
      },
    },
    {
      name: 'Iframe sandbox security attributes include restricted permissions',
      fn: async () => {
        const res = parseAndSanitizeVideoUrl('https://vimeo.com/76979871');
        expect(res.isValid).toBe(true);
        expect(res.provider).toBe('vimeo');
        expect(res.sandboxAttributes).toBeDefined();
        expect(res.sandboxAttributes).toContain('allow-scripts');
        expect(res.sandboxAttributes).toContain('allow-same-origin');
      },
    },
    {
      name: 'Direct MP4 video URLs with special query parameters are URI encoded safely',
      fn: async () => {
        const rawMp4 = 'https://cdn.pixy.app/videos/demo video #1 (2026).mp4?token=abc 123';
        const res = parseAndSanitizeVideoUrl(rawMp4);
        expect(res.isValid).toBe(true);
        expect(res.provider).toBe('mp4');
        expect(res.embedUrl).not.toContain(' ');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier2');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
