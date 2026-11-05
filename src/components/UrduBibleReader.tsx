import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  BookOpen, ChevronRight, ChevronLeft, Plus, Minus, 
  Copy, Check, Share2, ArrowRight, ArrowLeft, Search, PenTool, Hash, Sparkles
} from 'lucide-react';

interface Verse {
  verse?: number;
  verseNum?: number;
  number?: number;
  text?: string;
}

interface BibleBook {
  num: number;
  name: string;
  chapters: number;
  testament: 'old' | 'new';
  category: string;
  author: string;
  description: string;
}

const BIBLE_BOOKS: BibleBook[] = [
  // --- OLD TESTAMENT ---
  { num: 1, name: 'Genesis', chapters: 50, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'The book of origins, creation, the fall of man, and God\'s covenant with Israel.' },
  { num: 2, name: 'Exodus', chapters: 40, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'Deliverance of Israel from Egypt, crossing the Red Sea, and the Ten Commandments.' },
  { num: 3, name: 'Leviticus', chapters: 27, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'Laws of holiness, offerings, priesthood, and sacrificial worship.' },
  { num: 4, name: 'Numbers', chapters: 36, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'The 40-year wilderness journey and census of the tribes of Israel.' },
  { num: 5, name: 'Deuteronomy', chapters: 34, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'Moses\' final sermons and repetition of the Law before entering Canaan.' },

  // Historical Books
  { num: 6, name: 'Joshua', chapters: 24, testament: 'old', category: 'Historical Books', author: 'Joshua', description: 'Conquest of the Promised Land and division among the 12 tribes.' },
  { num: 7, name: 'Judges', chapters: 21, testament: 'old', category: 'Historical Books', author: 'Samuel', description: 'Israel\'s cycles of sin, judgment, and deliverance by God-appointed Judges.' },
  { num: 8, name: 'Ruth', chapters: 4, testament: 'old', category: 'Historical Books', author: 'Samuel', description: 'A beautiful story of loyalty, redemption, and the lineage of King David.' },
  { num: 9, name: '1 Samuel', chapters: 31, testament: 'old', category: 'Historical Books', author: 'Samuel / Gad', description: 'Establishment of the Hebrew monarchy, King Saul, and the youth of David.' },
  { num: 10, name: '2 Samuel', chapters: 24, testament: 'old', category: 'Historical Books', author: 'Nathan / Gad', description: 'The reign, triumphs, and trials of King David over all Israel.' },

  // Wisdom & Poetry
  { num: 18, name: 'Job', chapters: 42, testament: 'old', category: 'Wisdom & Poetry', author: 'Job / Moses', description: 'A profound look at human suffering, unwavering faith, and divine sovereignty.' },
  { num: 19, name: 'Psalms', chapters: 150, testament: 'old', category: 'Wisdom & Poetry', author: 'David & others', description: 'Inspired prayers, songs of worship, praise, and messianic prophecies.' },
  { num: 20, name: 'Proverbs', chapters: 31, testament: 'old', category: 'Wisdom & Poetry', author: 'King Solomon', description: 'Practical wisdom and guidance for godly, righteous, and disciplined living.' },

  // Prophets
  { num: 23, name: 'Isaiah', chapters: 66, testament: 'old', category: 'Prophetic Books', author: 'Isaiah', description: 'Glorious prophecies of the suffering Servant Messiah and the future kingdom.' },

  // --- NEW TESTAMENT ---
  { num: 40, name: 'Matthew', chapters: 28, testament: 'new', category: 'Gospels & Acts', author: 'Matthew', description: 'Jesus presented as the promised King, Messiah, and fulfillment of OT prophecy.' },
  { num: 41, name: 'Mark', chapters: 16, testament: 'new', category: 'Gospels & Acts', author: 'Mark', description: 'Fast-paced, action-packed account of Jesus as the Servant Son of God.' },
  { num: 42, name: 'Luke', chapters: 24, testament: 'new', category: 'Gospels & Acts', author: 'Luke', description: 'Detailed historical account of Jesus\' humanity, compassion, and salvation for all.' },
  { num: 43, name: 'John', chapters: 21, testament: 'new', category: 'Gospels & Acts', author: 'John', description: 'Deep spiritual Gospel revealing the divinity, grace, and eternal life in Jesus.' },
  { num: 44, name: 'Acts', chapters: 28, testament: 'new', category: 'Gospels & Acts', author: 'Luke', description: 'Outpouring of the Holy Spirit and the birth and spread of the early Church.' },
  { num: 45, name: 'Romans', chapters: 16, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'The definitive masterwork on righteousness and salvation by grace through faith.' },
  { num: 66, name: 'Revelation', chapters: 22, testament: 'new', category: 'Prophecy', author: 'John', description: 'The apocalyptic revelation of Jesus Christ, ultimate victory over evil, and New Jerusalem.' }
];

