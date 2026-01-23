import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { NavigationProvider } from './features/auth/contexts/SignupContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './components/desktop/LandingPage';
import { SignupPage } from './features/auth/pages/SignupPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { BirthdayPage } from './features/auth/pages/BirthdayPage';
import { ConfirmPage } from './features/auth/pages/ConfirmPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetVerifyPage } from './features/auth/pages/ResetVerifyPage';
import { NewPasswordPage } from './features/auth/pages/NewPasswordPage';
import { ResetProvider } from './features/auth/contexts/ResetContext';

// New Layout and Pages
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { EditProfilePage } from './features/profile/pages/EditProfilePage';
import { SearchPage } from './pages/SearchPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CreatePage } from './pages/CreatePage';
import { MorePage } from './pages/MorePage';

// Layout wrapper to ensure ResetContext is destroyed when leaving the flow
const ResetLayout = () => (
  <ResetProvider>
    <Outlet />
  </ResetProvider>
);

function App() {
  return (
    <NavigationProvider>
      <Router basename="/Allify">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/signup" element={<ProtectedRoute><SignupPage /></ProtectedRoute>} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup/birthday" element={<ProtectedRoute><BirthdayPage /></ProtectedRoute>} />
          <Route path="/auth/signup/confirm" element={<ProtectedRoute><ConfirmPage /></ProtectedRoute>} />

          {/* Reset Password Flow - Scoped Provider */}
          <Route element={<ResetLayout />}>
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-verify" element={<ResetVerifyPage />} />
            <Route path="/auth/reset-password" element={<NewPasswordPage />} />
          </Route>

          {/* Main App Routes - Protected with Sidebar Layout */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/more" element={<MorePage />} />
          </Route>

          {/* Redirect /sample to /home for backwards compatibility */}
          <Route path="/sample" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </NavigationProvider>
  );
}

export default App;
