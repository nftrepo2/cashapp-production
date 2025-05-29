// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Unknown Date';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Load transactions
async function loadTransactions() {
  const userJson = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  if (!userJson || !token) {
    window.location.href = '/login';
    return;
  }

  const user = JSON.parse(userJson);
  const transactionsContainer = document.getElementById('transactions');
  transactionsContainer.innerHTML = '<div class="loading">Loading transactions...</div>';

  try {
    const response = await fetch('/api/transactions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        displayTransactions(data.transactions, user.accNo);
      } else {
        throw new Error('Failed to load transactions');
      }
    } else {
      throw new Error('Failed to load transactions');
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    transactionsContainer.innerHTML = `
      <div class="no-transactions">
        <p>Failed to load transactions. <button id="retry-btn">Try Again</button></p>
      </div>
    `;
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadTransactions);
    }
  }
}

// Display transactions
function displayTransactions(transactions, userAccNo) {
  const transactionsContainer = document.getElementById('transactions');

  if (!transactions || transactions.length === 0) {
    transactionsContainer.innerHTML = `
      <div class="no-transactions">
        <p>No transactions yet</p>
      </div>
    `;
    return;
  }

  transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  let html = '';

  transactions.forEach((transaction) => {
    const isCredit = !transaction.isSent && transaction.recipientAccountNumber === userAccNo;
    const transactionType = isCredit ? 'credit' : 'debit';
    const icon = isCredit ? 'arrow-down' : 'arrow-up';
    const title = isCredit
      ? `Received from ${transaction.senderName || 'Unknown'}`
      : `Sent to ${transaction.recipientName || 'Unknown'}`;
    const note = transaction.note ? `<div class="transaction-note">Note: ${transaction.note}</div>` : '';

    html += `
      <div class="transaction">
        <div class="transaction-icon ${transactionType}">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="transaction-details">
          <div class="transaction-title">${title}</div>
          <div class="transaction-date">${formatDate(transaction.timestamp)}</div>
          ${note}
        </div>
        <div class="transaction-amount ${transactionType}">
          ${isCredit ? '+' : '-'}${formatCurrency(transaction.amount)}
        </div>
      </div>
    `;
  });

  transactionsContainer.innerHTML = html;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();

  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/dashboard';
    });
  }
});