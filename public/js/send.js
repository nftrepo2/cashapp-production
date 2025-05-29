let transferAmount = 0;

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Update amount display
function updateAmountDisplay() {
  const amountDisplay = document.getElementById('amount-display');
  if (amountDisplay) {
    amountDisplay.textContent = formatCurrency(transferAmount);
  }
}

// Handle numpad button click
function handleNumpadClick(value) {
  if (value === 'backspace') {
    // Convert to string and remove last character
    let amountStr = transferAmount.toFixed(2).replace('.', '');
    amountStr = amountStr.slice(0, -1) || '0';
    // Parse back to number
    transferAmount = parseFloat(amountStr) / 100;
    if (isNaN(transferAmount)) transferAmount = 0;
  } else if (value === '.') {
    // Ignore if already has decimal
    if (transferAmount.toString().includes('.')) return;
    // Do nothing, handled by digit addition
  } else {
    // Add digit
    const newValue = transferAmount.toString() + value;
    const parsed = Number.parseFloat(newValue);
    if (!isNaN(parsed)) {
      // Limit to 2 decimal places
      transferAmount = Math.round(parsed * 100) / 100;
    }
  }

  updateAmountDisplay();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize amount display
  updateAmountDisplay();

  // Back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard';
    });
  }

  // Numpad buttons
  const numpadBtns = document.querySelectorAll('.numpad-btn');
  numpadBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-value');
      handleNumpadClick(value);
    });
  });

  // Next button
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (transferAmount <= 0) {
        alert('Please enter an amount greater than 0');
        return;
      }

      // Check balance via API
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!data.success || data.user.balance < transferAmount) {
          alert('Insufficient balance');
          return;
        }

        // Store amount in sessionStorage
        sessionStorage.setItem('transferAmount', transferAmount);
        window.location.href = '/recipient';
      } catch (error) {
        console.error('Error checking balance:', error);
        alert('Error verifying balance. Please try again.');
      }
    });
  }
});