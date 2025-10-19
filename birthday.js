// Birthday page functionality with age verification (15+)
document.addEventListener('DOMContentLoaded', function() {
    // Initialize automatic system theme detection
    new SystemThemeManager();
    
    // Initialize footer scroll detection
    new FooterScrollManager();
    
    const birthdayForm = document.getElementById('birthday-form');
    const birthdayInput = document.getElementById('birthday');
    const backBtn = document.getElementById('back-btn');
    
    // Check if user came from the previous step
    const signupData = localStorage.getItem('signupData');
    if (!signupData) {
        // Redirect to home if no data
        window.location.href = 'index.html';
        return;
    }
    
    // Prefill birthday if present
    try {
        const data = JSON.parse(signupData);
        if (data && data.birthday) {
            birthdayInput.value = data.birthday;
        }
    } catch (_) {}
    
    // Autosave birthday input and show age feedback
    birthdayInput.addEventListener('input', function() {
        let data;
        try { data = JSON.parse(localStorage.getItem('signupData') || '{}'); } catch (_) { data = {}; }
        data.birthday = birthdayInput.value;
        localStorage.setItem('signupData', JSON.stringify(data));
        
        // Show age feedback
        if (birthdayInput.value) {
            const age = calculateAge(birthdayInput.value);
            const ageInfo = document.getElementById('age-info');
            const ageText = document.getElementById('age-text');
            
            if (age >= 15) {
                ageText.textContent = `✅ You are ${age} years old - Welcome to Allify!`;
                ageInfo.style.display = 'block';
                ageInfo.style.background = 'rgba(34, 197, 94, 0.1)';
                ageInfo.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                ageText.style.color = '#16a34a';
            } else {
                ageText.textContent = `❌ You are ${age} years old - Must be 15+ to use Allify`;
                ageInfo.style.display = 'block';
                ageInfo.style.background = 'rgba(239, 68, 68, 0.1)';
                ageInfo.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                ageText.style.color = '#dc2626';
            }
        } else {
            document.getElementById('age-info').style.display = 'none';
        }
    });
    
    // Age validation function
    function calculateAge(birthday) {
        const today = new Date();
        const birthDate = new Date(birthday);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
    
    // Form submission handler
    birthdayForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const birthday = birthdayInput.value.trim();
        
        if (!birthday) {
            birthdayInput.classList.add('error');
            setTimeout(() => birthdayInput.classList.remove('error'), 1000);
            showToast('Please select your birthday', 'error');
            return;
        }
        
        const age = calculateAge(birthday);
        
        if (age < 15) {
            birthdayInput.classList.add('error');
            setTimeout(() => birthdayInput.classList.remove('error'), 1000);
            showToast('You must be at least 15 years old to use Allify', 'error', 4000);
            return;
        }
        
        try {
            // Update signup data with birthday
            const data = JSON.parse(signupData);
            data.birthday = birthday;
            localStorage.setItem('signupData', JSON.stringify(data));
            
            // Complete signup process with Supabase
            const fullName = data.fullName;
            const username = data.username;
            const email = data.email;
            const password = data.password;

            const { data: signUpRes, error: signUpErr } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName, username, birthday } }
            });
            if (signUpErr) throw signUpErr;

            // Attempt to upsert profile with birthday
            const { error: upsertErr } = await window.supabaseClient
                .rpc('upsert_my_profile', { p_full_name: fullName, p_username: username, p_birthday: birthday });
            if (upsertErr) { 
                console.warn('Profile upsert deferred:', upsertErr.message); 
            }

            showToast('Account created! Check your email to verify', 'success', 2500);
            localStorage.removeItem('signupData');
            setTimeout(() => { window.location.href = 'signin.html'; }, 2600);
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Sign up failed. Please try again.', 'error');
        }
    });
    
    // Back button handler
    backBtn.addEventListener('click', function() {
        window.location.href = 'password.html';
    });
    
    // Add focus effect to input
    birthdayInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    birthdayInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
    
    // Add subtle animations on page load
    animateOnLoad();
});
