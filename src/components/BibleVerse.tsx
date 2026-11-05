import React, { useState, useEffect } from 'react';
import { BookOpen, Copy, Check, Edit2 } from 'lucide-react';

export default function BibleVerse() {
  const [copied, setCopied] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savedEntries, setSavedEntries] = useState<any[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const scriptures = [
    { text: "For I know the plans I have for you, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
    { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
    { text: "Trust in the Lord with all your heart, and lean not on your own understanding.", ref: "Proverbs 3:5" },
    { text: "But seek first the kingdom of God and His righteousness, and all these things shall be added to you.", ref: "Matthew 6:33" },
    { text: "Be strong and of good courage; do not be afraid, nor be dismayed, for the Lord your God is with you wherever you go.", ref: "Joshua 1:9" },
    { text: "The Lord is my shepherd; I shall not want. He makes me to lie down in green pastures; He leads me beside the still waters.", ref: "Psalm 23:1-2" },
    { text: "But those who wait on the Lord shall renew their strength; they shall mount up with wings like eagles, they shall run and not be weary, they shall walk and not faint.", ref: "Isaiah 40:31" },
    { text: "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.", ref: "Romans 8:28" },
    { text: "The Lord is my light and my salvation; Whom shall I fear? The Lord is the strength of my life; Of whom shall I be afraid?", ref: "Psalm 27:1" },
    { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" }
  ];

  useEffect(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    setCurrentVerseIndex(dayOfYear % scriptures.length);

    const saved = localStorage.getItem('christ_studio_journal');
    if (saved) {
      try {
        setSavedEntries(JSON.parse(saved));
      } catch (err) {
        setSavedEntries([]);
      }
    }
  }, []);

  const activeVerse = scriptures[currentVerseIndex];

  const handleCopy = () => {
    if (!activeVerse) return;
    const textToCopy = `"${activeVerse.text}" — ${activeVerse.ref}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !activeVerse) return;

    const newEntry = {
      id: `entry-${Date.now()}`,
      verseRef: activeVerse.ref,
      verseText: activeVerse.text,
      note: noteText.trim(),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const updated = [newEntry, ...savedEntries];
    setSavedEntries(updated);
    localStorage.setItem('christ_studio_journal', JSON.stringify(updated));
    setNoteText('');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 4000);
  };

  return (
    <div 
      id="bible-verse-widget" 
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-amber-500/[0.04] to-rose-500/[0.04] dark:from-amber-500/[0.08] dark:to-rose-500/[0.08] group text-left transition-all duration-150 text-zinc-900 dark:text-zinc-50"
    >
      {/* Subtle Cross Background Overlay */}
      <div className="absolute right-6 -bottom-4 text-zinc-500/10 dark:text-white/5 text-9xl font-black select-none pointer-events-none group-hover:scale-105 transition-all duration-500">
        †
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 select-none">
            <span className="text-amber-600 dark:text-amber-400 text-base animate-pulse">✨</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Scripture of the Day</span>
          </div>
          <button
            onClick={() => setShowJournal(!showJournal)}
            id="toggle-journal-btn"
            className="text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-all flex items-center gap-1 bg-amber-500/5 hover:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/10 cursor-pointer active:scale-95 shrink-0 shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{showJournal ? 'Close Journal' : 'Write Reflection'}</span>
          </button>
        </div>

        <p id="daily-verse-text" className="text-sm sm:text-base font-serif italic leading-relaxed text-zinc-800 dark:text-zinc-100 select-text">
          "{activeVerse?.text}"
        </p>

        <div className="flex items-center justify-between pt-1 select-none">
          <span id="daily-verse-reference" className="text-xs font-black tracking-wide text-amber-705 dark:text-amber-400">
            — {activeVerse?.ref}
          </span>
          <button 
            onClick={handleCopy}
            id="share-verse-btn" 
            className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-extrabold">Copied!</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                <span>Copy Word</span>
              </>
            )}
          </button>
        </div>

        {/* Success Alert Banner */}
        {showSuccessMessage && (
          <div className="animate-fade-in bg-amber-500/5 text-amber-800 dark:text-amber-400 border border-amber-500/10 p-3.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 select-none">
            <span>✨</span>
            <span>Reflection saved to your local Spiritual Journal! You can review it inside the Quiet Time Devotionals page.</span>
          </div>
        )}

        {/* Collapsible Journal Note Form */}
        {showJournal && (
          <form 
            onSubmit={handleSaveJournal}
            className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-3 animate-slide-down"
          >
            <label htmlFor="reflection-textarea" className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider select-none">
              📝 Quiet Time Reflection
            </label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 select-none">
              How does today's word speak to your current circumstances? Jot down your thoughts below:
            </p>
            <textarea
              id="reflection-textarea"
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="What is the Lord whispering to your heart?"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-zinc-500 h-20 resize-none font-medium leading-relaxed shadow-inner"
            />
            <div className="flex justify-end select-none">
              <button
                type="submit"
                id="submit-reflection-btn"
                className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer shadow-sm border border-amber-500/20"
              >
                Save Reflection Note
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}