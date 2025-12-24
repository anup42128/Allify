import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../contexts/SignupContext';
import { supabase } from '../../../lib/supabase';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { SocialGraph } from '../../../components/ui/SocialGraph';

export const SignupPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const navigate = useNavigate();
    const { allowRoute, removeRoute, signupFormData, saveSignupFormData } = useNavigation();

    // Load saved form data on component mount only
    useEffect(() => {
        setFullName(signupFormData.fullName);
        setEmail(signupFormData.email);
        setUsername(signupFormData.username);
        // Password is intentionally NOT restored
        setPassword('');

        // Remove subsequent pages from allowed routes when returning to signup
        removeRoute('/auth/signup/birthday');
        removeRoute('/auth/signup/confirm');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run once on mount

    const handleContinue = async () => {
        // Validate all fields are filled
        if (!fullName.trim() || !email.trim() || !username.trim() || !password.trim()) {
            return; // Don't proceed if any field is empty
        }

        // Validate password length
        if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        // Clear any previous error
        setPasswordError('');
        setEmailError('');
        setUsernameError('');

        setIsLoading(true);

        try {
            // Check for existing email in profiles
            const { data: existingEmail } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (existingEmail) {
                setEmailError("This email is already registered.");
                setIsLoading(false);
                return;
            }

            // Check for existing username in profiles
            const { data: existingUsername } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .maybeSingle();

            if (existingUsername) {
                setUsernameError("Username is already taken.");
                setIsLoading(false);
                return;
            }

            // save form data locally for persistence/confirm page
            // Include password so we can use it on BirthdayPage for actual signup
            saveSignupFormData({
                fullName,
                email,
                username,
                password
            });

            // Proceed to birthday page
            const delay = 500; // Small artificial delay for UX smoothness
            setTimeout(() => {
                setIsLoading(false);
                allowRoute('/auth/signup/birthday');
                navigate('/auth/signup/birthday');
            }, delay);

        } catch (err) {
            console.error("Unexpected error:", err);
            setPasswordError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    // Strict Email Validation Regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const currentEmailError = emailError; // Capture current error state from closure? No, let's just clear it if valid.
        setEmail(val);

        // Clear error if user fixes it while typing
        // We need to check if an error currently exists. Since state updates are async, we rely on the logic that if we are typing and it becomes valid, we act.
        if (currentEmailError || emailError) {
            if (val && emailRegex.test(val)) {
                setEmailError("");
            }
        }
    };

    const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val && !emailRegex.test(val)) {
            setEmailError("Please enter a valid email address (e.g., user@example.com)");
        }
    };

    // Strict Username Validation Regex (Letters, numbers, underscores, dots)
    const usernameRegex = /^[a-zA-Z0-9._]*$/;

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUsername(val);

        // Real-time validation for invalid characters
        if (!usernameRegex.test(val)) {
            setUsernameError("Only letters, numbers, underscores, and dots are allowed.");
        } else {
            setUsernameError("");
        }
    };

    // Check if all fields are filled AND valid
    const isFormValid =
        fullName.trim() !== '' &&
        email.trim() !== '' &&
        !emailError &&
        emailRegex.test(email) &&
        username.trim() !== '' &&
        !usernameError &&
        usernameRegex.test(username) &&
        password.trim() !== '' &&
        password.length >= 6 &&
        !passwordError; // Ensure no password error exists

    return (
        <div className="h-screen w-screen bg-black text-white relative selection:bg-indigo-500/30 overflow-hidden">
            {/* Background Elements - Fixed */}
            <BackgroundGradient />
            <SocialGraph />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-0 pointer-events-none" />

            {/* Scrollable Overlay */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="min-h-full w-full flex items-center justify-center py-6">
                    <div className="w-full max-w-md z-10 px-6 relative">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate('/')}
                            className="absolute top-0 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Back
                        </button>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-6 mt-12"
                        >
                            {/* Header Section */}
                            <div className="text-center space-y-2 mb-8">
                                <motion.h1
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-6xl font-black tracking-tighter text-white drop-shadow-3xl mb-4"
                                >
                                    Allify
                                </motion.h1>
                                <h2 className="text-2xl font-bold text-gray-200">Create Account</h2>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                    Join the future of digital innovation.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {/* Full Name */}
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-sm shadow-inner"
                                    />
                                </div>

                                {/* Username */}
                                <div className="space-y-1">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="Username"
                                            value={username}
                                            onChange={handleUsernameChange}
                                            maxLength={20}
                                            className={`w-full px-5 py-3.5 rounded-xl bg-white/5 border ${usernameError ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-sm shadow-inner`}
                                        />
                                    </div>
                                    {usernameError && (
                                        <p className="text-xs text-red-400 ml-2">{usernameError}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-1">
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={handleEmailChange}
                                            onBlur={handleEmailBlur}
                                            className={`w-full px-5 py-3.5 rounded-xl bg-white/5 border ${emailError ? 'border-red-500/50' : 'border-white/10'} text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-sm shadow-inner`}
                                        />
                                    </div>
                                    {emailError && (
                                        <p className="text-xs text-red-400 ml-2">{emailError}</p>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="space-y-1">
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (passwordError) setPasswordError('');
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                                            className="w-full px-5 py-3.5 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-sm shadow-inner"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    {passwordError && (
                                        <p className="text-xs text-red-400 ml-2">{passwordError}</p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleContinue}
                                        disabled={isLoading || !isFormValid}
                                        className="w-full px-8 py-3.5 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] mt-6"
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Creating account...</span>
                                            </>
                                        ) : (
                                            "Continue"
                                        )}
                                    </button>

                                    <p className="text-[10px] text-gray-400 text-center">
                                        By signing up, you agree to our{' '}
                                        <button
                                            disabled
                                            className="underline hover:text-white cursor-not-allowed transition-colors"
                                        >
                                            Terms and Conditions
                                        </button>
                                        .
                                    </p>
                                </div>
                            </div>

                            {/* Divider and Footer Links */}
                            <div className="space-y-6">
                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">or</span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>

                                <div className="text-center">
                                    <p className="text-sm text-gray-400">
                                        Already have an account?{' '}
                                        <button
                                            onClick={() => navigate('/auth/login')}
                                            className="text-white hover:text-indigo-300 font-medium hover:underline transition-colors"
                                        >
                                            Log in
                                        </button>
                                    </p>
                                </div>
                            </div>

                            {/* Privacy Footer */}
                            <div className="pt-8 text-center opacity-60 hover:opacity-100 transition-opacity duration-300">
                                <div className="mt-4 text-[10px] text-gray-600 font-mono tracking-widest">
                                    ALLIFY © 2025
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};
