import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper, { type Area } from 'react-easy-crop';
import getCroppedImg from '../../../utils/cropImage';
import { useNavigation } from '../../auth/contexts/SignupContext';

export const ProfileSetup = () => {
    const navigate = useNavigate();
    const { allowRoute } = useNavigation();
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);

    // Cropping State
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    // Preview/Edit State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onCropComplete = useCallback((_area: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result as string);
                setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCrop = async () => {
        try {
            if (imageToCrop && croppedAreaPixels) {
                const cropped = await getCroppedImg(imageToCrop, croppedAreaPixels);
                setAvatar(cropped);
                setIsCropModalOpen(false);
                setImageToCrop(null);
                // Reset file input so same file can be selected again
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveImage = () => {
        setAvatar(null);
        setIsPreviewOpen(false);
        // Reset file input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleChangeImage = () => {
        setIsPreviewOpen(false);
        // Reset file input value before opening to ensure onChange fires
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        fileInputRef.current?.click();
    };


    const handleContinue = () => {
        allowRoute('/onboarding/interests');
        navigate('/onboarding/interests');
    };

    const handleSkip = () => {
        allowRoute('/onboarding/interests');
        navigate('/onboarding/interests');
    };

    return (
        <div className="space-y-10 pb-12 relative">
            {/* Skip Button - Absolute positioned */}
            <button
                onClick={handleSkip}
                className="absolute -top-8 -right-12 text-sm font-bold text-gray-400 hover:text-white transition-colors px-5 py-2.5 rounded-full hover:bg-white/10 border border-white/10"
            >
                Skip for now
            </button>


            {/* Header */}
            <div className="text-center space-y-4">
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40"
                >
                    Profile Setup
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-center gap-2"
                >
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-1 w-12 rounded-full transition-all duration-500 ${step === 1 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'
                                }`}
                        />
                    ))}
                </motion.div>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="relative"
                >
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    <button
                        onClick={() => avatar ? setIsPreviewOpen(true) : fileInputRef.current?.click()}
                        className="w-40 h-40 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all relative overflow-hidden group hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]"
                    >
                        {avatar ? (
                            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400 group-hover:text-indigo-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-black text-gray-500 group-hover:text-gray-300 tracking-widest uppercase">Select Photo</span>
                            </>
                        )}

                        {avatar && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] font-black text-white tracking-widest uppercase bg-indigo-500/80 px-3 py-1 rounded-full">Preview / Edit</span>
                            </div>
                        )}
                    </button>

                    {/* Badge */}
                    {avatar && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center border-4 border-black border-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </motion.div>
                    )}
                </motion.div>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">Tap to {avatar ? 'edit' : 'upload'}</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Display Name</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="What should we call you?"
                        className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium text-base"
                    />
                    <p className="text-[10px] text-gray-600 font-medium ml-1">If left empty, we'll use your @username instead.</p>
                </div>


                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Short Bio</label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, 160))}
                        placeholder="Tell the community who you are..."
                        rows={3}
                        className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-bold resize-none leading-relaxed"
                    />
                    <div className="flex justify-end px-2">
                        <span className={`text-[10px] font-black tracking-widest ${bio.length >= 160 ? 'text-red-500' : 'text-gray-600'}`}>
                            {bio.length}/160
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinue}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xl shadow-[0_15px_30px_-5px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="relative">Continue</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform relative">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
            </motion.button>

            <p className="text-center text-xs text-gray-600 font-medium mt-4">You can change all of this later in settings.</p>

            {/* MODALS */}


            {/* Cropping Modal */}
            <AnimatePresence>
                {isCropModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-2xl"
                    >
                        <div className="cropper-container w-full max-w-xl aspect-square relative bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                            {imageToCrop && (
                                <Cropper
                                    image={imageToCrop}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={true}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            )}
                        </div>

                        <div className="w-full max-w-xl mt-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase text-gray-500 tracking-widest px-2">
                                    <span>Zoom Control</span>
                                    <span>{Math.round(zoom * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setIsCropModalOpen(false);
                                        setImageToCrop(null);
                                        // Reset file input so same file can be selected again
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    }}

                                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCrop}
                                    className="flex-[2] py-4 rounded-2xl bg-indigo-500 text-white font-black shadow-[0_10px_20px_rgba(99,102,241,0.3)] hover:bg-indigo-400 transition-all uppercase tracking-widest text-xs"
                                >
                                    Crop & Save
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview/Edit Modal */}
            <AnimatePresence>
                {isPreviewOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-3xl"
                    >
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            onClick={() => setIsPreviewOpen(false)}
                            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </motion.button>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-sm aspect-square relative rounded-[40px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10"
                        >
                            {avatar && <img src={avatar} alt="Large Preview" className="w-full h-full object-cover" />}
                        </motion.div>

                        <div className="w-full max-w-sm mt-12 grid grid-cols-2 gap-4">
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                onClick={handleRemoveImage}
                                className="py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black hover:bg-red-500/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 12.142m-4.204 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                Remove
                            </motion.button>
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                onClick={handleChangeImage}
                                className="py-4 rounded-2xl bg-indigo-500 text-white font-black shadow-[0_10px_20px_rgba(99,102,241,0.3)] hover:bg-indigo-400 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-0.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                Change
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
