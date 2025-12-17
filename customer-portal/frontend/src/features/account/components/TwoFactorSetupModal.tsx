/**
 * TwoFactorSetupModal - 2FA Setup wizard
 *
 * Features:
 * - QR code display for authenticator apps
 * - Manual secret key entry option
 * - 6-digit verification code input
 * - Backup codes display
 */

import { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import './AccountModals.css';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable: (verificationCode: string) => Promise<{ backupCodes: string[] }>;
  onDisable: () => Promise<void>;
  isEnabled: boolean;
  qrCodeUrl?: string;
  secretKey?: string;
}

type Step = 'intro' | 'scan' | 'verify' | 'backup' | 'disable';

export function TwoFactorSetupModal({
  isOpen,
  onClose,
  onEnable,
  onDisable,
  isEnabled,
  qrCodeUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  secretKey = 'JBSWY3DPEHPK3PXP',
}: TwoFactorSetupModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(isEnabled ? 'disable' : 'intro');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onEnable(verificationCode);
      setBackupCodes(result.backupCodes);
      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.modals.twoFactorError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onDisable();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.modals.twoFactorDisableError);
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleClose = () => {
    setStep(isEnabled ? 'disable' : 'intro');
    setVerificationCode('');
    setError(null);
    setBackupCodes([]);
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  if (!isOpen) return null;

  return (
    <div className="account-modal-overlay" onClick={handleClose}>
      <div className="account-modal account-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <div className="modal-header-icon">🔐</div>
          <h2 className="account-modal-title">{t.account.modals.twoFactorTitle}</h2>
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

          {/* Step 1: Introduction */}
          {step === 'intro' && (
            <div className="twofa-step">
              <div className="twofa-intro">
                <div className="twofa-icon">🛡️</div>
                <h3>{t.account.modals.twoFactorIntroTitle}</h3>
                <p>{t.account.modals.twoFactorIntroText}</p>

                <div className="twofa-benefits">
                  <div className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <span>{t.account.modals.twoFactorBenefit1}</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <span>{t.account.modals.twoFactorBenefit2}</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <span>{t.account.modals.twoFactorBenefit3}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Scan QR Code */}
          {step === 'scan' && (
            <div className="twofa-step">
              <div className="twofa-instructions">
                <p>{t.account.modals.twoFactorScanInstructions}</p>
              </div>

              <div className="qr-code-container">
                <img src={qrCodeUrl} alt="QR Code" className="qr-code" />
              </div>

              <div className="secret-key-section">
                <button
                  type="button"
                  className="show-secret-btn"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? '🙈 ' : '🔑 '}
                  {showSecret ? t.account.modals.hideSecret : t.account.modals.showSecret}
                </button>

                {showSecret && (
                  <div className="secret-key">
                    <code>{secretKey}</code>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => navigator.clipboard.writeText(secretKey)}
                    >
                      📋
                    </button>
                  </div>
                )}
              </div>

              <div className="app-suggestions">
                <span>{t.account.modals.recommendedApps}:</span>
                <span className="app-name">Google Authenticator</span>
                <span className="app-name">Authy</span>
                <span className="app-name">Microsoft Authenticator</span>
              </div>
            </div>
          )}

          {/* Step 3: Verify Code */}
          {step === 'verify' && (
            <div className="twofa-step">
              <div className="twofa-instructions">
                <p>{t.account.modals.twoFactorVerifyInstructions}</p>
              </div>

              <div className="verification-code-input">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  autoFocus
                  className="code-input"
                />
              </div>

              <div className="code-hint">
                {t.account.modals.enterCodeFromApp}
              </div>
            </div>
          )}

          {/* Step 4: Backup Codes */}
          {step === 'backup' && (
            <div className="twofa-step">
              <div className="success-message">
                <span className="success-icon">✅</span>
                <span>{t.account.modals.twoFactorEnabled}</span>
              </div>

              <div className="backup-codes-section">
                <h4>{t.account.modals.backupCodesTitle}</h4>
                <p className="backup-warning">
                  ⚠️ {t.account.modals.backupCodesWarning}
                </p>

                <div className="backup-codes-grid">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="backup-code">
                      {code}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="copy-backup-btn"
                  onClick={copyBackupCodes}
                >
                  {copiedBackup ? '✓ ' + t.account.modals.copied : '📋 ' + t.account.modals.copyAll}
                </button>
              </div>
            </div>
          )}

          {/* Disable 2FA */}
          {step === 'disable' && (
            <div className="twofa-step">
              <div className="twofa-status enabled">
                <span className="status-icon">🛡️</span>
                <div>
                  <strong>{t.account.modals.twoFactorActive}</strong>
                  <p>{t.account.modals.twoFactorActiveDesc}</p>
                </div>
              </div>

              <div className="disable-warning">
                <p>⚠️ {t.account.modals.disableWarning}</p>
              </div>
            </div>
          )}
        </div>

        <div className="account-modal-footer">
          {step === 'intro' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={handleClose}>
                {t.account.modals.cancel}
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={() => setStep('scan')}
              >
                {t.account.modals.startSetup}
              </button>
            </>
          )}

          {step === 'scan' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={() => setStep('intro')}>
                {t.account.modals.back}
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={() => setStep('verify')}
              >
                {t.account.modals.next}
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={() => setStep('scan')}>
                {t.account.modals.back}
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? t.account.modals.verifying : t.account.modals.verify}
              </button>
            </>
          )}

          {step === 'backup' && (
            <button
              type="button"
              className="modal-btn-primary modal-btn-full"
              onClick={handleClose}
            >
              {t.account.modals.done}
            </button>
          )}

          {step === 'disable' && (
            <>
              <button type="button" className="modal-btn-cancel" onClick={handleClose}>
                {t.account.modals.keepEnabled}
              </button>
              <button
                type="button"
                className="modal-btn-danger"
                onClick={handleDisable}
                disabled={isLoading}
              >
                {isLoading ? t.account.modals.disabling : t.account.modals.disable2FA}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
