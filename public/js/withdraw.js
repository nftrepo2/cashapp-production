// Format currency
function formatCurrency(amount) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user && amount > 999999999999) {
    return "∞";
  }

  return new Intl.NumberFormat("en-US", {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Load user data and initialize withdraw page
async function initWithdrawPage() {
  const userJson = localStorage.getItem("user");
  if (!userJson) {
    window.location.href = "/";
    return;
  }

  let user = JSON.parse(userJson);

  // Fetch latest user data from server
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        user = data.user;
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        console.error("Failed to fetch user data:", data.message);
        window.location.href = "/login";
        return;
      }
    } else {
      console.error("Failed to fetch user data:", response.status);
      window.location.href = "/login";
      return;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    window.location.href = "/login";
    return;
  }

  const balance = user.balance;
  const isAdmin = user.email === "admin@example.com" || user.email === "emmy@gmail.com";

  // Update UI with user data
  document.getElementById("balance-amount").textContent = formatCurrency(balance);
  document.getElementById("withdraw-available").textContent = `${formatCurrency(balance)} AVAILABLE`;
  document.getElementById("withdraw-amount").textContent = formatCurrency(balance);

  // Set slider max value to balance (in cents)
  const slider = document.getElementById("amount-slider");
  const maxSliderValue = isAdmin
    ? 1000000000 * 100 // 1 billion for admins
    : Math.min(balance * 100, 1000000000 * 100); // Balance or 1 billion

  slider.max = maxSliderValue;
  slider.value = maxSliderValue; // Initialize to max (balance)
  slider.min = 1; // Allow $0.01 minimum

  // Update amount when slider changes
  slider.addEventListener("input", () => {
    const amount = slider.value / 100;
    document.getElementById("withdraw-amount").textContent = formatCurrency(amount);
  });
}

// Process withdrawal
async function processWithdrawal(amount) {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    const response = await fetch("/api/withdraw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        email: user.email,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      user.balance = data.userBalance;
      localStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("withdrawAmount", amount);
      const now = new Date();
      sessionStorage.setItem("withdrawTime", now.toISOString());
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error("Withdrawal error:", error);
    return { success: false, message: "An error occurred. Please try again." };
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  initWithdrawPage();

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "/dashboard";
    });
  }

  const withdrawBtn = document.getElementById("withdraw-btn");
  if (withdrawBtn) {
    withdrawBtn.addEventListener("click", async () => {
      const slider = document.getElementById("amount-slider");
      const amount = slider.value / 100;

      if (amount < 0.01) {
        alert("Please enter an amount of at least $0.01");
        return;
      }

      withdrawBtn.textContent = "Processing...";
      withdrawBtn.disabled = true;

      const result = await processWithdrawal(amount);

      if (result.success) {
        window.location.href = "/withdraw-success";
      } else {
        alert(result.message || "Withdrawal failed. Please try again.");
        withdrawBtn.textContent = "Cash Out";
        withdrawBtn.disabled = false;
      }
    });
  }
});