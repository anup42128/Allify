// Signin page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize automatic system theme detection
    new SystemThemeManager();
    
    // Initialize footer scroll detection
    new FooterScrollManager();
    
    const signinForm = document.getElementById('signin-form');
    const usernameInput = document.getElementById('signin-username');
    const passwordInput = document.getElementById('signin-password');
    
    // Form submission handler — Supabase signIn with email or username
    signinForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const ident = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!ident) {
            usernameInput.classList.add('error');
            setTimeout(() => usernameInput.classList.remove('error'), 1000);
            return;
        }
        if (!password) {
            passwordInput.classList.add('error');
            setTimeout(() => passwordInput.classList.remove('error'), 1000);
            return;
        }
        try {
            // Resolve to email if user typed username
            let emailToUse = ident;
            const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ident);
            if (!looksLikeEmail) {
                const { data: resolvedEmail, error: resolveErr } = await window.supabaseClient
                    .rpc('get_email_for_identifier', { identifier: ident });
                if (resolveErr) throw resolveErr;
            if (!resolvedEmail) { showToast('Account not found', 'error'); return; }
                emailToUse = resolvedEmail;
            }

            const { data: signInRes, error: signInErr } = await window.supabaseClient.auth
                .signInWithPassword({ email: emailToUse, password });
            if (signInErr) throw signInErr;

            showToast('Signed in successfully', 'success', 2500);
            setTimeout(() => { window.location.href = 'home.html'; }, 2600);
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Sign in failed. Please try again.', 'error');
        }
    });
    
    // Add focus effects to inputs
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
    
    // Add subtle animations on page load
    animateOnLoad();
});
