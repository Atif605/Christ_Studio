import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, Radio, Globe, Search, Heart, Share2, 
  Tv, AlertCircle, Check, Sparkles, History, ExternalLink, Play
} from 'lucide-react';
import type { LiveChannel } from '../types';
import { getYouTubeEmbedUrl, parseYouTubeId } from '../lib/youtubeUtils';

interface Props {
  channels?: LiveChannel[];
}

const DEFAULT_CHANNELS: LiveChannel[] = [
  {
    id: 'victory-channel-live',
    name: 'The Victory Channel',
    streamUrl: 'https://www.youtube.com/watch?v=w_rYqC7g9cE',
    category: 'USA',
    language: 'English',
    isLive: true,
    description: 'Faith, prayer, and uplifting Christian messages 24/7.'
  },
  {
    id: 'tbn-global-live',
    name: 'TBN Global Network',
    streamUrl: 'https://www.youtube.com/watch?v=r0fN_8VfR8E',
    category: 'Global',
    language: 'English',
    isLive: true,
    description: 'Trinity Broadcasting Network - World’s largest Christian television network.'
  },
  {
    id: 'daystar-live',
    name: 'Daystar Television',
    streamUrl: 'https://www.youtube.com/watch?v=83e601M_XpU',
    category: 'USA',
    language: 'English',
    isLive: true,
    description: 'Gospel music, live preaching, and inspirational programming.'
  },
  {
    id: 'god-tv-live',
    name: 'GOD TV Global',
    streamUrl: 'https://www.youtube.com/watch?v=1F6tY1G7D5I',
    category: 'UK',
    language: 'English',
    isLive: true,
    description: 'International Christian media broadcasting worldwide from the UK.'
  },
  {
    id: 'isaac-tv-live',
    name: 'ISAAC TV Pakistan',
    streamUrl: 'https://www.youtube.com/watch?v=dYqZ3YxV4jI',
    category: 'Pakistan',
    language: 'Urdu',
    isLive: true,
    description: 'Christian media broadcasting Gospel sermons, hymns, and prayers in Urdu.'
  },
  {
    id: 'cbn-news-live',
    name: 'CBN News Live',
    streamUrl: 'https://www.youtube.com/watch?v=p43aP606wS8',
    category: 'News',
    language: 'English',
    isLive: true,
    description: 'Christian perspective on world news and global current events.'
  }
];

function getChannelGradient(name: string): string {
  const gradients = [
    'from-rose-600 to-orange-600',
    'from-blue-600 to-indigo-600',
    'from-purple-600 to-pink-600',
    'from-emerald-600 to-teal-600',
    'from-amber-600 to-orange-600',
    'from-cyan-600 to-blue-600'
  ];
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[sum % gradients.length];
}