export default function EnglishNivBibleHub() {
  const [viewMode, setViewMode] = useState<'library' | 'book_overview' | 'reader'>('library');
  const [testament, setTestament] = useState<'old' | 'new'>('new');
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [copiedVerseId, setCopiedVerseId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore Reader Loader (NIV English)
  useEffect(() => {
    if (viewMode !== 'reader') return;

    async function loadChapter() {
      setLoading(true);
      const cacheKey = `niv_b${selectedBook.num}_c${selectedChapter}`;
      
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setVerses(JSON.parse(cached));
          setLoading(false);
          return;
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      try {
        // Primary format: Genesis_1
        let docId = `${selectedBook.name}_${selectedChapter}`;
        let docRef = doc(db, 'niv_bible', docId);
        let docSnap = await getDoc(docRef);

        // Fallback format: book_1_chapter_1 or urdu_bible collection
        if (!docSnap.exists()) {
          docId = `book_${selectedBook.num}_chapter_${selectedChapter}`;
          docRef = doc(db, 'niv_bible', docId);
          docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            docRef = doc(db, 'urdu_bible', docId);
            docSnap = await getDoc(docRef);
          }
        }

        if (docSnap.exists()) {
          const data = docSnap.data().verses || [];
          setVerses(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } else {
          setVerses([]);
        }
      } catch (err) {
        console.error("Firestore Fetching Error:", err);
        setVerses([]);
      } finally {
        setLoading(false);
      }
    }
    loadChapter();
  }, [selectedBook, selectedChapter, viewMode]);

  // Actions
  const openBookOverview = (book: BibleBook) => {
    setSelectedBook(book);
    setViewMode('book_overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openChapterReader = (book: BibleBook, chapterNum: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapterNum);
    setViewMode('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyVerse = (verseNum: number, text: string) => {
    const copyText = `"${text}" — ${selectedBook.name} ${selectedChapter}:${verseNum} (NIV)\n\n† Christ Studio Bible`;
    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedVerseId(verseNum);
      setTimeout(() => setCopiedVerseId(null), 2000);
    });
  };

  const handleShareVerse = (verseNum: number, text: string) => {
    const shareText = `"${text}" — ${selectedBook.name} ${selectedChapter}:${verseNum} (NIV)`;
    const shareUrl = window.location.origin;
    if (navigator.share) {
      navigator.share({ title: `${selectedBook.name} ${selectedChapter}:${verseNum}`, text: shareText, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert("Verse copied to clipboard for sharing!");
    }
  };

  // Group Books by Categories
  const groupByCategory = (testamentType: 'old' | 'new') => {
    const books = BIBLE_BOOKS.filter(b => {
      const matchT = b.testament === testamentType;
      const matchS = b.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchT && matchS;
    });
    
    const categories: { [key: string]: BibleBook[] } = {};
    books.forEach(b => {
      if (!categories[b.category]) categories[b.category] = [];
      categories[b.category].push(b);
    });
    return categories;
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans selection:bg-amber-500/20" dir="ltr">
      
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* TOP BRAND HEADER */}
        <div className="flex justify-between items-center border-b border-amber-900/10 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span className="font-serif font-black text-lg text-amber-900 dark:text-amber-400">Holy Bible (NIV Edition)</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode('library')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${viewMode === 'library' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-zinc-800'}`}
            >
              Library
            </button>
            {viewMode !== 'library' && (
              <button 
                onClick={() => setViewMode('book_overview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${viewMode === 'book_overview' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-zinc-800'}`}
              >
                Chapters Grid
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* TIER 1: ALL BOOKS LIBRARY VIEW */}
        {/* ========================================================= */}
        {viewMode === 'library' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Hero Card */}
            <div className="bg-gradient-to-r from-stone-900 via-slate-900 to-amber-950 text-white p-8 rounded-3xl text-center space-y-3 shadow-xl border border-amber-500/20">
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-amber-500/30">
                HOLY BIBLE • NEW INTERNATIONAL VERSION
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold font-serif text-amber-100">
                Scripture Study Hub
              </h1>
              <p className="text-xs sm:text-sm text-amber-200/80 max-w-xl mx-auto italic">
                Read, study, and meditate on all 66 books of the Holy Bible in modern English.
              </p>

              {/* Search Bar */}
              <div className="pt-4 max-w-md mx-auto relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search any book... (e.g. Genesis, Matthew)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-amber-500/30 rounded-2xl text-xs text-white placeholder-amber-200/50 focus:outline-none focus:bg-white/20 transition"
                />
              </div>
            </div>

            {/* Testament Toggle */}
            <div className="flex bg-amber-900/10 dark:bg-zinc-900 p-1 rounded-2xl border border-amber-900/10 dark:border-zinc-800">
              <button
                onClick={() => setTestament('new')}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${testament === 'new' ? 'bg-white dark:bg-zinc-800 text-amber-900 dark:text-amber-400 shadow' : 'text-slate-500'}`}
              >
                New Testament (27 Books)
              </button>
              <button
                onClick={() => setTestament('old')}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${testament === 'old' ? 'bg-white dark:bg-zinc-800 text-amber-900 dark:text-amber-400 shadow' : 'text-slate-500'}`}
              >
                Old Testament (39 Books)
              </button>
            </div>

            {/* Books Grid Categories */}
            <div className="space-y-8">
              {Object.entries(groupByCategory(testament)).map(([category, books]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-3 text-xs font-black text-amber-700 dark:text-amber-400 tracking-wider uppercase">
                    <span>{category}</span>
                    <div className="h-px bg-amber-900/10 dark:bg-zinc-800 flex-1"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {books.map(b => (
                      <div
                        key={b.num}
                        onClick={() => openBookOverview(b)}
                        className="p-4 rounded-2xl border border-amber-900/10 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-600 hover:shadow-lg transition cursor-pointer group space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-extrabold text-base text-amber-950 dark:text-amber-300 group-hover:text-amber-600 transition">
                            {b.name}
                          </h3>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-zinc-800 text-amber-800 dark:text-zinc-300">
                            {b.chapters} Ch.
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                          {b.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TIER 2: BOOK OVERVIEW & CHAPTERS GRID */}
        {/* ========================================================= */}
        {viewMode === 'book_overview' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Back Link */}
            <button
              onClick={() => setViewMode('library')}
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Bible Library</span>
            </button>

            {/* Main Card */}
            <div className="bg-white dark:bg-zinc-900 border border-amber-900/15 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
              
              {/* Header Box */}
              <header className="bg-[#fdfaf6] dark:bg-zinc-950 p-8 sm:p-12 text-center border-b border-amber-900/10 dark:border-zinc-800 space-y-3">
                <h1 className="text-4xl sm:text-6xl font-extrabold font-serif text-amber-950 dark:text-amber-100">
                  {selectedBook.name}
                </h1>
                
                <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest pt-2">
                  <span className="flex items-center gap-1.5"><PenTool className="w-3.5 h-3.5" /> Author: {selectedBook.author}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> {selectedBook.chapters} Chapters</span>
                </div>
              </header>

              {/* Intro Box */}
              <div className="m-6 sm:m-8 p-6 border-l-4 border-amber-600 bg-amber-500/5 dark:bg-zinc-950/50 rounded-2xl text-sm sm:text-base italic text-slate-700 dark:text-zinc-300 leading-relaxed">
                <p><strong>Overview:</strong> {selectedBook.description}</p>
              </div>

              {/* Chapters Grid */}
              <div className="px-6 sm:px-8 pb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Select a Chapter to Read:
                </h3>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2.5">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(chNum => (
                    <button
                      key={chNum}
                      onClick={() => openChapterReader(selectedBook, chNum)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 hover:border-amber-600 transition font-black text-sm flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      {chNum}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TIER 3: ENGLISH BIBLE READER VIEW */}
        {/* ========================================================= */}
        {viewMode === 'reader' && (
          <div className="bg-white dark:bg-zinc-900 border border-amber-900/15 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 animate-fadeIn">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <button
                onClick={() => setViewMode('book_overview')}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {selectedBook.name} Chapters</span>
              </button>
              
              <span className="text-xs font-bold text-slate-500 font-mono">
                {selectedBook.name} — Chapter {selectedChapter} (NIV)
              </span>
            </div>

            {/* Selectors Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600 shrink-0" />
                <h2 className="text-base font-black">
                  {selectedBook.name} {selectedChapter}
                </h2>
              </div>
              
              <div className="grid grid-cols-3 md:flex items-center gap-2 w-full md:w-auto">
                {/* Book Select */}
                <select 
                  value={selectedBook.num}
                  onChange={(e) => {
                    const book = BIBLE_BOOKS.find(b => b.num === Number(e.target.value));
                    if (book) {
                      setSelectedBook(book);
                      setSelectedChapter(1);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs font-extrabold text-slate-900 dark:text-zinc-100 cursor-pointer focus:outline-none"
                >
                  {BIBLE_BOOKS.map(b => (
                    <option key={b.num} value={b.num} className="dark:bg-zinc-900">
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Chapter Select */}
                <select 
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs font-extrabold text-slate-900 dark:text-zinc-100 cursor-pointer focus:outline-none"
                >
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num} className="dark:bg-zinc-900">Chapter {num}</option>
                  ))}
                </select>

                {/* Font Adjuster */}
                <div className="w-full flex items-center border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-950">
                  <button 
                    onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                    className="flex-1 flex items-center justify-center p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-xs font-bold border-r border-slate-200 dark:border-zinc-800 cursor-pointer"
                    title="Increase Font Size"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                    className="flex-1 flex items-center justify-center p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-xs font-bold cursor-pointer"
                    title="Decrease Font Size"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Verses Rendering */}
            {loading ? (
              <div className="py-24 text-center text-xs font-bold text-slate-400 animate-pulse">
                Loading Scripture Text...
              </div>
            ) : verses.length > 0 ? (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {verses.map((v, idx) => {
                  const verseNum = v.verseNum || v.verse || v.number || (idx + 1);
                  const verseText = v.text || '';

                  return (
                    <div 
                      key={verseNum} 
                      className="p-4 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-200/60 dark:border-zinc-800/80 hover:border-amber-500/40 transition group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-800 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md font-mono">
                          Verse {verseNum}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button 
                            onClick={() => handleCopyVerse(verseNum, verseText)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                            title="Copy Verse"
                          >
                            {copiedVerseId === verseNum ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button 
                            onClick={() => handleShareVerse(verseNum, verseText)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                            title="Share Verse"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Verse Text */}
                      <p 
                        style={{ fontSize: `${fontSize}px` }} 
                        className="text-slate-800 dark:text-zinc-100 font-sans leading-relaxed tracking-normal select-text selection:bg-amber-500/20"
                      >
                        {verseText}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-24 text-center text-xs font-bold text-slate-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                This chapter is currently unavailable.
              </div>
            )}

            {/* Bottom Nav */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-zinc-800 pt-4">
              <button
                onClick={() => {
                  if (selectedChapter > 1) setSelectedChapter(prev => prev - 1);
                }}
                disabled={selectedChapter === 1}
                className="flex items-center gap-1 px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-black rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Chapter
              </button>
              
              <span className="text-xs font-bold text-slate-500 font-mono">
                Chapter {selectedChapter} of {selectedBook.chapters}
              </span>
              
              <button
                onClick={() => {
                  if (selectedChapter < selectedBook.chapters) setSelectedChapter(prev => prev + 1);
                }}
                disabled={selectedChapter === selectedBook.chapters}
                className="flex items-center gap-1 px-4 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-black rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-40 cursor-pointer"
              >
                Next Chapter <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}