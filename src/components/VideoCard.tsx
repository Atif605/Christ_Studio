import React, { useEffect, useRef, useState } from 'react';
import { Play, Heart, Share2, Check } from 'lucide-react';
import type { MediaItem } from '../types';
import { getYouTubeThumbnailUrl, parseYouTubeId } from '../lib/youtubeUtils';

interface VideoCardProps {
  video: MediaItem;
  onOpenWatch: (video: MediaItem) => void;
  onViewProfile?: (creatorId: string) => void;
}

function formatCount(num: number | undefined): string {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

function LetterAvatar({ name, avatarUrl, className = "w-6 h-6 text-[9px]" }: { name: string; avatarUrl?: string; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const safeName = typeof name === 'string' ? name.trim() : '';
  const firstLetter = safeName ? safeName.charAt(0).toUpperCase() : '?';
  
  const colors = [
    'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'
  ];
  
  const charCodeSum = safeName 
    ? safeName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    : 0;
    
  const colorClass = colors[charCodeSum % colors.length] || 'bg-zinc-500';

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={safeName}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 select-none shadow-sm ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none shadow-sm ${colorClass} ${className}`}>
      {firstLetter}
    </div>
  );
}

export function VideoCard({ video, onOpenWatch, onViewProfile }: VideoCardProps) {
  const playCount = video.views || 0;
  const likesCount = video.likesCount ?? (video.likes?.length || 0);
  const [copied, setCopied] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const youtubeId = video.youtubeId || parseYouTubeId(video.videoUrl);
  const fallbackThumbnail = youtubeId ? getYouTubeThumbnailUrl(youtubeId, 'hqdefault') : '';

  const displayThumbnail = !thumbnailError && video.thumbnailUrl
    ? video.thumbnailUrl
    : fallbackThumbnail || 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=800&q=80';

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copyToClipboard = async (url: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy share link: ', err);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const shareUrl = `${window.location.origin}${window.location.pathname}?video=${video.id}`;
    const shareData = {
      title: video.title,
      text: `Watch "${video.title}" by ${video.creatorName || 'Christ Studio'} on Christ Studio!`,
      url: shareUrl,
    };

    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl);
        }
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenWatch(video);
    }
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewProfile) {
      onViewProfile(video.creatorId);
    } else {
      window.dispatchEvent(
        new CustomEvent('view-creator-profile', {
          detail: { creatorId: video.creatorId },
        })
      );
    }
  };

  return (
    <div 
      onClick={() => onOpenWatch(video)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Play video: ${video.title} by ${video.creatorName || 'Creator'}`}
      className="bg-white dark:bg-zinc-900/90 rounded-2xl p-2.5 sm:p-3 cursor-pointer hover:shadow-lg active:scale-[0.98] active:bg-zinc-50 dark:active:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all duration-200 group flex flex-col justify-between border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50"
    >
      <div>
        {/* Thumbnail Container */}
        <div className="relative overflow-hidden rounded-xl aspect-video bg-zinc-100 dark:bg-zinc-950 shadow-inner w-full mb-2.5 border border-zinc-200/40 dark:border-zinc-800/80">
          <img 
            src={displayThumbnail} 
            onError={() => setThumbnailError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none" 
            alt={video.title}
            loading="lazy"
          />
          
          {/* Hover Play Button Overlay */}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
            <div className="w-11 h-11 rounded-full bg-rose-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl backdrop-blur-xs">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Views Count Badge */}
          <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-[9px] sm:text-[10px] text-white px-2 py-0.5 rounded-md font-semibold tracking-wide select-none shadow">
            ▶ {formatCount(playCount)} views
          </span>
          
          {/* Category / Shorts Tag */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            {video.isShort && (
              <span className="bg-red-600 text-[8px] font-extrabold uppercase text-white px-2 py-0.5 rounded-md tracking-wider shadow">
                Shorts
              </span>
            )}
            {video.category && (
              <span className="bg-zinc-900/80 backdrop-blur-sm text-[8px] font-bold uppercase text-white px-2.5 py-0.5 rounded-md tracking-wider shadow border border-white/10 select-none">
                {video.category}
              </span>
            )}
          </div>

          {/* Copy Toast Overlay */}
          {copied && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs flex items-center justify-center select-none z-20 transition-opacity">
              <div className="bg-zinc-900 border border-zinc-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Link Copied!</span>
              </div>
            </div>
          )}
        </div>

        {/* Video Title */}
        <h4 className="font-bold text-xs sm:text-sm line-clamp-2 leading-snug tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors select-text text-left px-0.5">
          {video.title}
        </h4>
      </div>

      {/* Footer Info & Actions */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 select-none">
        <div 
          onClick={handleCreatorClick}
          className="flex items-center gap-1.5 max-w-[65%] truncate hover:opacity-80 transition-opacity cursor-pointer"
          title={`View @${video.creatorName || 'Creator'}`}
        >
          <LetterAvatar 
            name={video.creatorName || 'C'} 
            avatarUrl={video.creatorAvatar} 
            className="w-5 h-5 text-[8px]" 
          />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-medium hover:underline">
            @{video.creatorName || 'Creator'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer focus:outline-none"
            title="Share Video Link"
            aria-label="Share Video"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold shrink-0">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
            <span>{formatCount(likesCount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;