
export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue'

// Global Path: 0-51 (The outer loop)
// Red (TL) -> Green (TR) -> Blue (BR) -> Yellow (BL)
const START_OFFSETS: { [key in PlayerColor]: number } = {
    red: 0,
    green: 13,
    blue: 26,
    yellow: 39
}

// Map global path index (0-51) to Grid Coordinates [row, col] (0-14, 0-14)
// Starting from Red's start square [6, 1] and moving clockwise
const GLOBAL_PATH_COORDS: { [key: number]: [number, number] } = {
    // Red Arm (Left) -> Top
    0: [6, 1], 1: [6, 2], 2: [6, 3], 3: [6, 4], 4: [6, 5], 5: [5, 6],
    // Green Arm (Top) -> Right
    6: [4, 6], 7: [3, 6], 8: [2, 6], 9: [1, 6], 10: [0, 6], 11: [0, 7], 12: [0, 8],
    13: [1, 8], 14: [2, 8], 15: [3, 8], 16: [4, 8], 17: [5, 8], 18: [6, 9],
    // Blue Arm (Right) -> Bottom
    19: [6, 10], 20: [6, 11], 21: [6, 12], 22: [6, 13], 23: [6, 14], 24: [7, 14], 25: [8, 14],
    26: [8, 13], 27: [8, 12], 28: [8, 11], 29: [8, 10], 30: [8, 9], 31: [9, 8],
    // Yellow Arm (Bottom) -> Left
    32: [10, 8], 33: [11, 8], 34: [12, 8], 35: [13, 8], 36: [14, 8], 37: [14, 7], 38: [14, 6],
    39: [13, 6], 40: [12, 6], 41: [11, 6], 42: [10, 6], 43: [9, 6], 44: [8, 5],
    // Back to Red Arm
    45: [8, 4], 46: [8, 3], 47: [8, 2], 48: [8, 1], 49: [8, 0], 50: [7, 0], 51: [6, 0]
}

// Home Paths (The colored stretch into the center)
const HOME_PATH_COORDS: { [key in PlayerColor]: { [key: number]: [number, number] } } = {
    red: { 0: [7, 1], 1: [7, 2], 2: [7, 3], 3: [7, 4], 4: [7, 5], 5: [7, 6] },
    green: { 0: [1, 7], 1: [2, 7], 2: [3, 7], 3: [4, 7], 4: [5, 7], 5: [6, 7] },
    blue: { 0: [7, 13], 1: [7, 12], 2: [7, 11], 3: [7, 10], 4: [7, 9], 5: [7, 8] },
    yellow: { 0: [13, 7], 1: [12, 7], 2: [11, 7], 3: [10, 7], 4: [9, 7], 5: [8, 7] }
}

// Base Positions for tokens (when status is 'base')
const BASE_COORDS: { [key in PlayerColor]: [number, number][] } = {
    red: [[1, 1], [1, 4], [4, 1], [4, 4]], // TL
    green: [[1, 10], [1, 13], [4, 10], [4, 13]], // TR
    blue: [[10, 10], [10, 13], [13, 10], [13, 13]], // BR
    yellow: [[10, 1], [10, 4], [13, 1], [13, 4]] // BL
}

export function getGridCoordinates(color: PlayerColor, position: number, status: 'base' | 'active' | 'home', tokenId: number): [number, number] {
    if (status === 'base') {
        return BASE_COORDS[color][tokenId]
    }

    if (status === 'home') {
        // Offset tokens in the center square [7, 7] so they don't overlap
        // Red (Left), Green (Top), Blue (Right), Yellow (Bottom)
        const offset = tokenId * 0.05 // Slight offset for each token of same color

        switch (color) {
            case 'red': return [7.2 + offset, 6.8 + offset] // Left-ish
            case 'green': return [6.8 + offset, 7.2 + offset] // Top-ish
            case 'blue': return [7.2 + offset, 7.6 + offset] // Right-ish
            case 'yellow': return [7.6 + offset, 7.2 + offset] // Bottom-ish
            default: return [7, 7]
        }
    }

    // Active path
    if (position < 51) {
        // On global path
        const offset = START_OFFSETS[color]
        const globalIndex = (offset + position) % 52
        return GLOBAL_PATH_COORDS[globalIndex]
    } else {
        // On home stretch
        const homeIndex = position - 51
        return HOME_PATH_COORDS[color][homeIndex] || [7, 7]
    }
}

export function isSafeZone(globalIndex: number): boolean {
    // Stars at:
    // Green Arm: [2, 6] -> Index 8
    // Blue Arm: [6, 12] -> Index 21
    // Yellow Arm: [12, 8] -> Index 34
    // Red Arm: [8, 2] -> Index 47
    // Also Start Squares are usually safe? The image doesn't show stars there, but standard rules say yes.
    // Let's mark Stars AND Start Squares as safe.
    // Start Squares: 0 (Red), 13 (Green), 26 (Blue), 39 (Yellow)
    const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47]
    return SAFE_INDICES.includes(globalIndex)
}

export function getGlobalIndex(color: PlayerColor, position: number): number {
    if (position >= 51) return -1 // Not on global path
    return (START_OFFSETS[color] + position) % 52
}

export function checkCapture(
    players: { [key: string]: { color: PlayerColor; tokens: { id: number; position: number; status: string }[] } },
    myColor: PlayerColor,
    globalIndex: number
): { userId: string; tokenIndex: number } | null {
    if (globalIndex === -1) return null
    if (isSafeZone(globalIndex)) return null

    // Check all other players
    for (const userId in players) {
        const p = players[userId]
        if (p.color === myColor) continue // Don't capture self

        // Check their tokens
        for (let i = 0; i < p.tokens.length; i++) {
            const t = p.tokens[i]
            if (t.status === 'active') {
                const tGlobal = getGlobalIndex(p.color, t.position)
                if (tGlobal === globalIndex) {
                    return { userId, tokenIndex: i }
                }
            }
        }
    }
    return null
}
