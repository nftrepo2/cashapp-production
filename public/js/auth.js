// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

// Login user
async function loginUser(email, password) {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true };
    } else {
      return { success: false, errors: data.errors || { email: "Login failed. Please try again." } };
    }
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, errors: { email: "Network error. Please try again." } };
  }
}

// Register user
async function registerUser(fullName, email, password) {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullName, email, password1: password, password2: password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return { success: true, accNo: data.user.accNo };
    } else {
      return { success: false, errors: data.errors || { fullName: "Registration failed. Please try again." } };
    }
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, errors: { fullName: "Network error. Please try again." } };
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on the login page
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");

      if (!emailInput || !passwordInput) {
        alert("Form elements are missing. Please refresh the page.");
        return;
      }

      const email = emailInput.value;
      const password = passwordInput.value;

      // Debug: Log the values being sent
      console.log("Login attempt with:", { email, password });

      // Verify loginUser exists
      if (typeof loginUser !== "function") {
        console.error("loginUser function is not defined");
        alert("Application error: login functionality is unavailable. Please refresh and try again.");
        return;
      }

      const result = await loginUser(email, password);

      if (result.success) {
        window.location.href = "/dashboard";
      } else {
        const errorMessage = result.errors.email || result.errors.password || "Login failed. Please try again.";
        console.log("Login error response:", result.errors);
        alert(errorMessage);
      }
    });
  }

  // Check if we're on the register page
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullNameInput = document.getElementById("fullName");
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password");
      const confirmPasswordInput = document.getElementById("confirm-password");

      if (!fullNameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
        alert("Form elements are missing. Please refresh the page.");
        return;
      }

      const fullName = fullNameInput.value;
      const email = emailInput.value;
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      const result = await registerUser(fullName, email, password);

      if (result.success) {
        const accountCreated = document.getElementById("account-created");
        const accountNumber = document.getElementById("account-number");
        const countdown = document.getElementById("countdown");

        if (!accountCreated || !accountNumber || !countdown) {
          window.location.href = "/dashboard";
          return;
        }

        accountNumber.textContent = result.accNo;
        accountCreated.style.display = "flex";

        let seconds = 5;
        const timer = setInterval(() => {
          seconds--;
          countdown.textContent = seconds;

          if (seconds <= 0) {
            clearInterval(timer);
            window.location.href = "/dashboard";
          }
        }, 1000);
      } else {
        const errorMessage =
          result.errors.fullName ||
          result.errors.email ||
          result.errors.password ||
          result.errors.accNo ||
          "Registration failed. Please try again.";
        alert(errorMessage);
      }
    });
  }

  // Check if we need to redirect to login
  if (window.location.pathname !== "/login" && window.location.pathname !== "/register" && !checkAuth()) {
    window.location.href = "/login";
  }
});