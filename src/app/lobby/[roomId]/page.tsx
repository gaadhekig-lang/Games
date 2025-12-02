import { Lobby } from "@/features/lobby/Lobby"

interface LobbyPageProps {
    params: Promise<{
        roomId: string
    }>
}

export default async function LobbyPage({ params }: LobbyPageProps) {
    const { roomId } = await params
    return <Lobby roomId={roomId} />
}
