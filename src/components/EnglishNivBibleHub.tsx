import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  BookOpen, ChevronRight, ChevronLeft, Plus, Minus, 
  Copy, Check, Share2, ArrowRight, ArrowLeft, Search, PenTool, Hash, Sparkles, LayoutGrid, ListFilter, FileText, Bookmark
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

// بائبل کے ابواب کے عنوانات اور خلاصے (Chapter Summaries Database)
const CHAPTER_SUMMARIES: Record<string, Record<number, { title: string; summary: string }>> = {
  'Genesis': {
    1: { title: 'Creation', summary: 'God creates the universe, light, sky, land, sea, plants, stars, animals, and man in six days.' },
    2: { title: 'Eden', summary: 'God rests on the seventh day; Adam, Eve, and the first garden in Eden.' },
    3: { title: 'The Fall', summary: 'The serpent deceives Eve; the entrance of sin, shame, and God\'s promise of redemption.' },
    4: { title: 'Cain & Abel', summary: 'The first murder; Cain slays Abel; the birth of Seth.' },
    5: { title: 'Genealogy of Adam', summary: 'Lineage from Adam to Noah; Enoch walks with God and is taken.' },
    6: { title: 'The Ark Prepared', summary: 'Wickedness increases on earth; God instructs Noah to build the Ark.' },
    7: { title: 'The Great Flood', summary: 'Noah enters the Ark; floodwaters cover the earth for 40 days.' },
    8: { title: 'The Ark Rests', summary: 'Waters recede; the dove brings an olive leaf; the Ark rests on Ararat.' },
    9: { title: 'Rainbow Covenant', summary: 'God\'s covenant with Noah and creation never to flood the earth again.' },
    10: { title: 'Table of Nations', summary: 'Descendants of Shem, Ham, and Japheth after the flood.' },
    11: { title: 'Tower of Babel', summary: 'Human pride at Babel; God confuses languages and scatters mankind.' },
    12: { title: 'Abram’s Call', summary: 'God calls Abram to leave Ur for Canaan; covenant promise given.' },
    13: { title: 'Abram & Lot Separate', summary: 'Abram and Lot part ways; Lot chooses Sodom; God reassures Abram.' },
    14: { title: 'Melchizedek', summary: 'Abram rescues Lot from captivity and meets Melchizedek, King of Salem.' },
    15: { title: 'The Covenant Confirmed', summary: 'God promises Abram a biological heir as numerous as the stars.' },
    16: { title: 'Hagar & Ishmael', summary: 'Sarai gives Hagar to Abram; Ishmael is born in the wilderness.' },
    17: { title: 'Covenant of Circumcision', summary: 'God renames Abram to Abraham and Sarai to Sarah; sign of circumcision.' },
    18: { title: 'Three Heavenly Visitors', summary: 'Angel of the Lord promises Sarah a son; Abraham intercedes for Sodom.' },
    19: { title: 'Destruction of Sodom', summary: 'Angels rescue Lot; fire and brimstone destroy Sodom and Gomorrah.' },
    20: { title: 'Abraham & Abimelek', summary: 'Abraham journeys to Gerar; Abimelek is warned by God in a dream.' },
    21: { title: 'Birth of Isaac', summary: 'Isaac, child of promise, is born; Hagar and Ishmael sent away.' },
    22: { title: 'Testing of Abraham', summary: 'Abraham obeys God on Mount Moriah; God provides the sacrificial ram.' },
    23: { title: 'Death of Sarah', summary: 'Sarah dies at 127; Abraham purchases the burial cave of Machpelah.' },
    24: { title: 'A Wife for Isaac', summary: 'Abraham’s servant travels to Nahor and finds Rebekah for Isaac.' },
    25: { title: 'Jacob & Esau', summary: 'Death of Abraham; Rebekah gives birth to twins; Esau sells his birthright.' }
  },
  'Exodus': {
    1: { title: 'Israel in Slavery', summary: 'The Israelites multiply in Egypt; Pharaoh oppresses them with harsh labor.' },
    2: { title: 'Birth of Moses', summary: 'Moses placed in a basket on the Nile; rescued by Pharaoh’s daughter.' },
    3: { title: 'The Burning Bush', summary: 'God appears to Moses in holy fire; calls him to deliver Israel.' },
    4: { title: 'Signs & Miracles', summary: 'God gives Moses miraculous signs; Aaron appointed as spokesman.' },
    12: { title: 'The Passover', summary: 'Institution of Passover lamb, blood on doorposts, and Exodus from Egypt.' },
    14: { title: 'Red Sea Crossing', summary: 'God divides the Red Sea; Israel crosses on dry ground; Egyptian army defeated.' },
    20: { title: 'Ten Commandments', summary: 'God speaks the Ten Commandments from Mount Sinai amidst thunder and smoke.' }
  },
  'Matthew': {
    1: { title: 'Genealogy & Birth of Jesus', summary: 'Lineage of Jesus Christ from Abraham; virgin birth foretold to Joseph.' },
    2: { title: 'Visit of the Wise Men', summary: 'Magi worship the young King; flight to Egypt to escape Herod.' },
    3: { title: 'Baptism of Jesus', summary: 'John the Baptist preaches in wilderness; Holy Spirit descends on Jesus.' },
    4: { title: 'Temptation in Wilderness', summary: 'Jesus overcomes Satan\'s temptations; calls His first disciples in Galilee.' },
    5: { title: 'Sermon on the Mount: Beatitudes', summary: 'Blessed are the poor in spirit; salt of the earth and fulfillment of the Law.' },
    6: { title: 'Lord’s Prayer & Trusting God', summary: 'Teaching on prayer, fasting, treasures in heaven, and do not worry.' },
    7: { title: 'Ask, Seek, Knock', summary: 'Do not judge falsely; the narrow gate; building on the solid Rock.' },
    28: { title: 'Resurrection & Great Commission', summary: 'Jesus rises from the dead; commands disciples to teach all nations.' }
  },
  'John': {
    1: { title: 'The Word Became Flesh', summary: 'Jesus the eternal Word made flesh; testimony of John the Baptist.' },
    2: { title: 'Water into Wine', summary: 'Jesus performs first miracle at Cana wedding; cleanses Jerusalem Temple.' },
    3: { title: 'Nicodemus & Born Again', summary: 'Jesus teaches spiritual rebirth; God\'s love for the world (John 3:16).' },
    4: { title: 'Woman at the Well', summary: 'Jesus offers living water to Samaritan woman; heals official\'s son.' },
    14: { title: 'Way, Truth, & Life', summary: 'Jesus promises the Holy Spirit Helper and peace to His disciples.' },
    21: { title: 'Peter Restored', summary: 'Miraculous catch of fish; Jesus restores Peter by Galilee shore.' }
  },
  'Romans': {
    1: { title: 'Power of the Gospel', summary: 'Gospel is God\'s power for salvation; divine wrath against unrighteousness.' },
    3: { title: 'Justified by Faith', summary: 'All have sinned; righteousness comes through faith in Jesus Christ.' },
    8: { title: 'Life in the Spirit', summary: 'No condemnation in Christ; nothing can separate us from God\'s love.' },
    12: { title: 'Living Sacrifices', summary: 'Present your bodies as living sacrifices; love in action and humility.' }
  },
  'Revelation': {
    1: { title: 'Vision of Glorified Christ', summary: 'John sees the glorified Son of Man holding seven stars amidst lampstands.' },
    21: { title: 'New Heaven & New Earth', summary: 'God dwells with men in New Jerusalem; no more tears, death, or pain.' },
    22: { title: 'River of Life', summary: 'Tree of life; final warning and promise: Surely I am coming soon.' }
  }
};

