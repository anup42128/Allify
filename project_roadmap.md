# Allify Social Roadmap 🚀

Allify is positioned to be a next-generation social ecosystem. We have successfully built the "Front Door" (Landing, Authentication, Security). Now, it's time to build the "Social Heart".

## 📍 Where We Are
- **Infrastructure**: Supabase integration, React/Vite/TS frontend, initial Rust security backend.
- **Authentication**: Robust Multi-step Signup, Login, and Password Recovery.
- **Branding**: "Classic" Dark Mode aesthetic, animated SocialGraph, fluid UX.

---

## 🗺️ The Path Forward

### Phase 1: Social Identity (Next Priority)
*The transition from a "User Account" to a "Person".*

#### 📋 Onboarding Checklist
To make Allify feel like a real social network from day one, we should ask for:
1.  **Core Identity**:
    *   **Avatar (Profile Picture)**: The most critical visual element.
    *   **Display Name**: A "Human" name (e.g., "Anup Rai") to complement the `@username`.
    *   **Short Bio**: A 160-character bio to tell the world who they are.
2.  **Content Personalization**:
    *   **Interests**: Choosing 3-5 tags (e.g., #gaming, #tech, #music) to help us prime their "Home Feed".
3.  **Social Links**:
    *   **Website/Portfolio**: Useful for creators and professionals.
    *   **Other Socials**: Connecting their existing presence.

#### 🚀 Technical Goals
- **Onboarding Flow**: A seamless experience after signup to set up the profile.
- **Avatar Storage**: Integrate Supabase Storage for high-quality image hosting.
- **Profile Page**: Initial public-facing view showing this new metadata.

### Phase 2: The Social Loop
*Allowing users to express themselves and interact.*
- **Creation Hub**: A "Create" button/modal to post text or media (images/videos).
- **Global Home Feed**: A high-performance, scrollable feed of posts.
- **Engagement Mechanics**: Likes (Double-tap), Comments, and Saves.
- **Content Sharing**: Internal link sharing and external "Invite" prompts.

### Phase 3: Relationships & Discovery
*Connecting users together.*
- **Follow System**: Unidirectional following (Instagram-style) or bidirectional friends.
- **Explore Page**: A grid-based discovery view for trending content.
- **User Search**: Real-time search by username or display name.
- **Interests**: Tagging users by categories (Tech, Art, Sports) to refine suggestions.

### Phase 4: Real-time Communication
*Turning a feed into a conversation.*
- **Direct Messaging (DM)**: Real-time chat using Supabase Realtime or Socket.io.
- **Media Sharing in Chat**: Sending images and voice notes.
- **Notifications**: Real-time alerts for likes, follows, and messages.

### Phase 5: Media & Scale
*Advanced features for high engagement.*
- **Reels/Shorts**: Full-screen vertical video feed with gesture support.
- **Live Streams**: Real-time video broadcasting.
- **Stories**: 24-hour disappearing content.
- **Creator Dashboard**: Insights and analytics for top users.

---

## 🛠️ Recommended Next Steps
I recommend we start with **Phase 1: Social Identity**. 

1.  **Transform `SamplePage`**: Turn the "Welcome" page into a dynamic onboarding experience.
2.  **Profile Database**: Enhance the `profiles` table in Supabase to support bios and avatars.
3.  **Avatar Upload**: Implement image storage for profile pictures.

**What do you think of this direction? Should we start building the Profile system next?**
