export interface Participant {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    last_seen?: string | null;
}

export interface Conversation {
    id: string;
    last_message: string | null;
    last_message_time: string | null;
    other_user: Participant;
    unread_count: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string | null;
    audio_url?: string | null;
    audio_duration?: number | null;
    created_at: string;
    seen: boolean;
    optimistic?: boolean;
    reply_to_id?: string | null;
    message_reactions?: { user_id: string; emoji: string; }[];
}
