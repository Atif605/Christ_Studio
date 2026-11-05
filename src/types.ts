// ==========================================
// 1. COMMON & SYSTEM TYPES
// ==========================================

export type ID = string;
export type TimestampString = string;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  lastDocId: string | null;
  hasMore: boolean;
  total?: number;
}

// ==========================================
// 2. COMMENT & INTERACTION TYPES
// ==========================================

export interface CommentReply {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorId: string;
  content: string;
  createdAt: TimestampString;
  likes?: string[];
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorId?: string;
  content: string;
  createdAt: TimestampString;
  likes?: string[]; // Array of User IDs
  replies?: CommentReply[];
}

// ==========================================
// 3. USER & CREATOR PROFILE TYPES
// ==========================================

export type MinistryRole =
  | 'Pastor'
  | 'Worship Leader'
  | 'Evangelist'
  | 'Teacher'
  | 'Youth Leader'
  | 'Member'
  | 'Creator'
  | 'Other';

export interface SavedVerseItem {
  id: string;
  text: string;
  reference: string;
  savedAt: TimestampString;
  language?: 'urdu' | 'english';
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  youtubeChannelHandle: string; // e.g. "@ChurchName"
  verifiedCreator: boolean;
  avatarUrl: string;
  createdAt: TimestampString;
  updatedAt?: TimestampString;

  // Custom Profile & Ministry Metadata
  bio?: string;
  location?: string;
  churchName?: string;
  ministryRole?: MinistryRole | string;
  spiritualGift?: string;
  favoriteVerse?: string;
  statementOfFaith?: string;

  // Social Links
  instagram?: string;
  facebook?: string;
  website?: string;
  twitter?: string;

  // Follower Network Lists (Optimized array of user IDs)
  followers?: string[];
  following?: string[];

  // Privacy & Alerts Preferences
  privateFollowing?: boolean;
  followerNotifications?: boolean;
  pushNotificationsEnabled?: boolean;

  // Behavioral Analytics for Recommendations
  followingCreators?: string[];
  preferredCategories?: string[];
  savedVerses?: SavedVerseItem[];
  watchHistory?: Array<{
    mediaId: string;
    watchedAt: TimestampString;
    completed?: boolean;
  }>;
}

// ==========================================
// 4. MEDIA & VIDEO TYPES (YOUTUBE EMBED)
// ==========================================

export type MediaCategory =
  | 'Sermon'
  | 'Worship'
  | 'Testimonial'
  | 'Education'
  | 'Shorts'
  | 'Gospel'
  | 'Kids'
  | 'Documentary';

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  creatorName: string;
  creatorAvatar: string;
  creatorId: string;
  videoUrl: string;
  youtubeId?: string; // Extracted 11-char YouTube ID
  thumbnailUrl: string;
  category: MediaCategory | string;
  isShort: boolean;
  isFeatured: boolean;
  duration?: string;
  views: number;
  likes: string[]; // List of user IDs
  dislikes: string[]; // List of user IDs
  comments: Comment[];
  commentsCount?: number;
  likesCount?: number;
  tags?: string[];
  createdAt: TimestampString;
  updatedAt?: TimestampString;
}

export interface MediaUploadDTO {
  title: string;
  description: string;
  videoUrl: string;
  category: MediaCategory | string;
  isShort?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}

// ==========================================
// 5. ENTERTAINMENT (MOVIES & LIVE TV)
// ==========================================

export type LiveStreamType = 'youtube' | 'hls' | 'iframe';

export interface LiveChannel {
  id: string;
  name: string;
  logoUrl: string;
  streamUrl: string; // YouTube Live URL or m3u8 stream
  streamType?: LiveStreamType;
  youtubeId?: string;
  category: string;
  isLive: boolean;
  viewerCount?: number;
  currentProgram?: string;
  description?: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  youtubeId?: string;
  duration: string;
  releaseYear: string;
  category: string;
  genre?: string[];
  director?: string;
  cast?: string[];
  views: number;
  likes?: string[];
  featured?: boolean;
  createdAt?: TimestampString;
}

// ==========================================
// 6. PRAYER WALL & COMMUNITY
// ==========================================

export interface PrayerRequest {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorId?: string;
  requestText: string;
  prayerCount: number;
  prayedBy: string[]; // User IDs who tapped 'Pray'
  comments: Comment[];
  category: 'Healing' | 'Family' | 'Finance' | 'Spiritual' | 'Guidance' | 'General' | string;
  isAnswered?: boolean;
  praiseReportText?: string;
  createdAt: TimestampString;
  updatedAt?: TimestampString;
}

// ==========================================
// 7. BIBLE & DEVOTIONALS
// ==========================================

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: 'NIV' | 'URDU' | string;
}

export interface BibleChapter {
  chapter: number;
  verses: Array<{
    verse: number;
    text: string;
  }>;
}

export interface BibleBook {
  name: string;
  totalChapters: number;
  testament?: 'Old' | 'New';
  urduName?: string;
}

export interface Devotional {
  id: string;
  title: string;
  scriptureRef: string;
  scriptureText: string;
  body: string;
  reflectionQuestion: string;
  prayer?: string;
  category: string;
  dateString: string; // Format: YYYY-MM-DD
  authorName?: string;
  imageUrl?: string;
}

export interface JournalEntry {
  id: string;
  userId?: string;
  verseRef: string;
  verseText: string;
  note: string;
  tags?: string[];
  createdAt?: TimestampString;
  date: string;
}

// ==========================================
// 8. TRIVIA & GAMIFICATION
// ==========================================

export type TriviaDifficulty = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty?: TriviaDifficulty;
  category?: string;
}

export interface TriviaUserScore {
  userId: string;
  userName: string;
  userAvatar: string;
  totalScore: number;
  gamesPlayed: number;
  currentStreak: number;
  lastPlayedDate: string;
}

// ==========================================
// 9. UI & SPOTLIGHT COMPONENTS
// ==========================================

export interface SpotlightSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionText: string;
  actionLink: string;
  badge?: string;
  isActive?: boolean;
  priority?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'prayer' | 'video' | 'live' | 'system';
  link?: string;
  read: boolean;
  createdAt: TimestampString;
}