export function LiveTV({ channels = [] }: Props) {
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Favorites in LocalStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cs_favorite_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Recent channels in LocalStorage
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cs_recent_channels');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('cs_favorite_channels', JSON.stringify(updated));
      } catch {
        // storage quota fallback
      }
      return updated;
    });
  }, []);

  const handleSelectChannel = (channel: LiveChannel) => {
    setActiveChannel(channel);

    setRecents(prev => {
      const filtered = prev.filter(id => id !== channel.id);
      const updated = [channel.id, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('cs_recent_channels', JSON.stringify(updated));
      } catch {
        // storage quota fallback
      }
      return updated;
    });
  };

  const handleClosePlayer = useCallback(() => {
    setActiveChannel(null);
  }, []);

  // Keyboard shortcut (Escape to close player)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Escape' && activeChannel) {
        handleClosePlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChannel, handleClosePlayer]);

  const handleShare = async () => {
    if (!activeChannel) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?channel=${activeChannel.id}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allChannels = useMemo(() => {
    const safeIncoming = Array.isArray(channels) ? channels : [];
    const merged = [...safeIncoming, ...DEFAULT_CHANNELS];
    return merged.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  }, [channels]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(allChannels.map(c => c.category || 'Global')));
    return ['All', 'Favorites', 'Recently Watched', ...cats];
  }, [allChannels]);

  const languages = useMemo(() => {
    const langs = Array.from(new Set(allChannels.map(c => c.language || 'English')));
    return ['All', ...langs];
  }, [allChannels]);

  const filteredChannels = useMemo(() => {
    return allChannels.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(q) || 
        c.category.toLowerCase().includes(q) ||
        (c.language && c.language.toLowerCase().includes(q));
      
      if (!matchesSearch) return false;

      if (selectedLanguage !== 'All' && c.language !== selectedLanguage) {
        return false;
      }

      if (activeCategory === 'Favorites') return favorites.includes(c.id);
      if (activeCategory === 'Recently Watched') return recents.includes(c.id);
      if (activeCategory === 'All') return true;
      return c.category === activeCategory;
    });
  }, [allChannels, activeCategory, selectedLanguage, searchQuery, favorites, recents]);

  const embedUrl = useMemo(() => {
    if (!activeChannel) return '';
    const ytId = parseYouTubeId(activeChannel.streamUrl);
    if (ytId) {
      return getYouTubeEmbedUrl(ytId, { autoplay: true });
    }
    return activeChannel.streamUrl;
  }, [activeChannel]);

  return (
    <section className="space-y-6 text-left pb-16 text-zinc-100 max-w-7xl mx-auto px-2 sm:px-4 select-none font-sans" aria-label="Christian Live TV Network">
      
      {/* Header Section */}
      <header className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="relative p-2.5 bg-gradient-to-br from-rose-500/20 to-orange-500/10 text-rose-500 rounded-2xl border border-rose-500/30 shadow-inner">
              <Radio className="w-6 h-6 animate-pulse" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white uppercase">
                  Gospel Live TV
                </h1>
                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> 24/7 BROADCAST
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Stream Global & Regional Christian Channels Live</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1 md:flex-initial">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input 
                id="livetv-channel-search-input"
                name="livetvChannelSearch"
                type="text"
                autoComplete="off"
                placeholder="Search channel or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-rose-500 transition-all font-medium"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              id="livetv-language-select"
              name="livetvLanguageFilter"
              aria-label="Filter by Language"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 transition cursor-pointer font-bold"
            >
              {languages.map(lang => (
                <option key={lang} value={lang} className="bg-zinc-900 text-white">
                  {lang === 'All' ? '🌐 All Languages' : lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth" aria-label="Channel Filters">
          {categories.map((cat) => {
            const isFavTab = cat === 'Favorites';
            const isRecentTab = cat === 'Recently Watched';
            const isActive = activeCategory === cat;

            return (
              <button 
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-bold px-4 py-2 rounded-xl shrink-0 border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {isFavTab && <Heart className={`w-3.5 h-3.5 ${isActive ? 'fill-white' : 'text-rose-500'}`} />}
                {isRecentTab && <History className="w-3.5 h-3.5" />}
                {cat === 'All' && <Globe className="w-3.5 h-3.5" />}
                <span>{cat}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Live Stream Player */}
      {activeChannel ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-fade-in">
          
          <div className="lg:col-span-3 bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative">
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {embedUrl ? (
                <iframe
                  key={activeChannel.id}
                  src={embedUrl}
                  title={`${activeChannel.name} Live Stream`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-8 space-y-3 max-w-sm">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                  <p className="text-sm font-bold text-white">Stream Unavailable</p>
                  <p className="text-xs text-zinc-400">Unable to load active live feed for this channel.</p>
                </div>
              )}
            </div>

            {/* Bottom Stream Info Bar */}
            <div className="p-4 sm:p-5 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getChannelGradient(activeChannel.name)} border border-zinc-700 flex items-center justify-center text-white font-black text-xl uppercase shrink-0 shadow-md`}>
                  {activeChannel.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white leading-tight flex items-center gap-2">
                    {activeChannel.name}
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5 flex items-center gap-2">
                    <span>{activeChannel.category}</span>
                    <span>•</span>
                    <span>{activeChannel.language || 'English'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Direct Link */}
                <a
                  href={activeChannel.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
                  title="Open Source Stream"
                >
                  <ExternalLink className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Source</span>
                </a>

                {/* Favorite Toggle */}
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(activeChannel.id, e)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    favorites.includes(activeChannel.id)
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title={favorites.includes(activeChannel.id) ? 'Remove Favorite' : 'Save Favorite'}
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(activeChannel.id) ? 'fill-rose-500' : ''}`} />
                </button>

                {/* Share */}
                <button 
                  type="button"
                  onClick={handleShare}
                  className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition flex items-center gap-1 text-xs cursor-pointer"
                  title="Copy Stream Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>

                {/* Close Player */}
                <button 
                  type="button"
                  onClick={handleClosePlayer}
                  className="p-2.5 bg-zinc-800 hover:bg-rose-600 border border-zinc-700 hover:border-rose-600 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Close Player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Switch Channel Feed */}
          <aside className="lg:col-span-1 bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3 h-[480px] overflow-y-auto no-scrollbar shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Tv className="w-4 h-4 text-rose-500" />
                <span>Channels ({allChannels.length})</span>
              </span>
            </div>

            <div className="space-y-2">
              {allChannels.map(ch => {
                const isCurrent = activeChannel.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChannel(ch)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition border cursor-pointer ${
                      isCurrent 
                        ? 'bg-rose-600/15 border-rose-500 text-white shadow-xs' 
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getChannelGradient(ch.name)} flex items-center justify-center p-1 shrink-0 text-white font-black text-xs shadow-xs`}>
                      {ch.name.charAt(0)}
                    </span>
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold truncate leading-tight">{ch.name}</p>
                      <p className="text-[10px] text-zinc-400 uppercase mt-0.5">{ch.category} • {ch.language || 'EN'}</p>
                    </div>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

        </div>
      ) : (
        /* Channel Card Tiles */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredChannels.length === 0 ? (
            <div className="col-span-full text-center py-24 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/40">
              <Radio className="w-10 h-10 mx-auto text-zinc-600 mb-3 animate-pulse" />
              <p className="text-zinc-300 text-sm font-semibold">No channels found</p>
              <p className="text-zinc-500 text-xs mt-1">Try resetting your search query or language filter.</p>
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isFav = favorites.includes(channel.id);
              return (
                <article 
                  key={channel.id} 
                  onClick={() => handleSelectChannel(channel)}
                  className="group relative bg-zinc-950 border border-zinc-800/80 hover:border-rose-500/60 rounded-3xl p-4 sm:p-5 cursor-pointer hover:bg-zinc-900 transition-all duration-200 flex flex-col items-center justify-between text-center shadow-lg hover:shadow-rose-950/20 active:scale-95"
                >
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(channel.id, e)}
                    className="absolute top-3 right-3 p-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 transition cursor-pointer border border-zinc-800"
                    title={isFav ? 'Remove Favorite' : 'Save Favorite'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-zinc-500'}`} />
                  </button>

                  <div className="relative mt-2">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${getChannelGradient(channel.name)} border border-zinc-700/80 flex items-center justify-center text-white font-black text-2xl sm:text-3xl group-hover:scale-105 transition-transform duration-300 uppercase shadow-lg`}>
                      {channel.name.charAt(0)}
                    </div>
                    
                    {channel.isLive && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-zinc-950" />
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 w-full px-1 mt-3">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-200 group-hover:text-white truncate">
                      {channel.name}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                        {channel.category}
                      </span>
                      {channel.language && (
                        <span className="text-[9px] font-bold uppercase text-zinc-500">
                          {channel.language}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

    </section>
  );
}

export default LiveTV;