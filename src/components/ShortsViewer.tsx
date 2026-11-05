import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play,
  ChevronUp, 
  ChevronDown, 
  Send, 
  Clock, 
  X, 
  Check,
  Sparkles
} from 'lucide-react';
import type { MediaItem, Comment, UserProfile } from '../types';
import { parseYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '../lib/youtubeUtils';

interface ShortsViewerProps {
  shorts: MediaItem[];
  currentUserSession: string;
  onLike: (videoId: string) => void;
  onAddComment: (videoId: string, comments: Comment[]) => void;
  initialShortId?: string; 
  userProfile: UserProfile | null; 
  onTriggerAuth: () => void; 
  onIncrementView?: (videoId: string) => void;
}

function LetterAvatar({ name, avatarUrl, className = "w-9 h-9 text-xs" }: { name: string; avatarUrl?: string; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const trimmed = (name || "").trim();
  const firstLetter = trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  
  const colors = [
    'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'
  ];
  
  const charCodeSum = trimmed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colorClass = colors[charCodeSum % colors.length] || 'bg-zinc-600';

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={trimmed}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 select-none shadow-xs ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none shadow-xs ${colorClass} ${className}`}>
      {firstLetter}
    </div>
  );
}

export function ShortsViewer({
  shorts,
  currentUserSession,
  onLike,
  onAddComment,
  initialShortId,
  userProfile,
  onTriggerAuth,
  onIncrementView
}: ShortsViewerProps) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (initialShortId) {
      const idx = shorts.findIndex(s => s.id === initialShortId);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastScrollTime = useRef<number>(0);

  const activeShort = shorts[activeIndex];
  const youtubeId = activeShort ? (activeShort.youtubeId || parseYouTubeId(activeShort.videoUrl)) : null;
  const isYouTube = Boolean(youtubeId);

  // Sync initial Short ID when changed externally
  useEffect(() => {
    if (initialShortId) {
      const idx = shorts.findIndex(s => s.id === initialShortId);
      if (idx !== -1) {
        setActiveIndex(idx);
        setIsPlaying(true);
      }
    }
  }, [initialShortId, shorts]);

  // Construct stable YouTube Embed URL
  const activeIframeSrc = useMemo(() => {
    if (isYouTube && youtubeId) {
      return getYouTubeEmbedUrl(youtubeId, {
        autoplay: true,
        mute: isMuted,
        loop: true,
        controls: false,
        playsinline: true,
        rel: false
      });
    }
    return '';
  }, [youtubeId, isYouTube, isMuted]);

  // Handle native HTML5 video autoplay
  useEffect(() => {
    if (videoRef.current && !isYouTube) {
      videoRef.current.load();
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }
  }, [activeIndex, isYouTube, isPlaying]);

  // Handle Mute commands
  useEffect(() => {
    if (videoRef.current && !isYouTube) {
      videoRef.current.muted = isMuted;
    }

    if (isYouTube && iframeRef.current?.contentWindow) {
      const command = isMuted ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: command
      }), '*');
    }
  }, [isMuted, activeIndex, isYouTube]);

  // Handle Play/Pause commands
  useEffect(() => {
    if (isYouTube && iframeRef.current?.contentWindow) {
      const command = isPlaying ? 'playVideo' : 'pauseVideo';
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: command
      }), '*');
    }
  }, [isPlaying, activeIndex, isYouTube]);

  // View Counter Throttling (Protected for Spark Plan)
  useEffect(() => {
    if (!activeShort || !onIncrementView) return;

    const storageKey = `viewed_history_shorts_${currentUserSession || 'anonymous'}`;
    const ONE_HOUR = 60 * 60 * 1000; 
    
    let history: Record<string, number> = {};
    const localHistory = localStorage.getItem(storageKey);
    if (localHistory) {
      try {
        history = JSON.parse(localHistory);
      } catch {
        history = {};
      }
    }

    const lastViewedTime = history[activeShort.id];
    const now = Date.now();

    if (!lastViewedTime || (now - lastViewedTime >= ONE_HOUR)) {
      const watchTimer = setTimeout(() => {
        onIncrementView(activeShort.id);
        history[activeShort.id] = Date.now();
        try {
          localStorage.setItem(storageKey, JSON.stringify(history));
        } catch {
          // ignore localStorage full
        }
      }, 8000); // Trigger after 8 seconds of watching

      return () => clearTimeout(watchTimer);
    }
  }, [activeIndex, currentUserSession, onIncrementView, activeShort]);

  const handleNext = useCallback(() => {
    if (activeIndex < shorts.length - 1) {
      setActiveIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [activeIndex, shorts.length]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  }, [activeIndex]);

  // Keyboard navigation (Arrow Up / Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (shorts.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md mx-auto p-6 font-sans shadow-sm">
        <Sparkles className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Shorts Available</p>
        <p className="text-xs mt-2 text-zinc-500 leading-relaxed">
          Be the first creator to share inspiring Gospel Shorts on Christ Studio!
        </p>
      </div>
    );
  }

  const handlePlayPause = () => {
    if (isYouTube) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = () => {
    if (!userProfile) {
      onTriggerAuth();
      return;
    }
    onLike(activeShort.id);
  };

  const handleShare = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();

    const shareUrl = `${window.location.origin}${window.location.pathname}?video=${activeShort.id}`;
    const shareData = {
      title: activeShort.title,
      text: `Watch this Gospel Short "${activeShort.title}" by @${activeShort.creatorName} on Christ Studio!`,
      url: shareUrl
    };

    const copyToClipboard = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const ta = document.createElement('textarea');
          ta.value = shareUrl;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    };

    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!userProfile) {
      onTriggerAuth();
      return;
    }

    const newComment: Comment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      authorName: userProfile.name || 'Believer',
      authorAvatar: userProfile.avatarUrl || '',
      authorId: currentUserSession,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      likes: []
    };

    const updatedComments = [newComment, ...(activeShort.comments || [])];
    onAddComment(activeShort.id, updatedComments);
    setCommentText('');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartY.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 600) return;

    if (Math.abs(e.deltaY) > 25) {
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
      lastScrollTime.current = now;
    }
  };

  const hasLiked = activeShort.likes?.includes(currentUserSession) || false;
  const shortThumbnail = activeShort.thumbnailUrl || (youtubeId ? getYouTubeThumbnailUrl(youtubeId, 'hqdefault') : '');

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="flex flex-col items-center justify-center max-w-sm sm:max-w-md mx-auto relative h-[calc(100vh-8.5rem)] sm:h-[78vh] w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 font-sans select-none"
    >
      <div 
        onClick={handlePlayPause}
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
      >
        {isYouTube ? (
          <iframe
            ref={iframeRef}
            src={activeIframeSrc}
            className="w-full h-full object-cover border-0 z-10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={activeShort.videoUrl}
            poster={shortThumbnail}
            loop
            muted={isMuted}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Top/Bottom Gradient Shadows */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none z-20" />

        {/* Play/Pause Center Indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none z-20 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-2xl">
              <Play className="w-7 h-7 fill-current translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Audio Mute/Unmute Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/55 backdrop-blur-xs text-white hover:bg-black/80 transition focus:outline-none cursor-pointer border border-white/10 shadow-lg active:scale-90"
          title="Toggle Sound"
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Right Sidebar Action Icons */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="absolute bottom-16 right-3 sm:right-4 z-30 flex flex-col items-center gap-4 text-white"
        >
          {/* Creator Profile Avatar */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('view-creator-profile', { detail: { creatorId: activeShort.creatorId } }));
            }}
            className="relative group flex flex-col items-center cursor-pointer active:scale-90 transition-transform"
            title={`View @${activeShort.creatorName}`}
          >
            <LetterAvatar 
              name={activeShort.creatorName} 
              avatarUrl={activeShort.creatorAvatar}
              className="w-10 h-10 border-2 border-rose-500 shadow-md" 
            />
            <span className="absolute -bottom-1 bg-rose-600 text-[8px] font-black rounded-full px-1 py-0.2 uppercase text-white shadow-xs">✓</span>
          </div>

          {/* Like Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="flex flex-col items-center group cursor-pointer focus:outline-none active:scale-90 transition-transform"
            title="Like Short"
          >
            <div className={`p-3 rounded-full backdrop-blur-xs transition-all duration-150 ${hasLiked ? 'bg-rose-600 text-white scale-110 shadow-lg' : 'bg-black/55 text-white hover:bg-black/80'}`}>
              <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current text-white' : 'text-zinc-200'}`} />
            </div>
            <span className="text-[10px] font-bold mt-1 text-white shadow-xs">
              {activeShort.likes?.length || 0}
            </span>
          </button>

          {/* Comments Trigger */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="flex flex-col items-center group cursor-pointer focus:outline-none active:scale-90 transition-transform"
            title="Discussion"
          >
            <div className="p-3 rounded-full bg-black/55 backdrop-blur-xs text-white hover:bg-black/80 transition-colors">
              <MessageSquare className="w-5 h-5 text-zinc-200" />
            </div>
            <span className="text-[10px] font-bold mt-1 text-white shadow-xs">
              {activeShort.comments?.length || 0}
            </span>
          </button>

          {/* Share Button */}
          <button 
            type="button"
            onClick={(e) => handleShare(e, activeIndex)}
            className="flex flex-col items-center group cursor-pointer focus:outline-none active:scale-90 transition-transform"
            title="Share Short"
          >
            <div className={`p-3 rounded-full backdrop-blur-xs transition-all duration-200 ${
              copiedIndex === activeIndex 
                ? 'bg-rose-600 text-white scale-110 shadow-lg' 
                : 'bg-black/55 text-white hover:bg-black/80'
            }`}>
              {copiedIndex === activeIndex ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Share2 className="w-5 h-5 text-zinc-200" />
              )}
            </div>
            <span className="text-[10px] font-bold mt-1 text-white shadow-xs">
              {copiedIndex === activeIndex ? 'Copied!' : 'Share'}
            </span>
          </button>
        </div>

        {/* Video Metadata Overlay */}
        <div 
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-4 right-16 z-30 text-white space-y-1.5 select-text pointer-events-auto text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wide text-white drop-shadow">
              @{activeShort.creatorName || 'Christ Studio'}
            </span>
            <span className="bg-rose-600 text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md uppercase shadow-xs">
              Shorts
            </span>
          </div>
          <p className="text-xs font-bold leading-snug line-clamp-2 text-white drop-shadow">
            {activeShort.title}
          </p>
          {activeShort.description && (
            <p className="text-[10.5px] text-zinc-300 leading-relaxed font-normal line-clamp-2 drop-shadow-xs">
              {activeShort.description}
            </p>
          )}
        </div>
      </div>

      {/* Up/Down Floating Arrow Controls */}
      <div 
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30 select-none hidden sm:flex"
      >
        <button
          type="button"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="p-2 rounded-full bg-black/50 backdrop-blur-xs text-white hover:bg-black/80 transition disabled:opacity-20 cursor-pointer active:scale-90 border border-white/10"
          aria-label="Previous Short"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={activeIndex === shorts.length - 1}
          className="p-2 rounded-full bg-black/50 backdrop-blur-xs text-white hover:bg-black/80 transition disabled:opacity-20 cursor-pointer active:scale-90 border border-white/10"
          aria-label="Next Short"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Slide-Up Comments Drawer */}
      {showComments && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-[65%] bg-white dark:bg-zinc-900 rounded-t-3xl z-40 p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col justify-between shadow-2xl animate-slide-up text-left"
        >
          <div className="flex flex-col space-y-3 flex-1 overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 shrink-0 select-none">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>Discussion ({activeShort.comments?.length || 0})</span>
              </span>
              <button 
                type="button"
                onClick={() => setShowComments(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg transition cursor-pointer"
                aria-label="Close Comments"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 no-scrollbar">
              {(activeShort.comments?.length || 0) === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-8 select-none">
                  No comments yet. Share an encouraging thought! 🕊️
                </p>
              ) : (
                activeShort.comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5 text-xs text-left animate-fade-in">
                    <LetterAvatar 
                      name={c.authorName} 
                      avatarUrl={c.authorAvatar}
                      className="w-6 h-6 text-[9px]" 
                    />
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950/80 p-2.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
                      <div className="flex items-center justify-between pb-0.5 select-none">
                        <span className="font-extrabold text-zinc-900 dark:text-white text-[11px]">
                          {c.authorName}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-medium flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 font-normal leading-relaxed select-text mt-0.5">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCommentSubmit} className="mt-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={userProfile ? "Write a comment..." : "Sign in to join discussion..."}
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-normal text-zinc-900 dark:text-white"
            />
            <button
              type="submit"
              className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl active:scale-95 transition cursor-pointer select-none shadow-xs shadow-rose-600/20"
              title="Post comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ShortsViewer;