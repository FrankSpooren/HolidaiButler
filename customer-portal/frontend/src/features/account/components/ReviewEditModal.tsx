/**
 * ReviewEditModal - Edit user review modal
 *
 * Features:
 * - Edit rating (1-5 stars)
 * - Edit review text
 * - Shows target POI/Event info
 * - Save/Cancel actions
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { UserReview } from '../../../shared/contexts/UserReviewsContext';
import './AccountModals.css';

interface ReviewEditModalProps {
  isOpen: boolean;
  review: UserReview | null;
  onClose: () => void;
  onSave: (id: string, updates: { rating?: number; reviewText?: string }) => void;
}

export function ReviewEditModal({ isOpen, review, onClose, onSave }: ReviewEditModalProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when review changes
  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setReviewText(review.reviewText);
    }
  }, [review]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;

    setIsSaving(true);
    try {
      onSave(review.id, { rating, reviewText });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setHoveredStar(null);
    onClose();
  };

  if (!isOpen || !review) return null;

  const displayRating = hoveredStar !== null ? hoveredStar : rating;

  return (
    <div className="account-modal-overlay" onClick={handleClose}>
      <div className="account-modal review-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <div className="modal-header-icon">✏️</div>
          <h2 className="account-modal-title">Review bewerken</h2>
          <button className="account-close-btn" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="account-modal-body">
            {/* Target Info */}
            <div className="review-edit-target">
              {review.targetImage ? (
                <img src={review.targetImage} alt={review.targetName} className="review-edit-image" />
              ) : (
                <div className="review-edit-placeholder">
                  {review.type === 'poi' ? '📍' : '🎉'}
                </div>
              )}
              <div className="review-edit-info">
                <div className="review-edit-name">{review.targetName}</div>
                <div className="review-edit-category">{review.targetCategory}</div>
              </div>
            </div>

            {/* Rating */}
            <div className="modal-field">
              <label>Beoordeling</label>
              <div className="star-rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${star <= displayRating ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                  >
                    ★
                  </button>
                ))}
                <span className="rating-label">
                  {displayRating === 1 && 'Slecht'}
                  {displayRating === 2 && 'Matig'}
                  {displayRating === 3 && 'Gemiddeld'}
                  {displayRating === 4 && 'Goed'}
                  {displayRating === 5 && 'Uitstekend'}
                </span>
              </div>
            </div>

            {/* Review Text */}
            <div className="modal-field">
              <label htmlFor="review-text">Jouw review</label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Deel je ervaring..."
                rows={5}
                maxLength={1000}
              />
              <div className="field-hint">
                {reviewText.length}/1000 karakters
              </div>
            </div>
          </div>

          <div className="account-modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={handleClose}>
              Annuleren
            </button>
            <button
              type="submit"
              className="modal-btn-primary"
              disabled={isSaving || !reviewText.trim()}
            >
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
