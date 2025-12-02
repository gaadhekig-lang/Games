import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, UserCheck, UserX, User } from 'lucide-react';
import { Profile, FriendRequest, profileService } from '@/lib/services/profileService';
import { toast } from 'sonner';

interface FriendsListProps {
    currentUserId: string;
}

export default function FriendsList({ currentUserId }: FriendsListProps) {
    const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'add'>('friends');
    const [friends, setFriends] = useState<Profile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentUserId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [friendsData, requestsData] = await Promise.all([
                profileService.getFriends(currentUserId),
                profileService.getPendingRequests(currentUserId)
            ]);
            setFriends(friendsData);
            setRequests(requestsData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load friends');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        try {
            const results = await profileService.searchUsers(searchQuery);
            // Filter out self and existing friends
            const filtered = results.filter(u =>
                u.id !== currentUserId &&
                !friends.some(f => f.id === u.id)
            );
            setSearchResults(filtered);
        } catch (error) {
            console.error(error);
            toast.error('Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const sendRequest = async (userId: string) => {
        try {
            await profileService.sendFriendRequest(currentUserId, userId);
            toast.success('Friend request sent!');
            // Remove from search results to prevent duplicate sends
            setSearchResults(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error(error);
            toast.error('Failed to send request');
        }
    };

    const respondToRequest = async (requestId: string, status: 'accepted' | 'blocked') => {
        try {
            await profileService.respondToFriendRequest(requestId, status);
            toast.success(status === 'accepted' ? 'Friend added!' : 'Request ignored');
            loadData(); // Reload lists
        } catch (error) {
            console.error(error);
            toast.error('Action failed');
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-md border-4 border-white/20 rounded-xl overflow-hidden min-h-[500px] flex flex-col">
            {/* Tabs */}
            <div className="flex border-b-4 border-white/20">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`flex-1 py-4 font-retro-heading text-lg transition-colors ${activeTab === 'friends' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'
                        }`}
                >
                    My Friends ({friends.length})
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-4 font-retro-heading text-lg transition-colors ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'
                        }`}
                >
                    Requests ({requests.length})
                </button>
                <button
                    onClick={() => setActiveTab('add')}
                    className={`flex-1 py-4 font-retro-heading text-lg transition-colors ${activeTab === 'add' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'
                        }`}
                >
                    Add Friend
                </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {activeTab === 'friends' && (
                        <motion.div
                            key="friends"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            {friends.length === 0 ? (
                                <div className="col-span-full text-center text-white/50 py-10">
                                    No friends yet. Go to "Add Friend" to find some!
                                </div>
                            ) : (
                                friends.map(friend => (
                                    <div key={friend.id} className="bg-black/20 p-4 rounded-lg flex items-center gap-4 border-2 border-white/10">
                                        <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden">
                                            {friend.avatar_url ? (
                                                <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                                    {friend.display_name?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">{friend.display_name}</h3>
                                            <p className="text-sm text-blue-200">@{friend.username}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'pending' && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            {requests.length === 0 ? (
                                <div className="text-center text-white/50 py-10">
                                    No pending requests.
                                </div>
                            ) : (
                                requests.map(req => (
                                    <div key={req.id} className="bg-black/20 p-4 rounded-lg flex items-center justify-between border-2 border-white/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden">
                                                {req.requester?.avatar_url ? (
                                                    <img src={req.requester.avatar_url} alt={req.requester.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                                        {req.requester?.display_name?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{req.requester?.display_name}</h3>
                                                <p className="text-sm text-blue-200">wants to be friends</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => respondToRequest(req.id, 'accepted')}
                                                className="p-2 bg-green-500 hover:bg-green-600 rounded text-white transition-colors"
                                                title="Accept"
                                            >
                                                <UserCheck size={20} />
                                            </button>
                                            <button
                                                onClick={() => respondToRequest(req.id, 'blocked')}
                                                className="p-2 bg-red-500 hover:bg-red-600 rounded text-white transition-colors"
                                                title="Reject"
                                            >
                                                <UserX size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'add' && (
                        <motion.div
                            key="add"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by username..."
                                    className="flex-1 bg-black/20 border-2 border-white/20 rounded-lg px-4 py-3 text-white focus:border-blue-400 outline-none placeholder-white/30"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 rounded-lg font-bold transition-colors disabled:opacity-50"
                                >
                                    <Search size={20} />
                                </button>
                            </form>

                            <div className="space-y-4">
                                {searchResults.map(user => (
                                    <div key={user.id} className="bg-black/20 p-4 rounded-lg flex items-center justify-between border-2 border-white/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                                        {user.display_name?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{user.display_name}</h3>
                                                <p className="text-sm text-blue-200">@{user.username}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => sendRequest(user.id)}
                                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded transition-colors"
                                        >
                                            <UserPlus size={18} /> Add
                                        </button>
                                    </div>
                                ))}
                                {searchResults.length === 0 && searchQuery && !isLoading && (
                                    <div className="text-center text-white/50">
                                        No users found.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
