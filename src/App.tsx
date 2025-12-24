import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
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
import { SamplePage } from './components/desktop/SamplePage';
import { ResetProvider } from './features/auth/contexts/ResetContext';
import { OnboardingLayout } from './features/onboarding/OnboardingLayout';
import { ProfileSetup } from './features/onboarding/pages/ProfileSetup';
import { InterestsSetup } from './features/onboarding/pages/InterestsSetup';
import { WelcomeFinal } from './features/onboarding/pages/WelcomeFinal';

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

          <Route path="/sample" element={<ProtectedRoute><SamplePage /></ProtectedRoute>} />

          {/* Onboarding Flow */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingLayout /></ProtectedRoute>}>
            <Route path="profile" element={<ProfileSetup />} />
            <Route path="interests" element={<InterestsSetup />} />
            <Route path="welcome" element={<WelcomeFinal />} />
          </Route>
        </Routes>
      </Router>
    </NavigationProvider>
  );
}

export default App;
