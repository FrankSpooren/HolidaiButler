/**
 * DeleteAccountModal - Delete Account modal (Red warning)
 *
 * Features:
 * - 30-day grace period explanation
 * - Optional reason survey
 * - Confirmation by typing "DELETE"
 * - Clear warning about permanent deletion
 * - GDPR compliant
 */

import { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import './AccountModals.css';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  userEmail: string;
}

type Step = 'warning' | 'reason' | 'confirm' | 'scheduled';

const DELETION_REASONS = [
  'not_useful',
  'privacy_concerns',
  'too_many_emails',
  'found_alternative',
  'temporary_account',
  'other',
];

export function DeleteAccountModal({ isOpen, onClose, onConfirm, userEmail }: DeleteAccountModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('warning');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_PHRASE = 'DELETE';
  const canConfirm = confirmText.toUpperCase() === CONFIRM_PHRASE && !isLoading;

  // Calculate deletion date (30 days from now)
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);
  const formattedDeletionDate = deletionDate.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setIsLoading(true);
    setError(null);

    try {
      const reason = selectedReason === 'other' ? otherReason : selectedReason;
      await onConfirm(reason || undefined);
      setStep('scheduled');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.modals.deleteAccountError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('warning');
    setSelectedReason('');
    setOtherReason('');
    setConfirmText('');
    setError(null);
    onClose();
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      not_useful: t.account.modals.reasonNotUseful,
      privacy_concerns: t.account.modals.reasonPrivacy,
      too_many_emails: t.account.modals.reasonEmails,
      found_alternative: t.account.modals.reasonAlternative,
      temporary_account: t.account.modals.reasonTemporary,
      other: t.account.modals.reasonOther,
    };
    return labels[reason] || reason;
  };

  if (!isOpen) return null;

  return (
    <div className="account-modal-overlay" onClick={handleClose}>
      <div className="account-modal account-modal-danger" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header danger-header">
          <div className="modal-header-icon">⚠️</div>
          <h2 className="account-modal-title">{t.account.modals.deleteAccountTitle}</h2>
          <button className="account-close-btn" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="account-modal-body">
          {error && (
            <div className="modal-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Warning */}
          {step === 'warning' && (
            <>
              <div className="warning-box red">
                <div className="warning-icon">🚨</div>
                <div className="warning-content">
                  <strong>{t.account.modals.deleteAccountWarningTitle}</strong>
                  <p>{t.account.modals.deleteAccountWarningText}</p>
                </div>
              </div>

              <div className="grace-period-box">
                <div className="grace-icon">📅</div>
                <div className="grace-content">
                  <strong>{t.account.modals.gracePeriodTitle}</strong>
                  <p>{t.account.modals.gracePeriodText}</p>
                  <div className="grace-date">
                    {t.account.modals.scheduledDeletion}: <strong>{formattedDeletionDate}</strong>
                  </div>
                </div>
              </div>

              <div className="data-list-section">
                <h4>{t.account.modals.permanentlyDeleted}</h4>
                <ul className="data-delete-list danger">
                  <li>
                    <span className="delete-icon">💔</span>
                    {t.account.modals.deleteAccountItem1}
                  </li>
                  <li>
                    <span className="delete-icon">💔</span>
                    {t.account.modals.deleteAccountItem2}
                  </li>
                  <li>
                    <span className="delete-icon">💔</span>
                    {t.account.modals.deleteAccountItem3}
                  </li>
                  <li>
                    <span className="delete-icon">💔</span>
                    {t.account.modals.deleteAccountItem4}
                  </li>
                  <li>
                    <span className="delete-icon">💔</span>
                    {t.account.modals.deleteAccountItem5}
                  </li>
                </ul>
              </div>

              <div className="info-box red-info">
                <span>ℹ️</span>
                <span>{t.account.modals.canCancelDeletion}</span>
              </div>
            </>
          )}

          {/* Step 2: Reason (optional) */}
          {step === 'reason' && (
            <div className="reason-section">
              <h3>{t.account.modals.whyLeaving}</h3>
              <p className="reason-subtitle">{t.account.modals.helpUsImprove}</p>

              <div className="reason-options">
                {DELETION_REASONS.map((reason) => (
                  <label key={reason} className="reason-option">
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                    />
                    <span className="reason-label">{getReasonLabel(reason)}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'other' && (
                <div className="modal-field">
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder={t.account.modals.tellUsMore}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="confirm-section danger">
              <div className="confirm-icon-large">💔</div>
              <h3>{t.account.modals.confirmDeleteAccount}</h3>
              <p>{t.account.modals.typeDeleteToConfirm}</p>

              <div className="confirm-phrase danger">
                <code>{CONFIRM_PHRASE}</code>
              </div>

              <div className="modal-field">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  autoFocus
                  className={confirmText && !canConfirm ? 'invalid' : ''}
                />
              </div>

              <div className="email-reminder">
                {t.account.modals.accountToDelete}: <strong>{userEmail}</strong>
              </div>
            </div>
          )}

          {/* Step 4: Scheduled */}
          {step === 'scheduled' && (
            <div className="scheduled-section">
              <div className="scheduled-icon">📬</div>
              <h3>{t.account.modals.deletionScheduled}</h3>
              <p>{t.account.modals.deletionScheduledText}</p>

              <div className="scheduled-date-box">
                <div className="scheduled-date">{formattedDeletionDate}</div>
                <p className="scheduled-note">{t.account.modals.cancelBeforeDate}</p>
              </div>

              <div className="email-confirmation">
                <span>📧</span>
                <span>{t.account.modals.confirmationEmailSent} <strong>{userEmail}</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="account-modal-footer">
          {step === 'warning' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={handleClose}>
                {t.account.modals.keepAccount}
              </button>
              <button
                type="button"
                className="modal-btn-danger"
                onClick={() => setStep('reason')}
              >
                {t.account.modals.continue}
              </button>
            </>
          )}

          {step === 'reason' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={() => setStep('warning')}>
                {t.account.modals.back}
              </button>
              <button
                type="button"
                className="modal-btn-danger"
                onClick={() => setStep('confirm')}
              >
                {t.account.modals.continue}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={() => setStep('reason')}>
                {t.account.modals.back}
              </button>
              <button
                type="button"
                className="modal-btn-danger"
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                {isLoading ? t.account.modals.processing : t.account.modals.deleteMyAccount}
              </button>
            </>
          )}

          {step === 'scheduled' && (
            <button
              type="button"
              className="modal-btn-primary modal-btn-full"
              onClick={handleClose}
            >
              {t.account.modals.understood}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
