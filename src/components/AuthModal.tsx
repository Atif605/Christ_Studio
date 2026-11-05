import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Phone, 
  User, 
  Youtube, 
  ShieldCheck, 
  X, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  KeyRound,
  Loader2
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification, 
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut 
} from 'firebase/auth';
import type { UserProfile } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (userProfile: UserProfile) => void;
  initialMode?: 'login' | 'signup' | 'forgot';
}

export function AuthModal({ onClose, onLoginSuccess, initialMode = 'login' }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState('');

  // Password Visibility Toggle State
  const [showPassword, setShowPassword] = useState(false);

  // Verification Sent State
  const [emailSent, setEmailSent] = useState(false);
  const [canResendVerification, setCanResendVerification] = useState(false);

  // Handle Google OAuth Sign-in
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      let profileData: UserProfile;

      if (userSnap.exists()) {
        profileData = userSnap.data() as UserProfile;
      } else {
        // Create new user profile from Google info
        profileData = {
          uid: user.uid,
          name: user.displayName || 'Believer',
          email: user.email || '',
          phone: user.phoneNumber || '',
          youtubeChannelHandle: '@Believer',
          verifiedCreator: false,
          avatarUrl: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'B')}&background=e11d48&color=fff`,
          createdAt: new Date().toISOString(),
          followers: [],
          following: [],
          savedVerses: []
        };
        await setDoc(userDocRef, profileData);
      }

      setSuccessMsg(`Welcome, ${profileData.name}! 🕊️`);
      setTimeout(() => {
        onLoginSuccess(profileData);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      const firebaseErr = err as { code?: string; message?: string };
      if (firebaseErr.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in cancelled.');
      } else {
        setErrorMsg('Google authentication failed. Please try with Email.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Password Reset Request
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSuccessMsg(`Password reset link sent to ${email.trim()}. Check your inbox & spam folder.`);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      if (firebaseErr.code === 'auth/user-not-found') {
        setErrorMsg('No account found with this email.');
      } else {
        setErrorMsg(firebaseErr.message || 'Failed to send password reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Login & Signup
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (authMode === 'forgot') {
      return handlePasswordReset(e);
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please fill in both email and password.');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        if (!name.trim() || !phone.trim()) {
          setErrorMsg('Please provide your name and phone number.');
          setLoading(false);
          return;
        }

        const hasLetters = /[a-zA-Z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);

        if (!hasLetters || !hasNumbers || password.length < 6) {
          setErrorMsg('Password must be at least 6 characters and contain letters and numbers.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please verify your password fields.');
          setLoading(false);
          return;
        }

        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=e11d48&color=fff`;
        const isVerified = youtubeChannel.trim().length > 0;

        const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        const fbUser = userCredential.user;

        await updateProfile(fbUser, { displayName: name.trim() });
        await sendEmailVerification(fbUser);

        const userProfile: UserProfile = {
          uid: fbUser.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          youtubeChannelHandle: youtubeChannel.trim() || '@Believer',
          verifiedCreator: isVerified,
          avatarUrl: avatarUrl,
          createdAt: new Date().toISOString(),
          followers: [],
          following: [],
          savedVerses: []
        };

        try {
          await setDoc(doc(db, 'users', fbUser.uid), userProfile);
        } catch (dbErr) {
          console.warn('Profile write warning:', dbErr);
        }

        await signOut(auth);
        setEmailSent(true);
        setSuccessMsg(`Praise God! Verification email has been sent to ${email.trim()}.`);
      } else {
        // Login Flow
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
          const fbUser = userCredential.user;

          if (!fbUser.emailVerified) {
            setErrorMsg('Your email is not verified yet. Please check your inbox (and Spam folder) to verify.');
            setCanResendVerification(true);
            await signOut(auth);
            setLoading(false);
            return;
          }

          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const profileData = userSnap.data() as UserProfile;
            setSuccessMsg(`Welcome back, ${profileData.name}! 🕊️`);
            setTimeout(() => {
              onLoginSuccess(profileData);
              onClose();
            }, 1000);
          } else {
            // Profile fallback
            const fallbackProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || 'Believer',
              email: fbUser.email || '',
              phone: '',
              youtubeChannelHandle: '@Believer',
              verifiedCreator: false,
              avatarUrl: fbUser.photoURL || `https://ui-avatars.com/api/?name=Believer&background=e11d48&color=fff`,
              createdAt: new Date().toISOString()
            };
            onLoginSuccess(fallbackProfile);
            onClose();
          }
        } catch (authErr: unknown) {
          const fbErr = authErr as { code?: string; message?: string };
          if (
            fbErr.code === 'auth/wrong-password' || 
            fbErr.code === 'auth/user-not-found' || 
            fbErr.code === 'auth/invalid-credential'
          ) {
            setErrorMsg('Incorrect email or password. Please try again.');
          } else if (fbErr.code === 'auth/too-many-requests') {
            setErrorMsg('Too many unsuccessful attempts. Please reset your password or try again later.');
          } else {
            setErrorMsg('Authentication failed: ' + (fbErr.message || 'Unknown error'));
          }
        }
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const fbErr = err as { code?: string; message?: string };
      if (fbErr.code === 'auth/email-already-in-use') {
        setErrorMsg('This email address is already registered.');
      } else {
        setErrorMsg(fbErr.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Enter your email and password above to resend verification.');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      setSuccessMsg('Verification email resent! Please check your Gmail.');
      setErrorMsg(null);
    } catch {
      setErrorMsg('Could not resend email. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={onClose} 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans"
    >
      <div 
        className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col p-5 sm:p-7 space-y-4 text-left my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()} 
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-lg transition cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Block */}
        <div className="text-center space-y-1.5 select-none pt-1">
          <div className="w-11 h-11 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner">
            🕊️
          </div>
          <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-zinc-900 dark:text-white">
            {emailSent 
              ? 'Verify Your Email'
              : authMode === 'login' 
                ? 'Welcome to Christ Studio'
                : authMode === 'signup'
                  ? 'Create Creator Account'
                  : 'Reset Your Password'
            }
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            {emailSent
              ? `We have sent an official verification link to ${email.trim()}.`
              : authMode === 'login' 
                ? 'Sign in to access watch history, prayer wall, and studio.' 
                : authMode === 'signup'
                  ? 'Join our Christian community to share gospel media and prayers.'
                  : 'Enter your email address to receive password reset instructions.'
            }
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-semibold rounded-xl animate-fade-in shadow-xs">
            ⚠️ {errorMsg}
            {canResendVerification && (
              <button 
                type="button" 
                onClick={handleResendVerification}
                className="block mt-1.5 underline font-bold text-rose-600 dark:text-rose-400 hover:opacity-80 cursor-pointer"
              >
                Click here to resend verification email
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-xs font-bold rounded-xl animate-fade-in shadow-xs">
            ✨ {successMsg}
          </div>
        )}

        {emailSent ? (
          <div className="space-y-4 text-center select-none">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-3 text-left">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 block tracking-wider">
                  📩 Next Steps:
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  1. Open your <strong>Gmail inbox</strong> (or Spam folder). <br />
                  2. Click on the <strong>Verification Link</strong>. <br />
                  3. Return here and log in to your account.
                </p>
              </div>

              <div className="space-y-1 border-t border-emerald-200/60 dark:border-emerald-900/40 pt-2.5 text-right" dir="rtl">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 block tracking-wider">
                  📩 اگلا مرحلہ:
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  ۱۔ اپنی <strong>جی میل ایپ</strong> کھولیں۔ <br />
                  ۲۔ موصول ہونے والے <strong>تصدیقی لنک</strong> پر کلک کریں۔ <br />
                  ۳۔ تصدیق کے بعد دوبارہ لاگ ان کریں۔
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setEmailSent(false);
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-rose-600/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {/* Google OAuth Button */}
            {authMode !== 'forgot' && (
              <>
                <button
                  type="button"
                  disabled={googleLoading || loading}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 py-2.5 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 transition cursor-pointer shadow-xs active:scale-95"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center my-2 select-none">
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <span className="px-3 text-[10px] uppercase font-bold text-zinc-400">or with email</span>
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
                </div>
              </>
            )}

            {/* Name */}
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                />
              </div>
            </div>

            {/* Phone Number & YouTube Handle for Signup */}
            {authMode === 'signup' && (
              <>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +92 300 1234567"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    YouTube Channel Handle (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                      <Youtube className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={youtubeChannel}
                      onChange={(e) => setYoutubeChannel(e.target.value)}
                      placeholder="e.g. @GospelMinistry"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            {authMode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Password
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-10 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-10 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 active:scale-95 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : authMode === 'login' ? (
                'Sign In'
              ) : authMode === 'signup' ? (
                'Create Account'
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        {!emailSent && (
          <div className="text-center pt-2 border-t border-zinc-200 dark:border-zinc-800 select-none space-y-1.5">
            {authMode === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                {authMode === 'login' 
                  ? 'New to Christ Studio? Join us, Register here!' 
                  : 'Already have an account? Sign In here'
                }
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl items-center justify-center select-none text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Your personal credentials are safe & secure.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;