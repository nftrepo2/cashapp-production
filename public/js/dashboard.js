// Format currency
function formatCurrency(amount) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.email === "admin@example.com" || user.email === "emmy@gmail.com";

  if (isAdmin && amount > 999999999999) {
    return "∞";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format currency for short display (e.g., $5.6K)
function formatShortCurrency(amount) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.email === "admin@example.com" || user.email === "emmy@gmail.com";

  if (isAdmin && amount > 999999999999) {
    return "$∞";
  } else if (amount >= 1000000) {
    return "$" + (amount / 1000000).toFixed(1) + "M";
  } else if (amount >= 1000) {
    return "$" + (amount / 1000).toFixed(1) + "K";
  }
  return "$" + amount.toFixed(0);
}

// Load user data
async function loadUserData() {
  const userJson = localStorage.getItem("user");
  if (!userJson) {
    window.location.href = "/login";
    return;
  }

  const user = JSON.parse(userJson);

  // Update UI with user data
  document.getElementById("balance-amount").textContent = formatCurrency(user.balance);
  document.getElementById("account-number").textContent = "Account•" + (user.accNo ? user.accNo.slice(-4) : "0000");
  document.getElementById("routing-number").textContent = "Routing•" + (user.routingNo || "000");
  document.getElementById("balance-short").textContent = formatShortCurrency(user.balance);
  document.getElementById("profile-name").textContent = user.fullName || "User Name";
  document.getElementById("profile-email").textContent = user.email || "user@example.com";

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
        localStorage.setItem("user", JSON.stringify(data.user));
        // Update UI
        document.getElementById("balance-amount").textContent = formatCurrency(data.user.balance);
        document.getElementById("account-number").textContent = "Account•" + (data.user.accNo ? data.user.accNo.slice(-4) : "0000");
        document.getElementById("routing-number").textContent = "Routing•" + (data.user.routingNo || "000");
        document.getElementById("profile-name").textContent = data.user.fullName || "User Name";
        document.getElementById("profile-email").textContent = data.user.email || "user@example.com";
        document.getElementById("balance-short").textContent = formatShortCurrency(data.user.balance);
      }
    } else {
      console.error("Failed to fetch user data");
      window.location.href = "/login";
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  // Fetch transactions
  await loadTransactions();
}

// Load transactions
async function loadTransactions() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/transactions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const transactionsList = document.getElementById("transactions-list");
        const transactionCount = document.getElementById("transaction-count");
        transactionsList.innerHTML = "";

        if (data.transactions.length === 0) {
          transactionsList.innerHTML = "<p>No transactions found.</p>";
          transactionCount.textContent = "0";
        } else {
          data.transactions.forEach((tx) => {
            const txElement = document.createElement("div");
            txElement.className = "transaction-item";
            txElement.innerHTML = `
              <div class="transaction-details">
                <p><strong>${tx.senderName || "Unknown"}</strong> to <strong>${tx.recipientName || "Unknown"}</strong></p>
                <p>Amount: ${formatCurrency(tx.amount)}</p>
              </div>
            `;
            transactionsList.appendChild(txElement);
          });
          transactionCount.textContent = data.transactions.length;
        }
      }
    } else {
      console.error("Failed to fetch transactions");
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Load user data
  loadUserData();

  // Profile dropdown toggle
  const profilePic = document.getElementById("profile-pic");
  const profileDropdown = document.getElementById("profile-dropdown");

  if (profilePic && profileDropdown) {
    profilePic.addEventListener("click", () => {
      profileDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (event) => {
      if (!profilePic.contains(event.target) && !profileDropdown.contains(event.target)) {
        profileDropdown.classList.remove("active");
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    });
  }

  // Add money button
  const addMoneyBtn = document.getElementById("add-money-btn");
  if (addMoneyBtn) {
    addMoneyBtn.addEventListener("click", () => {
      alert("Add money feature coming soon!");
    });
  }

  // Withdraw button
  const withdrawBtn = document.getElementById("withdraw-btn");
  if (withdrawBtn) {
    withdrawBtn.addEventListener("click", () => {
      window.location.href = "/withdraw";
    });
  }

   // card button
  const cardBtn = document.getElementById("cardsItem");
  if (cardBtn) {
    cardBtn.addEventListener("click", () => {
      alert("Card feature coming soon!");
    });
  }
});