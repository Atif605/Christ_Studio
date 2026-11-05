import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Calendar, BookMarked, Edit2, Clock, Trash2, Heart, CheckCircle2, Search, Filter } from 'lucide-react';
import { Devotional, UserProfile, JournalEntry } from '../types';

type BilingualDevotional = Devotional & {
  urduTitle?: string;
  urduScriptureText?: string;
  urduBody?: string;
  urduReflectionQuestion?: string;
  urduCategory?: string;
};

interface DailyDevotionalProps {
  devotionals: Devotional[];
  journalEntries: JournalEntry[];
  onAddJournalEntry: (verseRef: string, verseText: string, note: string) => void;
  onDeleteJournalEntry: (id: string) => void;
  userProfile: UserProfile | null;
  onTriggerAuth: () => void;
}

export default function DailyDevotional({
  devotionals,
  journalEntries,
  onAddJournalEntry,
  onDeleteJournalEntry,
  userProfile,
  onTriggerAuth
}: DailyDevotionalProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeDevIndex, setActiveDevIndex] = useState(0);
  const [reflectionText, setReflectionText] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [searchDiaryQuery, setSearchDiaryQuery] = useState('');

  // Mobile navigation tabs configuration (Saves screen space & mimics native mobile app UX)
  const [mobileTab, setMobileTab] = useState<'reader' | 'selector' | 'diary'>('reader');

  useEffect(() => {
    const savedFavs = localStorage.getItem('christ_studio_fav_devs');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (err) {
        setFavorites([]);
      }
    }
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(devotionals.map(d => d.category));
    return ['All', ...Array.from(cats)];
  }, [devotionals]);

  const filteredDevotionals = useMemo(() => {
    return devotionals.filter(d => selectedCategory === 'All' || d.category === selectedCategory);
  }, [devotionals, selectedCategory]);

  useEffect(() => {
    setActiveDevIndex(0);
  }, [selectedCategory]);

  const activeDev: BilingualDevotional = filteredDevotionals[activeDevIndex];

  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(entry => 
      !searchDiaryQuery || 
      entry.note.toLowerCase().includes(searchDiaryQuery.toLowerCase()) || 
      entry.verseRef.toLowerCase().includes(searchDiaryQuery.toLowerCase())
    );
  }, [journalEntries, searchDiaryQuery]);

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim() || !activeDev) return;

    if (!userProfile) {
      onTriggerAuth();
      return;
    }

    onAddJournalEntry(
      activeDev.scriptureRef,
      activeDev.scriptureText,
      reflectionText.trim()
    );

    setReflectionText('');
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 4000);
  };

  const toggleFavorite = (id: string) => {
    let updated: string[];
    if (favorites.includes(id)) {
      updated = favorites.filter(fav => fav !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem('christ_studio_fav_devs', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans text-zinc-900 dark:text-zinc-50">
      
      {/* 1. TOP WELCOME BANNER */}
      <div className="bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border border-amber-500/20 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* English Purpose */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
              🕊️ Quiet Time Devotionals & Journal
            </h4>
            <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-semibold">
              This space is dedicated to your daily fellowship with God. Select a daily devotional, read the Scripture passage, ponder the reflection prompt, and write your private notes inside your cloud-synced spiritual diary.
            </p>
          </div>
          
          {/* Urdu Purpose (RTL) */}
          <div className="space-y-1 text-right border-t md:border-t-0 md:border-l border-amber-500/10 dark:border-amber-900/10 pt-3.5 md:pt-0 md:pl-4" dir="rtl">
            <h4 className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
              📖 خلوت کا وقت اور ڈائری کا مقصد
            </h4>
            <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed font-bold">
              یہ حصہ خدا کے ساتھ آپ کی روزانہ کی رفاقت کے لیے مخصوص ہے۔ روزانہ کا کلام منتخب کریں، کلامِ مقدس کی تلاوت کریں، سوچنے کے سوال پر غور کریں، اور اپنے ذاتی تاثرات کو اپنی کلاؤڈ ڈائری میں محفوظ کریں۔
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs (Only visible on mobile and tablets to save massive screen space) */}
      <div className="lg:hidden flex border-b border-zinc-200 dark:border-zinc-800 p-1 bg-zinc-50 dark:bg-zinc-950 rounded-2xl select-none">
        <button 
          onClick={() => setMobileTab('reader')}
          className={`flex-1 text-center py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
            mobileTab === 'reader' 
              ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-300'
          }`}
        >
          📖 Devotional
        </button>
        <button 
          onClick={() => setMobileTab('selector')}
          className={`flex-1 text-center py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
            mobileTab === 'selector' 
              ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-300'
          }`}
        >
          📂 Studies list
        </button>
        <button 
          onClick={() => setMobileTab('diary')}
          className={`flex-1 text-center py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
            mobileTab === 'diary' 
              ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-300'
          }`}
        >
          📓 My Diary
        </button>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: List of Devotionals with Category Pills */}
        <div className={`space-y-4 lg:col-span-1 select-none ${mobileTab === 'selector' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookMarked className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Select Study / کلام</span>
              </h3>
            </div>

            {/* Dynamic Theme Category Filter */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-500 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>Filter by Theme / موضوع منتخب کریں</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[9.5px] font-extrabold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      cat === selectedCategory
                        ? 'bg-amber-600 text-white border-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25 shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
              {filteredDevotionals.length === 0 ? (
                <p className="text-[11px] text-zinc-500 italic py-4 text-center">No devotionals in this theme.</p>
              ) : (
                filteredDevotionals.map((dev: BilingualDevotional, idx) => {
                  const isBookmarked = favorites.includes(dev.id);
                  const isActive = idx === activeDevIndex;

                  return (
                    <button
                      key={dev.id}
                      onClick={() => {
                        setActiveDevIndex(idx);
                        setReflectionText('');
                        setMobileTab('reader'); // Swaps back to reader tab automatically on selection
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer hover:border-amber-500/50 active:scale-95 ${
                        isActive
                          ? 'bg-amber-500/5 border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold'
                          : 'bg-transparent border-zinc-200 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-black uppercase tracking-wide truncate">
                            {dev.title}
                          </span>
                          {dev.urduTitle && (
                            <span className="block text-[11px] font-bold text-right text-zinc-500 dark:text-zinc-400 truncate mt-0.5" dir="rtl">
                              {dev.urduTitle}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {isBookmarked && (
                            <Heart className="w-3 h-3 text-rose-500 fill-current" />
                          )}
                          <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-bold">{dev.dateString}</span>
                        </div>
                      </div>
                      
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
                        {dev.scriptureRef}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Center & Right Column: Devotional Reader Panel & Reflection Journal Entries */}
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Active Devotional Reader Panel */}
          {activeDev ? (
            <article className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-7 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5 transition-all duration-150 ${mobileTab === 'reader' ? 'block' : 'hidden lg:block'}`}>
              
              {/* Devotional Reader Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-inner">
                      {activeDev.category}
                    </span>
                    {activeDev.urduCategory && (
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        {activeDev.urduCategory}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                    {activeDev.title}
                  </h2>
                  
                  {activeDev.urduTitle && (
                    <h2 className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-455 tracking-tight leading-tight pt-1" dir="rtl">
                      {activeDev.urduTitle}
                    </h2>
                  )}
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-center select-none shrink-0">
                  <button
                    onClick={() => toggleFavorite(activeDev.id)}
                    className="p-2 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-rose-500 transition cursor-pointer active:scale-95 shadow-sm border border-zinc-200 dark:border-zinc-800"
                    aria-label={favorites.includes(activeDev.id) ? "Remove Devotional from bookmarks" : "Bookmark Devotional"}
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(activeDev.id) ? 'fill-current' : ''}`} />
                  </button>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{activeDev.dateString}</span>
                  </div>
                </div>
              </div>

              {/* Scripture Reading Card */}
              <div className="p-4 bg-amber-500/[0.03] dark:bg-amber-500/[0.08] rounded-xl border border-amber-500/20 space-y-3 shadow-inner">
                
                <div className="flex items-center justify-between border-b border-amber-500/10 pb-1.5">
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1 select-none">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Scripture Reading / تلاوت کلام</span>
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm font-serif italic text-zinc-800 dark:text-zinc-100 leading-relaxed select-text">
                  "{activeDev.scriptureText}"
                </p>
                
                {activeDev.urduScriptureText && (
                  <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-relaxed text-right pt-2 border-t border-dashed border-amber-500/10" dir="rtl">
                    "{activeDev.urduScriptureText}"
                  </p>
                )}
                
                <p className="text-[10.5px] font-black text-amber-700 dark:text-amber-455 text-right select-all">
                  — {activeDev.scriptureRef}
                </p>
              </div>

              {/* Devotional Body Text */}
              <div className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed font-medium space-y-4">
                <p className="whitespace-pre-line leading-relaxed">{activeDev.body}</p>
                
                {activeDev.urduBody && (
                  <p className="whitespace-pre-line leading-relaxed text-right border-t border-dashed border-zinc-100 dark:border-zinc-800 pt-4 font-bold" dir="rtl">
                    {activeDev.urduBody}
                  </p>
                )}
              </div>

              {/* Success Info Banner */}
              {showSaveSuccess && (
                <div className="animate-fade-in bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 p-3 rounded-xl text-xs font-semibold shadow-sm select-none">
                  📓 Praise the Lord! Your study reflection has been synced safely with your Cloud Spiritual Diary. / شکرگزاری ہو! آپ کے تاثرات ڈائری میں محفوظ کر لیے گئے ہیں۔
                </div>
              )}

              {/* Quiet Time Journal Section */}
              <form 
                onSubmit={handleSaveReflection}
                className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/20 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-850"
              >
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5 select-none font-sans">
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Reflection Prompt / آج کا سوال</span>
                  </span>
                  
                  <p className="text-xs font-bold text-zinc-900 dark:text-white leading-relaxed select-text">
                    "{activeDev.reflectionQuestion}"
                  </p>

                  {activeDev.urduReflectionQuestion && (
                    <p className="text-xs font-bold text-amber-705 dark:text-amber-400 leading-relaxed text-right pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800" dir="rtl">
                      "{activeDev.urduReflectionQuestion}"
                    </p>
                  )}
                </div>

                {!userProfile ? (
                  <div className="bg-amber-500/5 border border-amber-500/10 dark:border-amber-900/30 p-4 rounded-xl text-center space-y-2 select-none animate-fade-in">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      🔒 Sign in to lock in your Quiet Time Diary in the cloud! / کلاؤڈ ڈائری کو محفوظ کرنے کے لیے سائن ان کریں۔
                    </p>
                    <button
                      type="button"
                      onClick={onTriggerAuth}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black px-4 py-2 rounded-lg transition active:scale-95 shadow-sm cursor-pointer"
                    >
                      🔑 Sign In / Join Fellowship
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      placeholder="Write your heart out... what is the Holy Spirit teaching you today? / اپنے دلی خیالات لکھیں... روح القدس آج آپ کو کیا سکھا رہا ہے؟"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 h-28 resize-none font-medium leading-relaxed shadow-inner"
                    />

                    <div className="flex justify-end select-none">
                      <button
                        type="submit"
                        id="save-reflection-btn"
                        className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black px-5 py-2.5 rounded-xl transition cursor-pointer shadow-sm border border-amber-500/25"
                      >
                        Save to Cloud Diary / ڈائری محفوظ کریں
                      </button>
                    </div>
                  </>
                )}
              </form>
            </article>
          ) : (
            <p className={`text-sm text-center py-8 text-zinc-500 select-none ${mobileTab === 'reader' ? 'block' : 'hidden lg:block'}`}>Loading devotional guides / کلام لوڈ ہو رہا ہے...</p>
          )}

          {/* 2. Quiet Time Journal entries section */}
          <section id="diary-section" className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-left transition-colors ${mobileTab === 'diary' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-3 shrink-0 select-none">
              <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <span>📓</span> Quiet Time Diary / میری ڈائری ({journalEntries.length})
              </h3>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-405 pointer-events-none">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchDiaryQuery}
                    onChange={(e) => setSearchDiaryQuery(e.target.value)}
                    placeholder="Search diary... / تلاش کریں"
                    className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-[11px] focus:outline-none placeholder-zinc-500 text-zinc-900 dark:text-white font-semibold"
                  />
                </div>

                <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/15 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cloud Synced / کلاؤڈ محفوظ</span>
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1 no-scrollbar">
              {filteredJournalEntries.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 select-none border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <p className="text-xs font-bold">No diary entries found / کوئی اندراج نہیں ملا</p>
                  <p className="text-[10px] mt-0.5 text-zinc-405">Try modifying your search or start mapping your journey by saving reflections!</p>
                </div>
              ) : (
                filteredJournalEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="bg-zinc-50 dark:bg-zinc-955 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-2.5 relative group animate-fade-in text-left transition-colors"
                  >
                    <button
                      onClick={() => onDeleteJournalEntry(entry.id)}
                      className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition duration-150 focus:outline-none cursor-pointer select-none"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold flex items-center gap-1 select-none font-sans">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        {entry.date}
                      </span>
                      <p className="text-[10px] font-black text-amber-700 dark:text-amber-450 uppercase tracking-wider select-all">
                        Studied Scripture: {entry.verseRef}
                      </p>
                    </div>

                    <p className="text-xs text-zinc-805 dark:text-zinc-200 leading-relaxed font-semibold whitespace-pre-line border-l-2 border-amber-500 pl-3 select-text font-serif">
                      "{entry.note}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}