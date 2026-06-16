// Initialize Firebase
let auth;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeFirebase();
    setupEventListeners();
    checkExistingSession();
});

function initializeFirebase() {
    try {
        if (!window.firebaseConfig) {
            showToast('Firebase configuration not found', 'error');
            return;
        }
        
        firebase.initializeApp(window.firebaseConfig);
        auth = firebase.auth();
        
        // Configure auth settings
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showToast('Firebase initialization failed', 'error');
    }
}

function setupEventListeners() {
    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Enter key handling for form fields
    document.getElementById('email').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('password').focus();
        }
    });
    
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
}

async function checkExistingSession() {
    try {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is already logged in, redirect to admin
                showToast('Welcome back! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1500);
            }
        });
    } catch (error) {
        console.error('Session check error:', error);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    // Basic validation
    if (!email || !password) {
        showToast('Please enter both email and password', 'warning');
        return;
    }
    
    // Email validation
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'warning');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Set persistence based on remember checkbox
        const persistence = remember ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        
        // Attempt sign in
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if user is verified (if email verification is enabled)
        if (!user.emailVerified && false) { // Set to true if you enable email verification
            showToast('Please verify your email before logging in', 'warning');
            await auth.signOut();
            setLoadingState(false);
            return;
        }
        
        // Successful login
        showToast('Login successful! Redirecting...', 'success');
        
        // Store session info
        sessionStorage.setItem('adminLoginTime', new Date().toISOString());
        localStorage.setItem('adminEmail', email);
        
        // Redirect to admin panel
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(error);
    } finally {
        setLoadingState(false);
    }
}

function handleLoginError(error) {
    let message = 'Login failed. Please try again.';
    
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'No account found with this email address.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address format.';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your connection.';
            break;
        default:
            message = error.message || 'An unexpected error occurred.';
    }
    
    showToast(message, 'error');
    
    // Log failed attempt (in production, you might want to send this to a server)
    logFailedAttempt(document.getElementById('email').value, error.code);
}

function setLoadingState(loading) {
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginSpinner = document.getElementById('loginSpinner');
    
    if (loading) {
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Signing In...';
        loginSpinner.classList.remove('hidden');
    } else {
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Sign In';
        loginSpinner.classList.add('hidden');
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggle.classList.remove('fa-eye');
        passwordToggle.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordToggle.classList.remove('fa-eye-slash');
        passwordToggle.classList.add('fa-eye');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function logFailedAttempt(email, errorCode) {
    // In production, you might want to send this to your server for security monitoring
    const attempt = {
        email: email,
        errorCode: errorCode,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: null // In production, you might get this from server
    };
    
    console.log('Failed login attempt:', attempt);
    
    // Store failed attempts locally for rate limiting
    const attempts = JSON.parse(localStorage.getItem('failedAttempts') || '[]');
    attempts.push(attempt);
    
    // Keep only last 10 attempts
    if (attempts.length > 10) {
        attempts.shift();
    }
    
    localStorage.setItem('failedAttempts', JSON.stringify(attempts));
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    const icons = {
        success: '<i class="fas fa-check-circle text-green-500 text-xl"></i>',
        error: '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>',
        warning: '<i class="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>',
        info: '<i class="fas fa-info-circle text-blue-500 text-xl"></i>'
    };
    toastIcon.innerHTML = icons[type] || icons.info;
    
    // Show toast
    toast.classList.remove('translate-x-full');
    
    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 4000);
}

// Auto-logout after inactivity (30 minutes)
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        auth.signOut().then(() => {
            showToast('Session expired due to inactivity', 'info');
            window.location.href = 'login.html';
        });
    }, 30 * 60 * 1000); // 30 minutes
}

// Set up activity listeners
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('scroll', resetInactivityTimer);

// Start timer on page load
resetInactivityTimer();

// Prevent going back to login after successful login
window.addEventListener('popstate', function(event) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            history.pushState(null, null, location.href);
        }
    });
});

// Check for suspicious activity
function checkSuspiciousActivity() {
    const attempts = JSON.parse(localStorage.getItem('failedAttempts') || '[]');
    const recentAttempts = attempts.filter(attempt => {
        const attemptTime = new Date(attempt.timestamp);
        const now = new Date();
        const diffInMinutes = (now - attemptTime) / (1000 * 60);
        return diffInMinutes < 15; // Last 15 minutes
    });
    
    // If more than 5 failed attempts in 15 minutes
    if (recentAttempts.length >= 5) {
        showToast('Too many failed attempts. Please wait before trying again.', 'error');
        document.getElementById('loginBtn').disabled = true;
        
        // Disable login for 5 minutes
        setTimeout(() => {
            document.getElementById('loginBtn').disabled = false;
            localStorage.removeItem('failedAttempts');
        }, 5 * 60 * 1000);
        
        return true;
    }
    
    return false;
}

// Check for suspicious activity on page load
checkSuspiciousActivity();
