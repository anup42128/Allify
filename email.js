// Email page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize automatic system theme detection
    new SystemThemeManager();
    
    // Initialize footer scroll detection
    new FooterScrollManager();
    
    const emailForm = document.getElementById('email-form');
    const emailInput = document.getElementById('email');
    const backBtn = document.getElementById('back-btn');
    
    // Check if user came from the previous step
    const signupData = localStorage.getItem('signupData');
    if (!signupData) {
        // Redirect to home if no data
        window.location.href = 'index.html';
        return;
    }
    // Prefill email if present
    try {
        const data = JSON.parse(signupData);
        if (data && data.email) {
            emailInput.value = data.email;
        }
    } catch (_) {}

    // Autosave email input
    emailInput.addEventListener('input', function() {
        let data;
        try { data = JSON.parse(localStorage.getItem('signupData') || '{}'); } catch (_) { data = {}; }
        data.email = emailInput.value;
        localStorage.setItem('signupData', JSON.stringify(data));
    });
    
    // Email validation function
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    // Form submission handler with Supabase email availability check
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email || !isValidEmail(email)) {
            emailInput.classList.add('error');
            setTimeout(() => emailInput.classList.remove('error'), 1000);
            return;
        }
        try {
            const { data: available, error } = await window.supabaseClient
                .rpc('is_email_available', { p_email: email });
            if (error) throw error;
            if (!available) { showToast('Email already registered. Try signing in', 'error'); return; }
            const data = JSON.parse(signupData);
            data.email = email;
            localStorage.setItem('signupData', JSON.stringify(data));
            window.location.href = 'password.html';
        } catch (err) { console.error(err); showToast('Could not verify email. Try again', 'error'); }
    });
    
    // Back button handler
    backBtn.addEventListener('click', function() {
        window.location.href = 'username.html';
    });
    
    // Add focus effect to input
    emailInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    emailInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
    
    // Add subtle animations on page load
    animateOnLoad();
});
