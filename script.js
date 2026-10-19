(() => {
  const STATUS_PREFIX = 'kerkbode-status-v2-';
  const ADDRESS_PREFIX = 'kerkbode-addresses-v1-';
  const cloudConfig = window.KERKBODE_CONFIG || {};
  const cloudConfigured = Boolean(cloudConfig.url && cloudConfig.anonKey && window.supabase?.createClient);
  const cloud = cloudConfigured ? window.supabase.createClient(cloudConfig.url, cloudConfig.anonKey) : null;
  const routes = {
    wijk1: { title: 'Wijk 1', people: 'Jeroen & Elize', data: wijk1Data.map((item) => ({ ...item })) },
    wijk2: { title: 'Wijk 2', people: 'Jaco & Jo-Anneke', data: wijk2Data.map((item) => ({ ...item })) }
  };
  const status = { wijk1: {}, wijk2: {} };
  let activeWijk = 'wijk1';
  let activeFilter = 'all';
  let editMode = false;
  let isAdmin = false;
  let insertionAnchor = null;
  let editingItem = null;
  let deletingItem = null;
  let remoteAddressesEmpty = false;
  let remoteLoadBusy = false;

  const list = document.querySelector('#address-list');
  const search = document.querySelector('#search');
  const progress = document.querySelector('.progress-track');
  const emptyState = document.querySelector('#empty-state');
  const resetDialog = document.querySelector('#reset-dialog');
  const addressDialog = document.querySelector('#address-dialog');
  const deleteDialog = document.querySelector('#delete-dialog');
  const addressForm = document.querySelector('#address-form');
  const adminButton = document.querySelector('#admin-button');
  const adminDialog = document.querySelector('#admin-dialog');
  const adminForm = document.querySelector('#admin-form');
  const adminError = document.querySelector('#admin-error');
  const syncStatus = document.querySelector('#sync-status');
  const seedButton = document.querySelector('#seed-addresses');

  function setSyncMessage(message, type = '') {
    syncStatus.textContent = message;
    syncStatus.classList.toggle('is-error', type === 'error');
    syncStatus.classList.toggle('is-success', type === 'success');
  }

  function remoteAddress(item, wijk, sortOrder) {
    return {
      id: item.id || crypto.randomUUID(),
      wijk,
      name: item.name,
      address: item.address,
      comment: item.comment || '',
      sort_order: sortOrder
    };
  }

  async function loadSharedData({ quiet = false } = {}) {
    if (!cloudConfigured || remoteLoadBusy) return;
    remoteLoadBusy = true;
    try {
      const { data: addressRows, error: addressError } = await cloud
        .from('addresses').select('id,wijk,name,address,comment,sort_order').order('wijk').order('sort_order');
      if (addressError) throw addressError;
      remoteAddressesEmpty = addressRows.length === 0;
      seedButton.hidden = !remoteAddressesEmpty || !isAdmin;
      if (remoteAddressesEmpty) {
        if (!quiet) setSyncMessage(isAdmin ? 'De gedeelde lijst is nog leeg. Importeer de startadressen vanaf dit apparaat.' : 'De gedeelde lijst wordt door de beheerder klaargezet.');
        return;
      }
      const { data: statusRows, error: statusError } = await cloud
        .from('delivery_status').select('address_id,delivered');
      if (statusError) throw statusError;
      for (const wijk of Object.keys(routes)) {
        const rows = addressRows.filter((item) => item.wijk === wijk);
        routes[wijk].data = rows.map((item) => ({ ...item }));
        const statusById = new Map(statusRows.map((item) => [item.address_id, item.delivered]));
        status[wijk] = {};
        rows.forEach((item) => {
          if (statusById.get(item.id) === true) status[wijk][addressKey(item)] = true;
        });
      }
      render();
      if (!quiet) setSyncMessage('Gedeelde lijst is bijgewerkt.', 'success');
    } catch (error) {
      setSyncMessage(`Synchroniseren lukt niet: ${error.message || 'controleer de Supabase-instellingen.'}`, 'error');
    } finally {
      remoteLoadBusy = false;
    }
  }

  async function saveSharedAddresses(wijk) {
    const payload = routes[wijk].data.map((item, index) => remoteAddress(item, wijk, index));
    payload.forEach((item, index) => Object.assign(routes[wijk].data[index], { id: item.id, sort_order: item.sort_order }));
    const { error } = await cloud.from('addresses').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* De lijst blijft in deze sessie bruikbaar. */ }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch { /* De lijst blijft in deze sessie bruikbaar. */ }
  }

  function addressKey(item) {
    return `${item.name}\u0000${item.address}`;
  }

  function saveStatus(wijk) {
    storageSet(STATUS_PREFIX + wijk, JSON.stringify(status[wijk]));
  }

  function saveAddresses(wijk) {
    const cleanData = routes[wijk].data.map(({ name, address, comment }) => ({ name, address, comment }));
    storageSet(ADDRESS_PREFIX + wijk, JSON.stringify(cleanData));
  }

  function loadAddresses(wijk) {
    const currentKey = ADDRESS_PREFIX + wijk;
    const saved = storageGet(currentKey);
    const legacySaved = saved === null ? storageGet(`${wijk}Data`) : null;
    const value = saved === null ? legacySaved : saved;
    if (value === null) return;

    try {
      const rows = JSON.parse(value);
      if (Array.isArray(rows)) {
        const savedRows = rows
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            name: String(item.name || ''),
            address: String(item.address || ''),
            comment: String(item.comment || ''),
            delivered: item.delivered === true
          }))
          .filter((item) => item.name && item.address);
        // An empty saved list can result from a previous failed load. Keep the
        // bundled address list and repair storage instead of showing 0 / 0.
        if (savedRows.length > 0) routes[wijk].data = savedRows;
        saveAddresses(wijk);
      }
    } catch { /* Gebruik de ingebouwde startlijst als lokale gegevens ongeldig zijn. */ }
    if (legacySaved !== null) storageRemove(`${wijk}Data`);
  }

  function loadStatus(wijk) {
    const saved = storageGet(STATUS_PREFIX + wijk);
    let priorStatus = {};
    if (saved !== null) {
      try { priorStatus = JSON.parse(saved) || {}; } catch { priorStatus = {}; }
    }

    routes[wijk].data.forEach((item, index) => {
      const key = addressKey(item);
      const oldCheckbox = storageGet(`checkbox-status-${wijk}-${index}`);
      let delivered = priorStatus[key] === true || item.delivered === true;
      try { if (oldCheckbox !== null) delivered = JSON.parse(oldCheckbox) === true; } catch { /* Behoud de eerder bekende status. */ }
      if (delivered) status[wijk][key] = true;
      storageRemove(`checkbox-status-${wijk}-${index}`);
    });
    saveStatus(wijk);
  }

  function normalized(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('nl');
  }

  function createAction(label, symbol, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `row-action ${className}`;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = symbol;
    button.addEventListener('click', handler);
    return button;
  }

  function makeCard(item, index) {
    const key = addressKey(item);
    const delivered = status[activeWijk][key] === true;
    const row = document.createElement('tr');
    row.className = `address-row${delivered ? ' is-delivered' : ''}${insertionAnchor === item ? ' is-insertion-anchor' : ''}`;
    row.dataset.index = String(index);

    const insertCell = document.createElement('td');
    insertCell.className = 'td-insert';
    if (editMode) {
      const insertButton = createAction(`Kies invoegplek onder ${item.name}`, '↳', 'insert-point', () => {
        insertionAnchor = item;
        render();
      });
      insertButton.setAttribute('aria-pressed', String(insertionAnchor === item));
      insertCell.append(insertButton);
    }

    const checkWrap = document.createElement('label');
    checkWrap.className = 'check-wrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = delivered;
    checkbox.setAttribute('aria-label', `Bezorgd: ${item.name}, ${item.address}`);
    const visual = document.createElement('span');
    visual.className = 'check-visual';
    visual.setAttribute('aria-hidden', 'true');
    visual.textContent = '✓';
    checkWrap.append(checkbox, visual);
    checkbox.addEventListener('change', () => {
      status[activeWijk][key] = checkbox.checked;
      row.classList.toggle('is-delivered', checkbox.checked);
      saveStatus(activeWijk);
      if (activeFilter === 'todo' && checkbox.checked) render();
      else updateProgress();
      if (cloudConfigured && item.id) {
        cloud.from('delivery_status').upsert({ address_id: item.id, delivered: checkbox.checked, updated_at: new Date().toISOString() }, { onConflict: 'address_id' })
          .then(({ error }) => {
            if (error) throw error;
            setSyncMessage('Bezorgstatus is gedeeld.', 'success');
          })
          .catch((error) => {
            setSyncMessage(`Bezorgstatus kon niet worden gedeeld: ${error.message}`, 'error');
            loadSharedData({ quiet: true });
          });
      }
    });

    const name = document.createElement('td');
    name.className = 'td-name';
    name.textContent = item.name;
    const address = document.createElement('span');
    address.className = 'address-line';
    address.textContent = item.address;
    const addressCell = document.createElement('td');
    addressCell.className = 'td-address';
    addressCell.append(address);

    const noteCell = document.createElement('td');
    noteCell.className = 'td-comment';
    if (item.comment) {
      const note = document.createElement('span');
      note.className = 'address-note';
      note.textContent = item.comment;
      noteCell.append(note);
    } else {
      noteCell.classList.add('is-empty');
      noteCell.textContent = '—';
    }

    const deliveredCell = document.createElement('td');
    deliveredCell.className = 'td-delivered';
    deliveredCell.append(checkWrap);

    const actions = document.createElement('span');
    actions.className = 'row-actions';
    if (editMode) {
      actions.append(
        createAction(`Bewerk ${item.name}`, '✎', 'edit-action', () => openAddressDialog(item)),
        createAction(`Verwijder ${item.name}`, '×', 'remove-action', () => openDeleteDialog(item))
      );
    }
    const actionsCell = document.createElement('td');
    actionsCell.className = 'td-actions';
    actionsCell.append(actions);
    row.append(insertCell, name, addressCell, noteCell, deliveredCell, actionsCell);
    return row;
  }

  function updateProgress() {
    const route = routes[activeWijk];
    const delivered = route.data.filter((item) => status[activeWijk][addressKey(item)] === true).length;
    document.querySelector('#progress-count').textContent = String(delivered);
    document.querySelector('#progress-total').textContent = ` / ${route.data.length}`;
    const percentage = route.data.length ? Math.round((delivered / route.data.length) * 100) : 0;
    document.querySelector('#progress-fill').style.width = `${percentage}%`;
    progress.setAttribute('aria-valuenow', String(percentage));
    document.querySelector('#count-wijk1').textContent = String(routes.wijk1.data.length);
    document.querySelector('#count-wijk2').textContent = String(routes.wijk2.data.length);
  }

  function render() {
    const route = routes[activeWijk];
    adminButton.hidden = !cloudConfigured;
    adminButton.textContent = isAdmin ? 'Beheerder afmelden' : 'Beheerder aanmelden';
    document.querySelector('#edit-mode-button').hidden = cloudConfigured && !isAdmin;
    document.querySelector('.address-table').classList.toggle('is-editing', editMode);
    document.querySelector('#edit-mode-button').setAttribute('aria-pressed', String(editMode));
    document.querySelector('#edit-mode-label').textContent = editMode ? 'Bewerken stoppen' : 'Bewerken';
    document.querySelector('#add-address').hidden = !editMode || (cloudConfigured && !isAdmin);
    seedButton.hidden = !cloudConfigured || !remoteAddressesEmpty || !isAdmin;
    document.querySelector('#add-address-label').textContent = insertionAnchor ? 'Hieronder toevoegen' : 'Adres toevoegen';
    const insertHint = document.querySelector('#insert-hint');
    insertHint.hidden = !editMode;
    insertHint.textContent = insertionAnchor
      ? `Nieuw adres komt direct onder ${insertionAnchor.name}.`
      : 'Kies links bij een adres ↳ als invoegplek. Zonder keuze komt het nieuwe adres onderaan.';
    const term = normalized(search.value.trim());
    const matches = route.data.filter((item) => {
      const delivered = status[activeWijk][addressKey(item)] === true;
      const matchesStatus = activeFilter === 'all' || !delivered;
      const matchesTerm = !term || normalized(`${item.name} ${item.address} ${item.comment || ''}`).includes(term);
      return matchesStatus && matchesTerm;
    });
    list.replaceChildren(...matches.map(makeCard));
    emptyState.hidden = matches.length > 0;
    emptyState.textContent = activeFilter === 'todo' && !term
      ? 'Alles is bezorgd in deze wijk.'
      : 'Geen adressen gevonden. Probeer een andere zoekterm.';
    document.querySelector('#visible-count').textContent = `${matches.length} ${matches.length === 1 ? 'adres' : 'adressen'}`;
    document.querySelector('#route-title').textContent = route.title;
    document.querySelector('#route-people').textContent = `Bezorgers: ${route.people}`;
    updateProgress();
  }

  function chooseWijk(wijk) {
    activeWijk = wijk;
    insertionAnchor = null;
    document.querySelectorAll('.route-tab').forEach((tab) => {
      const selected = tab.dataset.wijk === wijk;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelector('#wijk-panel').setAttribute('aria-labelledby', `tab-${wijk}`);
    render();
  }

  function openAddressDialog(item = null) {
    editingItem = item;
    addressForm.reset();
    document.querySelector('#address-dialog-title').textContent = item ? 'Adres aanpassen' : 'Adres toevoegen';
    document.querySelector('#address-dialog-copy').textContent = item
      ? `Pas de gegevens van ${item.name} aan.`
      : insertionAnchor
        ? `Het nieuwe adres komt direct onder ${insertionAnchor.name}.`
        : `Het nieuwe adres komt onderaan ${routes[activeWijk].title.toLowerCase()}.`;
    if (item) {
      document.querySelector('#field-name').value = item.name;
      document.querySelector('#field-address').value = item.address;
      document.querySelector('#field-comment').value = item.comment || '';
    }
    addressDialog.showModal();
    document.querySelector('#field-name').focus();
  }

  function openDeleteDialog(item) {
    deletingItem = item;
    document.querySelector('#delete-dialog-copy').textContent = `${item.name} — ${item.address} wordt uit ${routes[activeWijk].title.toLowerCase()} verwijderd.`;
    deleteDialog.showModal();
  }

  document.querySelectorAll('.route-tab').forEach((tab) => {
    tab.addEventListener('click', () => chooseWijk(tab.dataset.wijk));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'wijk1' : event.key === 'End' ? 'wijk2' : activeWijk === 'wijk1' ? 'wijk2' : 'wijk1';
      chooseWijk(next);
      document.querySelector(`#tab-${next}`).focus();
    });
  });

  document.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('.filter-button').forEach((option) => {
        const selected = option === button;
        option.classList.toggle('is-selected', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      render();
    });
  });

  search.addEventListener('input', render);
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== search && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
  });

  document.querySelector('#edit-mode-button').addEventListener('click', () => {
    if (cloudConfigured && !isAdmin) return;
    editMode = !editMode;
    if (!editMode) insertionAnchor = null;
    render();
  });
  document.querySelector('#add-address').addEventListener('click', () => openAddressDialog());
  adminButton.addEventListener('click', async () => {
    if (!cloudConfigured) return;
    if (isAdmin) {
      try {
        const { error } = await cloud.auth.signOut();
        if (error) throw error;
      } catch (error) {
        setSyncMessage(`Afmelden lukt niet: ${error.message}`, 'error');
      }
      return;
    }
    adminError.hidden = true;
    adminForm.reset();
    adminDialog.showModal();
  });
  document.querySelector('#cancel-admin').addEventListener('click', () => adminDialog.close());
  adminForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    adminError.hidden = true;
    try {
      const { error } = await cloud.auth.signInWithPassword({
        email: document.querySelector('#admin-email').value.trim(),
        password: document.querySelector('#admin-password').value
      });
      if (error) throw error;
      adminDialog.close();
      document.querySelector('#admin-password').value = '';
    } catch {
      adminError.textContent = 'Aanmelden is niet gelukt. Controleer je e-mailadres en wachtwoord.';
      adminError.hidden = false;
    }
  });
  seedButton.addEventListener('click', async () => {
    if (!cloudConfigured || !isAdmin || !remoteAddressesEmpty) return;
    seedButton.disabled = true;
    setSyncMessage('Startadressen worden gedeeld…');
    try {
      const seedRows = Object.keys(routes).flatMap((wijk) => routes[wijk].data.map((item, index) => remoteAddress(item, wijk, index)));
      const { data, error } = await cloud.from('addresses').insert(seedRows).select('id,wijk,name,address');
      if (error) throw error;
      const statusRows = data
        .filter((item) => status[item.wijk][addressKey(item)] === true)
        .map((item) => ({ address_id: item.id, delivered: true }));
      if (statusRows.length) {
        const { error: statusError } = await cloud.from('delivery_status').upsert(statusRows, { onConflict: 'address_id' });
        if (statusError) throw statusError;
      }
      await loadSharedData({ quiet: true });
      setSyncMessage('Startadressen en bestaande bezorgvinkjes zijn gedeeld.', 'success');
    } catch (error) {
      setSyncMessage(`Startadressen konden niet worden gedeeld: ${error.message}`, 'error');
    } finally {
      seedButton.disabled = false;
    }
  });
  document.querySelector('#cancel-address').addEventListener('click', () => addressDialog.close());
  addressForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const updated = {
      name: document.querySelector('#field-name').value.trim(),
      address: document.querySelector('#field-address').value.trim(),
      comment: document.querySelector('#field-comment').value.trim()
    };
    if (!updated.name || !updated.address) return;
    const rows = routes[activeWijk].data;
    const duplicate = rows.some((row) => row !== editingItem && normalized(row.address) === normalized(updated.address));
    const addressField = document.querySelector('#field-address');
    addressField.setCustomValidity(duplicate ? 'Dit adres staat al in deze wijk.' : '');
    if (duplicate) { addressField.reportValidity(); return; }
    if (cloudConfigured && !isAdmin) {
      setSyncMessage('Log in als beheerder om adressen aan te passen.', 'error');
      return;
    }
    if (editingItem) {
      const oldKey = addressKey(editingItem);
      Object.assign(editingItem, updated);
      const newKey = addressKey(editingItem);
      if (status[activeWijk][oldKey]) status[activeWijk][newKey] = true;
      delete status[activeWijk][oldKey];
      saveStatus(activeWijk);
    } else {
      updated.id = crypto.randomUUID();
      const anchorIndex = insertionAnchor ? rows.indexOf(insertionAnchor) : -1;
      rows.splice(anchorIndex >= 0 ? anchorIndex + 1 : rows.length, 0, updated);
      insertionAnchor = updated;
      search.value = '';
    }
    saveAddresses(activeWijk);
    if (cloudConfigured) {
      try {
        await saveSharedAddresses(activeWijk);
      } catch (error) {
        setSyncMessage(`Adres kon niet worden opgeslagen: ${error.message}`, 'error');
        await loadSharedData({ quiet: true });
        return;
      }
    }
    addressDialog.close();
    render();
  });
  document.querySelector('#address-form').addEventListener('input', () => document.querySelector('#field-address').setCustomValidity(''));

  document.querySelector('#confirm-delete').addEventListener('click', async (event) => {
    event.preventDefault();
    if (!deletingItem) return;
    const key = addressKey(deletingItem);
    if (cloudConfigured) {
      if (!isAdmin) return;
      const { error } = await cloud.from('addresses').delete().eq('id', deletingItem.id);
      if (error) {
        setSyncMessage(`Adres kon niet worden verwijderd: ${error.message}`, 'error');
        return;
      }
    }
    if (insertionAnchor === deletingItem) insertionAnchor = null;
    routes[activeWijk].data = routes[activeWijk].data.filter((item) => item !== deletingItem);
    delete status[activeWijk][key];
    saveAddresses(activeWijk);
    saveStatus(activeWijk);
    deletingItem = null;
    deleteDialog.close();
    render();
  });

  document.querySelector('#reset-button').addEventListener('click', () => resetDialog.showModal());
  document.querySelector('#confirm-reset').addEventListener('click', async (event) => {
    event.preventDefault();
    status[activeWijk] = {};
    saveStatus(activeWijk);
    if (cloudConfigured) {
      const payload = routes[activeWijk].data.map((item) => ({ address_id: item.id, delivered: false, updated_at: new Date().toISOString() }));
      const { error } = await cloud.from('delivery_status').upsert(payload, { onConflict: 'address_id' });
      if (error) {
        setSyncMessage(`Voortgang kon niet worden gewist: ${error.message}`, 'error');
        await loadSharedData({ quiet: true });
        return;
      }
    }
    resetDialog.close();
    render();
  });

  Object.keys(routes).forEach((wijk) => {
    loadAddresses(wijk);
    loadStatus(wijk);
  });
  document.querySelectorAll('.route-tab').forEach((tab) => { tab.tabIndex = tab.dataset.wijk === activeWijk ? 0 : -1; });
  if (!cloudConfigured) {
    setSyncMessage('Nog niet gekoppeld aan gedeelde opslag. Wijzigingen blijven op dit apparaat.', 'error');
  }
  render();
  if (cloudConfigured) {
    if (!cloud) setSyncMessage('De cloudbibliotheek is niet geladen. Controleer je internetverbinding.', 'error');
    else {
      cloud.auth.onAuthStateChange((_event, session) => {
        isAdmin = Boolean(session?.user);
        if (!isAdmin) editMode = false;
        render();
        loadSharedData();
      });
      cloud.auth.getSession().then(({ data, error }) => {
        if (error) throw error;
        isAdmin = Boolean(data.session?.user);
        render();
        return loadSharedData();
      }).catch((error) => setSyncMessage(`Verbinding lukt niet: ${error.message}`, 'error'));
      window.setInterval(() => {
        if (document.visibilityState === 'visible' && !editMode && !addressDialog.open && !deleteDialog.open) loadSharedData({ quiet: true });
      }, 10000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !editMode) loadSharedData({ quiet: true });
      });
    }
  }
})();
