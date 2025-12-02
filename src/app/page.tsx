"use client"

import { CharacterParade } from "@/components/retro/CharacterParade"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 font-retro-heading text-white pixel-text-shadow">
          Retro Game Arcade
        </h1>
        <p className="text-xl text-white font-retro-body bg-black/50 inline-block p-2 rounded pixel-border">
          Choose your game!
        </p>
      </div>

      <div className="mb-12">
        <CharacterParade />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto opacity-50 hover:opacity-100 transition-opacity">
        {/* Fallback / Additional Info if needed */}
      </div>
    </div>
  )
}
