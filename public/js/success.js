// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

document.addEventListener('DOMContentLoaded', () => {
  // Get transaction details from sessionStorage
  const transactionDetails = JSON.parse(sessionStorage.getItem('transactionDetails') || '{}');

  // Update success message
  const successMessage = document.getElementById('success-message');
  if (successMessage) {
    const amount = transactionDetails.amount || 0;
    const recipientName = transactionDetails.recipientName || 'Unknown';
    successMessage.textContent = `${formatCurrency(amount)} to ${recipientName}`;
  }

  // Add note if available
  const successNote = document.getElementById('success-note');
  if (successNote && transactionDetails.note) {
    successNote.textContent = `For: ${transactionDetails.note}`;
    successNote.style.display = 'block';
  }

  // Done button
  const doneBtn = document.getElementById('done-btn');
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      // Clear sessionStorage
      sessionStorage.removeItem('transferAmount');
      sessionStorage.removeItem('transactionDetails');
      // Redirect to dashboard
      window.location.href = '/dashboard';
    });
  }
});