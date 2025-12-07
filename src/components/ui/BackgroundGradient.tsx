export const BackgroundGradient = () => {
    return (
        <>
            <div className="absolute inset-0 bg-black z-[-2]" />
            {/* Top-left gradient removed as per request */}
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/30 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />
            <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-blue-900/20 rounded-full blur-[80px] pointer-events-none" />
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-[-1] mix-blend-overlay pointer-events-none"></div>
        </>
    );
};
