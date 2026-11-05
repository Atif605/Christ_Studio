import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Share2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  ChevronDown, 
  CheckCircle2, 
  X,
  Check,
  CornerDownRight
} from 'lucide-react';
import type { MediaItem, Comment, CommentReply, UserProfile } from '../types';
import { updateMetadata } from '../lib/seo';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { LazyYouTubePlayer } from './LazyYouTubePlayer';
import { parseYouTubeId, getYouTubeThumbnailUrl } from '../lib/youtubeUtils';

interface WatchModalProps {
  video: MediaItem;
  allVideos: MediaItem[]; 
  onSelectVideo: (video: MediaItem) => void; 
  onLike: (videoId: string) => void;
  onDislike: (videoId: string) => void;
  onUpdateComments: (videoId: string, comments: Comment[]) => void; 
  onClose: () => void;
  currentUserSession: string;
  currentUsername: string; 
  onViewProfile?: (creatorId: string) => void;
  onIncrementView: (videoId: string) => void;
  userProfile: UserProfile | null;
  onTriggerAuth: () => void;
}

function LetterAvatar({ name, avatarUrl, className = "w-8 h-8 text-xs" }: { name: string; avatarUrl?: string; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const safeName = typeof name === 'string' ? name.trim() : '';
  const firstLetter = safeName ? safeName.charAt(0).toUpperCase() : '?';
  
  const colors = [
    'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'
  ];
  
  const charCodeSum = safeName ? safeName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
  const colorClass = colors[charCodeSum % colors.length] || 'bg-zinc-600';

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={safeName}
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

export function WatchModal({
  video,
  allVideos,
  onSelectVideo,
  onLike,
  onDislike,
  onUpdateComments,
  onClose,
  currentUserSession,
  currentUsername,
  onViewProfile,
  onIncrementView,
  userProfile,
  onTriggerAuth
}: WatchModalProps) {
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});

  // Mobile layout active tab
  const [mobileTab, setMobileTab] = useState<'details' | 'suggestions'>('details');

  // Suggestion Filter Tabs
  const [suggestionTab, setSuggestionTab] = useState<'All' | 'Related' | 'Creator'>('All');

  // HTML5 Video fallback controls (if not YouTube)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Follow engine state
  const [followLoading, setFollowLoading] = useState(false);

  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    };
  }, []);

  // SEO metadata setup
  useEffect(() => {
    if (video) {
      updateMetadata({
        title: video.title,
        description: video.description || 'Watch Gospel Sermons and Worship on Christ Studio.',
        imageUrl: video.thumbnailUrl,
        type: 'video.other',
        videoUrl: video.videoUrl,
        author: video.creatorName,
        publishedTime: video.createdAt,
        schemaType: 'VideoObject'
      });
    }
  }, [video]);

  // Views logger safeguard (Prevents inflated view counts & saves Spark plan writes)
  useEffect(() => {
    const storageKey = `cs_views_${currentUserSession || 'guest'}`;
    const ONE_HOUR = 60 * 60 * 1000;
    let history: Record<string, number> = {};
    try {
      const local = localStorage.getItem(storageKey);
      if (local) history = JSON.parse(local);
    } catch {
      history = {};
    }

    const lastTime = history[video.id];
    const now = Date.now();

    if (!lastTime || (now - lastTime >= ONE_HOUR)) {
      const timer = setTimeout(() => {
        onIncrementView(video.id);
        history[video.id] = Date.now();
        try {
          localStorage.setItem(storageKey, JSON.stringify(history));
        } catch {
          // Ignore quota exceed in private mode
        }
      }, 10000); 
      return () => clearTimeout(timer);
    }
  }, [video.id, currentUserSession, onIncrementView]);

  // HTML5 Player handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
      if (!nextMute && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hasLiked = video.likes?.includes(currentUserSession) || false;
  const hasDisliked = video.dislikes?.includes(currentUserSession) || false;

  const isFollowing = useMemo(() => {
    return userProfile?.following?.includes(video.creatorId) || false;
  }, [userProfile?.following, video.creatorId]);

  const handleFollowToggle = async () => {
    if (!userProfile) {
      onTriggerAuth();
      return;
    }
    if (video.creatorId === currentUserSession) return;

    setFollowLoading(true);
    try {
      const currentUserDocRef = doc(db, 'users', currentUserSession);
      const creatorDocRef = doc(db, 'users', video.creatorId);

      if (isFollowing) {
        await updateDoc(currentUserDocRef, {
          following: arrayRemove(video.creatorId)
        });
        await updateDoc(creatorDocRef, {
          followers: arrayRemove(currentUserSession)
        });
      } else {
        await updateDoc(currentUserDocRef, {
          following: arrayUnion(video.creatorId)
        });
        await updateDoc(creatorDocRef, {
          followers: arrayUnion(currentUserSession)
        });

        // Add follow notification
        const creatorSnap = await getDoc(creatorDocRef);
        if (creatorSnap.exists()) {
          const creatorData = creatorSnap.data();
          const existingNotifs = creatorData.notifications || [];
          const newNotif = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            read: false,
            timestamp: new Date().toISOString(),
            type: 'follow',
            senderId: currentUserSession,
            senderName: currentUsername
          };
          const cappedNotifs = [newNotif, ...existingNotifs].slice(0, 20);
          await updateDoc(creatorDocRef, { notifications: cappedNotifs });
        }
      }
    } catch (err) {
      console.warn("Follow update error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const enhancedComments = useMemo<Comment[]>(() => {
    return (video.comments || []);
  }, [video.comments]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!userProfile) {
      onTriggerAuth();
      return;
    }

    const newComment: Comment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      authorName: currentUsername,
      authorAvatar: userProfile.avatarUrl || '', 
      authorId: currentUserSession,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      likes: [], 
      replies: [] 
    };

    onUpdateComments(video.id, [newComment, ...enhancedComments]);
    setCommentText('');
  };

  const handleReactToComment = (commentId: string) => {
    if (!userProfile) {
      onTriggerAuth();
      return;
    }
    const updated = enhancedComments.map((comm) => {
      if (comm.id !== commentId) return comm;
      const likes = comm.likes || [];
      const ok = likes.includes(currentUserSession);
      return {
        ...comm,
        likes: ok ? likes.filter(u => u !== currentUserSession) : [...likes, currentUserSession]
      };
    });
    onUpdateComments(video.id, updated);
  };

  const handleAddReply = (commentId: string, content: string) => {
    if (!content.trim()) return;
    if (!userProfile) {
      onTriggerAuth();
      return;
    }
    const reply: CommentReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      authorName: currentUsername,
      authorAvatar: userProfile.avatarUrl || '',
      authorId: currentUserSession,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: []
    };
    const updated = enhancedComments.map((comm) => {
      if (comm.id !== commentId) return comm;
      return { ...comm, replies: [...(comm.replies || []), reply] };
    });
    onUpdateComments(video.id, updated);
  };

  const toggleRepliesVisibility = (commentId: string) => {
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const copyToClipboard = async (url: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?video=${video.id}`;
    const shareData = {
      title: video.title,
      text: `Watch "${video.title}" by ${video.creatorName} on Christ Studio!`,
      url: shareUrl
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

  // Contextual Smart Recommendation Engine
  const suggestedVideos = useMemo(() => {
    let baseList = allVideos.filter(v => v.id !== video.id && !v.isShort);

    if (suggestionTab === 'Creator') {
      baseList = baseList.filter(v => v.creatorId === video.creatorId);
    } else if (suggestionTab === 'Related') {
      baseList = baseList.filter(v => v.category === video.category);
    }

    const scoredList = baseList.map(v => {
      let score = 0;
      if (v.category === video.category) score += 20;
      if (v.creatorId === video.creatorId) score += 15;
      const uploadAgeInDays = (Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score -= Math.min(uploadAgeInDays * 0.1, 10); 
      return { video: v, score };
    });

    return scoredList
      .sort((a, b) => b.score - a.score)
      .map(item => item.video)
      .slice(0, 10);
  }, [allVideos, video, suggestionTab]);

  const isYouTube = video.videoUrl.includes('youtube.com') || 
                    video.videoUrl.includes('youtu.be') || 
                    video.videoUrl.includes('youtube-nocookie.com');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex justify-center overflow-y-auto font-sans p-0 sm:p-4 md:p-6 animate-fade-in">
      <div 
        className="w-full max-w-6xl bg-white dark:bg-zinc-950 min-h-screen sm:min-h-[auto] sm:rounded-3xl border-0 sm:border border-zinc-200 dark:border-zinc-850 p-4 sm:p-6 shadow-2xl flex flex-col my-auto text-zinc-900 dark:text-zinc-50 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Bar: Close Action */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-850">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-xs font-black tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
              {video.category || 'Christ Studio Stream'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 transition cursor-pointer"
            aria-label="Close Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="w-full mt-4">
          <div key={video.id} className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-200/50 dark:border-zinc-800">
            {isYouTube ? (
              <LazyYouTubePlayer 
                url={video.videoUrl} 
                title={video.title} 
                autoPlay={true}
                className="w-full h-full" 
              />
            ) : (
              <div className="relative w-full h-full group/player">
                <video
                  ref={videoRef}
                  src={video.videoUrl}
                  autoPlay
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuration(videoRef.current.duration);
                  }}
                  onClick={handlePlayPause}
                  className="w-full h-full object-contain"
                />
                
                {/* HTML5 HUD Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover/player:opacity-100 transition-opacity flex flex-col justify-end p-4 space-y-2.5 pointer-events-none">
                  <div className="flex items-center gap-3 w-full pointer-events-auto">
                    <input 
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCurrentTime(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>

                  <div className="flex items-center justify-between w-full pointer-events-auto select-none">
                    <div className="flex items-center gap-3">
                      <button onClick={handlePlayPause} className="text-white hover:scale-110 transition cursor-pointer">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button onClick={handleToggleMute} className="text-white hover:scale-110 transition cursor-pointer">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 sm:w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <span className="text-[11px] text-zinc-300 font-bold">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <button 
                      onClick={() => {
                        if (videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen();
                      }} 
                      className="text-white hover:scale-110 transition cursor-pointer"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Tabs */}
        <div className="lg:hidden flex border-b border-zinc-200 dark:border-zinc-800 mt-4 select-none">
          <button 
            onClick={() => setMobileTab('details')}
            className={`flex-1 py-2.5 text-center text-xs font-black tracking-wider uppercase border-b-2 transition-all ${
              mobileTab === 'details' 
                ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400' 
                : 'border-transparent text-zinc-400'
            }`}
          >
            Details & Discussion
          </button>
          <button 
            onClick={() => setMobileTab('suggestions')}
            className={`flex-1 py-2.5 text-center text-xs font-black tracking-wider uppercase border-b-2 transition-all ${
              mobileTab === 'suggestions' 
                ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400' 
                : 'border-transparent text-zinc-400'
            }`}
          >
            Up Next ({suggestedVideos.length})
          </button>
        </div>

        {/* Main Two-Column Layout */}
        <div className="w-full flex flex-col lg:flex-row gap-6 mt-4">
          
          {/* Left Column: Video Info & Comments */}
          <div className={`flex-1 space-y-5 text-left ${mobileTab === 'details' ? 'block' : 'hidden lg:block'}`}>
            <div className="space-y-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-snug select-text">
                {video.title}
              </h1>

              {/* Creator & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-zinc-200 dark:border-zinc-850 pb-4">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div 
                    onClick={() => { 
                      if (onViewProfile) onViewProfile(video.creatorId); 
                      onClose(); 
                    }}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <LetterAvatar 
                      name={video.creatorName} 
                      avatarUrl={video.creatorAvatar} 
                      className="w-10 h-10 border border-zinc-200 dark:border-zinc-800" 
                    />
                    <div className="text-left">
                      <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 group-hover:underline flex items-center gap-1">
                        <span>{video.creatorName || 'Christ Studio Creator'}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 fill-current" />
                      </h3>
                      <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium">Verified Channel</p>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={followLoading || video.creatorId === currentUserSession}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer select-none active:scale-95 shadow-xs ${
                      video.creatorId === currentUserSession
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                        : isFollowing
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                    }`}
                  >
                    {video.creatorId === currentUserSession ? 'My Channel' : followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>

                {/* Engagement Actions */}
                <div className="flex items-center gap-2 select-none self-end sm:self-auto">
                  <div className="bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center h-9 overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <button 
                      type="button"
                      onClick={() => onLike(video.id)}
                      className={`flex items-center gap-1.5 px-3.5 h-full border-r border-zinc-200 dark:border-zinc-800 transition cursor-pointer ${
                        hasLiked ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                      <span className="text-xs font-bold">{video.likes?.length || 0}</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => onDislike(video.id)}
                      className={`flex items-center px-3 h-full transition cursor-pointer ${
                        hasDisliked ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-500'
                      }`}
                    >
                      <ThumbsDown className={`w-3.5 h-3.5 ${hasDisliked ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <button 
                    type="button"
                    onClick={handleShare}
                    className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition cursor-pointer border border-zinc-200 dark:border-zinc-800 shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />}
                    <span>{copied ? 'Copied!' : 'Share'}</span>
                  </button>
                </div>
              </div>

              {/* Description Box */}
              <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2 select-text">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  <span>{(video.views || 0).toLocaleString()} views</span>
                  <span>•</span>
                  <span>Uploaded {new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 font-normal">
                  {video.description || 'No description provided for this video.'}
                </p>
              </div>

              {/* Comments Section */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-extrabold border-b border-zinc-100 dark:border-zinc-850 pb-2 flex items-center gap-2 select-none">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  <span>Discussion ({enhancedComments.length})</span>
                </h3>

                {/* Add Comment Input */}
                <form onSubmit={handleSubmitComment} className="flex gap-3 items-center">
                  <LetterAvatar 
                    name={currentUsername || 'You'} 
                    avatarUrl={userProfile?.avatarUrl} 
                    className="w-8 h-8 text-xs border border-zinc-200 dark:border-zinc-800" 
                  />
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={userProfile ? "Add a public comment..." : "Sign in to join the discussion..."}
                      className="flex-1 bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-rose-500 py-1.5 text-xs placeholder-zinc-400 focus:outline-none font-normal"
                    />
                    <button 
                      type="submit" 
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-1.5 rounded-full cursor-pointer transition active:scale-95 shadow-xs"
                    >
                      Comment
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-3.5 pt-2">
                  {enhancedComments.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-4">Be the first to share your thoughts on this video.</p>
                  ) : (
                    enhancedComments.map((comm) => {
                      const likes = comm.likes || [];
                      const replies = comm.replies || [];
                      const isReplying = activeReplyBox === comm.id;
                      const areRepliesVisible = showReplies[comm.id];

                      return (
                        <div key={comm.id} className="flex gap-3 text-xs text-left leading-relaxed">
                          <LetterAvatar name={comm.authorName} avatarUrl={comm.authorAvatar} className="w-7 h-7 text-[10px]" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 select-none">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">@{comm.authorName}</span>
                              <span className="text-[10px] text-zinc-400">{new Date(comm.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-zinc-800 dark:text-zinc-300 select-text font-normal">{comm.content}</p>
                            
                            <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-semibold select-none pt-0.5">
                              <button 
                                type="button"
                                onClick={() => handleReactToComment(comm.id)}
                                className={`hover:text-rose-500 cursor-pointer flex items-center gap-1 transition ${likes.includes(currentUserSession) ? 'text-rose-500 font-bold' : ''}`}
                              >
                                ♥ {likes.length}
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  if (!userProfile) { onTriggerAuth(); return; }
                                  setActiveReplyBox(isReplying ? null : comm.id);
                                  setReplyText('');
                                }}
                                className="hover:text-zinc-900 dark:hover:text-white cursor-pointer transition"
                              >
                                Reply
                              </button>
                            </div>

                            {/* Reply Input Box */}
                            {isReplying && (
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleAddReply(comm.id, replyText);
                                  setActiveReplyBox(null);
                                  setReplyText('');
                                }}
                                className="flex gap-2 pt-2"
                              >
                                <input 
                                  type="text"
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                                <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1 rounded-xl font-bold transition cursor-pointer active:scale-95">
                                  Reply
                                </button>
                              </form>
                            )}

                            {/* Nested Replies */}
                            {replies.length > 0 && (
                              <div className="pt-1">
                                <button 
                                  type="button"
                                  onClick={() => toggleRepliesVisibility(comm.id)}
                                  className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer transition text-[11px] flex items-center gap-1"
                                >
                                  <CornerDownRight className="w-3 h-3" />
                                  <span>{areRepliesVisible ? 'Hide' : 'Show'} {replies.length} replies</span>
                                </button>
                                {areRepliesVisible && (
                                  <div className="mt-2 space-y-2 border-l-2 border-zinc-200 dark:border-zinc-800 pl-3">
                                    {replies.map((rep) => (
                                      <div key={rep.id} className="flex gap-2 text-[11px] leading-relaxed">
                                        <LetterAvatar name={rep.authorName} avatarUrl={rep.authorAvatar} className="w-5 h-5 text-[8px]" />
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-zinc-900 dark:text-zinc-100">@{rep.authorName}</span>
                                            <span className="text-[9px] text-zinc-400">{new Date(rep.createdAt).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-zinc-700 dark:text-zinc-300 font-normal">{rep.content}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Suggested Videos */}
          <div className={`w-full lg:w-[32%] space-y-4 text-left select-none shrink-0 ${mobileTab === 'suggestions' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <span>Up Next</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </h3>
              <span className="text-[10px] text-zinc-400 font-bold uppercase">Christ Studio</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['All', 'Related', 'Creator'] as const).map((tab) => (
                <button 
                  key={tab} 
                  type="button"
                  onClick={() => setSuggestionTab(tab)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-xl shrink-0 border transition cursor-pointer ${
                    suggestionTab === tab 
                      ? 'bg-rose-600 text-white shadow-xs border-transparent' 
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab === 'Creator' ? 'From Creator' : tab}
                </button>
              ))}
            </div>

            {/* Suggested Video Cards */}
            <div className="space-y-2.5">
              {suggestedVideos.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-6 text-center">
                  No suggested videos found.
                </p>
              ) : (
                suggestedVideos.map((sVid) => {
                  const sYtId = sVid.youtubeId || parseYouTubeId(sVid.videoUrl);
                  const sThumb = sVid.thumbnailUrl || (sYtId ? getYouTubeThumbnailUrl(sYtId, 'hqdefault') : '');

                  return (
                    <div
                      key={sVid.id}
                      onClick={() => onSelectVideo(sVid)}
                      className="flex gap-2.5 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-zinc-900 shadow-xs">
                        <img 
                          src={sThumb} 
                          className="w-full h-full object-cover" 
                          alt={sVid.title} 
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="text-xs font-bold line-clamp-2 leading-snug hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                            {sVid.title}
                          </h4>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                            @{sVid.creatorName}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                          <span>{(sVid.views || 0).toLocaleString()} views</span>
                          <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase text-zinc-600 dark:text-zinc-300">
                            {sVid.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default WatchModal;