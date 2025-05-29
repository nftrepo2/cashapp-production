// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format time
function formatTime(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Today at Unknown Time";
  }
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `Today at ${formattedHours}:${formattedMinutes} ${ampm}`;
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Get withdrawal details from session storage
  const amount = parseFloat(sessionStorage.getItem("withdrawAmount")) || 0;
  const time = sessionStorage.getItem("withdrawTime") || new Date().toISOString();

  // Update UI with withdrawal details
  document.getElementById("success-amount").textContent = formatCurrency(amount);
  document.getElementById("success-time").textContent = formatTime(time);

  // Close button
  const closeBtn = document.getElementById("close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sessionStorage.removeItem("withdrawAmount");
      sessionStorage.removeItem("withdrawTime");
      window.location.href = "/dashboard";
    });
  }

  // Done button
  const doneBtn = document.getElementById("done-btn");
  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      sessionStorage.removeItem("withdrawAmount");
      sessionStorage.removeItem("withdrawTime");
      window.location.href = "/dashboard";
    });
  }
});