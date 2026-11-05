import React, { useState, useMemo, useEffect } from 'react';
import type { Movie } from '../types';
import { X, Film, Play, Search, Clock, Calendar, Sparkles, Eye } from 'lucide-react';
import { LazyYouTubePlayer } from './LazyYouTubePlayer';
import { parseYouTubeId, getYouTubeThumbnailUrl } from '../lib/youtubeUtils';

interface MoviePortalProps {
  movies: Movie[];
}

export function MoviePortal({ movies }: MoviePortalProps) {
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Escape key closes player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMovie(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    movies.forEach(m => {
      if (m.category) cats.add(m.category);
    });
    return ['All', ...Array.from(cats)];
  }, [movies]);

  // Filter movies
  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      const matchesCat = selectedCategory === 'All' || movie.category === selectedCategory;
      const matchesSearch = 
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (movie.director && movie.director.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [movies, selectedCategory, searchQuery]);

  // Featured Hero Movie (First item or active item)
  const featuredMovie = useMemo(() => {
    return movies.find(m => m.featured) || movies[0] || null;
  }, [movies]);

  if (activeMovie) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 text-left animate-fade-in font-sans pb-12">
        <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl relative">
          
          {/* Close / Back to Grid Button */}
          <button 
            type="button"
            onClick={() => setActiveMovie(null)}
            className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-xs p-2.5 rounded-full text-white hover:bg-rose-600 transition cursor-pointer border border-white/10 shadow-lg active:scale-95"
            aria-label="Close Movie"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Player Container */}
          <div className="w-full bg-black aspect-video relative">
            <LazyYouTubePlayer 
              url={activeMovie.videoUrl} 
              title={activeMovie.title}
              autoPlay={true}
              className="w-full h-full"
            />
          </div>

          {/* Details Pane */}
          <div className="p-6 sm:p-8 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white space-y-4">
            <div className="flex flex-wrap items-center gap-2 select-none">
              <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                {activeMovie.category || 'Gospel Movie'}
              </span>
              {activeMovie.releaseYear && (
                <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {activeMovie.releaseYear}
                </span>
              )}
              {activeMovie.duration && (
                <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activeMovie.duration}
                </span>
              )}
              {activeMovie.views !== undefined && (
                <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {activeMovie.views.toLocaleString()} views
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              {activeMovie.title}
            </h1>

            {activeMovie.director && (
              <p className="text-xs text-zinc-400 font-medium">
                Director: <span className="text-zinc-200 font-semibold">{activeMovie.director}</span>
              </p>
            )}

            {activeMovie.cast && activeMovie.cast.length > 0 && (
              <p className="text-xs text-zinc-400 font-medium">
                Starring: <span className="text-zinc-200 font-semibold">{activeMovie.cast.join(', ')}</span>
              </p>
            )}

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl pt-2 select-text font-normal">
              {activeMovie.description}
            </p>
          </div>
        </div>

        {/* Other Recommendations */}
        <div className="pt-4 space-y-4">
          <h3 className="text-base font-extrabold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Film className="w-4 h-4 text-rose-500" />
            <span>More Movies & Shows</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {movies.filter(m => m.id !== activeMovie.id).slice(0, 5).map((movie) => {
              const ytId = movie.youtubeId || parseYouTubeId(movie.videoUrl);
              const thumb = movie.thumbnailUrl || (ytId ? getYouTubeThumbnailUrl(ytId, 'hqdefault') : '');

              return (
                <div
                  key={movie.id}
                  onClick={() => setActiveMovie(movie)}
                  className="group cursor-pointer flex flex-col gap-2 rounded-2xl p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition hover:shadow-lg active:scale-95 text-left"
                >
                  <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-black relative shadow-xs">
                    <img 
                      src={thumb || 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=800&q=80'} 
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all shadow-lg">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                    {movie.title}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans pb-12 w-full max-w-7xl mx-auto">
      
      {/* Featured Hero Header Banner (If available) */}
      {featuredMovie && !searchQuery && selectedCategory === 'All' && (
        <div 
          onClick={() => setActiveMovie(featuredMovie)}
          className="relative w-full aspect-[21/9] min-h-[220px] max-h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 group cursor-pointer flex flex-col justify-end p-6 sm:p-10 select-none bg-black"
        >
          <img
            src={featuredMovie.thumbnailUrl || (parseYouTubeId(featuredMovie.videoUrl) ? getYouTubeThumbnailUrl(parseYouTubeId(featuredMovie.videoUrl)!, 'maxresdefault') : '')}
            alt={featuredMovie.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-2 max-w-2xl text-left">
            <span className="inline-flex items-center gap-1.5 bg-rose-600 text-[10px] font-black uppercase text-white px-3 py-1 rounded-full tracking-wider shadow-md">
              <Sparkles className="w-3 h-3" />
              Featured Release
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
              {featuredMovie.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed font-medium drop-shadow-xs">
              {featuredMovie.description}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button 
                type="button"
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Watch Movie</span>
              </button>
              <span className="text-xs text-zinc-300 font-bold bg-black/50 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-white/10">
                {featuredMovie.duration}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Categories */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 select-none">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shadow-xs">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
              Gospel Cinema & Series
            </h3>
            <p className="text-[11px] text-zinc-500 font-medium">Stream faith-based movies and biblical documentaries</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies & series..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 text-zinc-900 dark:text-white font-medium"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Genre Filter Pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shrink-0 border ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white border-transparent shadow-xs'
                  : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Movies Poster Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {filteredMovies.length === 0 ? (
          <div className="col-span-full text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50 dark:bg-zinc-950/50 p-6">
            <Film className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No movies found</h4>
            <p className="text-xs text-zinc-500 mt-1">Try searching with a different term or category.</p>
          </div>
        ) : (
          filteredMovies.map((movie) => {
            const ytId = movie.youtubeId || parseYouTubeId(movie.videoUrl);
            const poster = movie.thumbnailUrl || (ytId ? getYouTubeThumbnailUrl(ytId, 'hqdefault') : '');

            return (
              <div 
                key={movie.id} 
                onClick={() => setActiveMovie(movie)}
                className="group cursor-pointer flex flex-col gap-2 active:scale-95 transition-transform text-left"
              >
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 relative shadow-md">
                  <img 
                    src={poster || 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=800&q=80'} 
                    alt={movie.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 pointer-events-none"
                    loading="lazy"
                  />

                  {/* Gradient & Hover Play Icon */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Category Pill on Poster */}
                  {movie.category && (
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-[9px] font-black uppercase text-white px-2 py-0.5 rounded-md border border-white/10 select-none">
                      {movie.category}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 px-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                    {movie.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                    {movie.releaseYear && <span>{movie.releaseYear}</span>}
                    {movie.releaseYear && movie.duration && <span>•</span>}
                    {movie.duration && <span>{movie.duration}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MoviePortal;