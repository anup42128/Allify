import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { SocialGraph } from '../../../components/ui/SocialGraph';
import { useNavigation } from '../contexts/SignupContext';

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { allowRoute } = useNavigation();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Check for success message from navigation state
        const state = location.state as { message?: string } | null;
        if (state?.message) {
            setSuccessMessage(state.message);
            // Clear state so message doesn't persist on refresh
            window.history.replaceState({}, document.title);
        }
    }, []); // Run once on mount

    const handleLogin = async () => {
        setIsLoading(true);
        setError('');

        try {
            let loginEmail = identifier;

            // Simple check to see if it looks like an email
            const isEmail = identifier.includes('@');

            if (!isEmail) {
                // If not an email, assume it's a username and try to find the email
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', identifier)
                    .single();

                if (profileError || !profile) {
                    // Username not found, but we show generic error securely or handle it
                    // For better UX during dev we can log it, but for end user:
                    setError("Invalid login credentials.");
                    setIsLoading(false);
                    return;
                }
                loginEmail = profile.email;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password,
            });

            if (signInError) {
                if (signInError.message.includes("Invalid login credentials")) {
                    setError("Invalid email/username or password.");
                } else {
                    setError(signInError.message);
                }
                setIsLoading(false);
                return;
            }

            // Success
            allowRoute('/home');
            navigate('/home');

        } catch (err) {
            console.error("Login error:", err);
            setError("An unexpected error occurred.");
            setIsLoading(false);
        }
    };

    // Check if form is valid
    const isFormValid = identifier.trim() && password.trim();

    return (
        <div className="h-[100dvh] w-screen bg-black text-white relative selection:bg-indigo-500/30 overflow-hidden">
            {/* Background Elements - Fixed */}
            <BackgroundGradient />
            <SocialGraph />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-0 pointer-events-none" />

            {/* Scrollable Overlay */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-y-contain">
                <div className="min-h-full w-full flex flex-col items-center justify-center p-6 pb-[10vh] md:pb-6">
                    <div className="w-full max-w-md z-10 relative mt-16 md:mt-0">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate('/')}
                            className="absolute -top-10 md:top-0 left-0 md:left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group p-2 md:p-0 backdrop-blur-md md:backdrop-blur-none bg-white/[0.03] md:bg-transparent border border-white/5 md:border-transparent rounded-full md:rounded-none z-50 text-xs md:text-base pr-4 md:pr-0 font-medium"
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
                            className="space-y-6 md:space-y-6 mt-4 md:mt-12"
                        >
                            {/* Header Section */}
                            <div className="text-center space-y-1 md:space-y-2 mb-8">
                                <motion.h1
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-3xl mb-2 md:mb-4 leading-none"
                                >
                                    Allify
                                </motion.h1>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-200 tracking-tight">Welcome back</h2>
                                <p className="text-zinc-500 md:text-gray-400 text-[13px] md:text-sm max-w-xs mx-auto font-medium md:font-normal">
                                    Enter your credentials to continue your journey.
                                </p>
                            </div>

                            <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
                                {/* Email or Username */}
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Email or Username"
                                        value={identifier}
                                        autoComplete="off"
                                        onChange={(e) => {
                                            setIdentifier(e.target.value);
                                            if (error) setError('');
                                        }}
                                        className="w-full px-4 md:px-5 py-3.5 rounded-2xl md:rounded-xl bg-white/[0.03] md:bg-white/5 border border-white/5 md:border-white/10 text-white placeholder-zinc-500 md:placeholder-gray-400 text-sm md:text-base focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-md shadow-inner"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={password}
                                        autoComplete="new-password"
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (error) setError('');
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                        className="w-full px-4 md:px-5 py-3.5 pr-12 rounded-2xl md:rounded-xl bg-white/[0.03] md:bg-white/5 border border-white/5 md:border-white/10 text-white placeholder-zinc-500 md:placeholder-gray-400 text-sm md:text-base focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all backdrop-blur-md shadow-inner"
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

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                                    >
                                        <p className="text-xs text-red-400 text-center">{error}</p>
                                    </motion.div>
                                )}

                                {successMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                                    >
                                        <p className="text-xs text-green-400 text-center">{successMessage}</p>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !isFormValid}
                                    className="w-full px-6 md:px-8 py-3.5 md:py-4 rounded-[20px] md:rounded-full bg-white text-black font-bold text-base md:text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] mt-6 md:mt-6"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Opening account...</span>
                                        </>
                                    ) : (
                                        "Open my account"
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/auth/forgot-password')}
                                    className="w-full px-6 md:px-8 py-3.5 md:py-4 rounded-[20px] md:rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:text-white hover:bg-indigo-500/20 font-semibold text-sm md:text-base transition-all flex items-center justify-center mt-3"
                                >
                                    <span>Forgot password? <span className="text-indigo-300/60 font-medium ml-1.5">No tension.</span></span>
                                </button>
                                </form>

                            {/* Divider and Footer Links */}
                            <div className="space-y-6 pt-2">
                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">or</span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>

                                <div className="text-center">
                                    <p className="text-sm text-gray-400">
                                        New to Allify?{' '}
                                        <button
                                            onClick={() => navigate('/auth/signup')}
                                            className="text-white hover:text-indigo-300 font-medium hover:underline transition-colors"
                                        >
                                            Create an account
                                        </button>
                                    </p>
                                </div>
                            </div>

                            {/* Security Footer */}
                            <div className="pt-8 pb-4 text-center">
                                <p className="text-[10px] md:text-xs text-gray-500/70 font-medium tracking-wide">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 inline-block mr-1.5 -mt-0.5 text-indigo-500/70">
                                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                                    </svg>
                                    Your data is secure and encrypted.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};
