import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Youtube, 
  Instagram, 
  Facebook, 
  MapPin, 
  Heart, 
  Bell, 
  BookMarked, 
  Edit3, 
  Check, 
  Lock, 
  Users, 
  ToggleLeft, 
  ToggleRight, 
  Award, 
  Video, 
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { MediaItem, PrayerRequest, UserProfile } from '../types';
import { parseYouTubeId, getYouTubeThumbnailUrl } from '../lib/youtubeUtils';

interface CreatorProfileProps {
  userId: string; 
  currentUser: UserProfile | null; 
  allMediaItems: MediaItem[];
  allPrayerRequests: PrayerRequest[];
  onOpenWatchVideo: (video: MediaItem) => void;
  onOpenStudio?: () => void;
  onBack?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
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

export function CreatorProfile({
  userId,
  currentUser,
  allMediaItems,
  allPrayerRequests,
  onOpenWatchVideo,
  onOpenStudio,
  onBack,
  onProfileUpdated
}: CreatorProfileProps) {
  const isOwnProfile = currentUser?.uid === userId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [churchName, setChurchName] = useState('');
  const [ministryRole, setMinistryRole] = useState('');
  const [spiritualGift, setSpiritualGift] = useState('');
  const [favoriteVerse, setFavoriteVerse] = useState('');
  const [statementOfFaith, setStatementOfFaith] = useState('');
  const [youtubeChannelHandle, setYoutubeChannelHandle] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');

  // Settings Toggles
  const [privateFollowing, setPrivateFollowing] = useState(false);
  const [followerNotifications, setFollowerNotifications] = useState(true);

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<'home' | 'videos' | 'shorts' | 'prayers'>('home');

  // Follow lists
  const [followersList, setFollowersList] = useState<string[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const docRef = doc(db, 'users', userId);
        const snap = await getDoc(docRef);

        if (snap.exists() && isMounted) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          initializeFields(data);
        } else if (isMounted) {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const initializeFields = (data: Partial<UserProfile>) => {
    setName(data.name || '');
    setBio(data.bio || '');
    setLocation(data.location || '');
    setChurchName(data.churchName || '');
    setMinistryRole(data.ministryRole || '');
    setSpiritualGift(data.spiritualGift || '');
    setFavoriteVerse(data.favoriteVerse || '');
    setStatementOfFaith(data.statementOfFaith || '');
    setYoutubeChannelHandle(data.youtubeChannelHandle || '');
    setPhone(data.phone || '');
    setInstagram(data.instagram || '');
    setFacebook(data.facebook || '');
    setWebsite(data.website || '');
    setPrivateFollowing(data.privateFollowing || false);
    setFollowerNotifications(data.followerNotifications !== false);
    setFollowersList(Array.isArray(data.followers) ? data.followers : []);
    setFollowingList(Array.isArray(data.following) ? data.following : []);
  };

  const creatorMedia = useMemo(() => allMediaItems.filter(item => item.creatorId === userId && !item.isShort), [allMediaItems, userId]);
  const creatorShorts = useMemo(() => allMediaItems.filter(item => item.creatorId === userId && item.isShort), [allMediaItems, userId]);
  const creatorPrayers = useMemo(() => allPrayerRequests.filter(req => req.authorId === userId), [allPrayerRequests, userId]);
  const isFollowing = currentUser ? followersList.includes(currentUser.uid) : false;

  const handleFollowToggle = async () => {
    if (!currentUser) {
      alert('Kindly register or login to join this creator’s fellowship circle! 🙏');
      return;
    }

    const previousFollowers = [...followersList];
    const isCurrentlyFollowing = isFollowing;

    // Optimistic UI Update
    if (isCurrentlyFollowing) {
      setFollowersList(prev => prev.filter(id => id !== currentUser.uid));
    } else {
      setFollowersList(prev => [...prev, currentUser.uid]);
    }

    try {
      const targetUserRef = doc(db, 'users', userId);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      if (isCurrentlyFollowing) {
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
      } else {
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });

        if (followerNotifications) {
          const newNotification = {
            id: `notif-${Date.now()}`,
            type: 'follow',
            senderId: currentUser.uid,
            senderName: currentUser.name || 'Believer',
            timestamp: new Date().toISOString(),
            read: false
          };

          await updateDoc(targetUserRef, {
            notifications: arrayUnion(newNotification)
          });
        }
      }
    } catch (err) {
      console.error('Follow operation failed:', err);
      setFollowersList(previousFollowers);
      alert('Action failed. Please check your network connection.');
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaveLoading(true);
    setSuccessMsg(null);

    try {
      const userRef = doc(db, 'users', userId);
      const updatedData: UserProfile = {
        uid: userId,
        email: profile?.email || '',
        avatarUrl: profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=e11d48&color=fff`,
        verifiedCreator: profile?.verifiedCreator || false,
        createdAt: profile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        churchName: churchName.trim(),
        ministryRole: ministryRole.trim(),
        spiritualGift: spiritualGift.trim(),
        favoriteVerse: favoriteVerse.trim(),
        statementOfFaith: statementOfFaith.trim(),
        youtubeChannelHandle: youtubeChannelHandle.trim(),
        phone: phone.trim(),
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        website: website.trim(),
        privateFollowing,
        followerNotifications,
        followers: followersList,
        following: followingList
      };

      await setDoc(userRef, updatedData, { merge: true });
      setProfile(updatedData);
      setEditMode(false);
      setSuccessMsg('Your profile has been successfully updated! 🕊️');
      
      if (onProfileUpdated) {
        onProfileUpdated(updatedData);
      }

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error saving profile modifications:', err);
      alert('Could not save profile changes. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 font-sans text-zinc-900 dark:text-zinc-100">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Loading Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center font-sans">
        <p className="text-xs text-rose-600 font-black uppercase tracking-wider">🕊️ Profile Not Found</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm font-medium leading-relaxed">
          This user profile does not exist or has not been registered yet.
        </p>
        {onBack && (
          <button 
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-xl hover:bg-zinc-200 cursor-pointer"
          >
            ← Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-2 py-2 space-y-6 animate-fade-in text-left font-sans text-zinc-900 dark:text-zinc-50 pb-12">
      
      {/* Back Button if provided */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 text-xs font-bold rounded-xl shadow-xs animate-fade-in select-none">
          🕊️ {successMsg}
        </div>
      )}

      {/* Top Profile Card Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left transition-colors">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 to-amber-500" />

        {/* Profile Avatar */}
        <div className="relative shrink-0 select-none">
          <LetterAvatar 
            name={profile.name} 
            avatarUrl={profile.avatarUrl}
            className="w-24 h-24 sm:w-28 sm:h-28 text-3xl sm:text-4xl border-4 border-zinc-100 dark:border-zinc-800 shadow-md" 
          />
          {profile.verifiedCreator && (
            <span className="absolute bottom-1 right-1 bg-rose-600 text-white p-1 rounded-full text-xs shadow-md" title="Verified Christian Creator">
              <CheckCircle2 className="w-4 h-4 fill-current text-white" />
            </span>
          )}
        </div>

        {/* User Details */}
        <div className="flex-1 space-y-3.5 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center justify-center md:justify-start gap-2 select-none">
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {profile.name}
                </h2>
                {profile.verifiedCreator && (
                  <span className="text-[8.5px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    Verified Minister
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold truncate select-all">
                {profile.youtubeChannelHandle || `@${profile.name.toLowerCase().replace(/\s+/g, '')}`}
              </p>
            </div>

            {/* Follow Button */}
            {!isOwnProfile && (
              <button
                type="button"
                onClick={handleFollowToggle}
                className={`px-5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95 shrink-0 ${
                  isFollowing 
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                }`}
              >
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-center md:justify-start gap-6 text-xs py-1.5 select-none text-zinc-700 dark:text-zinc-300 font-bold border-y border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              <span>{followersList.length} <span className="text-zinc-400 font-medium">Followers</span></span>
            </div>
            <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-600" />
              <span>{followingList.length} <span className="text-zinc-400 font-medium">Following</span></span>
            </div>
          </div>

          {profile.bio && (
            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed max-w-2xl mx-auto md:mx-0 select-text">
              {profile.bio}
            </p>
          )}

          {/* Pills for Ministry, Church, Location */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 select-none">
            {profile.location && (
              <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <MapPin className="w-3 h-3 text-rose-600" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.churchName && (
              <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>{profile.churchName}</span>
              </div>
            )}
            {profile.ministryRole && (
              <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <Award className="w-3 h-3 text-amber-500" />
                <span>{profile.ministryRole}</span>
              </div>
            )}
          </div>

          {/* Social Media Links */}
          {(profile.youtubeChannelHandle || profile.instagram || profile.facebook || profile.website) && (
            <div className="flex items-center justify-center md:justify-start gap-3 pt-0.5 select-none">
              {profile.youtubeChannelHandle && (
                <a 
                  href={`https://youtube.com/${profile.youtubeChannelHandle}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition hover:scale-105 active:scale-95"
                  title="YouTube Channel"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {profile.instagram && (
                <a 
                  href={profile.instagram} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1 text-zinc-400 hover:text-[#E1306C] transition hover:scale-105 active:scale-95"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {profile.facebook && (
                <a 
                  href={profile.facebook} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1 text-zinc-400 hover:text-blue-600 transition hover:scale-105 active:scale-95"
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {profile.website && (
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1 text-zinc-400 hover:text-emerald-500 transition hover:scale-105 active:scale-95"
                  title="Official Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Button Row (Edit Profile & Creator Studio for Own Profile) */}
      {isOwnProfile && (
        <div className="flex flex-wrap items-center justify-start gap-2.5 select-none animate-fade-in">
          <button
            type="button"
            onClick={() => {
              setEditMode(!editMode);
              if (!editMode) setActiveSubTab('home');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editMode ? 'Cancel Edit' : 'Edit Profile Settings'}</span>
          </button>

          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 transition cursor-pointer active:scale-95 shadow-xs"
            >
              <Video className="w-3.5 h-3.5 text-rose-600" />
              <span>Open Creator Studio</span>
            </button>
          )}
        </div>
      )}

      {/* Edit Profile Form */}
      {editMode && (
        <form onSubmit={handleSaveChanges} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-lg space-y-5 animate-slide-down">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 select-none">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️</span>
              <span>Edit Ministry & Channel Details</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Bio Summary</label>
                <textarea 
                  value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-normal leading-relaxed resize-none"
                  placeholder="Tell us about your walk of faith..."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">City & Country</label>
                <input 
                  type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Church Affiliation</label>
                <input 
                  type="text" value={churchName} onChange={(e) => setChurchName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Ministry Role</label>
                <input 
                  type="text" value={ministryRole} onChange={(e) => setMinistryRole(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                  placeholder="e.g. Pastor, Singer, Volunteer"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Spiritual Gifts</label>
                <input 
                  type="text" value={spiritualGift} onChange={(e) => setSpiritualGift(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Favorite Scripture</label>
                <input 
                  type="text" value={favoriteVerse} onChange={(e) => setFavoriteVerse(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Statement of Faith</label>
                <textarea 
                  value={statementOfFaith} onChange={(e) => setStatementOfFaith(e.target.value)} rows={2}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-normal leading-relaxed resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3 text-left select-none">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Privacy & Alerts</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex-1">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-zinc-800 dark:text-white flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-zinc-500" /> Private Following List</span>
                  <span className="block text-[9.5px] text-zinc-400 font-medium">Hide who you follow from other visitors.</span>
                </div>
                <button type="button" onClick={() => setPrivateFollowing(!privateFollowing)} className="text-rose-600 shrink-0 cursor-pointer">
                  {privateFollowing ? <ToggleRight className="w-8 h-8 text-rose-600" /> : <ToggleLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex-1">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-zinc-800 dark:text-white flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-zinc-500" /> Follower Alerts</span>
                  <span className="block text-[9.5px] text-zinc-400 font-medium">Get notified when someone follows you.</span>
                </div>
                <button type="button" onClick={() => setFollowerNotifications(!followerNotifications)} className="text-rose-600 shrink-0 cursor-pointer">
                  {followerNotifications ? <ToggleRight className="w-8 h-8 text-rose-600" /> : <ToggleLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 select-none">
            <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
            <button type="submit" disabled={saveLoading} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs">
              {saveLoading ? 'Saving...' : 'Save Profile'}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Main Publications Tabs */}
      <div className="space-y-5">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar font-bold text-xs select-none">
          
          <button
            type="button"
            onClick={() => setActiveSubTab('home')}
            className={`pb-3 px-4 uppercase tracking-wider border-b-2 transition cursor-pointer shrink-0 ${
              activeSubTab === 'home' ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('videos')}
            className={`pb-3 px-4 uppercase tracking-wider border-b-2 transition cursor-pointer shrink-0 ${
              activeSubTab === 'videos' ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span>Videos ({creatorMedia.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('shorts')}
            className={`pb-3 px-4 uppercase tracking-wider border-b-2 transition cursor-pointer shrink-0 ${
              activeSubTab === 'shorts' ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span>Shorts ({creatorShorts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('prayers')}
            className={`pb-3 px-4 uppercase tracking-wider border-b-2 transition cursor-pointer shrink-0 ${
              activeSubTab === 'prayers' ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <span>Prayers ({creatorPrayers.length})</span>
          </button>
        </div>

        {/* Tab Content Rendering */}
        <div className="space-y-4">
          
          {/* PROFILE OVERVIEW TAB */}
          {activeSubTab === 'home' && (
            <div className="space-y-8 animate-fade-in text-left">
              
              {/* Statement of Faith & Scripture */}
              {(profile.statementOfFaith || profile.favoriteVerse) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.statementOfFaith && (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs space-y-2">
                      <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-1.5 select-none">
                        Statement of Faith
                      </h4>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold italic select-text">
                        "{profile.statementOfFaith}"
                      </p>
                    </div>
                  )}
                  {profile.favoriteVerse && (
                    <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 shadow-xs space-y-2">
                      <h4 className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest border-b border-amber-500/20 pb-1.5 flex items-center gap-1.5 select-none">
                        <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Favorite Scripture</span>
                      </h4>
                      <p className="text-sm text-amber-900 dark:text-amber-400 leading-relaxed font-bold select-text">
                        {profile.favoriteVerse}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Latest Videos Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 select-none">
                  <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-rose-600" />
                    <span>Latest Videos ({creatorMedia.length})</span>
                  </h4>
                  {creatorMedia.length > 5 && (
                    <button 
                      type="button"
                      onClick={() => setActiveSubTab('videos')}
                      className="text-xs font-black text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      See More →
                    </button>
                  )}
                </div>

                {creatorMedia.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-4">No video publications posted yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {creatorMedia.slice(0, 5).map(video => {
                      const ytId = video.youtubeId || parseYouTubeId(video.videoUrl);
                      const thumb = video.thumbnailUrl || (ytId ? getYouTubeThumbnailUrl(ytId, 'hqdefault') : '');

                      return (
                        <div 
                          key={video.id}
                          onClick={() => onOpenWatchVideo(video)}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer flex flex-col justify-between"
                        >
                          <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-950 select-none">
                            <img src={thumb} className="w-full h-full object-cover" alt={video.title} loading="lazy" />
                            <span className="absolute bottom-2 right-2 bg-black/75 text-[8px] text-white px-1.5 py-0.5 rounded font-black shadow-xs">
                              ▶ {(video.views || 0).toLocaleString()} Views
                            </span>
                          </div>
                          <div className="p-2.5">
                            <h5 className="font-bold text-xs text-zinc-900 dark:text-white line-clamp-1 leading-snug select-text">
                              {video.title}
                            </h5>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Latest Shorts Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 select-none">
                  <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-rose-600" />
                    <span>Latest Shorts ({creatorShorts.length})</span>
                  </h4>
                  {creatorShorts.length > 5 && (
                    <button 
                      type="button"
                      onClick={() => setActiveSubTab('shorts')}
                      className="text-xs font-black text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      See More →
                    </button>
                  )}
                </div>

                {creatorShorts.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-4">No short loops published yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 animate-fade-in">
                    {creatorShorts.slice(0, 5).map(short => {
                      const ytId = short.youtubeId || parseYouTubeId(short.videoUrl);
                      const thumb = short.thumbnailUrl || (ytId ? getYouTubeThumbnailUrl(ytId, 'hqdefault') : '');

                      return (
                        <div 
                          key={short.id} 
                          onClick={() => onOpenWatchVideo(short)}
                          className="aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black relative border border-zinc-200 dark:border-zinc-800 shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                        >
                          <img 
                            src={thumb} 
                            alt={short.title} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                          <div className="absolute bottom-2.5 left-2.5 right-2 text-white text-left">
                            <p className="text-[10px] font-bold line-clamp-2 leading-snug">{short.title}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIDEOS TAB */}
          {activeSubTab === 'videos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
              {creatorMedia.length === 0 ? (
                <div className="w-full col-span-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center select-none">
                  <p className="text-sm text-zinc-400 font-bold">No video publications posted yet.</p>
                </div>
              ) : (
                creatorMedia.map(video => {
                  const ytId = video.youtubeId || parseYouTubeId(video.videoUrl);
                  const thumb = video.thumbnailUrl || (ytId ? getYouTubeThumbnailUrl(ytId, 'hqdefault') : '');

                  return (
                    <div 
                      key={video.id}
                      onClick={() => onOpenWatchVideo(video)}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer flex flex-col justify-between"
                    >
                      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-950 select-none">
                        <img src={thumb} className="w-full h-full object-cover" alt={video.title} loading="lazy" />
                        <span className="absolute bottom-2 right-2 bg-black/75 text-[8px] text-white px-1.5 py-0.5 rounded font-bold shadow-xs">
                          ▶ {(video.views || 0).toLocaleString()} Views
                        </span>
                        {video.category && (
                          <span className="absolute top-2 left-2 bg-rose-600 text-[8px] font-bold uppercase text-white px-2 py-0.5 rounded-full shadow-xs">
                            {video.category}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h5 className="font-bold text-xs text-zinc-900 dark:text-white line-clamp-1 leading-snug select-text">
                          {video.title}
                        </h5>
                        <p className="text-[10px] text-zinc-400 pt-0.5 font-medium select-none">
                          Published: {new Date(video.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SHORTS TAB */}
          {activeSubTab === 'shorts' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-fade-in">
              {creatorShorts.length === 0 ? (
                <div className="w-full col-span-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center select-none">
                  <p className="text-sm text-zinc-400 font-bold">No short loops published yet.</p>
                </div>
              ) : (
                creatorShorts.map(short => {
                  const ytId = short.youtubeId || parseYouTubeId(short.videoUrl);
                  const thumb = short.thumbnailUrl || (ytId ? getYouTubeThumbnailUrl(ytId, 'hqdefault') : '');

                  return (
                    <div 
                      key={short.id} 
                      onClick={() => onOpenWatchVideo(short)}
                      className="aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black relative border border-zinc-200 dark:border-zinc-800 shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                    >
                      <img 
                        src={thumb} 
                        alt={short.title} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                      <div className="absolute bottom-2.5 left-2.5 right-2 text-white text-left">
                        <p className="text-[10px] font-bold line-clamp-2 leading-snug">{short.title}</p>
                        <p className="text-[8.5px] text-zinc-300 font-medium mt-1">▶ {short.views || 0} Views</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* PRAYERS TAB */}
          {activeSubTab === 'prayers' && (
            <div className="space-y-4 animate-fade-in text-left">
              {creatorPrayers.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center select-none">
                  <p className="text-sm text-zinc-400 font-bold">No prayers posted yet.</p>
                </div>
              ) : (
                creatorPrayers.map(req => (
                  <div 
                    key={req.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between select-none">
                      <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold uppercase px-2 py-0.5 rounded-full border border-rose-500/20">
                        {req.category || 'General Intercession'}
                      </span>
                      {req.isAnswered && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50 font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          ✨ Praise Report
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold leading-relaxed select-text">
                      "{req.requestText}"
                    </p>

                    {req.isAnswered && req.praiseReportText && (
                      <div className="p-3 bg-amber-500/5 dark:bg-zinc-950 border border-amber-500/10 rounded-xl space-y-1">
                        <span className="block text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider select-none">
                          Praise Report / Miracle Testimony:
                        </span>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium italic select-text">
                          "{req.praiseReportText}"
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium pt-1.5 border-t border-zinc-100 dark:border-zinc-800 select-none">
                      <span>Posted on {new Date(req.createdAt).toLocaleDateString()}</span>
                      <span>{req.prayerCount} believers prayed</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreatorProfile;