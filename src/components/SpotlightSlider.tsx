import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { SpotlightSlide } from '../types';
import { motion, AnimatePresence } from 'motion/react';

type BilingualSpotlightSlide = SpotlightSlide & {
  urduTitle?: string;
  urduSubtitle?: string;
  urduActionText?: string;
};

interface SpotlightSliderProps {
  slides: SpotlightSlide[];
  onPromoClick?: (slideId: string, actionLink: string) => void;
}

export default function SpotlightSlider({ slides, onPromoClick }: SpotlightSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFocusedOrHovered, setIsFocusedOrHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    }
  };

  useEffect(() => {
    if (!isFocusedOrHovered) {
      timerRef.current = setInterval(nextSlide, 5000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isFocusedOrHovered, slides.length]);

  if (slides.length === 0) return null;

  const currentSlide: BilingualSpotlightSlide = slides[currentIndex];
  const link = currentSlide.actionLink || '#';

  const handleButtonClick = () => {
    if (onPromoClick) {
      onPromoClick(currentSlide.id, link);
      return;
    }

    if (link.startsWith('#') || link.startsWith('.')) {
      try {
        const el = document.querySelector(link);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        console.warn("Invalid selector query:", err);
      }
    } else if (link && link !== '#') {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section 
      id="spotlight-section" 
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Spotlights"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm group focus:outline-none focus:ring-1 focus:ring-rose-500/50 font-sans text-left transition-colors duration-150 text-zinc-900 dark:text-zinc-50 select-none"
      onMouseEnter={() => setIsFocusedOrHovered(true)}
      onMouseLeave={() => setIsFocusedOrHovered(false)}
      onFocus={() => setIsFocusedOrHovered(true)}
      onBlur={() => setIsFocusedOrHovered(false)}
    >
      {/* Featured Spotlight Tag */}
      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/75 dark:bg-zinc-900/60 backdrop-blur-md text-white shadow-md border border-white/10 select-none">
        <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-wider">
          Featured Spotlight
        </span>
      </div>

      {/* Slide Content */}
      <div 
        className="relative h-[290px] xs:h-[260px] sm:h-[220px] w-full overflow-hidden"
        aria-live={isFocusedOrHovered ? "polite" : "off"}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            role="group"
            aria-roledescription="slide"
            aria-label={`${currentIndex + 1} of ${slides.length}`}
            
            // App Swipe Gestures configuration
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) {
                nextSlide();
              } else if (info.offset.x > 50) {
                prevSlide();
              }
            }}

            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-8 cursor-grab active:cursor-grabbing"
          >
            {/* Slide Image */}
            <div className="w-full sm:w-[280px] h-[110px] sm:h-full shrink-0 relative overflow-hidden rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 select-none bg-zinc-100 dark:bg-zinc-950">
              <img 
                src={currentSlide.imageUrl} 
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700 pointer-events-none" 
                alt={currentSlide.title} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>

            {/* Slide Information */}
            <div className="flex-1 flex flex-col justify-center space-y-2 text-center sm:text-left min-w-0">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-lg font-black text-zinc-900 dark:text-white leading-tight tracking-tight select-text truncate">
                  {currentSlide.title}
                </h3>
                {currentSlide.urduTitle && (
                  <h3 className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 leading-tight tracking-tight select-text text-right truncate" dir="rtl">
                    {currentSlide.urduTitle}
                  </h3>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] sm:text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed max-w-lg select-text line-clamp-2">
                  {currentSlide.subtitle}
                </p>
                {currentSlide.urduSubtitle && (
                  <p className="text-[10px] sm:text-xs text-zinc-550 dark:text-zinc-400 font-bold leading-relaxed max-w-lg select-text text-right line-clamp-2" dir="rtl">
                    {currentSlide.urduSubtitle}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="select-none pt-1">
                <button 
                  onClick={handleButtonClick}
                  id={`spot-btn-${currentSlide.id}`}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] sm:text-xs font-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 mx-auto sm:mx-0 active:scale-95 border border-rose-500/25"
                >
                  <span>{currentSlide.actionText}</span>
                  {currentSlide.urduActionText && (
                    <span className="text-[9px] sm:text-[10px] font-bold border-l border-white/20 pl-1.5 ml-1" dir="rtl">
                      {currentSlide.urduActionText}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Navigation Controls (Hidden on Mobile) */}
      <button 
        onClick={prevSlide}
        id="slider-prev-btn"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-white shadow-md items-center justify-center hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 cursor-pointer border border-white/10"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button 
        onClick={nextSlide}
        id="slider-next-btn"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-white shadow-md items-center justify-center hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 cursor-pointer border border-white/10"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Navigation Indicators */}
      <div id="slider-dots" className="flex items-center justify-center gap-1.5 pb-3 select-none">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all duration-300 rounded-full h-1 cursor-pointer ${
              index === currentIndex 
                ? 'bg-rose-600 w-4' 
                : 'bg-zinc-300 dark:bg-zinc-700 w-1 hover:bg-zinc-400 dark:hover:bg-zinc-650'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentIndex ? "true" : "false"}
          />
        ))}
      </div>
    </section>
  );
}