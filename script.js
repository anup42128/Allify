// Automatic System Theme Detection
class SystemThemeManager {
    constructor() {
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.init();
    }

    init() {
        // Apply initial theme based on system preference
        this.applySystemTheme();
        
        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', () => {
            this.applySystemTheme();
            this.animateThemeTransition();
        });
    }

    getSystemTheme() {
        return this.mediaQuery.matches ? 'dark' : 'light';
    }

    applySystemTheme() {
        const theme = this.getSystemTheme();
        document.documentElement.setAttribute('data-theme', theme);
        
        // Log theme change for debugging
        console.log(`Theme automatically set to: ${theme} (based on system preference)`);
    }

    animateThemeTransition() {
        // Add transition class to all elements for smooth theme switching
        document.body.classList.add('theme-transition');
        
        // Remove transition class after animation completes
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }
}

// Footer Scroll Direction Detection
class FooterScrollManager {
    constructor() {
        this.footer = document.querySelector('footer');
        this.isVisible = false;
        this.lastScrollTime = 0;
        this.lastScrollTop = 0;
        this.scrollThreshold = 100; // Minimum scroll distance to trigger
        this.throttleDelay = 16; // ~60fps
        this.init();
    }

    init() {
        // Initialize scroll position
        this.lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Throttled scroll event listener
        window.addEventListener('scroll', this.throttledScroll.bind(this), { passive: true });
        
        // Listen for resize events to recalculate
        window.addEventListener('resize', this.throttledResize.bind(this), { passive: true });
    }

    throttledScroll() {
        const now = Date.now();
        if (now - this.lastScrollTime >= this.throttleDelay) {
            this.lastScrollTime = now;
            requestAnimationFrame(() => {
                this.checkScrollDirection();
            });
        }
    }

    throttledResize() {
        requestAnimationFrame(() => {
            this.lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        });
    }

    checkScrollDirection() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Calculate scroll direction
        const scrollDifference = Math.abs(currentScrollTop - this.lastScrollTop);
        
        // Only process if scroll difference is significant
        if (scrollDifference < this.scrollThreshold) {
            return;
        }
        
        // Check if we're near the bottom of the page
        const nearBottom = currentScrollTop + windowHeight >= documentHeight - 200;
        
        if (nearBottom) {
            // Determine scroll direction
            const scrollingDown = currentScrollTop > this.lastScrollTop;
            
            if (scrollingDown && !this.isVisible) {
                // Scrolling down near bottom - show footer
                this.showFooter();
            } else if (!scrollingDown && this.isVisible) {
                // Scrolling up - hide footer
                this.hideFooter();
            }
        } else if (this.isVisible) {
            // Not near bottom - hide footer
            this.hideFooter();
        }
        
        // Update last scroll position
        this.lastScrollTop = currentScrollTop;
    }

    showFooter() {
        // Remove any existing transition classes
        this.footer.classList.remove('hiding');
        
        // Force a reflow to ensure the class change is processed
        this.footer.offsetHeight;
        
        // Add visible class for fade in
        this.footer.classList.add('visible');
        this.isVisible = true;
    }

    hideFooter() {
        // Add hiding class for fade out
        this.footer.classList.add('hiding');
        
        // Remove visible class after transition completes
        setTimeout(() => {
            this.footer.classList.remove('visible', 'hiding');
            this.isVisible = false;
        }, 300); // Match CSS transition duration
    }
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    // Initialize automatic system theme detection
    new SystemThemeManager();
    
    // Initialize footer scroll detection
    new FooterScrollManager();
    
    const signupForm = document.getElementById('signup-form');
    const fullNameInput = document.getElementById('full-name');
    // Autosave full name so it persists when navigating back/forward
    fullNameInput.addEventListener('input', function() {
        const current = (localStorage.getItem('signupData') || '{}');
        let data;
        try { data = JSON.parse(current); } catch (_) { data = {}; }
        data.fullName = fullNameInput.value;
        localStorage.setItem('signupData', JSON.stringify(data));
    });
    
    // Form submission handler
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fullName = fullNameInput.value.trim();
        
        if (fullName) {
            // Store the name in localStorage and redirect to username page
            localStorage.setItem('signupData', JSON.stringify({ fullName: fullName }));
            window.location.href = 'username.html';
        } else {
            // Add animation to highlight the input field
            fullNameInput.classList.add('error');
            setTimeout(() => {
                fullNameInput.classList.remove('error');
            }, 1000);
        }
    });
    
    // Add focus effect to input
    fullNameInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    fullNameInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
    
    // Add subtle animations on page load
    animateOnLoad();
    // Prefill full name if present
    try {
        const data = JSON.parse(localStorage.getItem('signupData') || '{}');
        if (data && data.fullName) {
            fullNameInput.value = data.fullName;
        }
    } catch (_) {}
});

// Animation functions
function animateOnLoad() {
    const elements = document.querySelectorAll('.cta-section, .hero-content h2, .hero-content p');
    
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 300 + (index * 150));
    });
}

// Add ripple effect to buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-primary') || e.target.classList.contains('signin-link')) {
        createRipple(e);
    }
});

// Universal button click effect for all buttons
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn-primary') || 
        e.target.classList.contains('btn-secondary') || e.target.classList.contains('signin-link')) {
        // Add clicked class for visual feedback
        e.target.classList.add('clicked');
        
        // Remove clicked class after animation
        setTimeout(() => {
            e.target.classList.remove('clicked');
        }, 150);
    }
});

function createRipple(event) {
    const button = event.target;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");
    
    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) {
        ripple.remove();
    }
    
    button.appendChild(circle);
}

// Simple toast notifications (success/error/info)
window.showToast = function(message, type = 'info', durationMs = 2800) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '24px';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '9999';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    toast.style.color = '#fff';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '600';
    toast.style.letterSpacing = '0.2px';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';

    const bg = type === 'success' ? '#16a34a'
             : type === 'error' ? '#dc2626'
             : '#334155';
    toast.style.background = bg;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(-6px)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        setTimeout(() => toast.remove(), 220);
    }, durationMs);
}