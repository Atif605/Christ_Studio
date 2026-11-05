import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, X, Flame, Share2, Lock, ChevronLeft, Calendar, Hourglass, Radio } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, query, limit, getDoc, where } from 'firebase/firestore';

// Types & Interfaces
export interface BilingualTriviaQuestion {
  id: string;
  question: string;
  urduQuestion?: string;
  options: string[];
  urduOptions?: string[];
  answerIndex: number;
  explanation: string;
  urduExplanation?: string;
}

export type TriviaStageId = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert';

export interface LevelProgress {
  currentDay: number; 
  completedDays: Record<number, { score: number; completedDate: string }>;
  completed: boolean; 
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  streak: number;
  xp: number; 
  badges: string[]; 
  avatarUrl: string;
  lastCompletedDate?: string;
  weekId?: string;
  currentLevel?: TriviaStageId;
  unlockedLevels?: TriviaStageId[];
  levelProgress?: Record<string, LevelProgress>;
}

interface StageDefinition {
  id: TriviaStageId;
  name: string;
  description: string;
  minPassingScore: number; 
}

// -------------------------------------------------------------
// Spark Plan Cache & Date Helpers
// -------------------------------------------------------------
const isCacheValid = (timestampKey: string, ttlMinutes = 15): boolean => {
  const cachedTime = localStorage.getItem(timestampKey);
  if (!cachedTime) return false;
  const diff = Date.now() - parseInt(cachedTime, 10);
  return diff < ttlMinutes * 60 * 1000;
};

const getLocalDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCutoffDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getWeeklyId = (): string => {
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${today.getFullYear()}-W${weekNum}`;
};

const getSpiritualTitle = (xp: number): { title: string; color: string } => {
  const points = xp || 0;
  if (points >= 300) return { title: "Elder", color: "text-purple-600 bg-purple-500/10 border-purple-500/20 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-900/30" };
  if (points >= 150) return { title: "Evangelist", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-900/30" };
  if (points >= 60) return { title: "Disciple", color: "text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-900/30" };
  return { title: "Seeker", color: "text-zinc-500 bg-zinc-500/10 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-500/10 dark:border-zinc-800" };
};

function LetterAvatar({ name, className = "w-8 h-8 text-xs" }: { name: string; className?: string }) {
  const safeName = typeof name === 'string' ? name.trim() : '';
  const firstLetter = safeName ? safeName.charAt(0).toUpperCase() : '?';
  const colors = [
    'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'
  ];
  const charCodeSum = safeName ? safeName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
  const colorClass = colors[charCodeSum % colors.length] || 'bg-zinc-500';

  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none shadow-sm ${colorClass} ${className}`}>
      {firstLetter}
    </div>
  );
}

const STAGES: StageDefinition[] = [
  {
    id: 'beginner',
    name: "Beginner",
    description: "Fundamental scriptures, creation account, Noah's ark, and basic New Testament facts.",
    minPassingScore: 4
  },
  {
    id: 'elementary',
    name: "Elementary",
    description: "Moses, the Exodus, miracles of Jesus, and famous parables.",
    minPassingScore: 4
  },
  {
    id: 'intermediate',
    name: "Intermediate",
    description: "Old Testament Kings, Prophets, and the early Church in the book of Acts.",
    minPassingScore: 4
  }
];

const getStageTotalDays = (_stageId: TriviaStageId): number => 28;

const getStageProgressLabel = (stageId: TriviaStageId, progress?: LevelProgress): string => {
  if (progress?.completed) {
    return "Completed";
  }
  const current = progress?.currentDay || 1;
  const total = getStageTotalDays(stageId);
  return `Day ${current} of ${total}`;
};

interface BibleTriviaProps {
  currentUserSession: string | null;
  currentUsername: string | null;
  currentUserAvatar: string | null;
  userProfile?: any;
  onTriggerAuth?: () => void;
}

