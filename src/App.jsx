import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import BirthdaySetup from './components/BirthdaySetup';
import UsernameSetup from './components/UsernameSetup';
import AuthCallback from './components/AuthCallback';
import ConfirmationPage from './components/ConfirmationPage';
import WelcomePage from './components/WelcomePage';
import SamplePage from './components/SamplePage';
import MUsernameSetup from './components/views/MUsernameSetup';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/username-setup" element={<UsernameSetup />} />
        <Route path="/birthday-setup" element={<BirthdaySetup />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/sample" element={<SamplePage />} />
        <Route path="/m-username-setup" element={<MUsernameSetup />} />
      </Routes>
    </Router>
  );
}

export default App;
