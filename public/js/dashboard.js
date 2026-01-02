// Dashboard JavaScript
// Handles dashboard functionality and data loading

// Load user data from session
async function loadUserData() {
    try {
        // Get user info from server
        const response = await fetch('/dashboard/api/user');
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                // Update username if element exists (only on dashboard page)
                const usernameElement = document.getElementById('username');
                if (usernameElement) {
                    usernameElement.textContent = data.user.username;
                }
                
                // Update coin amount - this should exist on all pages
                const coinAmountElement = document.getElementById('coinAmount');
                if (coinAmountElement) {
                    coinAmountElement.textContent = formatNumber(data.user.coins || 0);
                }
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/servers/api/list');
        if (response.ok) {
            const data = await response.json();
            const serverCount = data.servers ? data.servers.length : 0;
            document.getElementById('serverCount').textContent = serverCount;
        }
        
        // Load coin balance
        const userResponse = await fetch('/dashboard/api/user');
        if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user) {
                document.getElementById('totalCoins').textContent = formatNumber(userData.user.coins || 0);
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Check if user is admin and show admin panel link
function checkAdminAccess() {
    fetch('/dashboard/api/user')
        .then(res => res.json())
        .then(data => {
            if (data.user && data.user.is_admin) {
                const adminLink = document.querySelector('.admin-only');
                if (adminLink) {
                    adminLink.style.display = 'flex';
                }
            }
        })
        .catch(err => console.error('Error checking admin access:', err));
}