function getChapterInfo(bookName: string, chapterNum: number) {
  const bookSummary = CHAPTER_SUMMARIES[bookName]?.[chapterNum];
  if (bookSummary) {
    return bookSummary;
  }
  return {
    title: `Chapter ${chapterNum}`,
    summary: `Read and meditate on Chapter ${chapterNum} of ${bookName}, exploring God's Word and divine truth.`
  };
}

// بائبل کی تمام 66 کتابوں کی لسٹ
const BIBLE_BOOKS: BibleBook[] = [
  // --- OLD TESTAMENT (39 BOOKS) ---
  { num: 1, name: 'Genesis', chapters: 50, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'The book of origins, creation, the fall of man, and God\'s covenant with Israel.' },
  { num: 2, name: 'Exodus', chapters: 40, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'Deliverance of Israel from Egypt, crossing the Red Sea, and the Ten Commandments.' },
  { num: 3, name: 'Leviticus', chapters: 27, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'Laws of holiness, offerings, priesthood, and sacrificial worship.' },
  { num: 4, name: 'Numbers', chapters: 36, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'The 40-year wilderness journey and census of the tribes of Israel.' },
  { num: 5, name: 'Deuteronomy', chapters: 34, testament: 'old', category: 'The Pentateuch', author: 'Moses', description: 'Moses\' final sermons and repetition of the Law before entering Canaan.' },

  { num: 6, name: 'Joshua', chapters: 24, testament: 'old', category: 'Historical Books', author: 'Joshua', description: 'Conquest of the Promised Land and division among the 12 tribes.' },
  { num: 7, name: 'Judges', chapters: 21, testament: 'old', category: 'Historical Books', author: 'Samuel', description: 'Israel\'s cycles of sin, judgment, and deliverance by God-appointed Judges.' },
  { num: 8, name: 'Ruth', chapters: 4, testament: 'old', category: 'Historical Books', author: 'Samuel', description: 'A beautiful story of loyalty, redemption, and the lineage of King David.' },
  { num: 9, name: '1 Samuel', chapters: 31, testament: 'old', category: 'Historical Books', author: 'Samuel / Gad / Nathan', description: 'Establishment of the Hebrew monarchy, King Saul, and the youth of David.' },
  { num: 10, name: '2 Samuel', chapters: 24, testament: 'old', category: 'Historical Books', author: 'Nathan / Gad', description: 'The reign, triumphs, and trials of King David over all Israel.' },
  { num: 11, name: '1 Kings', chapters: 22, testament: 'old', category: 'Historical Books', author: 'Jeremiah', description: 'Solomon\'s reign, building of the Temple, and kingdom division.' },
  { num: 12, name: '2 Kings', chapters: 25, testament: 'old', category: 'Historical Books', author: 'Jeremiah', description: 'History of the divided kingdoms of Judah and Israel leading to captivity.' },
  { num: 13, name: '1 Chronicles', chapters: 29, testament: 'old', category: 'Historical Books', author: 'Ezra', description: 'Genealogies and a spiritual recount of King David\'s reign.' },
  { num: 14, name: '2 Chronicles', chapters: 36, testament: 'old', category: 'Historical Books', author: 'Ezra', description: 'History of the kings of Judah from Solomon to the Babylonian exile.' },
  { num: 15, name: 'Ezra', chapters: 10, testament: 'old', category: 'Historical Books', author: 'Ezra', description: 'Return of the Jewish remnants from Babylon and rebuilding of the Temple.' },
  { num: 16, name: 'Nehemiah', chapters: 13, testament: 'old', category: 'Historical Books', author: 'Nehemiah', description: 'Rebuilding the walls of Jerusalem and spiritual revival.' },
  { num: 17, name: 'Esther', chapters: 10, testament: 'old', category: 'Historical Books', author: 'Mordecai', description: 'God\'s providential preservation of the Jewish people in Persia.' },

  { num: 18, name: 'Job', chapters: 42, testament: 'old', category: 'Wisdom & Poetry', author: 'Job / Moses', description: 'A profound look at human suffering, unwavering faith, and divine sovereignty.' },
  { num: 19, name: 'Psalms', chapters: 150, testament: 'old', category: 'Wisdom & Poetry', author: 'David & others', description: 'Inspired prayers, songs of worship, praise, and messianic prophecies.' },
  { num: 20, name: 'Proverbs', chapters: 31, testament: 'old', category: 'Wisdom & Poetry', author: 'King Solomon', description: 'Practical wisdom and guidance for godly, righteous, and disciplined living.' },
  { num: 21, name: 'Ecclesiastes', chapters: 12, testament: 'old', category: 'Wisdom & Poetry', author: 'King Solomon', description: 'Reflections on the vanity of earthly pursuits without God.' },
  { num: 22, name: 'Song of Solomon', chapters: 8, testament: 'old', category: 'Wisdom & Poetry', author: 'King Solomon', description: 'A poem celebrating love, marriage, and Christ\'s relationship with the Church.' },

  { num: 23, name: 'Isaiah', chapters: 66, testament: 'old', category: 'Major Prophets', author: 'Isaiah', description: 'Glorious prophecies of the suffering Servant Messiah and the future kingdom.' },
  { num: 24, name: 'Jeremiah', chapters: 52, testament: 'old', category: 'Major Prophets', author: 'Jeremiah', description: 'Warnings to Judah, prophecy of the New Covenant, and Babylon exile.' },
  { num: 25, name: 'Lamentations', chapters: 5, testament: 'old', category: 'Major Prophets', author: 'Jeremiah', description: 'Poetic laments over the destruction of Jerusalem and God\'s faithfulness.' },
  { num: 26, name: 'Ezekiel', chapters: 48, testament: 'old', category: 'Major Prophets', author: 'Ezekiel', description: 'Visions of God\'s glory, judgment on nations, and Israel\'s restoration.' },
  { num: 27, name: 'Daniel', chapters: 12, testament: 'old', category: 'Major Prophets', author: 'Daniel', description: 'Stories of faith in exile and apocalyptic prophecies of end times.' },

  { num: 28, name: 'Hosea', chapters: 14, testament: 'old', category: 'Minor Prophets', author: 'Hosea', description: 'God\'s unfaithful spouse (Israel) and His enduring, redeeming love.' },
  { num: 29, name: 'Joel', chapters: 3, testament: 'old', category: 'Minor Prophets', author: 'Joel', description: 'Call to repentance, the locust plague, and the promised Holy Spirit.' },
  { num: 30, name: 'Amos', chapters: 9, testament: 'old', category: 'Minor Prophets', author: 'Amos', description: 'Denunciation of social injustice and call for true righteousness.' },
  { num: 31, name: 'Obadiah', chapters: 1, testament: 'old', category: 'Minor Prophets', author: 'Obadiah', description: 'Prophecy of judgment against Edom for pride and hostility toward Israel.' },
  { num: 32, name: 'Jonah', chapters: 4, testament: 'old', category: 'Minor Prophets', author: 'Jonah', description: 'The reluctant prophet who learned of God\'s mercy for all nations.' },
  { num: 33, name: 'Micah', chapters: 7, testament: 'old', category: 'Minor Prophets', author: 'Micah', description: 'Prophecy of Bethlehem as the birthplace of Messiah and divine justice.' },
  { num: 34, name: 'Nahum', chapters: 3, testament: 'old', category: 'Minor Prophets', author: 'Nahum', description: 'Prophecy of the fall and destruction of Nineveh.' },
  { num: 35, name: 'Habakkuk', chapters: 3, testament: 'old', category: 'Minor Prophets', author: 'Habakkuk', description: 'A dialogue on why God permits evil and living by faith.' },
  { num: 36, name: 'Zephaniah', chapters: 3, testament: 'old', category: 'Minor Prophets', author: 'Zephaniah', description: 'Warning of the Day of the Lord and promise of a humble remnant.' },
  { num: 37, name: 'Haggai', chapters: 2, testament: 'old', category: 'Minor Prophets', author: 'Haggai', description: 'Exhortation to rebuild the Lord\'s temple after the exile.' },
  { num: 38, name: 'Zechariah', chapters: 14, testament: 'old', category: 'Minor Prophets', author: 'Zechariah', description: 'Visions of encouragement and precise prophecies of Jesus Christ.' },
  { num: 39, name: 'Malachi', chapters: 4, testament: 'old', category: 'Minor Prophets', author: 'Malachi', description: 'Rebukes for lukewarm worship and prophecy of John the Baptist.' },

  // --- NEW TESTAMENT (27 BOOKS) ---
  { num: 40, name: 'Matthew', chapters: 28, testament: 'new', category: 'Gospels & Acts', author: 'Matthew', description: 'Jesus presented as the promised King, Messiah, and fulfillment of OT prophecy.' },
  { num: 41, name: 'Mark', chapters: 16, testament: 'new', category: 'Gospels & Acts', author: 'Mark', description: 'Fast-paced, action-packed account of Jesus as the Servant Son of God.' },
  { num: 42, name: 'Luke', chapters: 24, testament: 'new', category: 'Gospels & Acts', author: 'Luke', description: 'Detailed historical account of Jesus\' humanity, compassion, and salvation for all.' },
  { num: 43, name: 'John', chapters: 21, testament: 'new', category: 'Gospels & Acts', author: 'John', description: 'Deep spiritual Gospel revealing the divinity, grace, and eternal life in Jesus.' },
  { num: 44, name: 'Acts', chapters: 28, testament: 'new', category: 'Gospels & Acts', author: 'Luke', description: 'Outpouring of the Holy Spirit and the birth and spread of the early Church.' },

  { num: 45, name: 'Romans', chapters: 16, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'The definitive masterwork on righteousness and salvation by grace through faith.' },
  { num: 46, name: '1 Corinthians', chapters: 16, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Addressing church division, Christian morality, gifts of the Spirit, and resurrection.' },
  { num: 47, name: '2 Corinthians', chapters: 13, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Paul\'s apostolic authority, ministry in weakness, and divine comfort.' },
  { num: 48, name: 'Galatians', chapters: 6, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Defense of Christian liberty and justification by faith, not legalism.' },
  { num: 49, name: 'Ephesians', chapters: 6, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Our spiritual riches in Christ, unity in the Church, and armor of God.' },
  { num: 50, name: 'Philippians', chapters: 4, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Joy, humility, and peace in Christ regardless of suffering.' },
  { num: 51, name: 'Colossians', chapters: 4, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'The supremacy and sufficiency of Christ over all creation.' },
  { num: 52, name: '1 Thessalonians', chapters: 5, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Encouragement in holiness and hope in the second coming of Jesus.' },
  { num: 53, name: '2 Thessalonians', chapters: 3, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Clarity on the Day of the Lord, antichrist, and steadfast endurance.' },
  { num: 54, name: '1 Timothy', chapters: 6, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Pastoral instructions for church leadership, sound doctrine, and order.' },
  { num: 55, name: '2 Timothy', chapters: 4, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Paul\'s final charge to remain faithful in preaching the Word.' },
  { num: 56, name: 'Titus', chapters: 3, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'Setting in order church leadership and living out sound doctrine.' },
  { num: 57, name: 'Philemon', chapters: 1, testament: 'new', category: 'Pauline Epistles', author: 'Paul', description: 'A letter on forgiveness, Christian brotherhood, and reconciliation.' },

  { num: 58, name: 'Hebrews', chapters: 13, testament: 'new', category: 'General Epistles', author: 'Unknown', description: 'The superiority of Jesus Christ as High Priest over the Old Covenant.' },
  { num: 59, name: 'James', chapters: 5, testament: 'new', category: 'General Epistles', author: 'James', description: 'Practical faith in action, perseverance through trials, and speech.' },
  { num: 60, name: '1 Peter', chapters: 5, testament: 'new', category: 'General Epistles', author: 'Peter', description: 'Hope, living holy lives, and enduring suffering for Christ.' },
  { num: 61, name: '2 Peter', chapters: 3, testament: 'new', category: 'General Epistles', author: 'Peter', description: 'Warnings against false teachers and growth in grace and knowledge.' },
  { num: 62, name: '1 John', chapters: 5, testament: 'new', category: 'General Epistles', author: 'John', description: 'Assurance of salvation, walk in the light, and love for God.' },
  { num: 63, name: '2 John', chapters: 1, testament: 'new', category: 'General Epistles', author: 'John', description: 'Walking in truth and love, and caution against deceivers.' },
  { num: 64, name: '3 John', chapters: 1, testament: 'new', category: 'General Epistles', author: 'John', description: 'Commendation of hospitality and warnings against prideful leadership.' },
  { num: 65, name: 'Jude', chapters: 1, testament: 'new', category: 'General Epistles', author: 'Jude', description: 'Exhortation to contend earnestly for the faith against apostasy.' },

  { num: 66, name: 'Revelation', chapters: 22, testament: 'new', category: 'Prophecy', author: 'John', description: 'The apocalyptic revelation of Jesus Christ, ultimate victory over evil, and New Jerusalem.' }
];

export default function EnglishNivBibleHub() {
  const [viewMode, setViewMode] = useState<'library' | 'book_overview' | 'reader'>('library');
  const [testament, setTestament] = useState<'old' | 'new'>('new');
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[39]); // Defaults to Matthew
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [chapterSummary, setChapterSummary] = useState<string>('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [copiedVerseId, setCopiedVerseId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chapter View Toggle: 'grid' (Compact Numbers) vs 'detailed' (Cards with Summaries)
  const [chapterDisplayMode, setChapterDisplayMode] = useState<'grid' | 'detailed'>('detailed');

  // Firestore Loader for 'the_holy_bible'
  useEffect(() => {
    if (viewMode !== 'reader') return;

    async function loadChapter() {
      setLoading(true);
      setVerses([]);
      setChapterSummary('');

      const cacheKey = `holy_bible_b${selectedBook.num}_c${selectedChapter}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.verses) && parsed.verses.length > 0) {
            setVerses(parsed.verses);
            setChapterSummary(parsed.summary || getChapterInfo(selectedBook.name, selectedChapter).summary);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem(cacheKey);
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      const candidateDocIds = [
        `${selectedBook.name}_${selectedChapter}`,
        `book_${selectedBook.num}_chapter_${selectedChapter}`,
        `${selectedBook.name.toLowerCase()}_${selectedChapter}`
      ];

      let foundVerses: Verse[] = [];
      let foundSummary = '';
      let matchFound = false;

      for (const docId of candidateDocIds) {
        try {
          const docRef = doc(db, 'the_holy_bible', docId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log(`✅ Loaded from the_holy_bible/${docId}`);
            const data = docSnap.data();
            foundVerses = data.verses || [];
            foundSummary = data.summary || data.chapter_summary || getChapterInfo(selectedBook.name, selectedChapter).summary;

            if (foundVerses.length > 0) {
              matchFound = true;
              localStorage.setItem(cacheKey, JSON.stringify({ verses: foundVerses, summary: foundSummary }));
              break;
            }
          }
        } catch (err) {
          console.warn(`Error reading the_holy_bible/${docId}:`, err);
        }
      }

      if (!matchFound) {
        console.error(`❌ Chapter not found in 'the_holy_bible' for ${selectedBook.name} Ch ${selectedChapter}`);
        localStorage.removeItem(cacheKey);
        foundSummary = getChapterInfo(selectedBook.name, selectedChapter).summary;
      }

      setVerses(foundVerses);
      setChapterSummary(foundSummary);
      setLoading(false);
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
    <div className="w-full space-y-6 animate-fade-in text-zinc-900 dark:text-zinc-50 select-none">
      
      {/* TOP BRAND HEADER - MAIN APP STYLED */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
            †
          </div>
          <div>
            <h2 className="font-serif font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
              The Holy Bible (NIV)
            </h2>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold tracking-wide uppercase">
              Scripture Study Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setViewMode('library')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              viewMode === 'library' 
                ? 'bg-rose-600 text-white shadow-sm' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Library
          </button>
          {viewMode !== 'library' && (
            <button 
              onClick={() => setViewMode('book_overview')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                viewMode === 'book_overview' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Chapters Grid
            </button>
          )}
        </div>
      </div>

      {/* TIER 1: ALL BOOKS LIBRARY VIEW */}
      {viewMode === 'library' && (
        <div className="space-y-6">
          
          {/* HERO BANNER - MATCHES CHRIST STUDIO PROMO */}
          <div className="bg-gradient-to-r from-zinc-900 via-rose-950/40 to-zinc-900 text-white p-6 sm:p-8 rounded-2xl border border-zinc-800 text-center space-y-3 shadow-md relative overflow-hidden">
            <span className="bg-rose-500/20 text-rose-300 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-rose-500/30">
              HOLY BIBLE • NEW INTERNATIONAL VERSION
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif text-zinc-100 tracking-tight">
              Interactive Scripture Library
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto italic">
              Explore all 66 books of the Holy Bible with chapter summaries, verses, and study tools.
            </p>

            <div className="pt-2 max-w-md mx-auto relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search any book... (e.g. Genesis, Matthew)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500 transition font-medium"
              />
            </div>
          </div>

          {/* TESTAMENT SWITCHER TOGGLE */}
          <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <button
              onClick={() => setTestament('new')}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
                testament === 'new' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              New Testament (27 Books)
            </button>
            <button
              onClick={() => setTestament('old')}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
                testament === 'old' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Old Testament (39 Books)
            </button>
          </div>

          {/* CATEGORIES GRID */}
          <div className="space-y-8">
            {Object.entries(groupByCategory(testament)).map(([category, books]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-black text-rose-600 dark:text-rose-400 tracking-wider uppercase">
                  <span>{category}</span>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {books.map(b => (
                    <div
                      key={b.num}
                      onClick={() => openBookOverview(b)}
                      className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-500/50 hover:shadow-md transition cursor-pointer group space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                            {b.name}
                          </h3>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {b.chapters} Ch.
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 font-normal">
                          {b.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                        <span>Author: {b.author}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-600 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TIER 2: BOOK OVERVIEW & CHAPTERS GRID / SUMMARIES */}
      {viewMode === 'book_overview' && (
        <div className="space-y-6">
          
          <button
            onClick={() => setViewMode('library')}
            className="inline-flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Bible Library</span>
          </button>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            
            <header className="bg-gradient-to-r from-zinc-50 via-rose-50/20 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-6 sm:p-10 text-center border-b border-zinc-200 dark:border-zinc-800 space-y-3">
              <h1 className="text-3xl sm:text-5xl font-extrabold font-serif text-zinc-900 dark:text-zinc-100 tracking-tight">
                {selectedBook.name}
              </h1>
              
              <div className="flex flex-wrap justify-center gap-4 text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest pt-1">
                <span className="flex items-center gap-1.5"><PenTool className="w-3.5 h-3.5" /> Author: {selectedBook.author}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> {selectedBook.chapters} Chapters</span>
              </div>
            </header>

            <div className="m-6 p-5 border-l-4 border-rose-600 bg-rose-500/5 dark:bg-zinc-950/60 rounded-xl text-xs sm:text-sm italic text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <p><strong>Overview:</strong> {selectedBook.description}</p>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  Select a Chapter to Read:
                </h3>

                {/* TOGGLE BETWEEN COMPACT GRID & DETAILED CARDS WITH SUMMARIES */}
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => setChapterDisplayMode('detailed')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      chapterDisplayMode === 'detailed' ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-500'
                    }`}
                    title="List View with Summaries"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Detailed</span>
                  </button>
                  <button
                    onClick={() => setChapterDisplayMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      chapterDisplayMode === 'grid' ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-500'
                    }`}
                    title="Compact Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Compact</span>
                  </button>
                </div>
              </div>

              {/* MODE A: COMPACT NUMBER GRID */}
              {chapterDisplayMode === 'grid' && (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(chNum => (
                    <button
                      key={chNum}
                      onClick={() => openChapterReader(selectedBook, chNum)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 hover:border-rose-600 transition font-black text-xs sm:text-sm flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                    >
                      {chNum}
                    </button>
                  ))}
                </div>
              )}

              {/* MODE B: DETAILED CARDS WITH REAL CHAPTER TITLES & SUMMARIES */}
              {chapterDisplayMode === 'detailed' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(chNum => {
                    const info = getChapterInfo(selectedBook.name, chNum);
                    return (
                      <div
                        key={chNum}
                        onClick={() => openChapterReader(selectedBook, chNum)}
                        className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950 hover:border-rose-500/60 hover:shadow-md transition cursor-pointer group space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[10.5px] text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                              Ch. {chNum} • {info.title}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-600 group-hover:translate-x-1 transition" />
                          </div>

                          <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 transition">
                            {selectedBook.name} {chNum}: {info.title}
                          </h4>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 font-normal">
                            {info.summary}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex justify-between items-center text-[10px] text-zinc-400 font-bold">
                          <span>Read full chapter</span>
                          <span className="font-extrabold text-rose-600 dark:text-rose-400">NIV</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* TIER 3: ENGLISH BIBLE READER VIEW */}
      {viewMode === 'reader' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
          
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <button
              onClick={() => setViewMode('book_overview')}
              className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {selectedBook.name} Chapters</span>
            </button>
            
            <span className="text-xs font-extrabold text-zinc-500 font-mono">
              {selectedBook.name} — Chapter {selectedChapter} (NIV)
            </span>
          </div>

          {/* CHAPTER OVERVIEW BANNER */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400">
              <FileText className="w-3.5 h-3.5" />
              <span>Chapter Overview — {getChapterInfo(selectedBook.name, selectedChapter).title}</span>
            </div>
            <p className="italic leading-relaxed font-medium">
              {chapterSummary || getChapterInfo(selectedBook.name, selectedChapter).summary}
            </p>
          </div>

          {/* READER CONTROL BAR */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-600 shrink-0" />
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-50">
                {selectedBook.name} {selectedChapter}
              </h2>
            </div>
            
            <div className="grid grid-cols-3 md:flex items-center gap-2 w-full md:w-auto">
              <select 
                value={selectedBook.num}
                onChange={(e) => {
                  const book = BIBLE_BOOKS.find(b => b.num === Number(e.target.value));
                  if (book) {
                    setSelectedBook(book);
                    setSelectedChapter(1);
                  }
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-extrabold text-zinc-900 dark:text-zinc-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {BIBLE_BOOKS.map(b => (
                  <option key={b.num} value={b.num} className="dark:bg-zinc-900">
                    {b.name}
                  </option>
                ))}
              </select>

              <select 
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-extrabold text-zinc-900 dark:text-zinc-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num} className="dark:bg-zinc-900">Chapter {num}</option>
                ))}
              </select>

              <div className="w-full flex items-center border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                <button 
                  onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                  className="flex-1 flex items-center justify-center p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs font-bold border-r border-zinc-200 dark:border-zinc-800 cursor-pointer"
                  title="Increase Text Size"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                  className="flex-1 flex items-center justify-center p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs font-bold cursor-pointer"
                  title="Decrease Text Size"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* VERSES LIST */}
          {loading ? (
            <div className="py-24 text-center text-xs font-black text-zinc-400 animate-pulse">
              Loading Scripture Text...
            </div>
          ) : verses.length > 0 ? (
            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {verses.map((v, idx) => {
                const verseNum = v.verseNum || v.verse || v.number || (idx + 1);
                const verseText = v.text || '';

                return (
                  <div 
                    key={verseNum} 
                    className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-rose-500/40 transition group space-y-2 select-text"
                  >
                    <div className="flex items-center justify-between select-none">
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md font-mono border border-amber-500/20">
                        Verse {verseNum}
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button 
                          onClick={() => handleCopyVerse(verseNum, verseText)}
                          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-rose-600 transition cursor-pointer"
                          title="Copy Verse"
                        >
                          {copiedVerseId === verseNum ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => handleShareVerse(verseNum, verseText)}
                          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-rose-600 transition cursor-pointer"
                          title="Share Verse"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p 
                      style={{ fontSize: `${fontSize}px` }} 
                      className="text-zinc-800 dark:text-zinc-100 font-sans leading-relaxed tracking-normal selection:bg-amber-500/20 font-normal"
                    >
                      {verseText}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center text-xs font-black text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              This chapter is currently unavailable in the database.
            </div>
          )}

          {/* BOTTOM NAVIGATION */}
          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4 select-none">
            <button
              onClick={() => {
                if (selectedChapter > 1) setSelectedChapter(prev => prev - 1);
              }}
              disabled={selectedChapter === 1}
              className="flex items-center gap-1 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-black rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 cursor-pointer transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Chapter
            </button>
            
            <span className="text-xs font-extrabold text-zinc-500 font-mono">
              Chapter {selectedChapter} of {selectedBook.chapters}
            </span>
            
            <button
              onClick={() => {
                if (selectedChapter < selectedBook.chapters) setSelectedChapter(prev => prev + 1);
              }}
              disabled={selectedChapter === selectedBook.chapters}
              className="flex items-center gap-1 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-black rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 cursor-pointer transition active:scale-95"
            >
              Next Chapter <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}