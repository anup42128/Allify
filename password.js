// Password page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize automatic system theme detection
    new SystemThemeManager();
    
    // Initialize footer scroll detection
    new FooterScrollManager();
    
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const backBtn = document.getElementById('back-btn');
    const submitBtn = passwordForm.querySelector('button[type="submit"]');
    
    // Check if user came from the previous step
    const signupData = localStorage.getItem('signupData');
    if (!signupData) {
        // Redirect to home if no data
        window.location.href = 'index.html';
        return;
    }
    
    function setSubmittingState(isSubmitting) {
        if (!submitBtn) return;
        if (isSubmitting) {
            submitBtn.disabled = true;
            submitBtn.setAttribute('aria-busy', 'true');
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating...';
        } else {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
            if (submitBtn.dataset.originalText) {
                submitBtn.textContent = submitBtn.dataset.originalText;
                delete submitBtn.dataset.originalText;
            }
        }
    }

    // Form submission handler - Supabase signUp and profile upsert
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        setSubmittingState(true);
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        if (password.length < 6 || password !== confirmPassword) {
            if (password.length < 6) {
                passwordInput.classList.add('error');
                setTimeout(() => passwordInput.classList.remove('error'), 1000);
                showToast('Password must be at least 6 characters', 'error', 2800);
            }
            if (password !== confirmPassword) {
                confirmPasswordInput.classList.add('error');
                setTimeout(() => confirmPasswordInput.classList.remove('error'), 1000);
                showToast('Passwords do not match', 'error', 2800);
            }
            setSubmittingState(false);
            return;
        }
        const data = JSON.parse(signupData);
        data.password = password;
        localStorage.setItem('signupData', JSON.stringify(data));
        window.location.href = 'birthday.html';
    });
    
    // Back button handler
    backBtn.addEventListener('click', function() {
        // Persist the partial password fields are intentionally NOT stored
        window.location.href = 'email.html';
    });
    
    // Add focus effects to inputs
    [passwordInput, confirmPasswordInput].forEach(input => {
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
