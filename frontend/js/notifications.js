// ─── LOAD NOTIFICATIONS ───
const loadNotifications = async () => {
  const result = await notificationsAPI.getAll();
  if (!result || !result.ok) return;

  const { notifications, unread_count } = result.data;

  // Update badge count
  const badge = document.getElementById('notif-count');
  if (unread_count > 0) {
    badge.textContent = unread_count > 9 ? '9+' : unread_count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }

  // Render notification list
  const list = document.getElementById('notif-list');

  if (notifications.length === 0) {
    list.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:14px;">
        No notifications yet
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div 
      class="notification-item ${n.is_read ? '' : 'unread'}"
      onclick="markOneRead('${n.id}', this)"
    >
      <div style="font-size:13px; color:var(--text); margin-bottom:4px;">${n.message}</div>
      <div style="font-size:11px; color:var(--text-muted);">
        ${new Date(n.created_at).toLocaleString()}
      </div>
    </div>
  `).join('');
};

// ─── TOGGLE DROPDOWN ───
const toggleNotifications = () => {
  document.getElementById('notif-dropdown').classList.toggle('open');
};

// ─── MARK ONE AS READ ───
const markOneRead = async (id, element) => {
  await notificationsAPI.markRead(id);
  element.classList.remove('unread');
  loadNotifications();
};

// ─── MARK ALL AS READ ───
const markAllRead = async () => {
  await notificationsAPI.markAllRead();
  loadNotifications();
  showToast('All notifications marked as read.', 'success');
};

// ─── POLL FOR NEW NOTIFICATIONS ───
// Check for new notifications every 30 seconds
setInterval(loadNotifications, 30000);