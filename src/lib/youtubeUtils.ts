export interface YouTubeVideoMetadata {
  id: string;
  isShort: boolean;
  isLive: boolean;
  startTime?: number;
  embedUrl: string;
  thumbnailUrl: string;
}

/**
 * Extracts YouTube Video ID from various link formats:
 * - https://www.youtube.com/watch?v=XXXXXXXXXXX
 * - https://youtu.be/XXXXXXXXXXX
 * - https://www.youtube.com/shorts/XXXXXXXXXXX
 * - https://www.youtube.com/live/XXXXXXXXXXX
 * - https://www.youtube.com/embed/XXXXXXXXXXX
 * - m.youtube.com URLs
 */
export const parseYouTubeId = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;

  const cleanUrl = url.trim();

  try {
    // Regex covering all YouTube URL variations and extracting exact 11-char ID
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = cleanUrl.match(regExp);

    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }

    // Fallback URL parser for edge cases
    const parsedUrl = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    
    if (parsedUrl.hostname.includes('youtu.be')) {
      const id = parsedUrl.pathname.replace(/^\//, '').split('/')[0].split('?')[0];
      return id.length === 11 ? id : null;
    }

    if (parsedUrl.hostname.includes('youtube.com')) {
      if (parsedUrl.pathname === '/watch') {
        const v = parsedUrl.searchParams.get('v');
        return v && v.length === 11 ? v : null;
      }
      if (parsedUrl.pathname.startsWith('/shorts/') || parsedUrl.pathname.startsWith('/embed/') || parsedUrl.pathname.startsWith('/live/')) {
        const parts = parsedUrl.pathname.split('/');
        const id = parts[2] ? parts[2].split('?')[0] : null;
        return id && id.length === 11 ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Check if the given YouTube URL is a YouTube Shorts video
 */
export const isYouTubeShorts = (url: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('/shorts/');
};

/**
 * Check if the given YouTube URL is a Live Stream
 */
export const isYouTubeLive = (url: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('/live/') || url.toLowerCase().includes('live=1');
};

/**
 * Parses timestamp from URL like ?t=1m30s or ?t=90
 */
export const parseYouTubeStartTime = (url: string): number | undefined => {
  if (!url) return undefined;
  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    const timeParam = parsedUrl.searchParams.get('t') || parsedUrl.searchParams.get('start');
    if (!timeParam) return undefined;

    if (/^\d+$/.test(timeParam)) {
      return parseInt(timeParam, 10);
    }

    const matches = timeParam.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    if (matches) {
      const hours = parseInt(matches[1] || '0', 10);
      const minutes = parseInt(matches[2] || '0', 10);
      const seconds = parseInt(matches[3] || '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

/**
 * Generates thumbnail URL with fallback support
 * quality options:
 * - 'maxresdefault' (1280x720) - Might not exist for all videos
 * - 'sddefault' (640x480)
 * - 'hqdefault' (480x360) - Standard & guaranteed to exist
 * - 'mqdefault' (320x180)
 */
export const getYouTubeThumbnailUrl = (
  videoIdOrUrl: string,
  quality: 'maxresdefault' | 'sddefault' | 'hqdefault' | 'mqdefault' = 'hqdefault'
): string => {
  if (!videoIdOrUrl) return '';

  const videoId = videoIdOrUrl.length === 11 ? videoIdOrUrl : parseYouTubeId(videoIdOrUrl);
  if (!videoId) return '';

  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

/**
 * Generates an optimized, privacy-conscious YouTube Embed URL
 */
export const getYouTubeEmbedUrl = (
  videoIdOrUrl: string,
  options: {
    autoplay?: boolean;
    mute?: boolean;
    controls?: boolean;
    loop?: boolean;
    startTime?: number;
    rel?: boolean;
    playsinline?: boolean;
  } = {}
): string => {
  const videoId = videoIdOrUrl.length === 11 ? videoIdOrUrl : parseYouTubeId(videoIdOrUrl);
  if (!videoId) return '';

  const {
    autoplay = false,
    mute = false,
    controls = true,
    loop = false,
    startTime = 0,
    rel = false,
    playsinline = true,
  } = options;

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: mute ? '1' : '0',
    controls: controls ? '1' : '0',
    rel: rel ? '1' : '0',
    playsinline: playsinline ? '1' : '0',
    modestbranding: '1',
    enablejsapi: '1',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });

  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId); // Required by YouTube iframe API for loop to work
  }

  if (startTime > 0) {
    params.set('start', startTime.toString());
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

/**
 * Extracts complete metadata package for a YouTube Link
 */
export const getYouTubeMetadata = (url: string): YouTubeVideoMetadata | null => {
  const id = parseYouTubeId(url);
  if (!id) return null;

  const isShort = isYouTubeShorts(url);
  const isLive = isYouTubeLive(url);
  const startTime = parseYouTubeStartTime(url);

  return {
    id,
    isShort,
    isLive,
    startTime,
    embedUrl: getYouTubeEmbedUrl(id, { startTime }),
    thumbnailUrl: getYouTubeThumbnailUrl(id, 'hqdefault'),
  };
};