import { supabase } from '@/lib/supabase/client';

export interface Profile {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
}

export interface FriendRequest {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'blocked';
    created_at: string;
    requester?: Profile;
    receiver?: Profile;
}

export const profileService = {
    async getProfile(userId: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data as Profile;
    },

    async updateProfile(userId: string, updates: Partial<Profile>) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as Profile;
    },

    async uploadAvatar(userId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars') // Ensure this bucket exists in Supabase
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return data.publicUrl;
    },

    async getFriends(userId: string) {
        // Get accepted friendships where user is either requester or receiver
        const { data, error } = await supabase
            .from('friends')
            .select(`
                *,
                requester:users!friends_requester_id_fkey(*),
                receiver:users!friends_receiver_id_fkey(*)
            `)
            .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (error) throw error;

        // Map to a cleaner list of profiles
        return data.map((f: any) => {
            return f.requester_id === userId ? f.receiver : f.requester;
        }) as Profile[];
    },

    async getPendingRequests(userId: string) {
        // Get requests received by the user
        const { data, error } = await supabase
            .from('friends')
            .select(`
                *,
                requester:users!friends_requester_id_fkey(*)
            `)
            .eq('receiver_id', userId)
            .eq('status', 'pending');

        if (error) throw error;
        return data as FriendRequest[];
    },

    async sendFriendRequest(requesterId: string, receiverId: string) {
        const { data, error } = await supabase
            .from('friends')
            .insert({ requester_id: requesterId, receiver_id: receiverId, status: 'pending' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async respondToFriendRequest(requestId: string, status: 'accepted' | 'blocked') {
        const { data, error } = await supabase
            .from('friends')
            .update({ status })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async searchUsers(query: string) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('username', `%${query}%`)
            .limit(10);

        if (error) throw error;
        return data as Profile[];
    }
};
