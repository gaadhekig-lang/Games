"use client"

import React from 'react'

export function MarioSprite({ className, frame = 0 }: { className?: string; frame?: number }) {
    // Using individual frames 0-4
    // Ensure frame is within bounds
    const safeFrame = Math.max(0, Math.min(4, Math.floor(frame)))

    return (
        <div className={`relative ${className}`}>
            <img
                src={`/mario-frame-${safeFrame}.png`}
                alt="Mario"
                className="w-full h-full object-contain"
                style={{
                    imageRendering: 'pixelated'
                }}
            />
        </div>
    )
}

export function GreenPipe({ className }: { className?: string }) {
    return (
        <div className={`relative flex flex-col items-center ${className}`}>
            {/* Pipe Top */}
            <div className="w-16 h-8 bg-green-600 border-4 border-black relative z-10">
                <div className="absolute top-1 left-1 right-1 h-2 bg-green-400 opacity-50"></div>
            </div>
            {/* Pipe Body */}
            <div className="w-14 h-full bg-green-600 border-x-4 border-black relative -mt-1">
                <div className="absolute top-0 left-1 right-1 h-full w-2 bg-green-400 opacity-30"></div>
                <div className="absolute top-0 right-2 h-full w-1 bg-green-800 opacity-30"></div>
            </div>
        </div>
    )
}

export function PixelTree({ className }: { className?: string }) {
    return (
        <div className={`relative ${className}`}>
            {/* Leaves */}
            <div className="w-32 h-32 bg-[#2d6a1e] rounded-full border-4 border-black relative z-10 mx-auto transform translate-y-4">
                <div className="absolute top-2 left-4 w-8 h-8 bg-[#4a8f3a] rounded-full opacity-50"></div>
                <div className="absolute top-8 right-6 w-6 h-6 bg-[#4a8f3a] rounded-full opacity-50"></div>
            </div>
            {/* Trunk */}
            <div className="w-12 h-24 bg-[#5d3a1a] border-4 border-black mx-auto -mt-8 relative z-0">
                <div className="absolute left-2 top-0 bottom-0 w-2 bg-[#7a4e24] opacity-50"></div>
            </div>
        </div>
    )
}

export function PixelHouse({ className }: { className?: string }) {
    return (
        <div className={`relative ${className}`}>
            {/* Roof */}
            <div className="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[60px] border-b-[#8b4513] relative z-10 drop-shadow-[0_4px_0_rgba(0,0,0,1)]">
                {/* Roof Detail */}
                <div className="absolute -left-[40px] top-[20px] w-[80px] h-[20px] bg-[#a0522d] opacity-50 clip-path-polygon"></div>
            </div>
            {/* Walls */}
            <div className="w-24 h-24 bg-[#e6b87d] border-4 border-black mx-auto -mt-1 relative z-0">
                {/* Door */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-12 bg-[#3e2723] border-t-4 border-x-4 border-black"></div>
                {/* Window */}
                <div className="absolute top-4 right-4 w-6 h-6 bg-[#87ceeb] border-4 border-black"></div>
            </div>
        </div>
    )
}
