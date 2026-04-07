import { supabase } from './supabase';

export type PostUpdateAction = 'like' | 'unlike' | 'save' | 'unsave' | 'comment_add' | 'comment_delete' | 'delete';

export interface PostUpdatePayload {
    postId: string;
    action: PostUpdateAction;
    data?: any; // e.g. likes_count
}

type Listener = (payload: PostUpdatePayload) => void;
const listeners = new Set<Listener>();

let isSubscribed = false;

// Initialize the channel for posts
const initPostBroadcast = () => {
    if (isSubscribed) return;
    isSubscribed = true;
    
    supabase
        .channel('post_broadcasts')
        .on(
            'broadcast',
            { event: 'post_update' },
            (payload) => {
                const data = payload.payload as PostUpdatePayload;
                listeners.forEach(listener => listener(data));
            }
        )
        .subscribe();
};

export const subscribeToPostUpdates = (listener: Listener) => {
    initPostBroadcast();
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const broadcastPostUpdate = async (payload: PostUpdatePayload) => {
    // Notify local listeners immediately for optimistic UI
    listeners.forEach(listener => listener(payload));
    
    // Broadcast to other tabs/sessions
    await supabase.channel('post_broadcasts').send({
        type: 'broadcast',
        event: 'post_update',
        payload: payload
    });
};

export const fetchPostWithContext = async (postId: string, currentUsername?: string, currentUserId?: string) => {
    try {
        // Fetch the post
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
            
        if (error || !post) throw error;
        
        // Fetch author profile
        const { data: authorProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', post.username)
            .single();
            
        post.author_profile = authorProfile;

        let is_liked_by_me = false;
        let is_saved_by_me = false;
        
        if (currentUsername) {
            const { data: likeData } = await supabase
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('username', currentUsername)
                .maybeSingle();
            is_liked_by_me = !!likeData;
        }

        if (currentUserId) {
            const { data: saveData } = await supabase
                .from('saved_posts')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', currentUserId)
                .maybeSingle();
            is_saved_by_me = !!saveData;
        }

        return {
            ...post,
            is_liked_by_me,
            is_saved_by_me
        };
    } catch (err) {
        console.error("Error fetching post:", err);
        return null;
    }
};
