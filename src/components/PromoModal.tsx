import React, { useState, useMemo, useEffect } from 'react';
import { X, Send, CreditCard, Calendar, ShieldCheck, Eye, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '../types';
import { getYouTubeThumbnailUrl, parseYouTubeId } from '../lib/youtubeUtils';

interface PromoModalProps {
  onClose: () => void;
  userProfile: Partial<UserProfile> & { uid: string };
}

// Ensure URL starts with http:// or https://
const formatExternalUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function PromoModal({ onClose, userProfile }: PromoModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(userProfile.name || '');
  const [whatsapp, setWhatsapp] = useState(userProfile.phone || '');
  const [campaignType, setCampaignType] = useState('Gospel Video');
  const [destinationLink, setDestinationLink] = useState('');
  
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState(''); 
  const [actionText, setActionText] = useState('Watch Now');
  const [duration, setDuration] = useState<number>(1); 
  const [transactionId, setTransactionId] = useState('');

  const pricePerWeek = 500;
  const totalAmount = duration * pricePerWeek;

  const computedThumbnailUrl = useMemo(() => {
    const fallbackImage = 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=800&q=80';
    if (!destinationLink) return fallbackImage;

    const ytId = parseYouTubeId(destinationLink);
    if (ytId) {
      return getYouTubeThumbnailUrl(ytId, 'hqdefault');
    }
    return fallbackImage;
  }, [destinationLink]);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (
      !name.trim() || 
      !whatsapp.trim() || 
      !destinationLink.trim() || 
      !title.trim() || 
      !subtitle.trim()
    ) {
      setError("Please fill in all required fields marked with (*).");
      setLoading(false);
      return;
    }

    try {
      const requestId = `promo-${Date.now()}`;
      const normalizedLink = formatExternalUrl(destinationLink);
      
      const promotionData = {
        id: requestId,
        userId: userProfile.uid,
        userEmail: userProfile.email || 'N/A',
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        campaignType,
        destinationLink: normalizedLink,
        title: title.trim(),
        subtitle: subtitle.trim(), 
        imageUrl: computedThumbnailUrl, 
        actionText: actionText.trim() || 'Watch Now',
        actionLink: normalizedLink,
        durationWeeks: duration,
        amount: totalAmount,
        transactionId: transactionId.trim() || 'Not Provided (Pending Verification)',
        approved: false, 
        status: 'pending',
        clicks: 0, 
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'promotion_requests', requestId), promotionData);
      setSuccess(true);
    } catch (err) {
      console.error("Promo submit error:", err);
      setError("Failed to submit request. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto font-sans text-zinc-900 dark:text-zinc-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col p-5 sm:p-6 max-h-[92vh] overflow-y-auto my-auto animate-scale-up"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg transition cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 mb-4 select-none">
          <div className="w-10 h-10 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto text-lg shadow-inner">
            📢
          </div>
          <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
            Promote Your Ministry & Gospel Media
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Feature your sermons, music, or ministry events on our homepage banner.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-semibold rounded-xl shadow-xs animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-8 space-y-4 select-none animate-fade-in">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
              🕊️
            </div>
            <div className="space-y-2 leading-relaxed">
              <h4 className="text-base font-extrabold uppercase tracking-wider">
                Spotlight Request Registered!
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 px-4 max-w-md mx-auto font-medium">
                Thank you! Your promotional banner request has been submitted. Our team is verifying your payment details. Once confirmed, your campaign will go live on the homepage carousel.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-7 py-2.5 rounded-xl transition cursor-pointer active:scale-95 shadow-md shadow-rose-600/20"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex flex-col-reverse md:flex-row gap-6">
            
            {/* Form Column */}
            <form onSubmit={handleSubmit} className="flex-1 space-y-3 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div className="space-y-1">
                  <label htmlFor="promo-name" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="promo-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-zinc-900 dark:text-white"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1">
                  <label htmlFor="promo-whatsapp" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    id="promo-whatsapp"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Campaign */}
                <div className="space-y-1 select-none">
                  <label htmlFor="promo-type" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Campaign Type *
                  </label>
                  <select
                    id="promo-type"
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold cursor-pointer text-zinc-900 dark:text-white"
                  >
                    <option value="Gospel Video" className="dark:bg-zinc-900">Gospel Video Promotion</option>
                    <option value="Worship Praise" className="dark:bg-zinc-900">Worship & Praise Program</option>
                    <option value="Sermon Teaching" className="dark:bg-zinc-900">Sermon & Bible Teaching</option>
                    <option value="Community Meet" className="dark:bg-zinc-900">Community Fellowship Event</option>
                  </select>
                </div>

                {/* Destination */}
                <div className="space-y-1">
                  <label htmlFor="promo-link" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Video / YouTube Link *
                  </label>
                  <input
                    type="url"
                    id="promo-link"
                    required
                    value={destinationLink}
                    onChange={(e) => setDestinationLink(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="promo-title" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Banner Title *
                </label>
                <input
                  type="text"
                  id="promo-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Miracle Worship Night"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-zinc-900 dark:text-white"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1">
                <label htmlFor="promo-subtitle" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Subtitle / Description *
                </label>
                <textarea
                  id="promo-subtitle"
                  required
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Describe your event or sermon in a few sentences..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-normal resize-none leading-relaxed text-zinc-900 dark:text-white"
                />
              </div>

              {/* Action Text */}
              <div className="space-y-1">
                <label htmlFor="promo-action" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Button Action Label
                </label>
                <input
                  type="text"
                  id="promo-action"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder="e.g. Watch Now, Join Live, Learn More"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-zinc-900 dark:text-white"
                />
              </div>

              {/* Duration selector */}
              <div className="p-3 bg-rose-500/5 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <div>
                    <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Duration</span>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-zinc-900 dark:text-white"
                    >
                      <option value={1} className="dark:bg-zinc-900">1 Week (Rs. 500)</option>
                      <option value={2} className="dark:bg-zinc-900">2 Weeks (Rs. 1,000)</option>
                      <option value={3} className="dark:bg-zinc-900">3 Weeks (Rs. 1,500)</option>
                      <option value={4} className="dark:bg-zinc-900">4 Weeks (Rs. 2,000)</option>
                    </select>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Total</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">Rs. {totalAmount}</span>
                </div>
              </div>

              {/* Payment Account Details */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-1 shadow-xs select-none">
                <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-1 text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payment Account Details</span>
                </div>
                <div className="text-[10.5px] text-zinc-600 dark:text-zinc-300 font-medium space-y-0.5 leading-relaxed text-left">
                  <p>💸 <strong className="text-zinc-900 dark:text-white">EasyPaisa:</strong> +92 341 2541147</p>
                  <p>🏦 <strong className="text-zinc-900 dark:text-white">HBL Bank:</strong> 00277901297103</p>
                  <p>🌐 <strong className="text-zinc-900 dark:text-white">IBAN:</strong> PK51HABB0000277901297103</p>
                </div>
              </div>

              {/* Transaction ID */}
              <div className="space-y-1">
                <label htmlFor="promo-trx" className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Transaction / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  id="promo-trx"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 12541098412 or TRX-489201"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none font-mono text-zinc-900 dark:text-white placeholder-zinc-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 active:scale-95 select-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Spotlight Request 🕊️</span>
                  </>
                )}
              </button>
            </form>

            {/* Right Column: Live Mockup Preview */}
            <div className="w-full md:w-[320px] lg:w-[380px] flex flex-col justify-start space-y-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider select-none">
                <Eye className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Live Banner Preview</span>
              </div>
              
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col justify-end p-4">
                <img
                  src={computedThumbnailUrl}
                  alt="Spotlight Banner Preview"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                <div className="relative z-10 text-left space-y-1 pointer-events-none">
                  <span className="inline-block bg-rose-600 text-[8.5px] font-bold uppercase text-white px-2.5 py-0.5 rounded-full tracking-wider shadow-xs">
                    {campaignType}
                  </span>
                  <h4 className="font-black text-xs sm:text-sm text-white line-clamp-1 leading-snug">
                    {title || 'Your Promotion Title'}
                  </h4>
                  <p className="text-zinc-300 text-[10px] font-normal leading-relaxed line-clamp-2">
                    {subtitle || 'Your subtitle/description details will automatically render here in real-time as you type...'}
                  </p>
                  <div className="pt-1">
                    <span className="inline-block bg-white text-zinc-900 text-[9.5px] font-bold px-3 py-1 rounded-lg shadow-sm">
                      {actionText || 'Watch Now'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl items-center pointer-events-none select-none text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                  Campaign and billing requests are processed securely following strict community standards.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default PromoModal;