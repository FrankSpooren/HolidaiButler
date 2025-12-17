/**
 * DeleteDataModal - Delete Personal Data modal (Orange warning)
 *
 * Features:
 * - Explains what data will be deleted
 * - Account remains active
 * - Confirmation by typing "DELETE DATA"
 * - GDPR compliant
 */

import { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import './AccountModals.css';

interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteDataModal({ isOpen, onClose, onConfirm }: DeleteDataModalProps) {
  const { t } = useLanguage();
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'confirm'>('info');

  const CONFIRM_PHRASE = 'DELETE DATA';
  const canConfirm = confirmText.toUpperCase() === CONFIRM_PHRASE && !isLoading;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setIsLoading(true);
    setError(null);

    try {
      await onConfirm();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.modals.deleteDataError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError(null);
    setStep('info');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="account-modal-overlay" onClick={handleClose}>
      <div className="account-modal account-modal-warning" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header warning-header">
          <div className="modal-header-icon">🗑️</div>
          <h2 className="account-modal-title">{t.account.modals.deleteDataTitle}</h2>
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

          {step === 'info' && (
            <>
              <div className="warning-box orange">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <strong>{t.account.modals.deleteDataWarningTitle}</strong>
                  <p>{t.account.modals.deleteDataWarningText}</p>
                </div>
              </div>

              <div className="data-list-section">
                <h4>{t.account.modals.dataToBeDeleted}</h4>
                <ul className="data-delete-list">
                  <li>
                    <span className="delete-icon">❌</span>
                    {t.account.modals.deleteDataItem1}
                  </li>
                  <li>
                    <span className="delete-icon">❌</span>
                    {t.account.modals.deleteDataItem2}
                  </li>
                  <li>
                    <span className="delete-icon">❌</span>
                    {t.account.modals.deleteDataItem3}
                  </li>
                  <li>
                    <span className="delete-icon">❌</span>
                    {t.account.modals.deleteDataItem4}
                  </li>
                  <li>
                    <span className="delete-icon">❌</span>
                    {t.account.modals.deleteDataItem5}
                  </li>
                </ul>
              </div>

              <div className="keep-section">
                <h4>{t.account.modals.dataKept}</h4>
                <ul className="data-keep-list">
                  <li>
                    <span className="keep-icon">✓</span>
                    {t.account.modals.keepDataItem1}
                  </li>
                  <li>
                    <span className="keep-icon">✓</span>
                    {t.account.modals.keepDataItem2}
                  </li>
                </ul>
              </div>

              <div className="info-box orange-info">
                <span>ℹ️</span>
                <span>{t.account.modals.deleteDataInfo}</span>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="confirm-section">
                <div className="confirm-icon-large">🗑️</div>
                <h3>{t.account.modals.confirmDeleteData}</h3>
                <p>{t.account.modals.typeToConfirm}</p>

                <div className="confirm-phrase">
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
              </div>
            </>
          )}
        </div>

        <div className="account-modal-footer">
          {step === 'info' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={handleClose}>
                {t.account.modals.cancel}
              </button>
              <button
                type="button"
                className="modal-btn-warning"
                onClick={() => setStep('confirm')}
              >
                {t.account.modals.continue}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={() => setStep('info')}>
                {t.account.modals.back}
              </button>
              <button
                type="button"
                className="modal-btn-warning"
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                {isLoading ? t.account.modals.deleting : t.account.modals.deleteData}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
