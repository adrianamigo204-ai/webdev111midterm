// Nexus Events interactions

document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const page = body.dataset.page;

  if (page) {
    const activeLink = document.querySelector(`[data-nav="${page}"]`);
    if (activeLink) activeLink.classList.add('active');
  }

  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const partyBtn = document.querySelector('[data-party-toggle]');
  if (partyBtn) {
    const setLabel = () => {
      partyBtn.textContent = body.classList.contains('party') ? 'Party Mode: ON' : 'Party Mode: OFF';
    };
    partyBtn.addEventListener('click', () => {
      body.classList.toggle('party');
      setLabel();
    });
    setLabel();
  }

  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-event-card]'));
  const searchInput = document.querySelector('[data-search]');
  let activeFilter = 'all';

  const applyFilters = () => {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    cards.forEach(card => {
      const tags = (card.dataset.tags || '').toLowerCase();
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const matchesFilter = activeFilter === 'all' || tags.includes(activeFilter);
      const matchesSearch = !query || title.includes(query) || tags.includes(query);
      card.style.display = (matchesFilter && matchesSearch) ? '' : 'none';
    });
  };

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter || 'all';
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  if (searchInput) searchInput.addEventListener('input', applyFilters);

  const ticketRows = document.querySelectorAll('[data-ticket-row]');
  const totalEl = document.querySelector('[data-total]');

  const updateTotal = () => {
    let total = 0;
    ticketRows.forEach(row => {
      const qtyInput = row.querySelector('[data-qty]');
      const price = Number(row.dataset.price || 0);
      const qty = Number(qtyInput ? qtyInput.value : 0);
      total += price * qty;
    });
    if (totalEl) {
      totalEl.textContent = total.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      });
    }
  };

  ticketRows.forEach(row => {
    const minus = row.querySelector('[data-qty-minus]');
    const plus = row.querySelector('[data-qty-plus]');
    const input = row.querySelector('[data-qty]');

    const clamp = () => {
      if (!input) return;
      const val = Math.max(0, Math.min(9, Number(input.value || 0)));
      input.value = String(val);
    };

    if (input) {
      input.addEventListener('change', () => {
        clamp();
        updateTotal();
      });
    }

    if (minus && input) {
      minus.addEventListener('click', () => {
        input.value = String(Math.max(0, Number(input.value || 0) - 1));
        updateTotal();
      });
    }

    if (plus && input) {
      plus.addEventListener('click', () => {
        input.value = String(Math.min(9, Number(input.value || 0) + 1));
        updateTotal();
      });
    }
  });

  if (ticketRows.length) updateTotal();

  document.querySelectorAll('[data-accordion]').forEach(section => {
    const items = section.querySelectorAll('.accordion-item');
    items.forEach(item => {
      const btn = item.querySelector('button');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  });

  const pulse = document.querySelector('[data-pulse]');
  if (pulse) {
    setInterval(() => {
      pulse.classList.toggle('pulse');
    }, 1400);
  }
});
