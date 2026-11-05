import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { 
  Flame, Search, 
  Check, X, Bell, Plus, Share2, User, HelpCircle, ArrowLeft, Trophy, LogOut, Video, Smartphone, LayoutGrid, Tv, Film
} from 'lucide-react';
import type { 
  MediaItem, PrayerRequest, Devotional, Comment, SpotlightSlide, UserProfile, LiveChannel, Movie 
} from './types';
import { 
  SEED_DEVOTIONALS, SEED_SPOTLIGHTS 
} from './data/seedData';

// Firebase Imports
import { db, auth } from './lib/firebase';
import { 
  collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, query, where, updateDoc, increment,
  arrayUnion, arrayRemove, orderBy, limit, getDocs
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Subcomponents
import { SeoHead } from './components/SeoHead';

const SpotlightSlider = lazy(() => import('./components/SpotlightSlider'));
const VideoCard = lazy(() => import('./components/VideoCard'));
const WatchModal = lazy(() => import('./components/WatchModal'));
const PrayerWall = lazy(() => import('./components/PrayerWall'));
const DailyDevotional = lazy(() => import('./components/DailyDevotional'));
const CreatorStudio = lazy(() => import('./components/CreatorStudio'));
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const BibleTrivia = lazy(() => import('./components/BibleTrivia'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const CreatorProfile = lazy(() => import('./components/CreatorProfile'));
const PromoModal = lazy(() => import('./components/PromoModal'));
const EnglishNivBibleHub = lazy(() => import('./components/EnglishNivBibleHub'));
const ShortsViewer = lazy(() => import('./components/ShortsViewer'));
const LiveTV = lazy(() => import('./components/LiveTV'));
const MoviePortal = lazy(() => import('./components/MoviePortal'));

const SkeletonFallback = () => (
  <div className="w-full h-full flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin"></div>
      <p className="text-zinc-500 font-bold text-xs animate-pulse">Loading experience...</p>
    </div>
  </div>
);

interface EnhancedComment extends Comment {
  likes?: string[];
  replies?: Array<{
    id: string;
    authorName: string;
    authorId: string;
    content: string;
    createdAt: string;
  }>;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY;
}

const HEADER_BIBLE_VERSES = [
  { text: "For I know the plans I have for you, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
  { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { text: "Trust in the Lord with all your heart, and lean not on your own understanding.", reference: "Proverbs 3:5" },
  { text: "But seek first the kingdom of God and His righteousness, and all these things shall be added to you.", reference: "Matthew 6:33" },
  { text: "Be strong and of good courage; do not be afraid, nor be dismayed, for the Lord your God is with you wherever you go.", reference: "Joshua 1:9" },
  { text: "The Lord is my shepherd; I shall not want. He makes me to lie down in green pastures; He leads beside the still waters.", reference: "Psalm 23:1-2" },
  { text: "But those who wait on the Lord shall renew their strength; they shall mount up with wings like eagles, they shall run and not be weary, they shall walk and not faint.", reference: "Isaiah 40:31" },
  { text: "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.", reference: "Romans 8:28" },
  { text: "The Lord is my light and my salvation; Whom shall I fear? The Lord is the strength of my life; Of whom shall I be afraid?", reference: "Psalm 27:1" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" }
];

function LetterAvatar({ name, className = "w-8 h-8 text-xs" }: { name: string; className?: string }) {
  const trimmed = (name || "").trim();
  const firstLetter = trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  
  const colors = [
    'bg-rose-500', 'bg-rose-600', 'bg-emerald-500', 'bg-amber-500', 
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'
  ];
  const charCodeSum = trimmed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colorClass = colors[charCodeSum % colors.length] || 'bg-zinc-500';

  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none shadow-sm ${colorClass} ${className}`}>
      {firstLetter}
    </div>
  );
}

const formatNotificationText = (notif: any) => {
  if (!notif) return '';
  const title = notif.videoTitle ? `"${notif.videoTitle}"` : '';

  switch (notif.type) {
    case 'follow':
      return `joined your fellowship circle!`;
    case 'like_video':
      return `liked your video ${title}`;
    case 'comment_video':
      return `commented on your video ${title}`;
    case 'comment_like':
      return `liked your comment on ${title}`;
    case 'comment_reply':
      return `replied to your comment on ${title}`;
    case 'prayer_agreement':
      return `stood in prayer agreement with you!`;
    case 'prayer_comment':
      return `left an encouraging note on your prayer request!`;
    case 'new_post':
      return `published a new gospel video ${title}`;
    default:
      return `sent you an alert.`;
  }
};

const getYoutubeThumbnail = (url: string) => {
  let id = '';
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    id = match[2];
  }
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';
};

const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com');
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('Home');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false); 
  const [showVerseOverlay, setShowVerseOverlay] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [viewingCreatorId, setViewingCreatorId] = useState<string | null>(null);

  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const [isDemoVisitor, setIsDemoVisitor] = useState<boolean>(() => {
    return localStorage.getItem('christ_studio_demo_visitor') === 'true';
  });

  const [landingEmail, setLandingEmail] = useState('');
  const [landingPassword, setLandingPassword] = useState('');
  const [landingError, setLandingError] = useState<string | null>(null);
  const [landingSuccess, setLandingSuccess] = useState<string | null>(null);
  const [landingLoading, setLandingLoading] = useState(false);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);

  const [isSharingVerse, setIsSharingVerse] = useState(false);
  const [showVerseJournal, setShowVerseJournal] = useState(false);
  const [verseNoteText, setVerseNoteText] = useState('');
  const [showVerseSuccess, setShowVerseSuccess] = useState(false);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [spotlights, setSpotlights] = useState<SpotlightSlide[]>(SEED_SPOTLIGHTS);
  const [devotionals] = useState<Devotional[]>(SEED_DEVOTIONALS);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedShortId, setSelectedShortId] = useState<string | undefined>(undefined);

  // Entertainment data (Live TV & Movies)
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);

  const [activeWatchVideo, setActiveWatchVideo] = useState<MediaItem | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUserSession, setCurrentUserSession] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('Zion Believer');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
  );

  const currentDayVerse = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const dateIndex = Math.abs(dayOfYear) % HEADER_BIBLE_VERSES.length;
    return HEADER_BIBLE_VERSES[dateIndex];
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.style.backgroundColor = '#0f0f0f';
  }, []);

  // Handle Auth Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            setCurrentUserSession(user.uid);
            setCurrentUsername(data.name || 'Zion Believer');
            setCurrentUserAvatar(data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
            setIsDemoVisitor(false);
            localStorage.setItem('christ_studio_user_profile', JSON.stringify(data));
          }
        } catch (e) {
          console.warn("Could not sync auth profile", e);
        }
      } else {
        const cached = localStorage.getItem('christ_studio_user_profile');
        if (!cached) {
          let session = localStorage.getItem('christ_studio_session_id');
          if (!session) {
            session = `guest-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('christ_studio_session_id', session);
          }
          setCurrentUserSession(session);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Handle Browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('video');
      if (!videoId && activeWatchVideo) {
        setActiveWatchVideo(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeWatchVideo]);

  // Smooth scroll handler with threshold to prevent excessive re-renders
  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (Math.abs(currentScrollY - lastScrollY.current) < 20) return;

    if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
      setIsBottomNavVisible(false);
    } else {
      setIsBottomNavVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // Profile and Notification Listener (Only runs for real authenticated users)
  useEffect(() => {
    if (!userProfile?.uid) {
      setNotifications([]);
      return;
    }
    const userDocRef = doc(db, 'users', userProfile.uid);
    const unsub = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNotifications(data.notifications || []);
        setUserProfile(prev => prev ? { ...prev, ...data } : (data as UserProfile));
      }
    }, (err) => {
      console.warn("User profile sync notice:", err.message);
    });
    return () => unsub();
  }, [userProfile?.uid]);

  // Core Data Listeners
  useEffect(() => {
    const qMedia = query(collection(db, "media"), orderBy("createdAt", "desc"), limit(40));
    const unsubMedia = onSnapshot(qMedia, (snapshot) => {
      const list: MediaItem[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as MediaItem);
      });
      setMediaItems(list);
    }, (err) => {
      console.warn("Media listener notice:", err.message);
    });

    const qPrayers = query(collection(db, "prayers"), orderBy("createdAt", "desc"), limit(20));
    const unsubPrayers = onSnapshot(qPrayers, (snapshot) => {
      const list: PrayerRequest[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PrayerRequest);
      });
      setPrayerRequests(list);
    }, (err) => {
      console.warn("Prayers listener notice:", err.message);
    });

    const qPromos = query(
      collection(db, "promotion_requests"), 
      where("approved", "==", true),
      limit(5)
    );
    
    const unsubPromos = onSnapshot(qPromos, (snapshot) => {
      const activePromos: SpotlightSlide[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        activePromos.push({
          id: docSnap.id,
          title: data.title,
          subtitle: data.subtitle, 
          imageUrl: data.imageUrl,
          actionText: data.actionText || 'Watch Now',
          actionLink: data.actionLink || '#'
        } as SpotlightSlide);
      });
      
      setSpotlights([...activePromos, ...SEED_SPOTLIGHTS]);
    }, (err) => {
      console.warn("Promo listener notice:", err.message);
    });

    // Fetch entertainment data safely
    const fetchEntertainmentData = async () => {
      try {
        const channelsSnap = await getDocs(collection(db, "live_channels")).catch(() => null);
        if (channelsSnap && !channelsSnap.empty) {
          const channelsList: LiveChannel[] = [];
          channelsSnap.forEach(docSnap => channelsList.push({ id: docSnap.id, ...docSnap.data() } as LiveChannel));
          setLiveChannels(channelsList);
        }

        const moviesSnap = await getDocs(collection(db, "movies")).catch(() => null);
        if (moviesSnap && !moviesSnap.empty) {
          const moviesList: Movie[] = [];
          moviesSnap.forEach(docSnap => moviesList.push({ id: docSnap.id, ...docSnap.data() } as Movie));
          setMovies(moviesList);
        }
      } catch (_) {
        // Fallback silently
      }
    };
    fetchEntertainmentData();

    return () => {
      unsubMedia();
      unsubPrayers();
      unsubPromos();
    };
  }, []);

  // Journals Sync
  useEffect(() => {
    if (!userProfile?.uid) {
      const saved = localStorage.getItem('christ_studio_journal');
      if (saved) {
        try { setJournalEntries(JSON.parse(saved)); } catch (_) { setJournalEntries([]); }
      } else {
        setJournalEntries([]);
      }
      return;
    }

    const q = query(
      collection(db, "journals"), 
      where("userId", "==", userProfile.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setJournalEntries(list);
    }, (error) => {
      console.warn("Journal sync fallback:", error.message);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  useEffect(() => {
    if (mediaItems.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('video');
      if (videoId) {
        const matchedVideo = mediaItems.find(v => v.id === videoId);
        if (matchedVideo) {
          if (matchedVideo.isShort) {
            setSelectedShortId(matchedVideo.id);
            setActiveTab('Shorts');
          } else {
            setActiveWatchVideo(matchedVideo);
          }
        }
      }
    }
  }, [mediaItems]);

  const handleCloseWatchVideo = () => {
    setActiveWatchVideo(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('video');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#notif-btn') && !target.closest('#notif-dropdown-menu')) {
        setShowNotificationsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleLoginSuccess = (profile: any) => {
    setUserProfile(profile);
    setCurrentUserSession(profile.uid);
    setCurrentUsername(profile.name);
    setCurrentUserAvatar(profile.avatarUrl);
    setIsDemoVisitor(false);
    localStorage.removeItem('christ_studio_demo_visitor');
    localStorage.setItem('christ_studio_user_profile', JSON.stringify(profile));
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('christ_studio_user_profile');
    setUserProfile(null);
    setIsDemoVisitor(false);
    localStorage.removeItem('christ_studio_demo_visitor');
    
    const session = `guest-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('christ_studio_session_id', session);
    setCurrentUserSession(session);
    setCurrentUsername('Zion Believer');
    setCurrentUserAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
  };

  const handleOpenWatchVideo = (video: MediaItem) => {
    if (video.isShort) {
      setSelectedShortId(video.id);
      setActiveTab('Shorts');
      handleCloseWatchVideo();
    } else {
      setActiveWatchVideo(video);
      const url = new URL(window.location.href);
      url.searchParams.set('video', video.id);
      window.history.pushState({}, document.title, url.pathname + url.search);
    }
  };

  const handleShareVerseImage = async () => {
    setIsSharingVerse(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas support disabled");

      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#090514'); 
      grad.addColorStop(0.5, '#1e1b4b'); 
      grad.addColorStop(1, '#2e101a'); 
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, 1000, 1000);

      ctx.strokeStyle = '#f59e0b'; 
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, 980, 980);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '72px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('†', 540, 180);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 20px "Inter", sans-serif';
      ctx.fillText('SCRIPTURE OF THE DAY', 540, 240);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 44px Georgia, serif';
      ctx.textBaseline = 'middle';
      
      const textToPrint = `"${currentDayVerse.text}"`;
      const lastLineY = wrapCanvasText(ctx, textToPrint, 540, 420, 840, 64);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 36px Georgia, serif';
      ctx.fillText(`— ${currentDayVerse.reference}`, 540, lastLineY + 100);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillText('† CHRIST STUDIO  •  christ-studio-hub.web.app', 540, 980);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Blob conversion failed");
        const file = new File([blob], `ChristStudio_DailyWord.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Daily Word - Christ Studio',
              text: `Check out today's inspiring Scripture from Christ Studio!`
            });
          } catch (_) {
            triggerDirectDownload(canvas);
          }
        } else {
          triggerDirectDownload(canvas);
        }
        setIsSharingVerse(false);
      }, 'image/png');

    } catch (err) {
      console.warn("Could not generate sharing canvas asset:", err);
      setIsSharingVerse(false);
    }
  };

  const triggerDirectDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `ChristStudio_DailyWord_${currentDayVerse.reference.replace(/ /g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyDonationDetail = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFieldId(id);
      setTimeout(() => setCopiedFieldId(null), 2000);
    });
  };

  const handleInviteFriend = async () => {
    const appUrl = window.location.origin;
    const inviteMessage = `Hey! I am using Christ Studio to watch inspiring Christian content, share prayers, and grow in fellowship. Join our community here: ${appUrl}`;

    if (navigator.share && typeof navigator.canShare === 'function') {
      try {
        await navigator.share({
          title: 'Join Christ Studio',
          text: inviteMessage,
          url: appUrl
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyInviteMessageToClipboard(inviteMessage);
        }
      }
    } else {
      await copyInviteMessageToClipboard(inviteMessage);
    }
  };

  const copyInviteMessageToClipboard = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy invite text: ', err);
    }
  };

  const handleSaveVerseJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verseNoteText.trim()) return;

    if (userProfile) {
      await handleAddJournalEntry(currentDayVerse.reference, currentDayVerse.text, verseNoteText.trim());
    } else {
      const saved = localStorage.getItem('christ_studio_journal');
      let entries = [];
      if (saved) {
        try { entries = JSON.parse(saved); } catch (_) { entries = []; }
      }
      const newEntry = {
        id: `entry-${Date.now()}`,
        verseRef: currentDayVerse.reference,
        verseText: currentDayVerse.text,
        note: verseNoteText.trim(),
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      const updated = [newEntry, ...entries];
      localStorage.setItem('christ_studio_journal', JSON.stringify(updated));
      setJournalEntries(updated);
    }

    setVerseNoteText('');
    setShowVerseJournal(false);
    setShowVerseSuccess(true);
    setTimeout(() => setShowVerseSuccess(false), 4000);
  };

  const trackUserBehavior = (category: string) => {
    if (!category) return;
    try {
      const stored = localStorage.getItem('christ_studio_user_interests');
      if (stored) {
        const interests = JSON.parse(stored);
        interests[category] = (interests[category] || 0) + 1;
        localStorage.setItem('christ_studio_user_interests', JSON.stringify(interests));
      } else {
        localStorage.setItem('christ_studio_user_interests', JSON.stringify({ [category]: 1 }));
      }
    } catch (err) {
      console.warn("Behavior tracking bypass: ", err);
    }
  };

  const handleIncrementView = async (videoId: string) => {
    if (!videoId) return;
    try {
      const videoDocRef = doc(db, "media", videoId);
      await updateDoc(videoDocRef, {
        views: increment(1)
      });
      const video = mediaItems.find(v => v.id === videoId);
      if (video?.category) {
        trackUserBehavior(video.category);
      }
    } catch (err) {
      // Bypassed
    }
  };

  const handlePromoClickTracking = async (slideId: string, actionLink: string) => {
    if (actionLink && actionLink !== '#') {
      window.open(actionLink, '_blank', 'noopener,noreferrer');
    }

    if (slideId?.startsWith('promo-')) {
      try {
        const promoDocRef = doc(db, "promotion_requests", slideId);
        await updateDoc(promoDocRef, {
          clicks: increment(1)
        });
      } catch (err) {
        console.warn("Error updating promo clicks:", err);
      }
    }
  };

  const triggerNotification = async (targetUserId: string, payload: {
    type: 'follow' | 'like_video' | 'comment_video' | 'comment_reply' | 'comment_like' | 'prayer_agreement' | 'prayer_comment' | 'new_post';
    senderId: string;
    senderName: string;
    videoId?: string;
    videoTitle?: string;
    prayerId?: string;
  }) => {
    if (!targetUserId || targetUserId === payload.senderId) return;
    try {
      const targetRef = doc(db, 'users', targetUserId);
      const newNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        read: false,
        timestamp: new Date().toISOString(),
        ...payload
      };
      await updateDoc(targetRef, {
        notifications: arrayUnion(newNotif)
      });
    } catch (err) {
      console.error("Failed to trigger notification:", err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!userProfile || !notifications.some(n => !n.read)) return;
    try {
      const updatedNotifs = notifications.map(n => ({ ...n, read: true }));
      await updateDoc(doc(db, 'users', userProfile.uid), {
        notifications: updatedNotifs
      });
    } catch (err) {
      console.warn("Failed to mark notifications as read:", err);
    }
  };

  const handleNotifBellClick = () => {
    setShowNotificationsDropdown(!showNotificationsDropdown);
    setShowVerseOverlay(false);
    if (!showNotificationsDropdown) {
      markAllNotificationsAsRead();
    }
  };

  const handleNotificationClick = async (notif: any) => {
    setShowNotificationsDropdown(false);

    if (userProfile) {
      try {
        const updatedNotifs = notifications.map(n => 
          n.id === notif.id ? { ...n, read: true } : n
        );
        await updateDoc(doc(db, 'users', userProfile.uid), {
          notifications: updatedNotifs
        });
      } catch (err) {
        console.warn("Failed to mark notification as read:", err);
      }
    }

    if (notif.type === 'follow') {
      setViewingCreatorId(notif.senderId);
      setActiveTab('Home'); 
      handleCloseWatchVideo(); 
    } 
    else if (['like_video', 'comment_video', 'comment_reply', 'comment_like', 'new_post'].includes(notif.type)) {
      if (notif.videoId) {
        const targetVideo = mediaItems.find(v => v.id === notif.videoId);
        if (targetVideo) {
          handleOpenWatchVideo(targetVideo); 
        } else {
          alert("This video is no longer available.");
        }
      }
    } 
    else if (['prayer_agreement', 'prayer_comment'].includes(notif.type)) {
      setActiveTab('PrayerWall'); 
      setViewingCreatorId(null);
      handleCloseWatchVideo(); 
      
      setTimeout(() => {
        const el = document.getElementById(`prayer-req-${notif.prayerId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-amber-500');
          setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 3000);
        }
      }, 500);
    }
  };

  const handleLikeVideo = async (videoId: string) => {
    if (!userProfile) {
      setShowAuthModal(true);
      return;
    }

    const item = mediaItems.find(m => m.id === videoId);
    if (!item) return;

    const isLiked = item.likes?.includes(currentUserSession) ?? false;
    const videoDocRef = doc(db, "media", videoId);

    try {
      if (isLiked) {
        await updateDoc(videoDocRef, {
          likes: arrayRemove(currentUserSession)
        });
      } else {
        await updateDoc(videoDocRef, {
          likes: arrayUnion(currentUserSession),
          dislikes: arrayRemove(currentUserSession)
        });
        trackUserBehavior(item.category);

        if (item.creatorId) {
          await triggerNotification(item.creatorId, {
            type: 'like_video',
            senderId: currentUserSession,
            senderName: currentUsername,
            videoId: videoId,
            videoTitle: item.title
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDislikeVideo = async (videoId: string) => {
    if (!userProfile) {
      setShowAuthModal(true);
      return;
    }

    const item = mediaItems.find(m => m.id === videoId);
    if (!item) return;

    const isDisliked = item.dislikes?.includes(currentUserSession) ?? false;
    const videoDocRef = doc(db, "media", videoId);

    try {
      if (isDisliked) {
        await updateDoc(videoDocRef, {
          dislikes: arrayRemove(currentUserSession)
        });
      } else {
        await updateDoc(videoDocRef, {
          dislikes: arrayUnion(currentUserSession),
          likes: arrayRemove(currentUserSession)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateComments = async (videoId: string, updatedComments: Comment[]) => {
    try {
      const video = mediaItems.find(v => v.id === videoId);
      if (!video) return;

      const oldComments = video.comments || [];
      await updateDoc(doc(db, "media", videoId), { comments: updatedComments });

      if (updatedComments.length > oldComments.length) {
        const newComment = updatedComments[0];
        if (newComment?.authorId && newComment.authorId !== video.creatorId && video.creatorId) {
          await triggerNotification(video.creatorId, {
            type: 'comment_video',
            senderId: currentUserSession,
            senderName: currentUsername,
            videoId: videoId,
            videoTitle: video.title
          });
        }
      } else if (updatedComments.length === oldComments.length) {
        for (let i = 0; i < updatedComments.length; i++) {
          const oldComm = oldComments[i] as EnhancedComment;
          const newComm = updatedComments[i] as EnhancedComment;
          if (!oldComm || !newComm) continue;

          const oldLikes = oldComm.likes || [];
          const newLikes = newComm.likes || [];

          if (newLikes.length > oldLikes.length) {
            if (newComm.authorId && newComm.authorId !== currentUserSession) {
              await triggerNotification(newComm.authorId, {
                type: 'comment_like',
                senderId: currentUserSession,
                senderName: currentUsername,
                videoId: videoId,
                videoTitle: video.title
              });
            }
            break;
          }

          const oldReplies = oldComm.replies || [];
          const newReplies = newComm.replies || [];

          if (newReplies.length > oldReplies.length) {
            if (newComm.authorId && newComm.authorId !== currentUserSession) {
              await triggerNotification(newComm.authorId, {
                type: 'comment_reply',
                senderId: currentUserSession,
                senderName: currentUsername,
                videoId: videoId,
                videoTitle: video.title
              });
            }
            break;
          }
        }
      }
    } catch (e) {
      console.error("Firestore comment update error:", e);
    }
  };

  const handleAddVideo = async (videoData: Omit<MediaItem, 'id' | 'views' | 'likes' | 'dislikes' | 'comments' | 'createdAt'>) => {
    const newId = `vid-${Date.now()}`;
    const newVideo: MediaItem = {
      ...videoData,
      id: newId,
      views: 0,
      likes: [],
      dislikes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "media", newId), newVideo);

      const creatorDocRef = doc(db, 'users', currentUserSession);
      const creatorSnap = await getDoc(creatorDocRef);
      if (creatorSnap.exists()) {
        const creatorData = creatorSnap.data();
        const followers = creatorData.followers || [];

        await Promise.all(
          followers.map(async (followerId: string) => {
            await triggerNotification(followerId, {
              type: 'new_post',
              senderId: currentUserSession,
              senderName: currentUsername,
              videoId: newId,
              videoTitle: newVideo.title
            });
          })
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteDoc(doc(db, "media", videoId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateVideo = async (videoId: string, newTitle: string, newDesc: string) => {
    try {
      await updateDoc(doc(db, "media", videoId), { 
        title: newTitle, 
        description: newDesc 
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPrayerRequest = async (requestData: Omit<PrayerRequest, 'id' | 'prayerCount' | 'prayedBy' | 'comments' | 'createdAt'>) => {
    const newId = `pr-${Date.now()}`;
    const newRequest: PrayerRequest = {
      ...requestData,
      id: newId,
      authorId: currentUserSession,
      prayerCount: 1,
      prayedBy: [currentUserSession],
      comments: [],
      isAnswered: false,
      praiseReportText: '',
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, "prayers", newId), newRequest);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrayForRequest = async (requestId: string) => {
    const req = prayerRequests.find(r => r.id === requestId);
    if (!req) return;

    const hasPrayed = req.prayedBy?.includes(currentUserSession) ?? false;
    const prayerDocRef = doc(db, "prayers", requestId);

    try {
      if (hasPrayed) {
        await updateDoc(prayerDocRef, {
          prayedBy: arrayRemove(currentUserSession),
          prayerCount: increment(-1)
        });
      } else {
        await updateDoc(prayerDocRef, {
          prayedBy: arrayUnion(currentUserSession),
          prayerCount: increment(1)
        });

        if (req.authorId) {
          await triggerNotification(req.authorId, {
            type: 'prayer_agreement',
            senderId: currentUserSession,
            senderName: currentUsername,
            prayerId: requestId
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPrayerComment = async (requestId: string, content: string) => {
    const req = prayerRequests.find(r => r.id === requestId);
    if (!req) return;

    const prayerDocRef = doc(db, "prayers", requestId);
    const newComment: Comment = {
      id: `prc-${Date.now()}`,
      authorName: currentUsername,
      authorAvatar: currentUserAvatar,
      authorId: currentUserSession,
      content,
      createdAt: new Date().toISOString()
    };

    try {
      await updateDoc(prayerDocRef, {
        comments: arrayUnion(newComment)
      });

      if (req.authorId) {
        await triggerNotification(req.authorId, {
          type: 'prayer_comment',
          senderId: currentUserSession,
          senderName: currentUsername,
          prayerId: requestId
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAnswered = async (requestId: string, praiseText: string) => {
    try {
      await updateDoc(doc(db, "prayers", requestId), {
        isAnswered: true,
        praiseReportText: praiseText
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddJournalEntry = async (verseRef: string, verseText: string, note: string) => {
    if (!userProfile) return;

    const newId = `journal-${Date.now()}`;
    const newEntry = {
      id: newId,
      userId: userProfile.uid,
      verseRef,
      verseText,
      note,
      createdAt: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    try {
      await setDoc(doc(db, "journals", newId), newEntry);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJournalEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, "journals", id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLandingLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLandingError(null);
    setLandingSuccess(null);
    setLandingLoading(true);

    if (!landingEmail.trim() || !landingPassword.trim()) {
      setLandingError("Please enter your email and password.");
      setLandingLoading(false);
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, landingEmail.trim().toLowerCase(), landingPassword);
      const fbUser = userCred.user;

      if (!fbUser.emailVerified) {
        setLandingError("Your email has not been verified yet.");
        await signOut(auth);
        setLandingLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        const profileData = {
          uid: data.uid,
          name: data.name,
          email: data.email,
          phone: data.phone,
          youtubeChannelHandle: data.youtubeChannelHandle,
          verifiedCreator: data.verifiedCreator,
          avatarUrl: data.avatarUrl,
          createdAt: data.createdAt
        };
        handleLoginSuccess(profileData);
      } else {
        setLandingError("User profile is missing.");
      }
    } catch (err: any) {
      setLandingError(err.message || "An authentication error occurred.");
    } finally {
      setLandingLoading(false);
    }
  };

  const handleLandingResetPassword = async () => {
    setLandingError(null);
    setLandingSuccess(null);

    if (!landingEmail.trim()) {
      setLandingError("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, landingEmail.trim().toLowerCase());
      setLandingSuccess(`Reset link sent to your email.`);
    } catch (err: any) {
      setLandingError("Failed to trigger reset email.");
    }
  };

  const handleDemoVisit = () => {
    setIsDemoVisitor(true);
    localStorage.setItem('christ_studio_demo_visitor', 'true');
  };

  const stableShorts = useMemo(() => {
    return mediaItems.filter(v => v.isShort);
  }, [mediaItems]);

  const activeSearchedVideos = useMemo(() => {
    return mediaItems.filter(v => 
      !searchQuery || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mediaItems, searchQuery]);

  const homePublications = useMemo(() => {
    return activeSearchedVideos
      .filter(v => !v.isShort)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeSearchedVideos]);

  const sortedForYouVideos = useMemo(() => {
    let interests: Record<string, number> = {};
    try {
      const stored = localStorage.getItem('christ_studio_user_interests');
      if (stored) interests = JSON.parse(stored);
    } catch (err) {
      console.warn("Recommendations fail-safe: ", err);
    }

    return [...activeSearchedVideos]
      .filter(v => !v.isShort)
      .sort((a, b) => {
        const viewsA = a.views || 0;
        const viewsB = b.views || 0;
        const likesA = a.likes?.length || 0;
        const likesB = b.likes?.length || 0;
        
        const ageHoursA = Math.max(1, (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60));
        const ageHoursB = Math.max(1, (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60));

        const preferenceFactorA = 1.0 + (interests[a.category] || 0) * 0.35;
        const preferenceFactorB = 1.0 + (interests[b.category] || 0) * 0.35;

        const scoreA = ((viewsA * 1.5 + likesA * 5) / Math.pow(ageHoursA + 2, 1.1)) * preferenceFactorA;
        const scoreB = ((viewsB * 1.5 + likesB * 5) / Math.pow(ageHoursB + 2, 1.1)) * preferenceFactorB;

        return scoreB - scoreA;
      });
  }, [activeSearchedVideos]);

  const filteredVideos = useMemo(() => {
    switch (activeTab) {
      case 'Home':
        return activeCategory === 'All' 
          ? homePublications 
          : homePublications.filter(v => v.category === activeCategory);
      
      case 'ForYou':
        return sortedForYouVideos;

      default:
        return activeSearchedVideos;
    }
  }, [activeTab, activeCategory, homePublications, sortedForYouVideos, activeSearchedVideos]);

  const showLandingPage = !userProfile && !isDemoVisitor;

  const SIDEBAR_ITEMS = useMemo(() => {
    const baseItems = [
      { id: 'Home', label: 'Home', icon: <span className="text-base select-none">🏠</span> },
      { id: 'Bible', label: 'The Holy Bible', icon: <span className="text-base select-none">📖</span> },
      { id: 'Shorts', label: 'Spiritual Shorts', icon: <span className="text-base select-none">📱</span> },
      { id: 'LiveTV', label: 'Live TV', icon: <Tv className="w-4 h-4 text-rose-500" /> },
      { id: 'Movies', label: 'Movies & Shows', icon: <Film className="w-4 h-4 text-rose-500" /> },
      { id: 'Trivia', label: 'Bible Trivia', icon: <Trophy className="w-4 h-4 text-rose-500" /> },
      { id: 'PrayerWall', label: 'Prayer Wall', icon: <span className="text-base select-none">🕊️</span> },
    ];

    if (userProfile) {
      baseItems.push({ id: 'Studio', label: 'Creator Studio', icon: <span className="text-base select-none">🎬</span> });
    }

    baseItems.push(
      { id: 'Devotional', label: 'Quiet Time Devotionals', icon: <span className="text-base select-none">📖</span> },
      { id: 'HelpCenter', label: 'Help Center', icon: <HelpCircle className="w-4 h-4 text-zinc-400" /> }
    );

    return baseItems;
  }, [userProfile]);

  if (showLandingPage) {
    return (
      <div className="bg-[#0f0f0f] dark min-h-screen flex flex-col justify-between font-sans text-zinc-50">
        <div className="max-w-6xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 flex-1 py-12">
          <div className="max-w-md lg:max-w-lg space-y-4 text-center lg:text-left select-none">
            <h1 className="text-4xl lg:text-5xl font-black text-rose-600 tracking-tight">Christ Studio</h1>
            <p className="text-xl lg:text-2xl font-bold leading-tight">Your faith, your channel, our platform.</p>
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
              Christ Studio is an ad-free Christian workspace and creators hub. Share, watch, and stream Gospel content securely.
            </p>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <form onSubmit={handleLandingLoginSubmit} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-lg space-y-4 text-left">
              {landingError && <div className="p-3 bg-rose-950/20 text-rose-400 border border-rose-900/50 text-xs font-semibold rounded-xl">⚠️ {landingError}</div>}
              {landingSuccess && <div className="p-3 bg-emerald-950/20 text-emerald-400 border border-emerald-900/50 text-xs font-semibold rounded-xl">✨ {landingSuccess}</div>}

              <input
                id="landing-email-input"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={landingEmail}
                onChange={(e) => setLandingEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium text-zinc-50"
              />

              <input
                id="landing-password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={landingPassword}
                onChange={(e) => setLandingPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium text-zinc-50"
              />

              <button type="submit" disabled={landingLoading} className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer active:scale-95 shadow-sm">
                {landingLoading ? 'Signing In...' : 'Log In'}
              </button>

              <div className="text-center pt-1">
                <button type="button" onClick={handleLandingResetPassword} className="text-xs font-medium text-rose-400 hover:underline cursor-pointer">
                  Forgotten password?
                </button>
              </div>

              <hr className="border-zinc-800 my-3" />

              <div className="flex flex-col gap-2 pt-1 select-none">
                <button
                  type="button"
                  onClick={() => { setAuthModalMode('signup'); setShowAuthModal(true); setLandingError(null); }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold py-3 rounded-xl transition cursor-pointer border border-zinc-800"
                >
                  Create new account
                </button>

                <button type="button" onClick={handleDemoVisit} className="w-full bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer shadow-sm">
                  Browse as Guest
                </button>
              </div>
            </form>
          </div>
        </div>

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} initialMode={authModalMode} />}
      </div>
    );
  }

  return (
    <div className="dark bg-[#0f0f0f] text-white min-h-screen font-sans flex flex-col justify-between transition-colors duration-150 relative overflow-x-hidden">
      <SeoHead />
      
      {/* Top Header Navigation */}
      <header className="bg-zinc-900 border-b border-zinc-800 h-14 flex items-center justify-between px-4 transition-colors sticky top-0 z-50">
        
        {isSearchExpanded && (
          <div className="absolute inset-0 bg-zinc-900 z-50 flex items-center px-4 gap-3 animate-fade-in">
            <button 
              type="button"
              onClick={() => setIsSearchExpanded(false)}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input 
              id="mobile-search-input"
              name="mobileSearch"
              type="text" 
              autoComplete="off"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Christ Studio..." 
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-4 py-2 text-sm focus:outline-none text-zinc-50 font-medium"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 shrink-0">
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveTab('Home'); setViewingCreatorId(null); handleCloseWatchVideo(); }}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-7 h-7 bg-rose-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm">†</div>
            <span className="font-bold text-sm tracking-tight block text-white">Christ Studio <sup className="text-[9px] text-zinc-400 font-bold font-mono">PK</sup></span>
          </a>
        </div>

        <div className="hidden sm:flex items-center gap-3 max-w-lg w-full px-4">
          <div className="relative flex-1 flex">
            <input 
              id="desktop-search-input"
              name="desktopSearch"
              type="text" 
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scriptures, sermons, worship..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-l-full px-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-zinc-500 text-zinc-50 font-medium"
            />
            <button type="button" className="bg-zinc-800 border-y border-r border-zinc-800 hover:bg-zinc-700 px-5 rounded-r-full flex items-center justify-center cursor-pointer">
              <Search className="w-4 h-4 text-zinc-300" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            type="button"
            onClick={() => setIsSearchExpanded(true)}
            className="sm:hidden p-2 hover:bg-zinc-800 rounded-full text-zinc-300 cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          <button 
            type="button"
            id="create-btn-top"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-full text-zinc-300 transition cursor-pointer relative"
            title="Create & Post"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button 
            type="button"
            id="verse-btn"
            onClick={() => { setShowVerseOverlay(!showVerseOverlay); setShowNotificationsDropdown(false); }}
            className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-full px-2.5 sm:px-3 py-1.5 transition text-[10px] sm:text-xs font-bold text-amber-400 cursor-pointer"
          >
            📖 <span className="hidden md:inline">Daily Word</span>
          </button>

          {userProfile && (
            <div className="relative">
              <button 
                type="button"
                id="notif-btn"
                onClick={handleNotifBellClick}
                className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-full text-zinc-300 transition cursor-pointer relative animate-fade-in"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-pulse border border-zinc-900"></span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div id="notif-dropdown-menu" className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-3 space-y-2.5 z-50 text-left animate-scale-up">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 select-none">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Alerts & Notifications</span>
                    <button type="button" onClick={() => setShowNotificationsDropdown(false)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic text-center py-6 select-none">No fellowship updates yet.</p>
                    ) : (
                      notifications.map((notif, idx) => {
                        const translatedText = formatNotificationText(notif);
                        return (
                          <div 
                            key={idx} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-2.5 rounded-lg flex items-start gap-2 border transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                              notif.read 
                                ? 'bg-transparent border-zinc-800 hover:bg-zinc-800' 
                                : 'bg-rose-500/[0.08] border-rose-500/20 hover:bg-rose-500/[0.12]'
                            }`}
                          >
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0 animate-pulse"></span>
                            )}
                            <LetterAvatar name={notif.senderName} className="w-6 h-6 text-[8px]" />
                            <div className="text-[10px] leading-relaxed flex-1 text-left">
                              <span className="font-bold text-zinc-50">@{notif.senderName} </span>
                              <span className="text-zinc-400 font-normal">{translatedText}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!userProfile && (
            <button 
              type="button"
              onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 sm:px-4 py-1.5 rounded-full transition text-[10px] sm:text-xs font-bold cursor-pointer shadow-sm active:scale-95"
            >
              <span>Join Now</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Shell */}
      <div className="flex flex-1 relative">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 h-[calc(100vh-3.5rem)] sticky top-14 bg-zinc-900 border-r border-zinc-800 pt-4 pb-4 flex-col justify-between select-none text-left shrink-0 px-2">
          <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pb-4">
            {userProfile ? (
              <div 
                onClick={() => {
                  setViewingCreatorId(userProfile.uid);
                  handleCloseWatchVideo();
                }}
                className="flex items-center gap-3 p-3 mx-1 bg-rose-600/10 rounded-2xl border border-rose-500/10 cursor-pointer hover:bg-rose-500/20 transition animate-fade-in"
              >
                <LetterAvatar name={currentUsername} className="w-10 h-10 text-sm" />
                <div className="min-w-0 text-left">
                  <span className="block text-xs font-bold truncate text-zinc-50">@{currentUsername}</span>
                  <span className="text-[10px] text-rose-400 font-semibold block">View My Profile</span>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="p-3 mx-1 bg-zinc-950 rounded-2xl border border-zinc-800 text-center cursor-pointer hover:bg-zinc-800 transition"
              >
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Fellowship Guest</p>
                <button type="button" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1.5 px-4 rounded-xl transition shadow-sm select-none">
                  Sign In / Register
                </button>
              </div>
            )}

            <div className="space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button 
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id); 
                      setViewingCreatorId(null); 
                      handleCloseWatchVideo(); 
                    }}
                    className={`w-full flex items-center gap-4 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                      isActive 
                        ? 'bg-rose-600/10 text-rose-400 font-bold' 
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <hr className="border-zinc-800 my-1" />
            
            <div className="space-y-1">
              <button 
                type="button"
                onClick={() => setShowPromoModal(true)}
                className="w-full flex items-center gap-4 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                <span className="select-none">📢</span>
                <span>Promote Gospel</span>
              </button>

              <button 
                type="button"
                onClick={() => setShowDonateModal(true)}
                className="w-full flex items-center gap-4 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                <span className="select-none">❤️</span>
                <span>Support Platform</span>
              </button>

              <button 
                type="button"
                onClick={handleInviteFriend}
                className="w-full flex items-center gap-4 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 cursor-pointer"
              >
                <span className="select-none">🤝</span>
                <span>{inviteCopied ? 'Link Copied! ✓' : 'Invite Family'}</span>
              </button>
            </div>
          </div>

          {userProfile && (
            <div className="p-2 border-t border-zinc-800 shrink-0">
              <button 
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Fellowship</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Viewport */}
        <main 
          onScroll={handleMainScroll}
          className="flex-1 min-w-0 p-4 sm:p-5 pb-20 sm:pb-5 space-y-6 overflow-y-auto h-[calc(100vh-3.5rem)] text-zinc-50 transition-colors"
        >
          <Suspense fallback={<SkeletonFallback />}>
          {showVerseOverlay && (
            <div 
              id="verse-dropdown-card"
              className="absolute right-4 mt-2.5 w-full max-w-[360px] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl z-50 p-4 space-y-4 text-zinc-200 text-left animate-scale-up"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>✨</span>
                  <span>Scripture of the Day</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowVerseOverlay(false)}
                  className="text-zinc-500 hover:text-white transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 py-1 text-center relative group">
                <p className="text-sm font-medium italic text-zinc-100 leading-relaxed font-serif text-center relative z-10 select-text">
                  "{currentDayVerse.text}"
                </p>
                <div className="flex items-center justify-between pt-2 border-b border-zinc-800 relative z-10">
                  <span className="text-xs font-bold text-amber-400">
                    — {currentDayVerse.reference}
                  </span>
                  
                  <button 
                    type="button"
                    onClick={handleShareVerseImage}
                    disabled={isSharingVerse}
                    className="bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg border border-transparent transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isSharingVerse ? 'Designing Graphic...' : 'Share Word'}</span>
                  </button>
                </div>
              </div>

              {showVerseSuccess && (
                <div className="bg-amber-500/5 text-amber-400 border border-amber-500/10 p-2.5 rounded-xl text-xs font-medium shadow-sm flex items-center gap-2">
                  <span>✨</span>
                  <span>Reflection saved to your Spiritual Journal!</span>
                </div>
              )}

              {showVerseJournal && (
                <form 
                  onSubmit={handleSaveVerseJournal}
                  className="mt-3 pt-3 border-t border-zinc-800 space-y-2.5 bg-zinc-950 rounded-xl p-3"
                >
                  <label htmlFor="daily-verse-note-area" className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    📝 Quiet Time Reflection
                  </label>
                  <textarea
                    id="daily-verse-note-area"
                    name="dailyVerseReflection"
                    value={verseNoteText}
                    onChange={(e) => setVerseNoteText(e.target.value)}
                    placeholder="What is the Lord whispering to your heart?"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 h-20 resize-none font-normal leading-relaxed shadow-inner"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                    >
                      Save Note
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Watch Modal & Dynamic Routes */}
          {activeWatchVideo ? (
            <WatchModal 
              video={activeWatchVideo} 
              allVideos={mediaItems} 
              onSelectVideo={handleOpenWatchVideo} 
              onLike={handleLikeVideo} 
              onDislike={handleDislikeVideo} 
              onUpdateComments={handleUpdateComments} 
              onClose={handleCloseWatchVideo} 
              currentUserSession={currentUserSession} 
              currentUsername={currentUsername} 
              onViewProfile={setViewingCreatorId}
              onIncrementView={handleIncrementView} 
              userProfile={userProfile}
              onTriggerAuth={() => setShowAuthModal(true)}
            />
          ) : viewingCreatorId ? (
            <CreatorProfile
              userId={viewingCreatorId}
              currentUser={userProfile}
              allMediaItems={mediaItems}
              allPrayerRequests={prayerRequests}
              onOpenWatchVideo={handleOpenWatchVideo}
              onOpenStudio={() => {
                setActiveTab('Studio');
                setViewingCreatorId(null);
              }}
              onBack={() => setViewingCreatorId(null)}
              onProfileUpdated={(updated) => {
                setUserProfile(updated);
                localStorage.setItem('christ_studio_user_profile', JSON.stringify(updated));
              }}
            />
          ) : (
            <>
              {activeTab === 'Home' && (
                <>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 select-none">
                    {['All', 'Worship', 'Sermon', 'Testimonial', 'Education'].map((chip, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => setActiveCategory(chip)}
                        className={`text-xs font-bold px-4 py-2 rounded-xl shrink-0 border border-transparent transition cursor-pointer ${
                          activeCategory === chip
                            ? 'bg-white text-black shadow-sm'
                            : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold uppercase tracking-wider select-none">
                        <span>⚡ SPONSORED</span>
                        <span>•</span>
                        <span>CHRIST STUDIO CORE</span>
                      </div>
                      <h3 className="text-lg font-bold leading-snug">Your Faith, Your Channel, Our Platform.</h3>
                      <p className="text-xs text-zinc-400 font-normal max-w-xl leading-relaxed">
                        Reach the right audience with your Gospel and Worship content without losing any views!
                      </p>
                    </div>
                    <div className="flex items-center gap-2 select-none shrink-0 w-full md:w-auto">
                      <button type="button" onClick={() => window.open('https://www.youtube.com/@ChristStudio605', '_blank')} className="flex-1 md:flex-initial bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm">
                        Visit Channel
                      </button>
                      <button type="button" onClick={() => { setActiveTab('Devotional'); }} className="flex-1 md:flex-initial bg-zinc-800 hover:bg-zinc-700 text-zinc-50 px-5 py-2.5 rounded-full text-xs font-bold border border-zinc-800 transition cursor-pointer active:scale-95 shadow-sm">
                        Read
                      </button>
                    </div>
                  </div>

                  <SpotlightSlider slides={spotlights} onPromoClick={handlePromoClickTracking} />

                  {stableShorts.length > 0 && (
                    <section className="space-y-4 text-left animate-fade-in">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 select-none">
                        <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          <span>📱</span>
                          <span>Spiritual Shorts</span>
                        </h3>
                      </div>
                      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {stableShorts.map((short) => (
                          <div 
                            key={short.id} 
                            onClick={() => { setSelectedShortId(short.id); setActiveTab('Shorts'); handleCloseWatchVideo(); }}
                            className="w-36 sm:w-44 shrink-0 group cursor-pointer space-y-2 relative active:scale-[0.98] transition-all"
                          >
                            <div className="aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black relative border border-zinc-800 shadow-sm">
                              {isYouTubeUrl(short.videoUrl) ? (
                                <img 
                                  src={getYoutubeThumbnail(short.videoUrl)} 
                                  alt={short.title} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              ) : (
                                <video 
                                  src={short.videoUrl} 
                                  muted 
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                              <div className="absolute bottom-2.5 left-2.5 right-2 text-white text-left">
                                <p className="text-[10px] font-bold line-clamp-2 leading-snug">{short.title}</p>
                                <p className="text-[9px] text-zinc-300 font-medium mt-1">@{short.creatorName}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 select-none">
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Flame className="w-4 h-4 text-rose-600" />
                        <span>Recent Gospel Publications</span>
                      </h3>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">LIVE FEED</span>
                    </div>

                    {filteredVideos.length === 0 ? (
                      <div className="text-center py-16 text-zinc-500 font-medium select-none border border-dashed border-zinc-800 rounded-2xl">
                        No active publications match this category right now.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
                        {filteredVideos.map((video) => (
                          <VideoCard key={video.id} video={video} onOpenWatch={handleOpenWatchVideo} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {activeTab === 'Shorts' && (
                <div className="flex items-center justify-center min-h-[70vh]">
                  <ShortsViewer
                    shorts={stableShorts}
                    currentUserSession={currentUserSession}
                    onLike={handleLikeVideo}
                    onAddComment={handleUpdateComments}
                    initialShortId={selectedShortId}
                    userProfile={userProfile}
                    onTriggerAuth={() => setShowAuthModal(true)}
                    onIncrementView={handleIncrementView}
                  />
                </div>
              )}

              {activeTab === 'LiveTV' && (
                <LiveTV channels={liveChannels} />
              )}

              {activeTab === 'Movies' && (
                <MoviePortal movies={movies} />
              )}

              {activeTab === 'ForYou' && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 text-left transition-colors">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-5 select-none">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <span>✨</span>
                        <span>For You Recommendations</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Personalized based on your watched topics, worship styles, and community engagement.
                      </p>
                    </div>
                  </div>

                  {sortedForYouVideos.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 font-medium">
                      Start exploring sermons and worship to build your personalized feed!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
                      {sortedForYouVideos.map((video) => (
                        <VideoCard key={video.id} video={video} onOpenWatch={handleOpenWatchVideo} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'PrayerWall' && (
                <PrayerWall 
                  prayerRequests={prayerRequests} 
                  onAddRequest={(reqData) => { if (isDemoVisitor && !userProfile) { setShowAuthModal(true); } else { handleAddPrayerRequest(reqData); } }} 
                  onPray={(requestId) => { if (isDemoVisitor && !userProfile) { setShowAuthModal(true); } else { handlePrayForRequest(requestId); } }} 
                  onAddPrayerComment={(requestId, content) => { if (isDemoVisitor && !userProfile) { setShowAuthModal(true); } else { handleAddPrayerComment(requestId, content); } }}
                  onMarkAnswered={handleMarkAnswered}
                  currentUserSession={currentUserSession} 
                />
              )}

              {activeTab === 'Trivia' && (
                <BibleTrivia 
                  currentUserSession={currentUserSession} 
                  currentUsername={currentUsername} 
                  currentUserAvatar={currentUserAvatar} 
                  userProfile={userProfile}
                  onTriggerAuth={() => setShowAuthModal(true)}
                />
              )}

              {activeTab === 'Devotional' && (
                <DailyDevotional 
                  devotionals={devotionals} 
                  journalEntries={journalEntries}
                  onAddJournalEntry={handleAddJournalEntry}
                  onDeleteJournalEntry={handleDeleteJournalEntry}
                  userProfile={userProfile}
                  onTriggerAuth={() => setShowAuthModal(true)}
                />
              )}

              {activeTab === 'Bible' && (
                <EnglishNivBibleHub />
              )}

              {activeTab === 'HelpCenter' && <HelpCenter />}

              {activeTab === 'Studio' && (
                <CreatorStudio 
                  myVideos={mediaItems.filter(v => v.creatorId === currentUserSession)} 
                  onAddVideo={handleAddVideo} 
                  onDeleteVideo={handleDeleteVideo} 
                  onUpdateVideo={handleUpdateVideo} 
                  currentUserSession={currentUserSession} 
                  userProfile={userProfile}
                />
              )}
            </>
          )}
          </Suspense>
        </main>
      </div>

      {/* Bottom Mobile Bar */}
      <nav 
        className={`sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 flex items-center justify-around z-40 px-2 select-none shadow-lg transition-transform duration-300 ${
          isBottomNavVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button 
          type="button"
          onClick={() => { setActiveTab('Home'); setViewingCreatorId(null); handleCloseWatchVideo(); }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'Home' && !activeWatchVideo && !viewingCreatorId ? 'text-rose-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button 
          type="button"
          onClick={() => { setActiveTab('LiveTV'); setViewingCreatorId(null); handleCloseWatchVideo(); }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'LiveTV' ? 'text-rose-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] font-bold">Live TV</span>
        </button>

        <button 
          type="button"
          onClick={() => { setActiveTab('Shorts'); setSelectedShortId(undefined); setViewingCreatorId(null); handleCloseWatchVideo(); }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'Shorts' ? 'text-rose-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <span className="text-xl">📱</span>
          <span className="text-[10px] font-bold">Shorts</span>
        </button>

        <button 
          type="button"
          onClick={() => { setActiveTab('Trivia'); setViewingCreatorId(null); handleCloseWatchVideo(); }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeTab === 'Trivia' ? 'text-rose-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Trophy className="w-5 h-5 text-rose-600" />
          <span className="text-[10px] font-bold">Trivia</span>
        </button>

        <button 
          type="button"
          onClick={() => { 
            if (userProfile) {
              setViewingCreatorId(userProfile.uid); 
              handleCloseWatchVideo();
            } else {
              setAuthModalMode('login');
              setShowAuthModal(true);
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            viewingCreatorId === userProfile?.uid ? 'text-rose-400 font-bold' : 'text-zinc-400'
          }`}
        >
          {userProfile ? (
            <LetterAvatar name={currentUsername} className="w-6 h-6 text-[8px]" />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>

      {/* Floating Menu Button */}
      <button
        type="button"
        onClick={() => setShowFullMenu(true)}
        className="fixed bottom-20 sm:bottom-6 right-6 z-[45] bg-rose-600 hover:bg-rose-700 text-white p-3.5 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center border border-rose-400/30"
        title="Open Navigation Menu"
        aria-label="Open Navigation Menu"
      >
        <LayoutGrid className="w-6 h-6" />
      </button>

      {/* Full Menu Modal */}
      {showFullMenu && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="bg-zinc-900 w-full max-w-lg rounded-3xl p-6 border border-zinc-800 shadow-2xl space-y-6 animate-scale-up text-left max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-rose-600" />
                <span className="text-sm font-bold uppercase text-zinc-50 tracking-wider">Workspace Navigation</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowFullMenu(false)} 
                className="p-1 text-zinc-500 hover:text-white rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Core Features</h4>
              <div className="grid grid-cols-2 gap-2.5">
                {SIDEBAR_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setViewingCreatorId(null);
                      handleCloseWatchVideo();
                      setShowFullMenu(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition text-left cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-rose-600/10 border-rose-500/30 text-rose-400 font-bold' 
                        : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div className="text-lg">{item.icon}</div>
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Community & Support</h4>
              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  type="button"
                  onClick={() => { setShowPromoModal(true); setShowFullMenu(false); }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-xs font-medium transition text-left cursor-pointer"
                >
                  <span className="text-base">📢</span>
                  <span>Promote Gospel</span>
                </button>

                <button 
                  type="button"
                  onClick={() => { setShowDonateModal(true); setShowFullMenu(false); }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-xs font-medium transition text-left cursor-pointer"
                >
                  <span className="text-base">❤️</span>
                  <span>Support Platform</span>
                </button>

                <button 
                  type="button"
                  onClick={() => { handleInviteFriend(); setShowFullMenu(false); }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-xs font-medium transition text-left cursor-pointer"
                >
                  <span className="text-base">🤝</span>
                  <span>{inviteCopied ? 'Link Copied! ✓' : 'Invite Family'}</span>
                </button>

                <a 
                  href="https://wa.me/923412541147?text=Hello%20Christ%20Studio%20Support!%20I%20have%20a%20question%20or%20need%20assistance%20with%20the%20platform."
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowFullMenu(false)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366]/20 text-xs font-bold text-[#25D366] transition text-left cursor-pointer"
                >
                  <span className="text-base">💬</span>
                  <span>WhatsApp Support</span>
                </a>
              </div>
            </div>

            {userProfile && (
              <div className="pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { handleLogout(); setShowFullMenu(false); }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-600/20 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Exit Fellowship (Log Out)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Action Modal */}
      {showCreateMenu && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-800 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Create & Share</span>
              <button type="button" onClick={() => setShowCreateMenu(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => {
                  if (userProfile) {
                    setActiveTab('Studio');
                  } else {
                    setShowAuthModal(true);
                  }
                  setShowCreateMenu(false);
                }}
                className="w-full flex items-center gap-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 transition text-left cursor-pointer"
              >
                <div className="w-10 h-10 bg-rose-600/10 rounded-xl flex items-center justify-center text-rose-600"><Video className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-50">Upload Gospel Video</h4>
                  <p className="text-[10px] text-zinc-500">Publish full sermons & worship songs</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => {
                  if (userProfile) {
                    setActiveTab('Studio');
                  } else {
                    setShowAuthModal(true);
                  }
                  setShowCreateMenu(false);
                }}
                className="w-full flex items-center gap-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 transition text-left cursor-pointer"
              >
                <div className="w-10 h-10 bg-amber-600/10 rounded-xl flex items-center justify-center text-amber-600"><Smartphone className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-50">Upload Spiritual Short</h4>
                  <p className="text-[10px] text-zinc-500">Share short vertical loop videos</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setActiveTab('PrayerWall');
                  setShowCreateMenu(false);
                }}
                className="w-full flex items-center gap-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 transition text-left cursor-pointer"
              >
                <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-600">🕊️</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-50">Post Prayer Request</h4>
                  <p className="text-[10px] text-zinc-500">Share prayer requests on the wall</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} initialMode={authModalMode} />}
      {showPromoModal && userProfile && <PromoModal onClose={() => setShowPromoModal(false)} userProfile={userProfile} />}

      {/* Support Modal */}
      {showDonateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-text text-left animate-fade-in">
          <div className="relative bg-zinc-900 w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-zinc-800 shadow-2xl space-y-5 animate-scale-up">
            <button type="button" onClick={() => setShowDonateModal(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full transition cursor-pointer hover:scale-105 active:scale-95">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-2 border-b border-zinc-800 pb-4 select-none">
              <span className="text-2xl">❤️</span>
              <h3 className="font-bold text-base tracking-tight text-zinc-50">Support Christ Studio</h3>
              <p className="text-xs text-zinc-400 font-normal max-w-sm mx-auto leading-relaxed">
                Every contribution keeps this Christian platform online, secure, and free of inappropriate advertisements.
              </p>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
              
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-rose-500 tracking-wider">EasyPaisa</span>
                  <h4 className="text-xs font-bold text-white">03412541147</h4>
                  <p className="text-[10px] text-zinc-400 font-medium">Account Title: Atif Azeem</p>
                </div>
                <button 
                  type="button"
                  onClick={() => handleCopyDonationDetail('03412541147', 'easypaisa')} 
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm shrink-0"
                >
                  {copiedFieldId === 'easypaisa' ? <Check className="w-3.5 h-3.5" /> : <span>Copy Number</span>}
                </button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-amber-400 tracking-wider">Raast ID (Instant Transfer)</span>
                  <h4 className="text-xs font-bold text-white">03412541147</h4>
                  <p className="text-[10px] text-zinc-400 font-medium">Account Title: Atif Azeem</p>
                </div>
                <button 
                  type="button"
                  onClick={() => handleCopyDonationDetail('03412541147', 'raast')} 
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm shrink-0"
                >
                  {copiedFieldId === 'raast' ? <Check className="w-3.5 h-3.5" /> : <span>Copy Raast</span>}
                </button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-emerald-400 tracking-wider">HBL Bank Account</span>
                    <h4 className="text-xs font-bold text-white">00277901297103</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">Account Title: Atif Azeem</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleCopyDonationDetail('00277901297103', 'hbl_acc')} 
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm shrink-0"
                  >
                    {copiedFieldId === 'hbl_acc' ? <Check className="w-3.5 h-3.5" /> : <span>Copy Acc #</span>}
                  </button>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">HBL IBAN Number</span>
                    <p className="text-[10.5px] font-mono font-bold text-zinc-200">PK51HABB0000277901297103</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleCopyDonationDetail('PK51HABB0000277901297103', 'hbl_iban')} 
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm border border-zinc-700 shrink-0"
                  >
                    {copiedFieldId === 'hbl_iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span>Copy IBAN</span>}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-text text-left animate-fade-in">
          <div className="relative bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="text-center space-y-2 border-b border-zinc-800 pb-3 select-none">
              <div className="w-11 h-11 bg-rose-600 rounded-full flex items-center justify-center text-white mx-auto text-xl shadow-sm">†</div>
              <h3 className="font-bold text-base tracking-tight text-zinc-50">Welcome to Christ Studio</h3>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-full">Christian Workspace</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              A distraction-free sanctuary for Christian fellowship with zero intrusive advertisements.
            </p>
            <button type="button" onClick={() => setShowWelcomeModal(false)} className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer text-center shadow-md active:scale-95">
              Enter Workspace
            </button>
          </div>
        </div>
      )}

    </div>
  );
}