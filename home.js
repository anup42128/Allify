// Home page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize automatic system theme detection
    new SystemThemeManager();
    
    // Initialize footer scroll detection
    new FooterScrollManager();
    
    const userGreeting = document.getElementById('user-greeting');
    const continueBtn = document.getElementById('continue-btn');
    
    // Check if user is authenticated
    async function checkAuth() {
        try {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            
            if (error || !user) {
                // Not authenticated, redirect to sign in
                window.location.href = 'signin.html';
                return;
            }
            
            // User is authenticated, fetch their profile
            await loadUserProfile(user);
        } catch (err) {
            console.error('Auth check failed:', err);
            window.location.href = 'signin.html';
        }
    }
    
    // Load user profile data
    async function loadUserProfile(user) {
        try {
            // Try to get profile from public.profiles
            const { data: profile, error: profileError } = await window.supabaseClient
                .from('profiles')
                .select('full_name, username, birthday')
                .eq('user_id', user.id)
                .single();
            
            if (profileError && profileError.code !== 'PGRST116') {
                console.warn('Profile fetch failed:', profileError);
            }
            
            // Use profile data or fallback to auth user metadata
            const fullName = profile?.full_name || user.user_metadata?.full_name || 'User';
            const username = profile?.username || user.user_metadata?.username || 'user';
            
            // Update greeting with user's name
            updateUserGreeting(fullName, username);
            
        } catch (err) {
            console.error('Profile load failed:', err);
            // Fallback to basic greeting
            updateUserGreeting('User', 'user');
        }
    }
    
    // Update the greeting with user's name
    function updateUserGreeting(fullName, username) {
        const timeOfDay = getTimeOfDay();
        const greeting = `${timeOfDay}, ${fullName}! 👋`;
        
        userGreeting.textContent = greeting;
        
        // Add a subtle animation
        userGreeting.style.opacity = '0';
        userGreeting.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            userGreeting.style.transition = 'all 0.6s ease';
            userGreeting.style.opacity = '1';
            userGreeting.style.transform = 'translateY(0)';
        }, 300);
    }
    
    // Get time-based greeting
    function getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }
    
    // Continue button handler (disabled for now)
    continueBtn.addEventListener('click', function() {
        if (continueBtn.disabled) return;
        
        // Show loading state
        continueBtn.querySelector('.btn-text').style.display = 'none';
        continueBtn.querySelector('.btn-loading').style.display = 'flex';
        
        // Simulate loading
        setTimeout(() => {
            showToast('Feature coming soon! 🚀', 'info', 3000);
            
            // Reset button
            continueBtn.querySelector('.btn-text').style.display = 'inline';
            continueBtn.querySelector('.btn-loading').style.display = 'none';
        }, 2000);
    });
    
    
    // Initialize page
    checkAuth();
    
    // Add subtle animations on page load
    animateWelcomeElements();
});

// Welcome page animations
function animateWelcomeElements() {
    const elements = document.querySelectorAll('.welcome-title, .welcome-subtitle, .welcome-description, .welcome-actions');
    
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 200 + (index * 150));
    });
    
    // Animate floating cards
    const cards = document.querySelectorAll('.floating-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px) scale(0.8)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
        }, 800 + (index * 100));
    });
}
