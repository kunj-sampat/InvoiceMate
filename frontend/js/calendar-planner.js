// js/calendar-planner.js
// Interactive Full-Month Calendar & Daily Task Planner for InvoiceMate
// Matches Invoza Frosted-Glass Aesthetic • 100% Client-Side Persistence

(function (window) {
  'use strict';

  const STORAGE_KEY = 'invoicemate_calendar_tasks';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let activeYear = new Date().getFullYear();
  let activeMonth = new Date().getMonth(); // 0-11
  let selectedDateKey = toDateKey(new Date()); // YYYY-MM-DD

  function toDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getStoredTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse calendar tasks', e);
    }

    // Default starter tasks for business owners
    const todayKey = toDateKey(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = toDateKey(tomorrow);

    const initial = {};
    initial[todayKey] = [
      { id: 't1', title: 'Follow up with client on pending invoice payment', time: '11:30', isAllDay: false, completed: false },
      { id: 't2', title: 'Review operational expenses and tax receipts', time: '', isAllDay: true, completed: false }
    ];
    initial[tomorrowKey] = [
      { id: 't3', title: 'GST GSTR-1 preparation & reconciliation', time: '15:00', isAllDay: false, completed: false }
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  function saveStoredTasks(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save calendar tasks', e);
    }
  }

  // --- Modal Injection ---
  function ensureCalendarModal() {
    let overlay = document.getElementById('invoza-calendar-modal');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'invoza-calendar-modal';
    overlay.className = 'modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '99999';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.45)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.webkitBackdropFilter = 'blur(4px)';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="calendar-modal-box">
        <!-- Modal Top Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 26px; border-bottom: 1px solid var(--color-border); background: var(--color-bg);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(32, 86, 70, 0.12); display: flex; align-items: center; justify-content: center; color: #205646;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--color-text);">Calendar &amp; Task Planner</h3>
              <span style="font-size: 11.5px; color: var(--color-text-tertiary);">Schedule invoice follow-ups, tax deadlines, and client meetings</span>
            </div>
          </div>
          <button class="modal-close" id="close-calendar-modal" style="font-size: 24px; line-height: 1; border: none; background: transparent; cursor: pointer; color: var(--color-text-tertiary);">&times;</button>
        </div>

        <!-- Main Two-Column View -->
        <div class="calendar-planner-grid">
          
          <!-- Left: Full Month View -->
          <div class="calendar-view-pane">
            <div class="cal-header">
              <h4 class="cal-title" id="cal-month-year-title">October 2026</h4>
              <div class="cal-nav-btns">
                <button class="cal-btn-nav" id="cal-prev-month" title="Previous Month">&lsaquo;</button>
                <button class="cal-btn-nav" id="cal-today-btn" style="width: auto; padding: 0 10px; font-size: 12px; font-weight: 600;" title="Go to Current Date">Today</button>
                <button class="cal-btn-nav" id="cal-next-month" title="Next Month">&rsaquo;</button>
              </div>
            </div>

            <!-- Calendar Days of Week Header -->
            <div class="cal-grid" style="margin-bottom: 4px;">
              ${dayNamesShort.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
            </div>

            <!-- Calendar Day Cells -->
            <div class="cal-grid" id="cal-cells-container">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Right: Selected Day Tasks Pane -->
          <div class="calendar-tasks-pane">
            <div class="tasks-pane-header">
              <h4 class="tasks-pane-date" id="tasks-selected-date-text">Today</h4>
              <p class="tasks-pane-sub" id="tasks-selected-count-text">0 tasks scheduled</p>
            </div>

            <!-- Task List for Selected Date -->
            <div class="tasks-list-container" id="tasks-list-container">
              <!-- Dynamically populated -->
            </div>

            <!-- Add Task Form -->
            <div class="add-task-box">
              <input type="text" id="new-task-title-input" placeholder="Add a task for this date..." autocomplete="off">
              <div class="add-task-options">
                <div class="add-task-time-wrap">
                  <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input type="checkbox" id="new-task-allday-check" checked>
                    <span>All Day</span>
                  </label>
                  <input type="time" id="new-task-time-input" style="display: none;">
                </div>
                <button type="button" class="btn-add-task" id="btn-add-task">+ Add Task</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Bind Close Handlers
    document.getElementById('close-calendar-modal')?.addEventListener('click', closeCalendar);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCalendar();
    });

    // Bind Month Navigation
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      activeMonth--;
      if (activeMonth < 0) {
        activeMonth = 11;
        activeYear--;
      }
      renderMonthView();
    });

    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      activeMonth++;
      if (activeMonth > 11) {
        activeMonth = 0;
        activeYear++;
      }
      renderMonthView();
    });

    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      const now = new Date();
      activeYear = now.getFullYear();
      activeMonth = now.getMonth();
      selectedDateKey = toDateKey(now);
      renderMonthView();
      renderSelectedDayTasks();
    });

    // Time toggle
    const allDayCheck = document.getElementById('new-task-allday-check');
    const timeInput = document.getElementById('new-task-time-input');
    allDayCheck?.addEventListener('change', () => {
      if (timeInput) timeInput.style.display = allDayCheck.checked ? 'none' : 'inline-block';
    });

    // Add Task Handler
    const addBtn = document.getElementById('btn-add-task');
    const titleInput = document.getElementById('new-task-title-input');
    
    function handleAddTask() {
      const title = titleInput?.value.trim();
      if (!title) return;

      const isAllDay = allDayCheck?.checked ?? true;
      const timeVal = isAllDay ? '' : (timeInput?.value || '');

      const tasks = getStoredTasks();
      if (!tasks[selectedDateKey]) tasks[selectedDateKey] = [];

      tasks[selectedDateKey].push({
        id: 'task_' + Date.now(),
        title: title,
        time: timeVal,
        isAllDay: isAllDay,
        completed: false
      });

      saveStoredTasks(tasks);

      if (titleInput) titleInput.value = '';
      renderSelectedDayTasks();
      renderMonthView(); // Update task dots on calendar cells
    }

    addBtn?.addEventListener('click', handleAddTask);
    titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTask();
      }
    });

    return overlay;
  }

  // --- Render Month Grid ---
  function renderMonthView() {
    const titleEl = document.getElementById('cal-month-year-title');
    if (titleEl) {
      titleEl.textContent = `${monthNames[activeMonth]} ${activeYear}`;
    }

    const container = document.getElementById('cal-cells-container');
    if (!container) return;
    container.innerHTML = '';

    const firstDayIndex = (new Date(activeYear, activeMonth, 1).getDay() + 6) % 7; // 0=Mon, 6=Sun
    const totalDaysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    const prevMonthDays = new Date(activeYear, activeMonth, 0).getDate();

    const tasksMap = getStoredTasks();
    const todayKey = toDateKey(new Date());

    // 1. Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const cell = document.createElement('div');
      cell.className = 'cal-cell other-month';
      cell.textContent = dayNum;
      container.appendChild(cell);
    }

    // 2. Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cellDate = new Date(activeYear, activeMonth, day);
      const dateKey = toDateKey(cellDate);

      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      cell.textContent = day;

      if (dateKey === todayKey) cell.classList.add('today');
      if (dateKey === selectedDateKey) cell.classList.add('selected');

      // Task indicators
      const dayTasks = tasksMap[dateKey] || [];
      if (dayTasks.length > 0) {
        const dotWrap = document.createElement('div');
        dotWrap.className = 'cal-task-dot-wrap';
        const count = Math.min(dayTasks.length, 3);
        for (let k = 0; k < count; k++) {
          const dot = document.createElement('span');
          dot.className = 'cal-task-dot';
          dotWrap.appendChild(dot);
        }
        cell.appendChild(dotWrap);
      }

      cell.addEventListener('click', () => {
        selectedDateKey = dateKey;
        // Update active class
        document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        renderSelectedDayTasks();
      });

      container.appendChild(cell);
    }

    // 3. Next month filler days (fill up to full row of 7)
    const totalRendered = firstDayIndex + totalDaysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell other-month';
      cell.textContent = j;
      container.appendChild(cell);
    }
  }

  // --- Render Tasks for Selected Date ---
  function renderSelectedDayTasks() {
    const headingEl = document.getElementById('tasks-selected-date-text');
    const countEl = document.getElementById('tasks-selected-count-text');
    const listEl = document.getElementById('tasks-list-container');
    if (!listEl) return;

    // Format human readable date
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const todayKey = toDateKey(new Date());

    let dateLabel = dateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    if (selectedDateKey === todayKey) dateLabel = `Today • ${dateLabel}`;
    if (headingEl) headingEl.textContent = dateLabel;

    const tasksMap = getStoredTasks();
    const tasks = tasksMap[selectedDateKey] || [];

    if (countEl) {
      countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} scheduled`;
    }

    listEl.innerHTML = '';

    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 36px 12px; color: var(--color-text-tertiary);">
          <div style="font-size: 26px; margin-bottom: 6px;">📝</div>
          <div style="font-size: 13.5px; font-weight: 600; color: var(--color-text);">No tasks scheduled</div>
          <p style="font-size: 12px; margin: 4px 0 0;">Add your first task for this date using the form below.</p>
        </div>
      `;
      return;
    }

    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item-card ${task.completed ? 'completed' : ''}`;

      let timeBadgeHtml = '';
      if (task.isAllDay) {
        timeBadgeHtml = '<span class="task-badge-allday">All Day</span>';
      } else if (task.time) {
        timeBadgeHtml = `<span class="task-item-time"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${task.time}</span>`;
      }

      item.innerHTML = `
        <div class="task-left">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
          <div class="task-info">
            <p class="task-item-title">${escapeHtml(task.title)}</p>
            ${timeBadgeHtml}
          </div>
        </div>
        <button type="button" class="task-btn-del" title="Delete task">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;

      // Checkbox complete toggle
      const checkEl = item.querySelector('.task-checkbox');
      checkEl.addEventListener('change', () => {
        task.completed = checkEl.checked;
        saveStoredTasks(tasksMap);
        item.classList.toggle('completed', task.completed);
      });

      // Delete button
      const delBtn = item.querySelector('.task-btn-del');
      delBtn.addEventListener('click', () => {
        tasksMap[selectedDateKey] = tasks.filter(t => t.id !== task.id);
        if (tasksMap[selectedDateKey].length === 0) {
          delete tasksMap[selectedDateKey];
        }
        saveStoredTasks(tasksMap);
        renderSelectedDayTasks();
        renderMonthView();
      });

      listEl.appendChild(item);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Public Control Methods ---
  function openCalendar(targetDate = null) {
    const modal = ensureCalendarModal();
    if (targetDate instanceof Date) {
      activeYear = targetDate.getFullYear();
      activeMonth = targetDate.getMonth();
      selectedDateKey = toDateKey(targetDate);
    } else {
      const now = new Date();
      activeYear = now.getFullYear();
      activeMonth = now.getMonth();
      selectedDateKey = toDateKey(now);
    }

    renderMonthView();
    renderSelectedDayTasks();
    modal.classList.add('active');
    modal.style.display = 'flex';
  }

  function closeCalendar() {
    const modal = document.getElementById('invoza-calendar-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  // Auto-bind to all calendar pills and buttons
  function initCalendarTriggers() {
    const pill = document.getElementById('dashboard-calendar-pill');
    if (pill) {
      pill.style.cursor = 'pointer';
      pill.onclick = (e) => {
        e.preventDefault();
        openCalendar();
      };
    }

    const otherPills = document.querySelectorAll('.invoza-date-pill');
    otherPills.forEach(p => {
      p.style.cursor = 'pointer';
      p.onclick = (e) => {
        e.preventDefault();
        openCalendar();
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendarTriggers);
  } else {
    initCalendarTriggers();
  }

  window.InvoiceMateCalendar = {
    open: openCalendar,
    close: closeCalendar,
    getTasks: getStoredTasks
  };

})(window);
