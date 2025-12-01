/**
 * USPSection - Unique Selling Points section
 *
 * Features:
 * - Desktop (≥768px): 5-column grid showing all USPs
 * - Mobile (<768px): Carousel with auto-rotate (4s interval)
 * - Dot navigation for carousel
 * - Responsive breakpoints
 */

import { useState, useEffect } from 'react';
import { USPCard } from './USPCard';

const usps = [
  {
    logoSrc: '/assets/images/calpe-turismo-logo.png',
    title: 'Official Partner',
    description: 'Official Partner Calpe Turismo',
  },
  {
    icon: '🤖',
    title: 'Calpe AI-Assistant',
    description: 'HolidAIButler: Your (hyper) personal Butler',
  },
  {
    icon: '🏘️',
    title: '100% Local',
    description: 'Support Calpe economy & identity',
  },
  {
    icon: '⚡',
    title: 'Realtime, accurate info',
    description: 'About locations, events, activities and weather',
  },
  {
    icon: '🔒',
    title: 'Trusted & Safe',
    description: 'Data till payment: we care about your Privacy',
  },
];

export function USPSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const totalSlides = usps.length;

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-rotate carousel ONLY on mobile
  useEffect(() => {
    if (!isMobile) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4000);

    return () => clearInterval(interval);
  }, [isMobile, totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section className="bg-white py-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-5">
        {/* Desktop: Grid - all 5 visible (≥768px) */}
        {!isMobile && (
          <div className="grid grid-cols-5 gap-5">
            {usps.map((usp, index) => (
              <USPCard key={index} {...usp} />
            ))}
          </div>
        )}

        {/* Mobile: Carousel (<768px) */}
        {isMobile && (
          <div>
            <div className="relative overflow-hidden">
              {/* Carousel Track */}
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {usps.map((usp, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-2">
                    <USPCard {...usp} />
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {usps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    currentSlide === index
                      ? 'w-6 h-2 bg-holibot-primary'
                      : 'w-2 h-2 bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
