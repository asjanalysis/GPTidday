const grants = [
  { name: 'Rural Equity Fund', amount: '$75,000', fit: 94, due: 'Aug 1', tags: ['Ohio', 'food security', 'rural'], note: 'Strong mission and geography match; budget range fits.' },
  { name: 'Community Resilience Mini-Grant', amount: '$20,000', fit: 87, due: 'Jul 22', tags: ['capacity building', 'local'], note: 'Eligible if project includes volunteer training.' },
  { name: 'Youth Wellness Partnership', amount: '$150,000', fit: 72, due: 'Sep 10', tags: ['youth', 'health'], note: 'Possible fit; requires school district partner.' }
];

let expenses = [
  { name: 'Mobile pantry fuel', vendor: 'Northside Fuel', date: '2026-06-03', amount: 318.44, grant: 'Community Health Fund', tags: ['transportation'], invoice: 'fuel-invoice.pdf', proof: 'card-receipt.jpg' },
  { name: 'Art workshop supplies', vendor: 'Creative Market', date: '2026-06-08', amount: 842.10, grant: 'Youth Arts Grant', tags: ['supplies', 'youth'], invoice: 'cm-invoice.pdf', proof: 'ach-confirmation.pdf' }
];

const money = value => Number(value).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

function renderGrants() {
  const mission = document.querySelector('#missionInput').value.toLowerCase();
  const region = document.querySelector('#regionInput').value;
  document.querySelector('#grantMatches').innerHTML = grants.map(grant => `
    <article class="grant-card">
      <header><div><span class="match">${grant.fit}% eligibility fit</span><h3>${grant.name}</h3></div><strong>${grant.amount}</strong></header>
      <p>${grant.note} Search tuned for <strong>${mission || 'your mission'}</strong> in <strong>${region || 'your region'}</strong>.</p>
      <div class="pill-row">${grant.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}<span class="tag">Due ${grant.due}</span></div>
    </article>`).join('');
}

function renderExpenses() {
  const query = document.querySelector('#receiptSearch').value.toLowerCase();
  const filtered = expenses.filter(expense => [expense.vendor, expense.date, expense.amount, expense.name, expense.grant, ...expense.tags].join(' ').toLowerCase().includes(query));
  document.querySelector('#expenseCount').textContent = `${filtered.length} receipt${filtered.length === 1 ? '' : 's'}`;
  document.querySelector('#expenseList').innerHTML = filtered.map(expense => `
    <article class="expense-item">
      <header><strong>${expense.name}</strong><strong>${money(expense.amount)}</strong></header>
      <p>${expense.vendor} · ${expense.date} · ${expense.grant}</p>
      <div class="pill-row">${expense.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
      <small>Invoice: ${expense.invoice || 'not attached'} · Proof: ${expense.proof || 'not attached'}</small>
    </article>`).join('') || '<p>No receipts match that search.</p>';
}

document.querySelector('#grantSearchForm').addEventListener('submit', event => { event.preventDefault(); renderGrants(); });
document.querySelector('#receiptSearch').addEventListener('input', renderExpenses);
document.querySelector('#seedExpenseButton').addEventListener('click', () => {
  expenses.unshift({ name: 'Volunteer background checks', vendor: 'SafeHire', date: '2026-06-18', amount: 129.00, grant: 'Rural Equity Fund', tags: ['compliance', 'volunteers'], invoice: 'safehire.pdf', proof: 'bank-confirmation.pdf' });
  renderExpenses();
});
document.querySelector('#expenseForm').addEventListener('submit', event => {
  event.preventDefault();
  expenses.unshift({
    name: document.querySelector('#expenseName').value,
    vendor: document.querySelector('#vendorName').value,
    date: document.querySelector('#expenseDate').value,
    amount: document.querySelector('#expenseAmount').value,
    grant: document.querySelector('#grantName').value,
    tags: document.querySelector('#expenseTags').value.split(',').map(tag => tag.trim()).filter(Boolean),
    invoice: document.querySelector('#invoiceFile').files[0]?.name,
    proof: document.querySelector('#paymentFile').files[0]?.name
  });
  event.target.reset();
  renderExpenses();
});
document.querySelector('#proposalForm').addEventListener('submit', event => {
  event.preventDefault();
  const title = document.querySelector('#proposalTitle').value;
  const need = document.querySelector('#needStatement').value;
  const goals = document.querySelector('#proposalGoals').value;
  document.querySelector('#proposalOutput').textContent = `Proposal outline: ${title}\n\n1. Need: ${need}\n2. Program plan: ${goals}\n3. Budget narrative: Connect each cost to measurable outcomes.\n4. Evaluation: Define outputs, outcomes, and reporting cadence.\n5. AI next step: Copy this outline into ChatGPT or Claude using your own account for edits.`;
});

renderGrants();
renderExpenses();
