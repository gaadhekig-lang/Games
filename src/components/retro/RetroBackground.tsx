"use client"

export function RetroBackground({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#5c94fc]">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url("/retro-bg.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center bottom',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated' // Keep pixel art crisp
                }}
            />

            {/* Content */}
            <div className="relative z-10 pb-20">
                {children}
            </div>
        </div>
    )
}
