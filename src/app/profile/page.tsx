'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store';
import { profileService, Profile } from '@/lib/services/profileService';
import ProfileHeader from '@/components/profile/ProfileHeader';
import FriendsList from '@/components/profile/FriendsList';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
    const { user } = useAppSelector(state => state.auth);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        loadProfile();
    }, [user, router]);

    const loadProfile = async () => {
        try {
            const data = await profileService.getProfile(user.id);
            setProfile(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#87CEEB]">
                <div className="text-2xl font-retro-heading text-white animate-pulse">Loading Profile...</div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-[#87CEEB] overflow-hidden relative">
            {/* Background Elements (Same as Lobby) */}
            <div className="absolute bottom-0 w-full h-32 bg-[#4a3c31] border-t-8 border-[#2d241d]" />
            <div className="absolute bottom-32 w-full h-8 bg-[#90EE90] border-t-4 border-[#32CD32]" />

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="bg-white border-4 border-black p-2 rounded hover:bg-gray-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-4xl font-retro-heading text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                        Player Profile
                    </h1>
                </div>

                <div className="max-w-4xl mx-auto">
                    <ProfileHeader
                        profile={profile}
                        onProfileUpdate={setProfile}
                    />

                    <FriendsList currentUserId={profile.id} />
                </div>
            </div>
        </div>
    );
}
