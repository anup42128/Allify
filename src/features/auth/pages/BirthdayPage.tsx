import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../contexts/SignupContext';
import { supabase } from '../../../lib/supabase';
import { BackgroundGradient } from '../../../components/ui/BackgroundGradient';
import { SocialGraph } from '../../../components/ui/SocialGraph';

export const BirthdayPage = () => {
    const navigate = useNavigate();
    const {
        signupFormData,
        allowRoute,
        saveSignupFormData
    } = useNavigation();

    // Redirect if no data
    if (!signupFormData.email || !signupFormData.password) {
        // ideally navigate here or in useEffect
    }

    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');

    // Dropdown state
    const [openDropdown, setOpenDropdown] = useState<'year' | 'month' | 'day' | null>(null);

    // Generate Years (Current - 100)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const getDaysInMonth = (y: number, m: number) => {
        return new Date(y, m, 0).getDate();
    };

    // Calculate days based on selected year/month
    const days = year && month
        ? Array.from({ length: getDaysInMonth(parseInt(year), months.indexOf(month) + 1) }, (_, i) => i + 1)
        : [];

    const calculateAge = () => {
        if (!day || !month || !year) return 0;
        const birthDate = new Date(parseInt(year), months.indexOf(month), parseInt(day));
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const isUnderage = calculateAge() < 13;
    const isFormValid = day && month && year && !isUnderage;

    const handleContinue = async () => {
        if (!isFormValid) return;

        setIsLoading(true);
        setError('');

        const monthIndex = months.indexOf(month) + 1;
        const birthday = `${year}-${monthIndex.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;

        try {
            saveSignupFormData({
                ...signupFormData,
                birthday
            });

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: signupFormData.email,
                password: signupFormData.password!,
                options: {
                    data: {
                        full_name: signupFormData.fullName,
                        username: signupFormData.username,
                        birthday: birthday
                    },
                },
            });

            if (signUpError) {
                if (signUpError.message.includes("already registered")) {
                    const { error: resendError } = await supabase.auth.resend({
                        type: 'signup',
                        email: signupFormData.email
                    });

                    if (resendError) {
                        if (resendError.message.includes("Too many requests") || resendError.status === 429) {
                            setError("Too many attempts. Please wait 60 seconds.");
                        } else if (resendError.message.includes("already active")) {
                            setError("This email is already active. Please log in.");
                        } else {
                            setError("Could not send code. Please try again later.");
                        }
                        setIsLoading(false);
                        return;
                    }
                } else {
                    console.error("Signup error:", signUpError.message);
                    setError(signUpError.message);
                    setIsLoading(false);
                    return;
                }
            }

            // Explicitly update profile with birthday to ensure persistence
            if (authData.user) {
                await supabase
                    .from('profiles')
                    .update({ birthday: birthday })
                    .eq('id', authData.user.id);
            }

            localStorage.removeItem('allify_resend_end_time');
            allowRoute('/auth/signup/confirm');
            navigate('/auth/signup/confirm', { replace: true });

        } catch (err) {
            console.error("Unexpected error:", err);
            setError("An unexpected error occurred.");
            setIsLoading(false);
        }
    };

    // Helper to close dropdowns when clicking outside
    const handleBackdropClick = () => {
        setOpenDropdown(null);
    };

    // DROPDOWN COMPONENT
    const Dropdown = ({
        type,
        options,
        value,
        placeholder,
        disabled,
        onChange
    }: {
        type: 'year' | 'month' | 'day',
        options: (string | number)[],
        value: string | number,
        placeholder: string,
        disabled: boolean,
        onChange: (val: string) => void
    }) => {
        const isOpen = openDropdown === type;

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent backdrop click logic from immediately closing it if overlapping
            if (disabled) {
                if (type === 'month' && !year) setWarning('Please select the Year first.');
                if (type === 'day' && (!year || !month)) setWarning(year ? 'Please select the Month first.' : 'Please select the Year first.');
                return;
            }
            setOpenDropdown(isOpen ? null : type);
        };

        const handleOptionClick = (opt: string | number, e: React.MouseEvent) => {
            e.stopPropagation();
            onChange(opt.toString());
            setOpenDropdown(null);
            setWarning('');
            setError('');
        };

        return (
            <div className="relative group flex-1">
                <button
                    type="button"
                    onClick={handleClick}
                    className={`w-full px-4 py-3 rounded-lg border text-left flex items-center justify-between transition-all outline-none ${disabled
                        ? 'bg-neutral-900/50 border-neutral-800 text-gray-600 cursor-not-allowed'
                        : !value
                            ? 'bg-neutral-900 border-white/40 text-white cursor-pointer hover:border-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.1)]'
                            : 'bg-neutral-900 border-neutral-800 text-white cursor-pointer hover:border-neutral-700 focus:border-neutral-600'
                        }`}
                >
                    <span className={`block truncate ${!value ? 'text-gray-500' : ''}`}>
                        {value || placeholder}
                    </span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {isOpen && !disabled && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-neutral-900 border border-white/20 rounded-lg max-h-48 overflow-y-auto shadow-2xl custom-scrollbar">
                        {options.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={(e) => handleOptionClick(opt, e)}
                                className="w-full px-4 py-3 text-left text-white hover:bg-neutral-800 transition-colors border-b border-neutral-800/50 last:border-0 text-sm"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className="h-screen w-screen bg-black text-white relative selection:bg-indigo-500/30 overflow-hidden"
            onClick={handleBackdropClick}
        >
            <BackgroundGradient />
            <SocialGraph />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-0 pointer-events-none" />

            {/* Scrollable Overlay */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="min-h-full w-full flex items-center justify-center py-6">
                    <div className="w-full max-w-md z-10 px-6 relative flex flex-col items-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate('/auth/signup'); }}
                            className="absolute top-0 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Back
                        </button>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="mb-12 mt-12"
                        >
                            {/* Birthday Cake SVG - Robust Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                {/* Cake Base */}
                                <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
                                <path d="M4 16s.5-1 2-1 2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2-1 2-1" />
                                <path d="M2 21h20" />
                                {/* Candles */}
                                <path d="M7 8v2" />
                                <path d="M12 8v2" />
                                <path d="M17 8v2" />
                                {/* Flames */}
                                <path d="M7 4v2" className="text-orange-400 stroke-orange-400" />
                                <path d="M12 4v2" className="text-orange-400 stroke-orange-400" />
                                <path d="M17 4v2" className="text-orange-400 stroke-orange-400" />
                            </svg>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="w-full space-y-8"
                        >
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-white mb-2">When is your birthday?</h2>
                                <p className="text-gray-400 text-sm mb-1">You won't be able to change this later.</p>
                                <p className="text-gray-400 text-xs mt-1">Your birthday won't be shared publicly until you want.</p>
                            </div>

                            <div className="flex gap-6 relative z-50">
                                <Dropdown
                                    type="year"
                                    options={years}
                                    value={year}
                                    placeholder="Year"
                                    disabled={false}
                                    onChange={(val) => {
                                        setYear(val);
                                        setMonth('');
                                        setDay('');
                                    }}
                                />
                                <Dropdown
                                    type="month"
                                    options={months}
                                    value={month}
                                    placeholder="Month"
                                    disabled={!year}
                                    onChange={(val) => {
                                        setMonth(val);
                                        setDay('');
                                    }}
                                />
                                <Dropdown
                                    type="day"
                                    options={days}
                                    value={day}
                                    placeholder="Day"
                                    disabled={!year || !month}
                                    onChange={(val) => setDay(val)}
                                />
                            </div>

                            <p className="text-gray-400 text-xs text-center mt-8">You must be at least 13 years old to use Allify.</p>

                            {warning && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 animate-pulse">
                                    <p className="text-xs text-yellow-400 text-center">{warning}</p>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                                    <p className="text-xs text-red-400 text-center">{error}</p>
                                </div>
                            )}


                            {year && month && day && isUnderage && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                                    <p className="text-[10px] text-red-400/80 text-center">You must be 13 or older.</p>
                                </div>
                            )}

                            <button
                                onClick={handleContinue}
                                disabled={isLoading || !isFormValid}
                                className="w-full px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)]"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    "Continue"
                                )}
                            </button>

                            <div className="about-me text-center mt-8">
                                <p className="text-[10px] text-gray-600">Allify © 2025</p>
                            </div>

                        </motion.div>
                    </div>
                </div>
            </div>
        </div>

    );
};
