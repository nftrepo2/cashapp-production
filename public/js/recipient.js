// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Update transfer title with amount
function updateTransferTitle() {
  const transferAmount = parseFloat(sessionStorage.getItem('transferAmount') || '0');
  const transferTitle = document.getElementById('transfer-title');
  if (transferTitle) {
    transferTitle.textContent = `Send ${formatCurrency(transferAmount)}`;
  }
}

// Fetch recipient details
async function fetchRecipient(query) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      return { success: false, errors: { recipient_account: 'Not authenticated' } };
    }
    const response = await fetch(`/api/user/lookup?query=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    console.log('fetchRecipient response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching recipient:', error);
    return { success: false, errors: { recipient_account: 'Network error' } };
  }
}

// Fetch recent contacts
async function fetchRecentContacts() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/user/recent-contacts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching recent contacts:', error);
    return { success: false, contacts: [] };
  }
}

// Populate suggested contacts
function populateSuggestedContacts(contacts) {
  const suggestedContacts = document.querySelector('.suggested-contacts');
  if (!suggestedContacts) return;

  suggestedContacts.innerHTML = '';

  if (contacts.length === 0) {
    suggestedContacts.innerHTML = '<p>No recent contacts found.</p>';
    return;
  }

  const colors = ['#e67e22', '#c0392b', '#16a085', '#8e44ad', '#2980b9'];

  contacts.forEach((contact, index) => {
    const contactItem = document.createElement('div');
    contactItem.className = 'contact-item';
    if (contact.accNo) {
      contactItem.setAttribute('data-account', contact.accNo);
    }
    const initial = contact.name.charAt(0).toUpperCase();
    const color = colors[index % colors.length];
    contactItem.innerHTML = `
      <div class="contact-avatar" style="background-color: ${color};">${initial}</div>
      <div class="contact-info">
        <div class="contact-name">${contact.name}</div>
        <div class="contact-detail">${contact.accNo ? `Account•${contact.accNo.slice(-4)}` : 'Non-registered'}</div>
      </div>
    `;
    suggestedContacts.appendChild(contactItem);

    contactItem.addEventListener('click', async () => {
      if (contact.accNo) {
        const accountInput = document.getElementById('account-number');
        accountInput.value = contact.accNo;
        const recipientData = await fetchRecipient(contact.accNo);
        updateFormState(recipientData, contact.accNo);
      }
    });
  });
}

// Update form state
function updateFormState(recipientData, inputValue) {
  console.log('updateFormState called with:', { recipientData, inputValue });
  const accountName = document.getElementById('account-name');
  const sendBtn = document.getElementById('send-btn');
  let recipientNameInput = document.getElementById('recipient-name');

  if (recipientNameInput) {
    recipientNameInput.remove();
    recipientNameInput = null;
  }

  if (recipientData.success && recipientData.found && recipientData.user?.fullName) {
    accountName.textContent = recipientData.user.fullName;
    accountName.style.display = 'block';
    accountName.dataset.accNo = recipientData.user.accNo || ''; // Store accNo
    sendBtn.disabled = false;
  } else {
    accountName.textContent = '';
    accountName.style.display = 'none';
    accountName.dataset.accNo = '';

    const accountInputDiv = document.querySelector('.account-input');
    recipientNameInput = document.createElement('input');
    recipientNameInput.type = 'text';
    recipientNameInput.id = 'recipient-name';
    recipientNameInput.placeholder = 'Enter CashApp Tag';
    recipientNameInput.className = 'recipient-name-input';
    accountInputDiv.appendChild(recipientNameInput);

    recipientNameInput.addEventListener('input', () => {
      sendBtn.disabled = !recipientNameInput.value.trim();
    });

    sendBtn.disabled = true;
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  updateTransferTitle();

  fetchRecentContacts().then((data) => {
    if (data.success) {
      populateSuggestedContacts(data.contacts);
    } else {
      populateSuggestedContacts([]);
    }
  });

  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/send';
    });
  }

  const accountInput = document.getElementById('account-number');
  let debounceTimer;
  if (accountInput) {
    accountInput.addEventListener('input', async () => {
      clearTimeout(debounceTimer);
      const query = accountInput.value.trim();
      if (query.length < 3) {
        updateFormState({ success: true, found: false }, query);
        return;
      }

      debounceTimer = setTimeout(async () => {
        const recipientData = await fetchRecipient(query);
        updateFormState(recipientData, query);
      }, 500);
    });
  }

  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const accountName = document.getElementById('account-name');
      const recipientAccount = accountName.dataset.accNo || accountInput.value.trim();
      const note = document.getElementById('note').value.trim();
      const recipientNameInput = document.getElementById('recipient-name');
      const recipientName = recipientNameInput ? recipientNameInput.value.trim() : '';
      const amount = parseFloat(sessionStorage.getItem('transferAmount') || '0');

      console.log('Sending transaction with:', { recipientAccount, amount, note, recipientName });

      if (!recipientAccount || amount <= 0 || isNaN(amount)) {
        alert('Please enter a valid recipient account and amount');
        return;
      }

      if (recipientNameInput && !recipientName) {
        alert('Please enter a recipient name for non-registered accounts');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Not authenticated. Please log in.');
          window.location.href = '/login';
          return;
        }

        const requestBody = {
          recipient_account: recipientAccount,
          amount,
          note,
        };
        if (recipientName) {
          requestBody.recipient_name = recipientName;
        }

        const response = await fetch('/send-money', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log('send-money response:', data);

        if (data.success) {
          sessionStorage.setItem('transactionDetails', JSON.stringify(data.transaction));
          window.location.href = data.redirect;
        } else {
          const errorMessage =
            data.errors.recipient_account ||
            data.errors.amount ||
            data.errors.recipient_name ||
            'Failed to send money';
          alert(errorMessage);
        }
      } catch (error) {
        console.error('Error sending money:', error);
        alert('Network error. Please try again.');
      }
    });
  }
});