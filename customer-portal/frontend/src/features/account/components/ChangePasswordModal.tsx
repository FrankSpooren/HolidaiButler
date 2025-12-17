/**
 * ChangePasswordModal - Password change modal
 *
 * Features:
 * - Current password verification
 * - New password with strength indicator
 * - Confirm password validation
 * - Error handling
 */

import { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import './AccountModals.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
}

export function ChangePasswordModal({ isOpen, onClose, onSubmit }: ChangePasswordModalProps) {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 1, label: t.account.modals.passwordWeak, color: '#DC2626' };
    if (strength <= 4) return { level: 2, label: t.account.modals.passwordMedium, color: '#F97316' };
    return { level: 3, label: t.account.modals.passwordStrong, color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = currentPassword && newPassword.length >= 8 && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(currentPassword, newPassword);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.modals.passwordError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="account-modal-overlay" onClick={handleClose}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <div className="modal-header-icon">🔑</div>
          <h2 className="account-modal-title">{t.account.modals.changePasswordTitle}</h2>
          <button className="account-close-btn" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="account-modal-body">
            {error && (
              <div className="modal-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Current Password */}
            <div className="modal-field">
              <label htmlFor="current-password">{t.account.modals.currentPassword}</label>
              <div className="password-input-wrapper">
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="modal-field">
              <label htmlFor="new-password">{t.account.modals.newPassword}</label>
              <div className="password-input-wrapper">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="password-strength">
                  <div className="strength-bars">
                    <div className={`strength-bar ${passwordStrength.level >= 1 ? 'active' : ''}`} style={{ backgroundColor: passwordStrength.level >= 1 ? passwordStrength.color : undefined }} />
                    <div className={`strength-bar ${passwordStrength.level >= 2 ? 'active' : ''}`} style={{ backgroundColor: passwordStrength.level >= 2 ? passwordStrength.color : undefined }} />
                    <div className={`strength-bar ${passwordStrength.level >= 3 ? 'active' : ''}`} style={{ backgroundColor: passwordStrength.level >= 3 ? passwordStrength.color : undefined }} />
                  </div>
                  <span className="strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              <div className="field-hint">
                {t.account.modals.passwordRequirements}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="modal-field">
              <label htmlFor="confirm-password">{t.account.modals.confirmPassword}</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {confirmPassword && !passwordsMatch && (
                <div className="field-error">{t.account.modals.passwordMismatch}</div>
              )}
              {confirmPassword && passwordsMatch && (
                <div className="field-success">✓ {t.account.modals.passwordMatch}</div>
              )}
            </div>
          </div>

          <div className="account-modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={handleClose}>
              {t.account.modals.cancel}
            </button>
            <button
              type="submit"
              className="modal-btn-primary"
              disabled={!canSubmit}
            >
              {isLoading ? t.account.modals.saving : t.account.modals.changePassword}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
