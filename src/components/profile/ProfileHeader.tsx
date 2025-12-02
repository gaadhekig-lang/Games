import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Edit2, Save, X } from 'lucide-react';
import { Profile, profileService } from '@/lib/services/profileService';
import { toast } from 'sonner';

interface ProfileHeaderProps {
    profile: Profile;
    onProfileUpdate: (updatedProfile: Profile) => void;
}

export default function ProfileHeader({ profile, onProfileUpdate }: ProfileHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: profile.username || '',
        display_name: profile.display_name || '',
        bio: profile.bio || ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        try {
            const updated = await profileService.updateProfile(profile.id, formData);
            onProfileUpdate(updated);
            setIsEditing(false);
            toast.success('Profile updated!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update profile');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await profileService.uploadAvatar(profile.id, file);
            const updated = await profileService.updateProfile(profile.id, { avatar_url: url });
            onProfileUpdate(updated);
            toast.success('Avatar updated!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload avatar');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-[#e6d5aa] pixel-border border-4 border-[#8b4513] p-6 mb-8 relative">
            {/* Decorative Corner Screws */}
            <div className="absolute top-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
            <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
            <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                {/* Avatar Section */}
                <div className="relative group">
                    <div className="w-32 h-32 bg-[#8b4513] p-1 pixel-border border-2 border-[#5d3a1a] relative">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#d4c59a] flex items-center justify-center text-4xl font-retro-heading text-[#3e2723]">
                                {profile.display_name?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}

                        {/* Upload Overlay */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                        >
                            <Camera className="w-8 h-8 text-white" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    {isUploading && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-1 font-retro-body">
                            Uploading...
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="flex-1 text-center md:text-left w-full">
                    {isEditing ? (
                        <div className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-retro-heading text-[#5d4037] mb-1">Display Name</label>
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                    className="w-full bg-white border-2 border-[#8b4513] px-3 py-2 font-retro-body text-[#3e2723] focus:outline-none focus:border-[#5d3a1a]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-retro-heading text-[#5d4037] mb-1">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-white border-2 border-[#8b4513] px-3 py-2 font-retro-body text-[#3e2723] focus:outline-none focus:border-[#5d3a1a]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-retro-heading text-[#5d4037] mb-1">Bio</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full bg-white border-2 border-[#8b4513] px-3 py-2 font-retro-body text-[#3e2723] focus:outline-none focus:border-[#5d3a1a] resize-none h-20"
                                />
                            </div>
                            <div className="flex gap-2 justify-center md:justify-start">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 bg-[#4a8f3a] hover:bg-[#3a722e] text-white px-4 py-2 font-retro-heading border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                >
                                    <Save size={18} /> SAVE
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex items-center gap-2 bg-[#c84c0c] hover:bg-[#a03d09] text-white px-4 py-2 font-retro-heading border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                >
                                    <X size={18} /> CANCEL
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                <h1 className="text-3xl font-retro-heading text-[#3e2723]">
                                    {profile.display_name || 'Anonymous Player'}
                                </h1>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 bg-[#d4c59a] hover:bg-[#c2b28a] border-2 border-[#8b4513] text-[#5d4037] transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>
                            <p className="font-retro-body text-[#8b4513] text-lg mb-4">@{profile.username || 'username'}</p>
                            <div className="bg-[#d4c59a] p-3 border-2 border-[#8b4513] inline-block min-w-[300px]">
                                <p className="font-retro-body text-[#5d4037] max-w-lg mx-auto md:mx-0">
                                    {profile.bio || 'No bio yet. Click edit to add one!'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
