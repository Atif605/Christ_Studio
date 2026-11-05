import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Send, MessageSquare, ShieldCheck } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface FAQItem {
  q: string;
  a: string;
}

export default function HelpCenter() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [supportName, setSupportName] = useState(auth.currentUser?.displayName || '');
  const [supportEmail, setSupportEmail] = useState(auth.currentUser?.email || '');
  const [supportType, setSupportMessageType] = useState('counseling');
  const [supportMessage, setSupportMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      q: "What is Christ Studio Social Workspace?",
      a: "Christ Studio is an interactive social workspace and spiritual media directory designed to connect believers worldwide. You can browse sermons, worship music, testimonials, vertical Shorts, and lift others up in prayer on our community Prayer Wall."
    },
    {
      q: "How do I upload sermons or praise videos?",
      a: "To publish media, sign in, open the Creator Studio tab, and select 'Upload New Media'. You can paste a YouTube embed link, specify titles, descriptions, format as vertical Shorts if you like, and hit publish."
    },
    {
      q: "Is my Quiet Time Diary shared publicly?",
      a: "No. For guest users, Quiet Time Diary entries and reflection notes are stored strictly inside local browser storage (localStorage). When you sign in to your authenticated account, they are safely backed up to your personal, highly secure, and private Cloud Firestore space where nobody else can access them."
    },
    {
      q: "How does the Prayer Wall 'Pray for this' button work?",
      a: "When you select 'Pray for this', you stand in faith with the person who posted. The lifting count increments immediately, and they are notified that a fellow believer has agreed with them in prayer."
    }
  ];

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName.trim() || !supportMessage.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setReplyMessage(null);

    let targetTeam = "Pastoral Counsel Team";
    if (supportType === 'technical') targetTeam = "Technical Support Team";
    if (supportType === 'prayer') targetTeam = "Intercessory Prayer Ministry";

    try {
      await addDoc(collection(db, "support_inquiries"), {
        name: supportName.trim(),
        email: supportEmail.trim() || auth.currentUser?.email || 'guest@christstudio.com',
        type: supportType,
        message: supportMessage.trim(),
        team: targetTeam,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: auth.currentUser?.uid || 'guest'
      });

      setReplyMessage(
        `Thank you, ${supportName.trim()}! Your request has been securely routed to our ${targetTeam}. Our team will review your message and reach out to you shortly.`
      );
      setSupportName('');
      setSupportEmail('');
      setSupportMessage('');
    } catch (err) {
      console.error("Error saving support inquiry:", err);
      setErrorMsg("Failed to send request. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans text-zinc-900 dark:text-zinc-50">
      
      {/* Scriptural Banner */}
      <div className="bg-amber-500/[0.04] dark:bg-amber-500/[0.08] border border-amber-500/20 rounded-2xl p-4 sm:p-5 text-center select-none shadow-inner space-y-1">
        <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 tracking-widest">
          † Spiritual Support & Pastoral Counsel
        </p>
        <p className="text-xs sm:text-sm font-serif italic text-zinc-700 dark:text-zinc-300">
          "Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you." — Matthew 7:7
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Knowledge Base FAQs */}
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 transition-colors duration-150">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5 select-none">
              <HelpCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Knowledge Base & FAQs
              </h3>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div 
                    key={idx}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      id={`faq-btn-${idx}`}
                      className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 text-left text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition cursor-pointer active:scale-[0.99]"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white dark:bg-zinc-900 text-xs font-normal text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-zinc-200 dark:border-zinc-800 select-text animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Support Desk Form */}
        <div className="space-y-4 lg:col-span-1">
          <form 
            onSubmit={handleSupportSubmit}
            className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 transition-colors duration-150"
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5 select-none">
              <MessageSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Support Desk
              </h3>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed select-none">
              Reach out to our intercessory team, counseling pastors, or administrators securely.
            </p>

            {/* Name Input */}
            <div className="space-y-1">
              <label htmlFor="support-name" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Your Name
              </label>
              <input
                type="text"
                id="support-name"
                required
                value={supportName}
                onChange={(e) => setSupportName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium shadow-inner"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <label htmlFor="support-email" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Your Email
              </label>
              <input
                type="email"
                id="support-email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium shadow-inner"
              />
            </div>

            {/* Reason for Contact */}
            <div className="space-y-1">
              <label htmlFor="support-type" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Reason for Contact
              </label>
              <select
                id="support-type"
                value={supportType}
                onChange={(e) => setSupportMessageType(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium shadow-inner cursor-pointer"
              >
                <option value="counseling" className="dark:bg-zinc-900">Pastoral Guidance & Counseling</option>
                <option value="prayer" className="dark:bg-zinc-900">Specific Prayer Request</option>
                <option value="technical" className="dark:bg-zinc-900">Technical Platform Support</option>
                <option value="general" className="dark:bg-zinc-900">General Information Inquiry</option>
              </select>
            </div>

            {/* Message Area */}
            <div className="space-y-1">
              <label htmlFor="support-message" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Detailed Message
              </label>
              <textarea
                id="support-message"
                required
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="How can we assist you spiritually or technically?"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-rose-500 h-24 resize-none font-medium leading-relaxed shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              id="submit-support-btn"
              className="w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Sending Inquiry..." : "Send Support Request"}</span>
            </button>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs font-medium text-red-600 dark:text-red-400 rounded-xl leading-relaxed animate-fade-in shadow-inner">
                ⚠️ {errorMsg}
              </div>
            )}

            {replyMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs font-medium text-emerald-800 dark:text-emerald-400 rounded-xl leading-relaxed animate-fade-in shadow-inner">
                ✓ {replyMessage}
              </div>
            )}
          </form>

          {/* Privacy Guarantee Block */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-2 select-none transition-colors duration-150">
            <ShieldCheck className="w-6 h-6 text-rose-600 dark:text-rose-400 mx-auto" />
            <h4 className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
              Privacy Guarantee
            </h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              All details, prayer messages, and counseling letters are treated with the highest degree of confidentiality and spiritual safety.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}