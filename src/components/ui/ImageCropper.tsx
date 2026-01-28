import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion } from 'framer-motion';

interface ImageCropperProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
    aspect?: number;
    cropShape?: 'round' | 'rect';
    showAspectSelector?: boolean;
    maxDimension?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
    image,
    onCropComplete,
    onCancel,
    aspect = 1,
    cropShape = 'round',
    showAspectSelector = false,
    maxDimension
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [currentAspect, setCurrentAspect] = useState(aspect);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_rent: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: any
    ): Promise<Blob | null> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Calculate output dimensions
        let targetWidth = pixelCrop.width;
        let targetHeight = pixelCrop.height;

        if (maxDimension) {
            const ratio = pixelCrop.width / pixelCrop.height;
            if (pixelCrop.width > pixelCrop.height) {
                if (pixelCrop.width > maxDimension) {
                    targetWidth = maxDimension;
                    targetHeight = maxDimension / ratio;
                }
            } else {
                if (pixelCrop.height > maxDimension) {
                    targetHeight = maxDimension;
                    targetWidth = maxDimension * ratio;
                }
            }
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Enable high-quality smoothing for sharp resizing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            targetWidth,
            targetHeight
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.9); // 90% quality: The "sweet spot" for HD clarity + small file size
        });
    };

    const handleDone = async () => {
        try {
            const croppedImage = await getCroppedImg(image, croppedAreaPixels);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col pt-16 px-4"
        >
            <div className="relative flex-1 bg-zinc-950 rounded-[2rem] overflow-hidden border border-zinc-800">
                <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    aspect={currentAspect}
                    cropShape={cropShape}
                    showGrid={true}
                    onCropChange={onCropChange}
                    onCropComplete={onCropCompleteInternal}
                    onZoomChange={onZoomChange}
                />
            </div>

            <div className="p-10 flex flex-col items-center gap-8">
                {/* Aspect Ratio Selector */}
                {showAspectSelector && (
                    <div className="flex gap-4 p-1 bg-zinc-900 rounded-full border border-zinc-800">
                        <button
                            onClick={() => setCurrentAspect(1)}
                            className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${currentAspect === 1 ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            1:1
                        </button>
                        <button
                            onClick={() => setCurrentAspect(4 / 5)}
                            className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${currentAspect === 4 / 5 ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            4:5
                        </button>
                    </div>
                )}

                <div className="w-full max-w-xs">
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full accent-white"
                    />
                </div>

                <div className="flex gap-4 w-full max-w-md">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-white font-bold text-sm tracking-widest hover:bg-zinc-800 transition-colors uppercase"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDone}
                        className="flex-1 py-4 rounded-full bg-white text-black font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors uppercase"
                    >
                        Done
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default ImageCropper;