export default function BibleTrivia({
  currentUserSession,
  currentUsername,
  currentUserAvatar,
  userProfile,
  onTriggerAuth
}: BibleTriviaProps) {

  // Flow States
  const [activeStage, setActiveStage] = useState<TriviaStageId | null>(null);
  const [questions, setQuestions] = useState<BilingualTriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [todayScore, setTodayScore] = useState(0);

  // Progression States
  const [unlockedLevels, setUnlockedLevels] = useState<TriviaStageId[]>(['beginner']);
  const [levelProgress, setLevelProgress] = useState<Record<string, LevelProgress>>({});
  const [userXp, setUserXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [lastCompletedDate, setLastCompletedDate] = useState<string>('');

  // UI & Network States
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isSyncingScore, setIsSyncingScore] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streakWarriors, setStreakWarriors] = useState<LeaderboardEntry[]>([]);
  const [dailyParticipants, setDailyParticipants] = useState<LeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'streak'>('weekly');

  // Spark Optimized Leaderboard (15 min cache + limit 12)
  const fetchLeaderboard = useCallback(async () => {
    const CACHE_KEY = 'cs_leaderboard_cache_v4';
    const TIME_KEY = 'cs_leaderboard_time_v4';

    if (isCacheValid(TIME_KEY, 15)) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setLeaderboard(parsed.weekly || []);
          setStreakWarriors(parsed.streaks || []);
          return;
        } catch (e) {
          console.error("Leaderboard cache parse error", e);
        }
      }
    }

    try {
      const cutoffDate = getCutoffDateString();
      const qWeekly = query(
        collection(db, 'trivia_scores'),
        where('lastCompletedDate', '>=', cutoffDate),
        limit(12) // Low limit to save Spark reads
      );
      
      const querySnapshotWeekly = await getDocs(qWeekly);
      const weeklyData: LeaderboardEntry[] = [];
      
      querySnapshotWeekly.forEach((docSnap) => {
        weeklyData.push(docSnap.data() as LeaderboardEntry);
      });

      const sortedWeekly = weeklyData
        .sort((a, b) => (b.streak !== a.streak ? b.streak - a.streak : b.xp - a.xp))
        .slice(0, 10);

      const sortedStreaks = [...weeklyData]
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 10);

      setLeaderboard(sortedWeekly);
      setStreakWarriors(sortedStreaks);

      localStorage.setItem(CACHE_KEY, JSON.stringify({ weekly: sortedWeekly, streaks: sortedStreaks }));
      localStorage.setItem(TIME_KEY, Date.now().toString());
    } catch (e) {
      console.warn("Could not retrieve leaderboard data:", e);
    }
  }, []);

  // Spark Optimized Daily Participants Ticker (10 min cache + limit 6)
  const fetchDailyParticipants = useCallback(async () => {
    const CACHE_KEY = 'cs_ticker_cache_v4';
    const TIME_KEY = 'cs_ticker_time_v4';

    if (isCacheValid(TIME_KEY, 10)) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          setDailyParticipants(JSON.parse(cached));
          return;
        } catch (e) {
          console.error("Ticker cache parse error", e);
        }
      }
    }

    try {
      const todayStr = getLocalDateString();
      const q = query(
        collection(db, 'trivia_scores'),
        where('lastCompletedDate', '==', todayStr),
        limit(6)
      );
      const querySnapshot = await getDocs(q);
      const list: LeaderboardEntry[] = [];
      querySnapshot.forEach(docSnap => {
        list.push(docSnap.data() as LeaderboardEntry);
      });

      setDailyParticipants(list);
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      localStorage.setItem(TIME_KEY, Date.now().toString());
    } catch (e) {
      console.warn("Error reading active participants:", e);
    }
  }, []);

  // Safe Progress Fetch & Smart Merge
  const fetchUserProgression = useCallback(async () => {
    const localUnlocked = localStorage.getItem('cs_trivia_unlocked_local_v4');
    const localProgress = localStorage.getItem('cs_trivia_progress_local_v4');
    const localLastCompleted = localStorage.getItem('cs_trivia_last_completed_local_v4');
    const localStreak = localStorage.getItem('cs_trivia_streak_local_v4');
    const localXp = localStorage.getItem('cs_trivia_xp_local_v4');

    const parsedLocalUnlocked = localUnlocked ? JSON.parse(localUnlocked) : ['beginner'];
    const parsedLocalProgress = localProgress ? JSON.parse(localProgress) : {};
    const parsedLocalStreak = localStreak ? parseInt(localStreak, 10) : 0;
    const parsedLocalXp = localXp ? parseInt(localXp, 10) : 0;
    const parsedLocalLastCompleted = localLastCompleted || '';

    if (!currentUserSession || !userProfile) {
      setUnlockedLevels(parsedLocalUnlocked);
      setLevelProgress(parsedLocalProgress);
      setLastCompletedDate(parsedLocalLastCompleted);
      setStreak(parsedLocalStreak);
      setUserXp(parsedLocalXp);
      return;
    }

    try {
      const docRef = doc(db, 'trivia_scores', currentUserSession);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        
        // Smart Merge: Remote progress vs Local Progress
        const mergedXp = Math.max(cloudData.xp || 0, parsedLocalXp);
        const mergedStreak = Math.max(cloudData.streak || 0, parsedLocalStreak);
        const mergedUnlocked = Array.from(new Set([...(cloudData.unlockedLevels || ['beginner']), ...parsedLocalUnlocked])) as TriviaStageId[];
        const mergedProgress = { ...(cloudData.levelProgress || {}), ...parsedLocalProgress };
        const finalLastCompleted = cloudData.lastCompletedDate || parsedLocalLastCompleted;

        setUnlockedLevels(mergedUnlocked);
        setLevelProgress(mergedProgress);
        setUserXp(mergedXp);
        setStreak(mergedStreak);
        setUserBadges(cloudData.badges || []);
        setLastCompletedDate(finalLastCompleted);

        // Update local with cloud merged data
        localStorage.setItem('cs_trivia_unlocked_local_v4', JSON.stringify(mergedUnlocked));
        localStorage.setItem('cs_trivia_progress_local_v4', JSON.stringify(mergedProgress));
        localStorage.setItem('cs_trivia_streak_local_v4', mergedStreak.toString());
        localStorage.setItem('cs_trivia_xp_local_v4', mergedXp.toString());
        localStorage.setItem('cs_trivia_last_completed_local_v4', finalLastCompleted);
      } else if (parsedLocalXp > 0 || parsedLocalStreak > 0) {
        // First-time sync of local profile to Cloud
        syncLocalToCloud(parsedLocalUnlocked, parsedLocalProgress, parsedLocalStreak, parsedLocalXp, parsedLocalLastCompleted);
      }
    } catch (e) {
      console.warn("Could not read remote user progression:", e);
    }
  }, [currentUserSession, userProfile]);

  useEffect(() => {
    fetchLeaderboard();
    fetchDailyParticipants();
    fetchUserProgression();
  }, [fetchLeaderboard, fetchDailyParticipants, fetchUserProgression]);

  const syncLocalToCloud = async (
    unlocked: TriviaStageId[], 
    progress: Record<string, LevelProgress>, 
    offlineStreak: number, 
    offlineXp: number,
    lastDate: string
  ) => {
    if (!currentUserSession) return;
    try {
      const docRef = doc(db, 'trivia_scores', currentUserSession);
      const currentWeekId = getWeeklyId();
      await setDoc(docRef, {
        userId: currentUserSession,
        name: currentUsername || 'Anonymous Believer',
        streak: offlineStreak,
        xp: offlineXp,
        badges: userBadges,
        avatarUrl: currentUserAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        lastCompletedDate: lastDate,
        weekId: currentWeekId,
        unlockedLevels: unlocked,
        levelProgress: progress
      }, { merge: true });
    } catch (e) {
      console.warn("Could not sync local progress profile to database:", e);
    }
  };

  const isDailyLimitReached = () => lastCompletedDate === getLocalDateString();

  const loadStageQuestionsForDay = async (stageId: TriviaStageId, dayNumber: number, isReplay = false) => {
    if (isDailyLimitReached() && !isReplay) {
      alert("Today's study is completed. The next lesson unlocks tomorrow.");
      return;
    }

    setLoadingQuestions(true);
    setActiveStage(stageId);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowExplanation(false);
    setTodayScore(0);
    setQuizCompleted(false);

    const cacheKey = `cs_stage_cache_v4_${stageId}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsedCache = JSON.parse(cachedData);
        const dayQuestions = parsedCache.days?.[dayNumber] || parsedCache.days?.[String(dayNumber)];
        if (dayQuestions && dayQuestions.length > 0) {
          setQuestions(dayQuestions);
          setLoadingQuestions(false);
          return;
        }
      } catch (e) {
        console.error("Cache parsing error:", e);
      }
    }

    try {
      const docRef = doc(db, 'trivia_stages', stageId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const stageData = docSnap.data();
        localStorage.setItem(cacheKey, JSON.stringify(stageData));

        const dayQuestions = stageData.days?.[dayNumber] || stageData.days?.[String(dayNumber)];
        if (dayQuestions && dayQuestions.length > 0) {
          setQuestions(dayQuestions);
          setLoadingQuestions(false);
          return;
        }
      }
      throw new Error(`Questions for Stage '${stageId}' Day ${dayNumber} not found.`);
    } catch (err) {
      console.error("Error loading questions:", err);
      alert("Could not load questions. Please check your internet connection and try again.");
      setActiveStage(null);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswered || !questions[currentIndex]) return;
    setIsAnswered(true);
    setShowExplanation(true);
    
    if (selectedOption === questions[currentIndex].answerIndex) {
      setTodayScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setSelectedOption(null);
      setIsAnswered(false);
      setShowExplanation(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      processLevelCompletion();
    }
  };

  const processLevelCompletion = async () => {
    if (!activeStage) return;

    setQuizCompleted(true);
    const finalScore = todayScore;
    const currentStageDef = STAGES.find(s => s.id === activeStage);
    if (!currentStageDef) return;

    const isPassed = finalScore >= currentStageDef.minPassingScore;
    const totalDaysInStage = getStageTotalDays(activeStage);
    
    const updatedProgress = { ...levelProgress };
    const currentRecord: LevelProgress = updatedProgress[activeStage] || {
      currentDay: 1,
      completedDays: {},
      completed: false
    };

    const activeDay = currentRecord.currentDay;
    const todayStr = getLocalDateString();

    const updatedCompletedDays = { ...(currentRecord.completedDays || {}) };
    
    if (isPassed) {
      updatedCompletedDays[activeDay] = {
        score: finalScore,
        completedDate: todayStr
      };
    }

    let nextDay = activeDay;
    let isFullyCompleted = currentRecord.completed;

    if (isPassed) {
      if (activeDay < totalDaysInStage) {
        nextDay = activeDay + 1;
      } else {
        isFullyCompleted = true;
      }
    }

    updatedProgress[activeStage] = {
      currentDay: nextDay,
      completedDays: updatedCompletedDays,
      completed: isFullyCompleted
    };

    let updatedUnlocked = [...unlockedLevels];
    if (isFullyCompleted) {
      const currentStageIndex = STAGES.findIndex(s => s.id === activeStage);
      const nextStage = STAGES[currentStageIndex + 1];
      if (nextStage && !updatedUnlocked.includes(nextStage.id)) {
        updatedUnlocked.push(nextStage.id);
      }
    }

    setLevelProgress(updatedProgress);
    setUnlockedLevels(updatedUnlocked);

    // Compute Streak & XP (Safe Math.round)
    let computedStreak = streak;
    if (isPassed) {
      setLastCompletedDate(todayStr);
      const lastSavedDateStr = lastCompletedDate || localStorage.getItem('cs_trivia_last_completed_local_v4') || '';
      if (lastSavedDateStr && lastSavedDateStr !== todayStr) {
        const lastDate = new Date(lastSavedDateStr);
        const today = new Date(todayStr);
        lastDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          computedStreak += 1;
        } else if (diffDays > 1) {
          computedStreak = 1;
        }
      } else if (!lastSavedDateStr) {
        computedStreak = 1;
      }
    }

    const xpGained = (finalScore * 10) + (isPassed ? 30 : 10);
    const updatedXp = userXp + xpGained;

    setStreak(computedStreak);
    setUserXp(updatedXp);

    localStorage.setItem('cs_trivia_unlocked_local_v4', JSON.stringify(updatedUnlocked));
    localStorage.setItem('cs_trivia_progress_local_v4', JSON.stringify(updatedProgress));
    localStorage.setItem('cs_trivia_streak_local_v4', computedStreak.toString());
    localStorage.setItem('cs_trivia_xp_local_v4', updatedXp.toString());
    if (isPassed) {
      localStorage.setItem('cs_trivia_last_completed_local_v4', todayStr);
    }

    if (currentUserSession) {
      await saveProgressionRemote(activeStage, finalScore, updatedUnlocked, updatedProgress, isPassed, computedStreak, updatedXp);
    }
  };

  const saveProgressionRemote = async (
    stageId: TriviaStageId, 
    score: number, 
    unlockedList: TriviaStageId[], 
    progressRecord: Record<string, LevelProgress>,
    isPassed: boolean,
    computedStreak: number,
    updatedXp: number
  ) => {
    if (isSyncingScore || !currentUserSession) return;
    setIsSyncingScore(true);

    try {
      const todayStr = getLocalDateString();
      const currentWeekId = getWeeklyId();
      const docRef = doc(db, 'trivia_scores', currentUserSession);

      const badgesList = [...userBadges];
      if (computedStreak >= 7 && !badgesList.includes('faithful_member')) {
        badgesList.push('faithful_member');
      }
      if (score === 5 && !badgesList.includes('scripture_scholar')) {
        badgesList.push('scripture_scholar');
      }

      await setDoc(docRef, {
        userId: currentUserSession,
        name: currentUsername || 'Anonymous Believer',
        score: score, 
        streak: computedStreak,
        xp: updatedXp,
        badges: badgesList,
        avatarUrl: currentUserAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        lastCompletedDate: isPassed ? todayStr : lastCompletedDate,
        weekId: currentWeekId,
        currentLevel: stageId,
        unlockedLevels: unlockedList,
        levelProgress: progressRecord
      }, { merge: true });

      setUserBadges(badgesList);
      
      // Invalidate cache so leaderboard shows newly saved score
      localStorage.removeItem('cs_leaderboard_time_v4');
      localStorage.removeItem('cs_ticker_time_v4');
      fetchLeaderboard();
      fetchDailyParticipants();
    } catch (e) {
      console.warn("Could not sync progression to Firestore:", e);
    } finally {
      setIsSyncingScore(false);
    }
  };

  const handleRegisterToSave = () => {
    if (onTriggerAuth) {
      onTriggerAuth();
    }
    window.dispatchEvent(new CustomEvent('trigger-auth-signup'));
  };

  const handleShareChallenge = async () => {
    if (questions.length === 0 || !questions[currentIndex]) return;
    const currentQ = questions[currentIndex];
    const shareUrl = `${window.location.origin}${window.location.pathname}?tab=Trivia`;
    
    let text = `🚨 BIBLE SCRIPTURE CHALLENGE!\n\nQuestion: ${currentQ.question}\n`;
    if (currentQ.urduQuestion) {
      text += `سوال: ${currentQ.urduQuestion}\n`;
    }
    text += `\nTest your biblical knowledge across progressive levels. Try here:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bible Trivia Challenge', text });
      } catch {
        navigator.clipboard.writeText(text);
        alert('Challenge text copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Challenge text copied to clipboard!');
    }
  };

  const handleShareScoreChallenge = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?tab=Trivia`;
    const text = `🏆 I completed the ${activeStage?.toUpperCase()} stage in Bible Trivia!\n\n` +
      `I scored ${todayScore}/5! Can you beat my score? Test your biblical comprehension here:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bible Trivia Challenge', text });
      } catch {
        navigator.clipboard.writeText(text);
        alert('Score challenge copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Score challenge copied to clipboard!');
    }
  };

  const myTitle = useMemo(() => getSpiritualTitle(userXp), [userXp]);

  return (
    <div className="space-y-4 text-left font-sans text-zinc-900 dark:text-zinc-50 select-none">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Live Daily Activity Ticker Banner */}
      <div className="bg-rose-50/80 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-2xl p-3 overflow-hidden shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0 bg-rose-600 text-white dark:bg-rose-700 text-[10px] font-bold uppercase px-2.5 py-1 rounded-xl shadow-sm tracking-wider">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Live Activity</span>
        </div>
        <div className="relative w-full overflow-hidden flex items-center h-5">
          {dailyParticipants.length === 0 ? (
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              No participants yet today. Be the first to complete today's devotional study! 📖
            </span>
          ) : (
            <div className="absolute whitespace-nowrap flex items-center gap-10 animate-marquee text-xs font-bold text-rose-800 dark:text-rose-400">
              {dailyParticipants.map((p, index) => (
                <span key={p.userId || index} className="inline-flex items-center gap-2">
                  <span className="text-[10px] bg-rose-200 dark:bg-rose-900/50 px-2 py-0.5 rounded-full text-rose-800 dark:text-rose-300">
                    #{index + 1}
                  </span>
                  <span>🕊️ <b>{p.name}</b> Today's Score: <b>{p.score}/5</b></span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Primary Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Trivia Gameplay Panel */}
        <div className="lg:col-span-2 space-y-4">
          
          {activeStage === null ? (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 select-none">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Scripture Progression Stages
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                    Unlock progressive levels of study. Daily pacing ensures deep reflection.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${myTitle.color}`}>
                    {myTitle.title}
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-white px-2.5 py-1 rounded-full text-[10px] font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-rose-600 fill-current" />
                    <span>{streak} Days</span>
                  </div>
                </div>
              </div>

              {/* Locked Today Notice */}
              {isDailyLimitReached() && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-800 dark:text-amber-400">
                      Daily Lesson Completed!
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                      To help scripture retention, the next devotional unlocks tomorrow. Keep up the faithful habit!
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STAGES.map((stage, idx) => {
                  const isUnlocked = unlockedLevels.includes(stage.id);
                  const progress: LevelProgress = levelProgress[stage.id] || {
                    currentDay: 1,
                    completedDays: {},
                    completed: false
                  };
                  
                  const currentDay = progress.currentDay;
                  const totalDaysInStage = getStageTotalDays(stage.id);
                  const percentComplete = Math.min(100, Math.round(((currentDay - 1) / totalDaysInStage) * 100));

                  return (
                    <div 
                      key={stage.id} 
                      className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-full ${
                        isUnlocked 
                          ? 'bg-zinc-50/50 hover:bg-zinc-50 dark:bg-zinc-950/20 dark:hover:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800' 
                          : 'bg-zinc-100/40 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800 opacity-70'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                            progress.completed 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : isUnlocked 
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                          }`}>
                            Stage {idx + 1}
                          </span>
                          {progress.completed && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                              Completed ✓
                            </span>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                            {stage.name}
                          </h4>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed mt-1">
                            {stage.description}
                          </p>
                        </div>

                        {isUnlocked && (
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                              <span>{getStageProgressLabel(stage.id, progress)}</span>
                              <span>{percentComplete}%</span>
                            </div>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-rose-600 h-full transition-all duration-300" style={{ width: `${percentComplete}%` }}></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        {isUnlocked ? (
                          <button
                            onClick={() => loadStageQuestionsForDay(
                              stage.id, 
                              progress.completed ? totalDaysInStage : currentDay,
                              progress.completed
                            )}
                            disabled={isDailyLimitReached() && !progress.completed}
                            className={`text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer select-none ${
                              isDailyLimitReached() && !progress.completed
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-700' 
                                : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                            }`}
                          >
                            {progress.completed ? 'Replay Stage Quiz 🔄' : `Start Day ${currentDay} Quiz 📖`}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-600">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked</span>
                          </div>
                        )}
                      </div>

                      {!isUnlocked && idx > 0 && (
                        <div className="mt-3 text-[10px] text-zinc-500 font-medium bg-zinc-100 dark:bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          🔒 Complete Day {getStageTotalDays(STAGES[idx - 1].id)} of {STAGES[idx - 1].name} to unlock this level.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Gameplay Module */
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 select-none">
                <button 
                  onClick={() => setActiveStage(null)}
                  className="flex items-center gap-1 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Return to Stages</span>
                </button>

                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                  Stage: {activeStage.toUpperCase()} | Day {levelProgress[activeStage]?.currentDay || 1} of {getStageTotalDays(activeStage)}
                </span>
              </div>

              {loadingQuestions ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Loading devotional lesson...</p>
                </div>
              ) : !quizCompleted && questions.length > 0 && questions[currentIndex] ? (
                <div className="space-y-5">
                  
                  {/* Bilingual Question Card */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between select-none">
                      <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-widest">
                        Question {currentIndex + 1} of {questions.length}
                      </span>
                      
                      <button
                        onClick={handleShareChallenge}
                        className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline tracking-wider bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 cursor-pointer transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Question</span>
                      </button>
                    </div>
                    
                    {/* English Question */}
                    <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-relaxed select-text">
                      {questions[currentIndex].question}
                    </p>

                    {/* Urdu Question Subtitle */}
                    {questions[currentIndex].urduQuestion && (
                      <p 
                        className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 leading-relaxed select-text border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-2" 
                        dir="rtl"
                      >
                        {questions[currentIndex].urduQuestion}
                      </p>
                    )}
                  </div>

                  {/* Bilingual Options List */}
                  <div className="space-y-2.5">
                    {questions[currentIndex].options.map((opt, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = questions[currentIndex].answerIndex === idx;
                      const urduOpt = questions[currentIndex].urduOptions?.[idx];
                      
                      let buttonStyle = "border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300";
                      if (isSelected) {
                        buttonStyle = "border-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-bold ring-1 ring-rose-500";
                      }
                      if (isAnswered) {
                        if (isCorrect) {
                          buttonStyle = "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold ring-1 ring-emerald-500";
                        } else if (isSelected && !isCorrect) {
                          buttonStyle = "border-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-bold ring-1 ring-rose-500";
                        } else {
                          buttonStyle = "border-zinc-200/50 dark:border-zinc-800 opacity-40 text-zinc-400";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(idx)}
                          disabled={isAnswered}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-medium transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer focus:outline-none ${buttonStyle}`}
                        >
                          <div className="flex flex-col text-left flex-1 min-w-0">
                            <span className="font-semibold">{opt}</span>
                            {urduOpt && (
                              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-1" dir="rtl">
                                {urduOpt}
                              </span>
                            )}
                          </div>
                          <div className="shrink-0">
                            {isAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                            {isAnswered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bilingual Scripture Commentary / Explanation */}
                  {showExplanation && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 dark:border-amber-900/20 rounded-xl space-y-2 shadow-inner text-left">
                      <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block tracking-wider select-none pb-1 border-b border-amber-500/10">
                        📖 Scripture Commentary
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-normal leading-relaxed select-text">
                        {questions[currentIndex].explanation}
                      </p>
                      {questions[currentIndex].urduExplanation && (
                        <p 
                          className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed select-text border-t border-dashed border-amber-500/10 dark:border-amber-900/10 pt-2" 
                          dir="rtl"
                        >
                          {questions[currentIndex].urduExplanation}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 select-none">
                    {!isAnswered ? (
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={selectedOption === null || isAnswered}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-6 py-2.5 rounded-full transition cursor-pointer active:scale-95 shadow-sm"
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-6 py-2.5 rounded-full transition cursor-pointer active:scale-95 shadow-sm"
                      >
                        {currentIndex === questions.length - 1 ? 'See Results 🏆' : 'Next Question'}
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                /* Completed Quiz Result Screen */
                <div className="text-center py-8 space-y-5 select-none">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
                    {todayScore >= 4 ? "👑" : "📖"}
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      {todayScore >= 4 ? `Lesson Passed!` : 'Lesson Incomplete'}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      You scored <b className="text-amber-600 dark:text-amber-400">{todayScore}/5</b> (Passing score required: 4/5)
                    </p>
                    
                    {todayScore < 4 ? (
                      <p className="text-xs text-rose-500 font-medium max-w-sm mx-auto pt-1">
                        Passing score not reached. You can retry immediately to improve your score and progress!
                      </p>
                    ) : (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold max-w-sm mx-auto">
                          Excellent! Your progress has been recorded. The next day's study unlocks tomorrow.
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase border border-zinc-200 dark:border-zinc-700">
                          <Hourglass className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Next Study Unlocks Tomorrow</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto pt-2">
                    <button
                      onClick={() => {
                        if (todayScore < 4 && activeStage) {
                          loadStageQuestionsForDay(activeStage, levelProgress[activeStage]?.currentDay || 1, false);
                        } else {
                          setActiveStage(null);
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white text-xs font-bold rounded-full transition cursor-pointer active:scale-95 border border-zinc-200 dark:border-zinc-700"
                    >
                      {todayScore < 4 ? 'Try Again' : 'View Stages'}
                    </button>
                    
                    <button
                      onClick={handleShareScoreChallenge}
                      className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Score</span>
                    </button>
                  </div>

                  {!currentUserSession && (
                    <div className="max-w-md mx-auto p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 shadow-inner text-left">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block tracking-wider">
                          🔒 Sign in to Sync Progress
                        </span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Create an account to permanently save your stage progress, earn spiritual badges, and never lose your streak across devices.
                        </p>
                      </div>
                      <button
                        onClick={handleRegisterToSave}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                      >
                        <span>Create Free Account 🕊️</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Community Progression Leaderboard Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 transition-all duration-150">
            
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-px text-xs font-bold select-none shrink-0">
              <button
                onClick={() => setLeaderboardTab('weekly')}
                className={`flex-1 text-center pb-2.5 tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                  leaderboardTab === 'weekly'
                    ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-white'
                }`}
              >
                🏆 Top Scholars
              </button>
              <button
                onClick={() => setLeaderboardTab('streak')}
                className={`flex-1 text-center pb-2.5 tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                  leaderboardTab === 'streak'
                    ? 'border-amber-600 dark:border-amber-400 text-amber-600 dark:text-amber-400 font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-white'
                }`}
              >
                🔥 Streak Leaders
              </button>
            </div>

            {leaderboardTab === 'weekly' ? (
              <>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium select-none">
                  Ranked by active devotional streak days with XP as tie-breaker.
                </p>

                <div className="space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar">
                  {leaderboard.length === 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-6 select-none">
                      No leaderboard scores recorded yet. Complete a quiz to rank!
                    </p>
                  ) : (
                    leaderboard.map((entry, index) => {
                      const isCurrentUser = entry.userId === currentUserSession;
                      const titleData = getSpiritualTitle(entry.xp);
                      const badgesList = entry.badges || [];
                      
                      let rankStyle = "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";
                      if (index === 0) rankStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20 shadow-sm";
                      if (index === 1) rankStyle = "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold shadow-sm";
                      if (index === 2) rankStyle = "bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold border border-orange-500/20 shadow-sm";

                      return (
                        <div 
                          key={entry.userId}
                          className={`flex flex-col p-2.5 rounded-xl border transition gap-2 ${
                            isCurrentUser 
                              ? 'bg-rose-500/5 border-rose-500' 
                              : 'bg-transparent border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] select-none shrink-0 ${rankStyle}`}>
                                {index + 1}
                              </span>
                              <LetterAvatar name={entry.name} className="w-7 h-7 text-[10px]" />
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-zinc-900 dark:text-white truncate select-none">
                                  {entry.name} {isCurrentUser && "(You)"}
                                </span>
                                <span className={`inline-block text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${titleData.color}`}>
                                  {titleData.title}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 select-none">
                              <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-rose-500 fill-current" />
                                <span>{entry.streak}d</span>
                              </div>
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                {entry.xp} XP
                              </span>
                            </div>
                          </div>

                          {badgesList.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pl-7 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-1.5">
                              {badgesList.slice(0, 3).map((badge) => (
                                <span 
                                  key={badge} 
                                  className="bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-500/20 dark:border-amber-900/20 rounded-lg px-2 py-0.5 text-[9px] font-semibold flex items-center gap-1"
                                >
                                  {badge === 'faithful_member' ? '🔥 Streak' : '⭐ Scholar'}
                                </span>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium select-none">
                  Believers maintaining consecutive daily scripture devotionals.
                </p>

                <div className="space-y-2.5 max-h-[360px] overflow-y-auto no-scrollbar">
                  {streakWarriors.length === 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-6 select-none">
                      No active daily metrics recorded yet. Complete lessons daily to rank!
                    </p>
                  ) : (
                    streakWarriors.map((entry) => {
                      const isCurrentUser = entry.userId === currentUserSession;
                      const titleData = getSpiritualTitle(entry.xp);

                      return (
                        <div 
                          key={entry.userId}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                            isCurrentUser 
                              ? 'bg-amber-500/5 border-amber-500' 
                              : 'bg-transparent border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold select-none shrink-0">
                              🔥
                            </span>
                            <LetterAvatar name={entry.name} className="w-7 h-7 text-[10px]" />
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-zinc-900 dark:text-white truncate select-none">
                                {entry.name} {isCurrentUser && "(You)"}
                              </span>
                              <span className={`inline-block text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${titleData.color}`}>
                                {titleData.title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 select-none">
                            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Flame className="w-4 h-4 text-amber-500 fill-current" />
                              <span>{entry.streak} Days</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl text-center text-[10px] text-zinc-500 font-medium border border-dashed border-zinc-200 dark:border-zinc-800 select-none">
              "Your word is a lamp for my feet, a light on my path." — Psalm 119:105
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}