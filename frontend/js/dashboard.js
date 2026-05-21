const buildSidebar = (role) => {
  const user = requireAuth();

  const navItems = {
    teacher: [
      { icon: 'layout-dashboard', label: 'Dashboard',        href: '/pages/teacher/dashboard.html' },
      { icon: 'calendar-plus',    label: 'My Bookings',      href: '/pages/teacher/bookings.html'  },
      { icon: 'door-open',        label: 'Rooms & Schedule', href: '/pages/teacher/rooms.html'     },
    ],
    student: [
      { icon: 'layout-dashboard', label: 'Dashboard',        href: '/pages/student/dashboard.html' },
      { icon: 'door-open',        label: 'Room Schedule',    href: '/pages/student/rooms.html'     },
    ],
    admin: [
      { icon: 'layout-dashboard', label: 'Dashboard',        href: '/pages/admin/dashboard.html'   },
      { icon: 'calendar-check',   label: 'All Bookings',     href: '/pages/admin/bookings.html'    },
      { icon: 'door-open',        label: 'Manage Rooms',     href: '/pages/admin/rooms.html'       },
      { icon: 'users',            label: 'Manage Users',     href: '/pages/admin/users.html'       },
    ]
  };

  const items       = navItems[role] || [];
  const currentPath = window.location.pathname;

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        <i data-lucide="building-2" style="color:white; width:20px; height:20px;"></i>
      </div>
      <span class="sidebar-logo-text">ClassBook</span>
    </div>

    <nav class="sidebar-nav">
      ${items.map(item => `
        <a href="${item.href}" class="nav-item ${currentPath.includes(item.href.split('/').pop()) ? 'active' : ''}">
          <i data-lucide="${item.icon}" style="width:18px; height:18px;"></i>
          ${item.label}
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-user-info">
        <div class="sidebar-avatar">
          ${user.full_name.charAt(0).toUpperCase()}
        </div>
        <div style="overflow:hidden;">
          <div class="sidebar-user-name">${user.full_name}</div>
          <div class="sidebar-user-role">${user.role}</div>
        </div>
      </div>
      <button onclick="logout()" class="nav-item" style="color:var(--error);">
        <i data-lucide="log-out" style="width:18px; height:18px;"></i>
        Sign Out
      </button>
    </div>
  `;

  lucide.createIcons();
  buildMobileNav(role, items, currentPath);
};

const buildMobileNav = (role, items, currentPath) => {
  const mobileNav = document.getElementById('mobile-nav');
  if (!mobileNav) return;

  mobileNav.innerHTML = items.map(item => `
    <a href="${item.href}" class="mobile-nav-item ${currentPath.includes(item.href.split('/').pop()) ? 'active' : ''}">
      <i data-lucide="${item.icon}" style="width:22px; height:22px;"></i>
      ${item.label.split(' ')[0]}
    </a>
  `).join('') + `
    <button onclick="logout()" class="mobile-nav-item" style="color:var(--error); background:none; border:none; font-family:'Inter',sans-serif;">
      <i data-lucide="log-out" style="width:22px; height:22px;"></i>
      Logout
    </button>
  `;

  lucide.createIcons();
};

const buildTopbar = (title) => {
  const topbar = document.getElementById('topbar');
  topbar.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <button class="mobile-menu-btn" onclick="toggleMobileSidebar()" id="menu-btn">
        <i data-lucide="menu" style="width:18px; height:18px;"></i>
      </button>
      <h1 class="topbar-title">${title}</h1>
    </div>

    <div class="topbar-actions">
      <button onclick="toggleTheme()" class="theme-btn">
        <i data-lucide="sun-moon" style="width:16px; height:16px;"></i>
      </button>

      <div style="position:relative;" id="notification-wrapper">
        <div class="notification-bell" onclick="toggleNotifications()" id="bell-btn">
          <i data-lucide="bell" style="width:20px; height:20px;"></i>
          <span class="notification-badge" id="notif-count" style="display:none;">0</span>
        </div>

        <div class="notification-dropdown" id="notif-dropdown">
          <div class="notification-header">
            <span>Notifications</span>
            <button onclick="markAllRead()" style="font-size:12px; color:var(--primary); background:none; border:none; cursor:pointer; font-weight:600; font-family:'Inter',sans-serif;">
              Mark all read
            </button>
          </div>
          <div id="notif-list" style="max-height:320px; overflow-y:auto;">
            <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:14px;">
              Loading...
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
  loadNotifications();
};

const toggleMobileSidebar = () => {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('active');
};

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('notification-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    document.getElementById('notif-dropdown')?.classList.remove('open');
  }
});