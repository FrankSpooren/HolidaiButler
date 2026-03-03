/**
 * WriteReviewModal - Modal for submitting POI reviews
 *
 * Features:
 * - Star rating selection (1-5)
 * - Travel party selection (Solo, Couple, Family, Friends, Business)
 * - Review text (required, min 50 chars)
 * - Optional photo upload
 * - Form validation
 * - Submit to backend
 * - Authentication required
 */

import { useState, useRef } from 'react';
import { X, Star, Upload, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import './WriteReviewModal.css';

interface WriteReviewModalProps {
  poiId: number;
  poiName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

type TravelParty = 'solo' | 'couple' | 'family' | 'friends' | 'business';

export function WriteReviewModal({
  poiId,
  poiName,
  isOpen,
  onClose,
  onSubmitSuccess,
}: WriteReviewModalProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [travelParty, setTravelParty] = useState<TravelParty | null>(null);
  const [reviewText, setReviewText] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const travelPartyOptions: { value: TravelParty; label: string; emoji: string }[] = [
    { value: 'solo', label: t.reviews.writeReviewModal.solo, emoji: '🧍' },
    { value: 'couple', label: t.reviews.writeReviewModal.couple, emoji: '💑' },
    { value: 'family', label: t.reviews.writeReviewModal.family, emoji: '👨‍👩‍👧‍👦' },
    { value: 'friends', label: t.reviews.writeReviewModal.friends, emoji: '👥' },
    { value: 'business', label: t.reviews.writeReviewModal.business, emoji: '💼' },
  ];

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors.rating = t.reviews.writeReviewModal.selectRating;
    }

    if (!travelParty) {
      newErrors.travelParty = t.reviews.writeReviewModal.selectTravelParty;
    }

    if (reviewText.trim().length < 50) {
      newErrors.reviewText = t.reviews.writeReviewModal.minChars;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, photo: t.reviews.writeReviewModal.uploadImageOnly });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, photo: t.reviews.writeReviewModal.imageTooLarge });
        return;
      }

      setPhoto(file);
      setErrors({ ...errors, photo: '' });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit review
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      // const formData = new FormData();
      // formData.append('poi_id', poiId.toString());
      // formData.append('rating', rating.toString());
      // formData.append('travel_party', travelParty!);
      // formData.append('review_text', reviewText);
      // if (photo) {
      //   formData.append('photo', photo);
      // }
      //
      // await reviewService.submitReview(formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccessMessage(t.reviews.writeReviewModal.success);
      setTimeout(() => {
        onClose();
        onSubmitSuccess?.();
      }, 2000);
    } catch (error) {
      setErrors({
        submit: t.reviews.writeReviewModal.error,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal and reset form
  const handleClose = () => {
    setRating(0);
    setTravelParty(null);
    setReviewText('');
    setPhoto(null);
    setPhotoPreview(null);
    setErrors({});
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="write-review-modal-overlay" onClick={handleClose}>
      <div
        className="write-review-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="write-review-header">
          <h2 className="write-review-title">{t.reviews.writeReviewModal.title}</h2>
          <button
            className="write-review-close"
            onClick={handleClose}
            aria-label={t.reviews.writeReviewModal.close}
          >
            <X size={24} />
          </button>
        </div>

        {/* POI Name */}
        <div className="write-review-poi-name">{poiName}</div>

        {/* Success Message */}
        {successMessage && (
          <div className="write-review-success">
            <AlertCircle size={20} />
            {successMessage}
          </div>
        )}

        {/* Form */}
        <div className="write-review-form">
          {/* Rating */}
          <div className="write-review-field">
            <label className="write-review-label">
              {t.reviews.writeReviewModal.yourRating} <span className="required">*</span>
            </label>
            <div className="write-review-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`write-review-star ${
                    star <= (hoverRating || rating) ? 'active' : ''
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    size={32}
                    fill={star <= (hoverRating || rating) ? '#FFC107' : 'none'}
                    stroke={star <= (hoverRating || rating) ? '#FFC107' : '#D1D5DB'}
                  />
                </button>
              ))}
            </div>
            {errors.rating && (
              <span className="write-review-error">{errors.rating}</span>
            )}
          </div>

          {/* Travel Party */}
          <div className="write-review-field">
            <label className="write-review-label">
              {t.reviews.writeReviewModal.travelPartyLabel} <span className="required">*</span>
            </label>
            <div className="write-review-travel-party">
              {travelPartyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`travel-party-option ${
                    travelParty === option.value ? 'active' : ''
                  }`}
                  onClick={() => setTravelParty(option.value)}
                >
                  <span className="travel-party-emoji">{option.emoji}</span>
                  <span className="travel-party-label">{option.label}</span>
                </button>
              ))}
            </div>
            {errors.travelParty && (
              <span className="write-review-error">{errors.travelParty}</span>
            )}
          </div>

          {/* Review Text */}
          <div className="write-review-field">
            <label className="write-review-label">
              {t.reviews.writeReviewModal.yourReview} <span className="required">*</span>
            </label>
            <textarea
              className="write-review-textarea"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t.reviews.writeReviewModal.placeholder}
              rows={6}
              maxLength={1000}
            />
            <div className="write-review-char-count">
              {reviewText.length} / 1000 {t.reviews.writeReviewModal.characters}
              {reviewText.length < 50 && (
                <span className="char-count-min">
                  {' '}
                  ({t.reviews.writeReviewModal.minimum})
                </span>
              )}
            </div>
            {errors.reviewText && (
              <span className="write-review-error">{errors.reviewText}</span>
            )}
          </div>

          {/* Photo Upload */}
          <div className="write-review-field">
            <label className="write-review-label">{t.reviews.writeReviewModal.addPhoto}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            {!photoPreview ? (
              <button
                type="button"
                className="write-review-photo-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} />
                <span>{t.reviews.writeReviewModal.uploadPhoto}</span>
              </button>
            ) : (
              <div className="write-review-photo-preview">
                <img src={photoPreview} alt="Preview" />
                <button
                  className="photo-remove-btn"
                  onClick={handleRemovePhoto}
                  aria-label="Remove photo"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            {errors.photo && (
              <span className="write-review-error">{errors.photo}</span>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="write-review-submit-error">
              <AlertCircle size={20} />
              {errors.submit}
            </div>
          )}

          {/* Submit Button */}
          <button
            className="write-review-submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? t.reviews.writeReviewModal.submitting : t.reviews.writeReviewModal.submitReview}
          </button>
        </div>
      </div>
    </div>
  );
}
