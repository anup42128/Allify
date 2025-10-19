// Username page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize automatic system theme detection
    new SystemThemeManager();
    
    // Initialize footer scroll detection
    new FooterScrollManager();
    
    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username');
    const backBtn = document.getElementById('back-btn');
    
    // Check if user came from the previous step
    const signupData = localStorage.getItem('signupData');
    if (!signupData) {
        // Redirect to home if no data
        window.location.href = 'index.html';
        return;
    }
    // Prefill username if present
    try {
        const data = JSON.parse(signupData);
        if (data && data.username) {
            usernameInput.value = data.username;
        }
    } catch (_) {}

    // Autosave username input
    usernameInput.addEventListener('input', function() {
        let data;
        try { data = JSON.parse(localStorage.getItem('signupData') || '{}'); } catch (_) { data = {}; }
        data.username = usernameInput.value;
        localStorage.setItem('signupData', JSON.stringify(data));
    });
    
    // Form submission handler with availability check via RPC
    usernameForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = usernameInput.value.trim();
        if (!username || username.length < 3) {
            usernameInput.classList.add('error');
            setTimeout(() => usernameInput.classList.remove('error'), 1000);
            return;
        }
        try {
            const { data: available, error } = await window.supabaseClient
                .rpc('is_username_available', { p_username: username });
            if (error) throw error;
            if (!available) { showToast('Username is already taken', 'error'); return; }
            const data = JSON.parse(signupData);
            data.username = username;
            localStorage.setItem('signupData', JSON.stringify(data));
            window.location.href = 'email.html';
        } catch (err) { console.error(err); showToast('Could not verify username. Try again', 'error'); }
    });
    
    // Back button handler
    backBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
    });
    
    // Add focus effect to input
    usernameInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    usernameInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
    
    // Add subtle animations on page load
    animateOnLoad();
});
