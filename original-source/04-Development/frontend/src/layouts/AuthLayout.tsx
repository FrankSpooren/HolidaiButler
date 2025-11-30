import { Outlet } from 'react-router';

/**
 * AuthLayout - Minimal layout for authentication pages
 *
 * Structure:
 * - No header/footer
 * - No extra wrapper (LoginPage/SignupPage handle their own styling)
 * - Just renders <Outlet /> for auth form content
 *
 * Used by: Login, Signup, Forgot Password, Reset Password, Verify Email
 */
export function AuthLayout() {
  return <Outlet />;
}
