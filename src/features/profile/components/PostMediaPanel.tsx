interface PostMediaPanelProps {
    post: any;
}

export const PostMediaPanel = ({ post }: PostMediaPanelProps) => {
    return (
        <div className="relative bg-black flex items-center justify-center overflow-hidden transition-all duration-300 w-full md:w-auto shrink min-w-0">
            {/* Loading skeleton */}
            <div id={`modal-loader-${post.id}`} className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
            </div>

            {post.type === 'video' ? (
                <video
                    src={post.video_url}
                    className="object-contain relative z-10 w-auto h-[85vh] md:h-[90vh] aspect-[9/16]"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedData={() => {
                        document.getElementById(`modal-loader-${post.id}`)?.classList.add('hidden');
                    }}
                />
            ) : (
                <img
                    src={post.image_url}
                    alt={post.caption}
                    className="object-contain relative z-10 opacity-0 transition-opacity duration-700 w-auto h-auto max-w-full max-h-[60vh] md:max-h-[90vh]"
                    onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.classList.remove('opacity-0');
                        img.classList.add('opacity-100');
                        document.getElementById(`modal-loader-${post.id}`)?.classList.add('hidden');
                    }}
                />
            )}
        </div>
    );
};
