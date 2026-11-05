import React, { useState, useEffect, useMemo } from 'react';
import { 
  Video, 
  Plus, 
  BarChart3, 
  Edit2, 
  Trash2, 
  FileVideo, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  MessageSquare, 
  X, 
  TrendingUp, 
  Eye, 
  Clock, 
  Layers, 
  Search, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import type { MediaItem, UserProfile, MediaCategory } from '../types';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { parseYouTubeId, getYouTubeThumbnailUrl, isYouTubeShorts } from '../lib/youtubeUtils';

interface CreatorStudioProps {
  myVideos: MediaItem[];
  onAddVideo: (video: Omit<MediaItem, 'id' | 'views' | 'likes' | 'dislikes' | 'comments' | 'createdAt'>) => void;
  onDeleteVideo: (videoId: string) => void;
  onUpdateVideo: (videoId: string, title: string, desc: string) => void;
  currentUserSession: string;
  userProfile: UserProfile | null;
}

const CATEGORIES: MediaCategory[] = [
  'Sermon',
  'Worship',
  'Testimonial',
  'Education',
  'Gospel',
  'Kids',
  'Documentary'
];

export function CreatorStudio({
  myVideos,
  onAddVideo,
  onDeleteVideo,
  onUpdateVideo,
  currentUserSession,
  userProfile
}: CreatorStudioProps) {
  const [studioTab, setStudioTab] = useState<'dashboard' | 'content' | 'upload'>('dashboard');

  // Content Tab Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'videos' | 'shorts'>('all');

  // Real-time Firestore follower data
  const [liveUserData, setLiveUserData] = useState<Partial<UserProfile> | null>(null);

  // Edit and Form States
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Upload Form Fields
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState<MediaCategory>('Sermon');
  const [isShort, setIsShort] = useState(false);
  
  // Verification Fields
  const [channelHandleCheck, setChannelHandleCheck] = useState('');
  const [confirmOwnership, setConfirmOwnership] = useState(false);

  // Edit Modal States
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Sync real-time follower data
  useEffect(() => {
    if (!currentUserSession) return;
    const userDocRef = doc(db, 'users', currentUserSession);
    const unsub = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setLiveUserData(snap.data() as Partial<UserProfile>);
      }
    }, (err) => {
      console.warn("Could not sync live user stats:", err);
    });

    return () => unsub();
  }, [currentUserSession]);

  // Auto-detect YouTube thumbnail and Shorts format
  useEffect(() => {
    if (videoUrl.trim()) {
      const ytId = parseYouTubeId(videoUrl);
      if (ytId) {
        setThumbnailUrl(getYouTubeThumbnailUrl(ytId, 'hqdefault'));
        if (isYouTubeShorts(videoUrl)) {
          setIsShort(true);
        }
      }
    }
  }, [videoUrl]);

  // Real Dynamic Calculations
  const totalViews = useMemo(() => {
    return myVideos.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
  }, [myVideos]);

  const totalLikes = useMemo(() => {
    return myVideos.reduce((acc, curr) => acc + (Array.isArray(curr.likes) ? curr.likes.length : 0), 0);
  }, [myVideos]);

  const totalComments = useMemo(() => {
    return myVideos.reduce((acc, curr) => acc + (Array.isArray(curr.comments) ? curr.comments.length : 0), 0);
  }, [myVideos]);

  const realFollowersCount = useMemo(() => {
    if (liveUserData?.followers && Array.isArray(liveUserData.followers)) {
      return liveUserData.followers.length;
    }
    return userProfile?.followers?.length || 0;
  }, [liveUserData, userProfile]);

  const estimatedWatchHours = useMemo(() => {
    return ((totalViews * 3.5) / 60).toFixed(1);
  }, [totalViews]);

  // Sort Videos: Latest first
  const sortedMyVideos = useMemo(() => {
    return [...myVideos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myVideos]);

  const latestVideo = sortedMyVideos.length > 0 ? sortedMyVideos[0] : null;

  const topVideos = useMemo(() => {
    return [...myVideos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
  }, [myVideos]);

  // Filtered list for Content tab
  const filteredContentVideos = useMemo(() => {
    return sortedMyVideos.filter(vid => {
      const matchesSearch = !searchQuery.trim() || 
        vid.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        vid.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (contentTypeFilter === 'videos') return matchesSearch && !vid.isShort;
      if (contentTypeFilter === 'shorts') return matchesSearch && vid.isShort;
      return matchesSearch;
    });
  }, [sortedMyVideos, searchQuery, contentTypeFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!userProfile) {
      setValidationError("You must be signed in to upload media.");
      return;
    }

    if (!title.trim() || !desc.trim() || !videoUrl.trim()) {
      setValidationError("Please fill out all required fields.");
      return;
    }

    const ytId = parseYouTubeId(videoUrl);
    if (!ytId) {
      setValidationError("Christ Studio strictly supports YouTube Video embeds. Please provide a valid YouTube watch or shorts URL.");
      return;
    }

    if (userProfile.youtubeChannelHandle && userProfile.youtubeChannelHandle !== '@Believer') {
      const registeredHandle = userProfile.youtubeChannelHandle.toLowerCase().replace('@', '').trim();
      const typedHandle = channelHandleCheck.toLowerCase().replace('@', '').trim();

      if (registeredHandle !== typedHandle) {
        setValidationError(`Handle check mismatch: Typed (${channelHandleCheck}) does not match registered handle (${userProfile.youtubeChannelHandle}).`);
        return;
      }
    }

    if (!confirmOwnership) {
      setValidationError("Please verify and confirm that you own or have permission to share this content.");
      return;
    }

    const resolvedThumbnail = thumbnailUrl.trim() || getYouTubeThumbnailUrl(ytId, 'hqdefault');

    onAddVideo({
      title: title.trim(),
      description: desc.trim(),
      creatorName: userProfile.name || 'Gospel Creator',
      creatorAvatar: userProfile.avatarUrl || '',
      creatorId: currentUserSession,
      videoUrl: videoUrl.trim(),
      youtubeId: ytId,
      thumbnailUrl: resolvedThumbnail,
      category: isShort ? 'Shorts' : category,
      isShort,
      isFeatured: false
    });

    setTitle('');
    setDesc('');
    setVideoUrl('');
    setThumbnailUrl('');
    setChannelHandleCheck('');
    setConfirmOwnership(false);
    setIsShort(false);
    setStudioTab('content');
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4500);
  };

  const handleStartEdit = (vid: MediaItem) => {
    setEditingVideoId(vid.id);
    setEditTitle(vid.title);
    setEditDesc(vid.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVideoId && editTitle.trim()) {
      onUpdateVideo(editingVideoId, editTitle.trim(), editDesc.trim());
      setEditingVideoId(null);
      setShowEditSuccess(true);
      setTimeout(() => setShowEditSuccess(false), 4000);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans text-zinc-900 dark:text-zinc-50 max-w-7xl mx-auto pb-12">
      
      {/* Studio Header & Tab Switcher */}
      <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-rose-600/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg">🎬</span>
            <span>Creator Studio</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium pt-1 flex items-center gap-1.5">
            <span>{userProfile?.youtubeChannelHandle || `@${userProfile?.name?.toLowerCase().replace(/\s+/g, '') || 'creator'}`}</span>
            <span>•</span>
            <span>Content & Analytics Control Center</span>
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 select-none w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStudioTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              studioTab === 'dashboard'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioTab('content')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              studioTab === 'content'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Content ({myVideos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              studioTab === 'upload'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="animate-fade-in bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 p-4 rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 select-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Congratulations! Your video embed has been published to Christ Studio!</span>
        </div>
      )}

      {showEditSuccess && (
        <div className="animate-fade-in bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 p-4 rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 select-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Video details have been successfully updated!</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. REAL DYNAMIC DASHBOARD VIEW                                            */}
      {/* ========================================================================= */}
      {studioTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 select-none">
            <div className="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl"><Video className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Media</p>
                <h4 className="text-base sm:text-lg font-black">{myVideos.length}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><Eye className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Views</p>
                <h4 className="text-base sm:text-lg font-black">{totalViews.toLocaleString()}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Sparkles className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Likes</p>
                <h4 className="text-base sm:text-lg font-black">{totalLikes.toLocaleString()}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl"><MessageSquare className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Discussions</p>
                <h4 className="text-base sm:text-lg font-black">{totalComments.toLocaleString()}</h4>
              </div>
            </div>
          </div>

          {/* Detailed Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: Latest Upload Performance */}
            <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 select-none">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                  <span>Latest Release</span>
                </h3>
              </div>

              {latestVideo ? (
                <div className="space-y-3.5">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800">
                    <img 
                      src={latestVideo.thumbnailUrl} 
                      alt={latestVideo.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                      {latestVideo.isShort ? 'Shorts' : latestVideo.category}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs sm:text-sm leading-snug line-clamp-2">
                    {latestVideo.title}
                  </h4>

                  <p className="text-[10px] text-zinc-400 font-medium">
                    Published: {new Date(latestVideo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-500">Views</span>
                      <span>{(latestVideo.views || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-500">Likes</span>
                      <span className="text-rose-500">{Array.isArray(latestVideo.likes) ? latestVideo.likes.length : 0}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-zinc-500">Comments</span>
                      <span>{Array.isArray(latestVideo.comments) ? latestVideo.comments.length : 0}</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setStudioTab('content')}
                    className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 transition cursor-pointer"
                  >
                    Manage in Content Tab →
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3 select-none">
                  <p className="text-xs text-zinc-400 font-medium">No videos published yet.</p>
                  <button
                    type="button"
                    onClick={() => setStudioTab('upload')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Upload First Video
                  </button>
                </div>
              )}
            </div>

            {/* COLUMN 2: Recent Publications */}
            <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 select-none">
                <h3 className="text-xs font-black uppercase tracking-wider">Recent Publications</h3>
                {myVideos.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setStudioTab('content')} 
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    View all →
                  </button>
                )}
              </div>

              {sortedMyVideos.length === 0 ? (
                <p className="text-xs text-zinc-400 italic text-center py-8">No recent videos to show.</p>
              ) : (
                <div className="space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {sortedMyVideos.slice(0, 4).map((vid) => (
                    <div key={vid.id} className="pt-3 first:pt-0 flex items-center gap-3">
                      <div className="w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative border border-zinc-800">
                        <img src={vid.thumbnailUrl} className="w-full h-full object-cover" alt="" loading="lazy" />
                        {vid.isShort && (
                          <span className="absolute bottom-0.5 right-0.5 bg-rose-600 text-[6px] text-white px-1 rounded font-black uppercase">Shorts</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold truncate leading-tight">{vid.title}</h5>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                          {(vid.views || 0).toLocaleString()} Views • {Array.isArray(vid.likes) ? vid.likes.length : 0} Likes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN 3: Channel Stats & Followers */}
            <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 select-none">
                <h3 className="text-xs font-black uppercase tracking-wider">Channel Reach</h3>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="space-y-1 select-none">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Active Followers</span>
                <h4 className="text-2xl sm:text-3xl font-black tracking-tight">{realFollowersCount.toLocaleString()}</h4>
                <span className="text-[10px] text-emerald-500 font-bold">Fellowship subscribers</span>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 select-none">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Audience Engagement</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-500">Total Views</span>
                    <span>{totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-500">Est. Watch Time</span>
                    <span>{estimatedWatchHours} hrs</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-500">Total Likes</span>
                    <span className="text-rose-500">{totalLikes.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Top Ranked Content */}
              <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-zinc-400 select-none">Top Videos</h5>
                {topVideos.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No publications yet.</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {topVideos.map((tv, idx) => (
                      <div key={tv.id} className="flex justify-between items-center">
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[170px]">
                          {idx + 1}. {tv.title}
                        </span>
                        <span className="font-bold text-emerald-500">{tv.views || 0} views</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REAL CONTENT DIRECTORY TABLE VIEW                                      */}
      {/* ========================================================================= */}
      {studioTab === 'content' && (
        <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 select-none">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Channel Media Library</h3>
              <p className="text-xs text-zinc-500 font-medium">Manage, edit, and review all your uploaded gospel videos & shorts.</p>
            </div>
            
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your library..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                />
              </div>

              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value as any)}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Content</option>
                <option value="videos">Videos Only</option>
                <option value="shorts">Shorts Only</option>
              </select>

              <button
                type="button"
                onClick={() => setStudioTab('upload')}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {filteredContentVideos.length === 0 ? (
            <div className="text-center py-16 space-y-3 select-none">
              <Layers className="w-10 h-10 text-zinc-400 mx-auto opacity-50" />
              <p className="text-sm text-zinc-400 font-bold">
                {searchQuery ? 'No publications match your search query.' : 'You have not published any content yet.'}
              </p>
              <button
                type="button"
                onClick={() => setStudioTab('upload')}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Publish Your First Video
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 select-none">
                  <tr>
                    <th className="py-2.5 px-3">Media</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Published</th>
                    <th className="py-2.5 px-3">Views</th>
                    <th className="py-2.5 px-3">Likes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
                  {filteredContentVideos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800">
                            <img src={vid.thumbnailUrl} className="w-full h-full object-cover" alt={vid.title} loading="lazy" />
                            {vid.isShort && (
                              <span className="absolute bottom-0.5 right-0.5 bg-rose-600 text-[6px] text-white px-1 rounded font-black uppercase">Shorts</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs truncate max-w-[200px] sm:max-w-xs">{vid.title}</h5>
                            <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">{vid.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 select-none">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          vid.isShort ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {vid.isShort ? 'Shorts' : 'Video'}
                        </span>
                      </td>
                      <td className="py-3 px-3 select-none text-zinc-500 dark:text-zinc-400 font-bold">
                        {vid.category}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 select-none">
                        {new Date(vid.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-bold">{(vid.views || 0).toLocaleString()}</td>
                      <td className="py-3 px-3 font-bold text-rose-500">{Array.isArray(vid.likes) ? vid.likes.length : 0}</td>
                      <td className="py-3 px-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleStartEdit(vid)} 
                            className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer transition"
                            title="Edit Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${vid.title}"?`)) {
                                onDeleteVideo(vid.id);
                              }
                            }} 
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg cursor-pointer transition"
                            title="Delete Video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. UPLOAD MEDIA FORM VIEW                                                 */}
      {/* ========================================================================= */}
      {studioTab === 'upload' && (
        <form 
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md space-y-5 animate-slide-down"
        >
          <div className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider pb-2 border-b border-zinc-100 dark:border-zinc-800 select-none">
            <FileVideo className="w-4 h-4" />
            <span>Publish Gospel Media (YouTube Embed)</span>
          </div>

          {validationError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-semibold rounded-2xl flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1 select-none">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Creator Policy</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Videos must be family-friendly and uphold Christian faith values. You are publishing as: <strong className="text-zinc-900 dark:text-white">{userProfile?.youtubeChannelHandle || userProfile?.name || 'Creator'}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                Video Title *
              </label>
              <input
                type="text" 
                required 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter sermon or song title"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                YouTube Video / Shorts Link *
              </label>
              <input
                type="text" 
                required 
                value={videoUrl} 
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or /shorts/..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                Confirm Channel Handle
              </label>
              <input
                type="text" 
                value={channelHandleCheck} 
                onChange={(e) => setChannelHandleCheck(e.target.value)}
                placeholder={userProfile?.youtubeChannelHandle || "e.g. @MyMinistry"}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
              />
            </div>

            <div className="space-y-1 select-none">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                Category
              </label>
              <select
                disabled={isShort} 
                value={category} 
                onChange={(e) => setCategory(e.target.value as MediaCategory)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none font-semibold disabled:opacity-50 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="dark:bg-zinc-900">{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Cover Thumbnail</span>
                {thumbnailUrl && <span className="text-[9px] text-emerald-500 font-bold">✨ Auto-Fetched</span>}
              </label>
              <input
                type="text" 
                value={thumbnailUrl} 
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Thumbnail URL auto-generated from YouTube"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
              />
            </div>

            <div className="flex flex-col justify-end select-none">
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <input
                  type="checkbox" 
                  id="is-short-toggle" 
                  checked={isShort} 
                  onChange={(e) => setIsShort(e.target.checked)}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 rounded cursor-pointer"
                />
                <label htmlFor="is-short-toggle" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  📽️ Format as Vertical Short (9:16)
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <input
              type="checkbox" 
              id="confirm-ownership" 
              checked={confirmOwnership} 
              onChange={(e) => setConfirmOwnership(e.target.checked)}
              className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 rounded cursor-pointer shrink-0"
            />
            <label htmlFor="confirm-ownership" className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer leading-normal">
              I certify in good faith that I have the rights to share this Christian media on Christ Studio.
            </label>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
              Description & Scripture References *
            </label>
            <textarea
              required 
              rows={3}
              value={desc} 
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Provide a brief description, sermon notes, or scripture references..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-normal resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2.5 select-none pt-2">
            <button
              type="button" 
              onClick={() => setStudioTab('dashboard')}
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-rose-600/20 active:scale-95"
            >
              Publish Video
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 4. EDITING MODAL                                                          */}
      {/* ========================================================================= */}
      {editingVideoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
          <form 
            onSubmit={handleSaveEdit}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-2xl space-y-4 text-left animate-scale-up"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 select-none">
              <h4 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-rose-500" />
                <span>Edit Media Details</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingVideoId(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Video Title</label>
              <input
                type="text" 
                required 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Description</label>
              <textarea
                rows={4}
                value={editDesc} 
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none font-normal leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 select-none">
              <button
                type="button" 
                onClick={() => setEditingVideoId(null)}
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                Save Updates
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default CreatorStudio;