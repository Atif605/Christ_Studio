import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Send, 
  Clock, 
  Users, 
  Sparkles, 
  MessageSquare, 
  Sun, 
  X, 
  Search, 
  Heart,
  CheckCircle2,
  Share2,
  Check
} from 'lucide-react';
import type { PrayerRequest, Comment } from '../types';

interface PrayerWallProps {
  prayerRequests: PrayerRequest[];
  onAddRequest: (request: Omit<PrayerRequest, 'id' | 'prayerCount' | 'prayedBy' | 'comments' | 'createdAt' | 'isAnswered'>) => void;
  onPray: (requestId: string) => void;
  onAddPrayerComment: (requestId: string, content: string) => void;
  onMarkAnswered: (requestId: string, praiseText: string) => void;
  currentUserSession: string;
  onTriggerAuth?: () => void;
}

function LetterAvatar({ name, avatarUrl, className = "w-8 h-8 text-xs" }: { name: string; avatarUrl?: string; className?: string }) {
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

const CATEGORIES = ['All', 'Healing', 'Wisdom', 'Strength', 'Family', 'Community', 'Faith', 'Financial', 'Spiritual'];

export function PrayerWall({
  prayerRequests = [],
  onAddRequest,
  onPray,
  onAddPrayerComment,
  onMarkAnswered,
  currentUserSession,
  onTriggerAuth
}: PrayerWallProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [wallTab, setWallTab] = useState<'Active' | 'Praise'>('Active'); 
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form States
  const [authorName, setAuthorName] = useState('');
  const [category, setCategory] = useState('Healing');
  const [requestText, setRequestText] = useState('');

  // Praise report states
  const [praiseRequestId, setPraiseRequestId] = useState<string | null>(null);
  const [praiseText, setPraiseText] = useState('');

  // Comment inputs & expansion state per request
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Auto-hide success toast with cleanup
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 4500);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && praiseRequestId) {
        setPraiseRequestId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [praiseRequestId]);

  const filteredRequests = useMemo(() => {
    return prayerRequests.filter(req => {
      const isAnswered = Boolean(req.isAnswered);
      const matchesTab = wallTab === 'Praise' ? isAnswered : !isAnswered;
      const matchesCategory = selectedCategory === 'All' || req.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        req.requestText.toLowerCase().includes(q) || 
        req.authorName.toLowerCase().includes(q) ||
        (req.praiseReportText && req.praiseReportText.toLowerCase().includes(q));
      
      return matchesTab && matchesCategory && matchesSearch;
    });
  }, [prayerRequests, wallTab, selectedCategory, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !requestText.trim()) return;

    const isGuest = !currentUserSession || currentUserSession.startsWith('session-');
    if (isGuest && onTriggerAuth) {
      onTriggerAuth();
      return;
    }

    onAddRequest({
      authorName: authorName.trim(),
      authorAvatar: '', 
      requestText: requestText.trim(),
      category
    });

    setAuthorName('');
    setRequestText('');
    setShowForm(false);
    setShowSuccess(true);
  };

  const handleCommentSubmit = (e: React.FormEvent, requestId: string) => {
    e.preventDefault();
    const commentText = commentInputs[requestId]?.trim();
    if (!commentText) return;

    const isGuest = !currentUserSession || currentUserSession.startsWith('session-');
    if (isGuest && onTriggerAuth) {
      onTriggerAuth();
      return;
    }

    onAddPrayerComment(requestId, commentText);
    setCommentInputs(prev => ({ ...prev, [requestId]: '' }));
  };

  const handlePraiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!praiseRequestId || !praiseText.trim()) return;

    onMarkAnswered(praiseRequestId, praiseText.trim());
    setPraiseRequestId(null);
    setPraiseText('');
    setWallTab('Praise'); 
  };

  const handleSharePrayer = async (req: PrayerRequest) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?prayer=${req.id}`;
    const shareData = {
      title: `Prayer Request for ${req.authorName}`,
      text: `Join us in praying for: "${req.requestText}" on Christ Studio Prayer Wall.`,
      url: shareUrl
    };

    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyShareLink(req.id, shareUrl);
        }
      }
    } else {
      copyShareLink(req.id, shareUrl);
    }
  };

  const copyShareLink = async (id: string, url: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const toggleComments = (requestId: string) => {
    setExpandedComments(prev => ({ ...prev, [requestId]: !prev[requestId] }));
  };

  return (
    <div className="space-y-6 font-sans text-left text-zinc-900 dark:text-zinc-50 max-w-5xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="space-y-1.5 text-left flex-1">
          <div className="flex items-center gap-2 select-none">
            <span className="text-xl">🕊️</span>
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Prayer Wall & Praise Reports
            </h2>
          </div>
          
          <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-serif italic leading-relaxed">
            "Again I say to you that if two of you agree on earth concerning anything that they ask, it will be done for them by My Father in heaven." — Matthew 18:19
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Post Prayer Need</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3 select-none">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          
          {/* Main Active / Praise Switch */}
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setWallTab('Active')}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                wallTab === 'Active'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span>Active Needs</span>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full">
                {prayerRequests.filter(r => !r.isAnswered).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setWallTab('Praise')}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                wallTab === 'Praise'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span>Praise Reports</span>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full">
                {prayerRequests.filter(r => !!r.isAnswered).length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prayers or names..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer border ${
                cat === selectedCategory
                  ? wallTab === 'Praise'
                    ? 'bg-amber-500 text-white border-transparent shadow-xs'
                    : 'bg-rose-600 text-white border-transparent shadow-xs'
                  : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification Toast */}
      {showSuccess && (
        <div className="animate-fade-in bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl text-xs font-semibold shadow-xs flex items-center gap-2.5 select-none">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p>Your prayer request has been published. The body of Christ is lifting you up in faith!</p>
        </div>
      )}

      {/* Share Prayer Request Form Drawer */}
      {showForm && (
        <form 
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4 animate-scale-up"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 select-none">
            <div className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Share Your Prayer Need</span>
            </div>
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            <div className="space-y-1">
              <label htmlFor="form-author-name" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                Your Name / Alias *
              </label>
              <input
                type="text"
                id="form-author-name"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Enter your name (e.g. Sister Grace)"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
              />
            </div>

            <div className="space-y-1 select-none">
              <label htmlFor="form-category" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                Category *
              </label>
              <select
                id="form-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none font-semibold cursor-pointer"
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c} className="dark:bg-zinc-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="form-request-text" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
              Prayer Details *
            </label>
            <textarea
              id="form-request-text"
              required
              rows={3}
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Share what is on your heart so believers can agree in prayer with you..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-normal resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 select-none active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Prayer Need 🕊️</span>
          </button>
        </form>
      )}

      {/* Share Praise Testimony Dialog Modal */}
      {praiseRequestId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans"
          onClick={() => setPraiseRequestId(null)}
        >
          <form 
            onSubmit={handlePraiseSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-2xl space-y-4 text-left animate-scale-up"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 select-none">
              <div className="flex items-center gap-2 text-amber-500">
                <Sun className="w-5 h-5 animate-spin" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-zinc-900 dark:text-white">
                  Share Your Praise Report
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setPraiseRequestId(null)} 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              "Give thanks to the Lord, for He is good; His love endures forever." Share how God moved in your situation!
            </p>

            <div className="space-y-1">
              <label htmlFor="praise-text-input" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                Your Testimony *
              </label>
              <textarea
                id="praise-text-input"
                required
                rows={4}
                value={praiseText}
                onChange={(e) => setPraiseText(e.target.value)}
                placeholder="Share the testimony of God's grace and how this prayer was answered..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-normal leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 select-none">
              <button
                type="button"
                onClick={() => setPraiseRequestId(null)}
                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Publish Praise Report 🙌
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Prayer Request Cards List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 select-none">
            <Heart className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-3 animate-pulse" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              No {wallTab === 'Praise' ? 'praise reports' : 'prayer needs'} found in {selectedCategory}
            </p>
            <p className="text-xs mt-1 text-zinc-500">
              {wallTab === 'Praise' 
                ? 'Stand in prayer with others and witness how prayers turn into praise!' 
                : 'Be the first to post a prayer need for the fellowship to lift up.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const alreadyPrayed = req.prayedBy?.includes(currentUserSession) ?? false;
            const isMyRequest = req.authorId === currentUserSession;
            const commentsCount = req.comments?.length || 0;

            return (
              <div 
                key={req.id}
                className={`bg-white dark:bg-zinc-900 rounded-3xl p-5 border shadow-xs space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200 relative overflow-hidden text-left ${
                  req.isAnswered 
                    ? 'border-amber-400/80 dark:border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/10' 
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {/* Answered Badge */}
                {req.isAnswered && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white font-black text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-sm select-none">
                    <Sun className="w-3 h-3 text-white fill-current animate-spin" />
                    <span>Answered by Grace</span>
                  </div>
                )}

                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <LetterAvatar 
                      name={req.authorName} 
                      avatarUrl={req.authorAvatar}
                      className={`w-9 h-9 text-xs border ${
                        req.isAnswered ? 'border-amber-400' : 'border-zinc-200 dark:border-zinc-800'
                      }`} 
                    />
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5 text-zinc-900 dark:text-white">
                        <span>{req.authorName}</span>
                        {isMyRequest && (
                          <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-md select-none">
                            You
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium pt-0.5 select-none">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider select-none ${
                    req.isAnswered 
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
                  }`}>
                    {req.category}
                  </span>
                </div>

                {/* Card Content Body */}
                <div className="space-y-3">
                  <div className="bg-zinc-50 dark:bg-zinc-950/80 p-3.5 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <span className="text-[9px] font-bold text-zinc-400 block uppercase mb-1 select-none">
                      Prayer Request:
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-serif italic whitespace-pre-line select-text">
                      "{req.requestText}"
                    </p>
                  </div>

                  {req.isAnswered && req.praiseReportText && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5 select-none">
                        ✨ Praise Testimony:
                      </span>
                      <p className="text-xs sm:text-sm font-serif font-medium text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-line pl-3 border-l-2 border-amber-500 select-text">
                        {req.praiseReportText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold select-none">
                    
                    {/* Pray Button */}
                    <button
                      type="button"
                      onClick={() => onPray(req.id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 shadow-xs ${
                        req.isAnswered
                          ? alreadyPrayed
                            ? 'bg-amber-500 text-white shadow-amber-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-amber-600 dark:text-amber-400'
                          : alreadyPrayed
                            ? 'bg-rose-600 text-white shadow-rose-600/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span>{req.isAnswered ? '🙌' : '🙏'}</span>
                      <span>
                        {req.isAnswered 
                          ? alreadyPrayed ? 'Hallelujah!' : 'Rejoice with Them'
                          : alreadyPrayed ? 'Praying in Agreement' : 'I Prayed'
                        }
                      </span>
                    </button>

                    {/* Encouraging Notes Trigger */}
                    <button
                      type="button"
                      onClick={() => toggleComments(req.id)}
                      className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3.5 py-1.5 rounded-full text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Encouragements ({commentsCount})</span>
                    </button>

                    {/* Mark Answered (for author) */}
                    {isMyRequest && !req.isAnswered && (
                      <button
                        type="button"
                        onClick={() => setPraiseRequestId(req.id)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>God Answered!</span>
                      </button>
                    )}

                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => handleSharePrayer(req)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition"
                      title="Share Prayer Request"
                    >
                      {copiedId === req.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Prayer Count Statistics */}
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0 select-none">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {req.isAnswered 
                        ? <>Praises: <strong className="text-amber-600 dark:text-amber-400">{req.prayerCount || 0}</strong> believers</>
                        : <>Lifted in prayer: <strong className="text-zinc-900 dark:text-white">{req.prayerCount || 0}</strong> times</>
                      }
                    </span>
                  </div>
                </div>

                {/* Collapsible Discussion Section */}
                {expandedComments[req.id] && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3 bg-zinc-50 dark:bg-zinc-950/90 p-4 rounded-2xl animate-fade-in">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1 select-none">
                      <Sparkles className="w-3 h-3 text-rose-500" />
                      <span>Encouraging Words & Scriptures</span>
                    </h5>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                      {commentsCount === 0 ? (
                        <p className="text-xs text-zinc-400 italic text-center py-2 select-none">
                          Leave an encouraging scripture or prayer note below.
                        </p>
                      ) : (
                        req.comments?.map((comm) => (
                          <div key={comm.id} className="flex gap-2.5 text-xs text-left">
                            <LetterAvatar 
                              name={comm.authorName} 
                              avatarUrl={comm.authorAvatar}
                              className="w-6 h-6 text-[9px]" 
                            />
                            <div className="flex-1 bg-white dark:bg-zinc-900 p-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                              <div className="flex items-center justify-between pb-0.5 select-none">
                                <span className="font-extrabold text-zinc-900 dark:text-white text-[11px]">
                                  {comm.authorName}
                                </span>
                                <span className="text-[9px] text-zinc-400 font-medium">
                                  {new Date(comm.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-zinc-700 dark:text-zinc-300 font-normal leading-relaxed select-text">
                                {comm.content}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form 
                      onSubmit={(e) => handleCommentSubmit(e, req.id)}
                      className="flex items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800"
                    >
                      <input
                        type="text"
                        value={commentInputs[req.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder={req.isAnswered ? "Write a celebration blessing..." : "Write words of comfort or a Bible verse..."}
                        className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-normal shadow-inner"
                      />
                      <button
                        type="submit"
                        className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl active:scale-95 transition cursor-pointer select-none shadow-xs shadow-rose-600/20"
                        title="Send Encouragement"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PrayerWall;