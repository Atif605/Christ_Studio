import React, { useState, useEffect } from 'react';
import { 
  getYouTubeThumbnailUrl, 
  parseYouTubeId, 
  getYouTubeEmbedUrl, 
  isYouTubeShorts, 
  parseYouTubeStartTime 
} from '../lib/youtubeUtils';
import { Play, Loader2, AlertCircle } from 'lucide-react';

interface LazyYouTubePlayerProps {
  url: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  mute?: boolean;
  loop?: boolean;
  aspectRatio?: 'video' | 'shorts' | 'auto';
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const LazyYouTubePlayer: React.FC<LazyYouTubePlayerProps> = ({ 
  url, 
  title = 'YouTube video player', 
  className = '',
  autoPlay = false,
  mute = false,
  loop = false,
  aspectRatio = 'auto',
  onPlayStateChange
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const videoId = parseYouTubeId(url);
  const isShort = isYouTubeShorts(url);
  const startTime = parseYouTubeStartTime(url);

  // Determine aspect ratio class
  const resolvedAspectClass = 
    aspectRatio === 'shorts' || (aspectRatio === 'auto' && isShort)
      ? 'aspect-[9/16]'
      : 'aspect-video';

  // Reset state when url changes
  useEffect(() => {
    setIsPlaying(autoPlay);
    setIsIframeLoading(autoPlay);
    setThumbnailError(false);
  }, [url, autoPlay]);

  const handlePlayClick = () => {
    setIsPlaying(true);
    setIsIframeLoading(true);
    if (onPlayStateChange) {
      onPlayStateChange(true);
    }
  };

  if (!videoId) {
    return (
      <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-400 text-xs font-medium p-6 text-center ${resolvedAspectClass} ${className}`}>
        <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
        <span>Invalid YouTube URL</span>
      </div>
    );
  }

  const defaultThumbnail = thumbnailError 
    ? getYouTubeThumbnailUrl(videoId, 'hqdefault') 
    : getYouTubeThumbnailUrl(videoId, 'maxresdefault');

  const embedUrl = getYouTubeEmbedUrl(videoId, {
    autoplay: isPlaying,
    mute,
    loop,
    startTime
  });

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden bg-black shadow-lg ${resolvedAspectClass} ${className}`}>
      {!isPlaying ? (
        <button
          type="button"
          onClick={handlePlayClick}
          className="relative w-full h-full block cursor-pointer group focus:outline-none focus:ring-2 focus:ring-rose-500"
          aria-label={`Play ${title}`}
        >
          {/* Thumbnail Image */}
          <img
            src={defaultThumbnail}
            alt={title}
            onError={() => {
              if (!thumbnailError) {
                setThumbnailError(true);
              }
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:bg-black/10 transition-colors" />

          {/* Central Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-rose-600/90 text-white rounded-full p-4 sm:p-5 transform transition-all duration-300 group-hover:scale-110 group-hover:bg-rose-600 shadow-2xl backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current translate-x-0.5" />
            </div>
          </div>

          {/* Duration or Format Badge */}
          {isShort && (
            <div className="absolute top-3 left-3 bg-red-600/90 text-white font-bold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-md shadow-md">
              Shorts
            </div>
          )}
        </button>
      ) : (
        <div className="w-full h-full relative">
          {/* Spinner during iframe initialization */}
          {isIframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            </div>
          )}
          <iframe
            src={embedUrl}
            title={title}
            onLoad={() => setIsIframeLoading(false)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full border-0 absolute inset-0"
          />
        </div>
      )}
    </div>
  );
};