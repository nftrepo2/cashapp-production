// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Load user profile data
async function loadProfileData() {
  console.log('loadProfileData started');

  // Check if user is logged in
  const userJson = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  console.log('localStorage.user:', userJson);
  console.log('localStorage.token:', token);

  if (!userJson || !token) {
    console.error('No user or token in localStorage');
    window.location.href = "/login";
    return;
  }

  let user;
  try {
    user = JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing userJson:', error);
    window.location.href = "/login";
    return;
  }

  // Fetch latest user data from server
  try {
    const response = await fetch("/api/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log('API /api/user response:', data);

    if (response.ok && data.success) {
      user = data.user;
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      console.error('Failed to fetch user data:', data.message || response.status);
      window.location.href = "/login";
      return;
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    window.location.href = "/login";
    return;
  }

  const isAdmin = user.email === "admin@example.com" || user.email === "emmy@gmail.com";
  console.log('User data:', user, 'isAdmin:', isAdmin);

  // Update UI with user data
  try {
    document.getElementById("profile-name").textContent = user.fullName || 'Unknown';
    document.getElementById("profile-email").textContent = user.email || 'Unknown';
    document.getElementById("profile-account").textContent = user.accNo || 'Unknown';
    document.getElementById("profile-routing").textContent = user.routingNo || 'Unknown';

    // Format balance
    let balanceDisplay = isAdmin && user.balance > 999999999999
      ? "∞"
      : formatCurrency(user.balance);
    document.getElementById("profile-balance").textContent = balanceDisplay;
  } catch (error) {
    console.error('Error updating UI:', error);
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log('DOM fully loaded, loading profile data');
  loadProfileData();

  // Back button
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      console.log('Back button clicked');
      window.location.href = "/dashboard";
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      console.log('Logout button clicked');
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    });
  }
});