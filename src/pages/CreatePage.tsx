import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import ImageCropper from '../components/ui/ImageCropper';

export const CreatePage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<'select' | 'crop' | 'details'>('select');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setSelectedFile(reader.result as string);
                setStep('crop');
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        setCroppedImage(croppedBlob);
        setStep('details');
    };

    const handlePost = async () => {
        if (!croppedImage) return;

        setIsUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("Not authenticated");

            // 1. Upload image
            const filename = `${session.user.id}/${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('posts')
                .upload(filename, croppedImage, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('posts')
                .getPublicUrl(filename);

            // 3. Get User Profile for Username
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (!profile?.username) throw new Error("Profile not found");

            // 4. Insert into posts table
            const { error: insertError } = await supabase
                .from('posts')
                .insert({
                    username: profile.username,
                    image_url: publicUrl,
                    caption: caption.trim()
                });

            if (insertError) throw insertError;

            // 4. Navigate to profile
            navigate('/profile', { state: { refresh: true } });

        } catch (error: any) {
            console.error("Error creating post:", error);
            alert("Failed to create post: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="h-full w-full bg-black text-white flex flex-col pt-10 px-4 md:px-0 relative">
            <AnimatePresence mode="wait">
                {step === 'select' && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex-1 flex flex-col items-center justify-center gap-8"
                    >
                        <h1 className="text-3xl font-bold tracking-tight">Create new post</h1>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="group relative cursor-pointer"
                        >
                            <div className="w-64 h-80 rounded-[2.5rem] border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-6 bg-zinc-900/30 group-hover:bg-zinc-900/50 group-hover:border-zinc-500 transition-all duration-300">
                                <div className="p-6 rounded-full bg-zinc-800 group-hover:scale-110 transition-transform duration-300">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </div>
                                <span className="font-medium text-zinc-400 group-hover:text-white transition-colors tracking-wide">Select from computer</span>
                            </div>

                            {/* Decorative background glow */}
                            <div className="absolute inset-0 bg-blue-500/20 blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            className="hidden"
                        />
                    </motion.div>
                )}

                {step === 'crop' && selectedFile && (
                    <ImageCropper
                        key="cropper"
                        image={selectedFile}
                        onCropComplete={handleCropComplete}
                        onCancel={() => {
                            setStep('select');
                            setSelectedFile(null);
                        }}
                        aspect={1} // Default square aspect ratio
                        cropShape="rect"
                    />
                )}

                {step === 'details' && croppedImage && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col max-w-4xl mx-auto w-full pb-20"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8 px-4">
                            <button
                                onClick={() => setStep('select')} // Restart flow for simplicity
                                className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-bold">New Post</h2>
                            <button
                                onClick={handlePost}
                                disabled={isUploading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold text-sm tracking-wide hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Sharing...' : 'Share'}
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 px-4">
                            {/* Image Preview */}
                            <div className="w-full md:w-1/2 bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl relative flex items-center justify-center">
                                <img
                                    src={URL.createObjectURL(croppedImage)}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full" />
                                    </div>
                                )}
                            </div>

                            {/* Caption Input */}
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="bg-zinc-900/50 rounded-[2rem] border border-zinc-800 p-6 flex-1 min-h-[300px]">
                                    <textarea
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Write a caption..."
                                        className="w-full h-full bg-transparent border-none outline-none resize-none text-lg text-white placeholder-zinc-500"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500 text-sm px-2">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                    </svg>
                                    <span>Your post will be shared to your profile and followers</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
