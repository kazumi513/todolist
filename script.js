// Global variables
let tasks = [];
let lists = [];
let settings = {};
let activeListId = '';
let currentFilter = 'all';
let editingTaskId = null;

// DOM Elements
const listsModal = document.getElementById('lists-modal');
const editTaskModal = document.getElementById('edit-task-modal');
const settingsPanel = document.getElementById('settings-panel');
const tasksList = document.getElementById('tasks-list');
const tasksCounter = document.getElementById('tasks-counter');
const newTaskInput = document.getElementById('new-task-input');
const appTitle = document.querySelector('.app-title');

// Initialize the app
function init() {
    // Load data from localStorage
    loadTasks();
    loadLists();
    loadSettings();
    loadActiveList();
    loadFilter();
    
    // Apply settings
    applySettings();
    
    // Update UI
    updateTaskList();
    updateActiveListName();
    updateFilterButtons();
    
    // Set up event listeners
    setupEventListeners();
}

// Load tasks from localStorage
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    } else {
        // Default tasks if none exist
        tasks = [
            {
                id: generateId(),
                title: 'Welcome to your Todo List',
                description: 'This is your first task. Click on it to edit or delete.',
                dueDate: '',
                dueTime: '',
                completed: false,
                priority: 'medium',
                list: 'default',
                createdAt: Date.now()
            }
        ];
        saveTasks();
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Load lists from localStorage
function loadLists() {
    const storedLists = localStorage.getItem('lists');
    if (storedLists) {
        lists = JSON.parse(storedLists);
    } else {
        // Default list if none exist
        lists = [
            {
                id: 'default',
                name: 'Default List',
                color: '#9764c7'
            }
        ];
        saveLists();
    }
}

// Save lists to localStorage
function saveLists() {
    localStorage.setItem('lists', JSON.stringify(lists));
}

// Load settings from localStorage
function loadSettings() {
    const storedSettings = localStorage.getItem('settings');
    if (storedSettings) {
        settings = JSON.parse(storedSettings);
    } else {
        // Default settings
        settings = {
            darkMode: true,
            accentColor: '#9764c7',
            notificationsEnabled: false,
            reminderTime: '09:00',
            syncEnabled: false
        };
        saveSettings();
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Load active list from localStorage
function loadActiveList() {
    const storedActiveList = localStorage.getItem('activeList');
    if (storedActiveList) {
        activeListId = storedActiveList;
    } else {
        // Default to the first list
        activeListId = lists.length > 0 ? lists[0].id : '';
        saveActiveList();
    }
}

// Save active list to localStorage
function saveActiveList() {
    localStorage.setItem('activeList', activeListId);
}

// Load filter from localStorage
function loadFilter() {
    const storedFilter = localStorage.getItem('filter');
    if (storedFilter) {
        currentFilter = storedFilter;
    } else {
        currentFilter = 'all';
        saveFilter();
    }
}

// Save filter to localStorage
function saveFilter() {
    localStorage.setItem('filter', currentFilter);
}

// Apply settings to the UI
function applySettings() {
    // Apply accent color
    document.documentElement.style.setProperty('--primary', settings.accentColor);
    
    // Calculate lighter and darker shades
    document.documentElement.style.setProperty('--primary-light', lightenColor(settings.accentColor, 15));
    document.documentElement.style.setProperty('--primary-dark', darkenColor(settings.accentColor, 15));
    
    // Update form inputs
    if (document.getElementById('dark-mode-toggle')) {
        document.getElementById('dark-mode-toggle').checked = settings.darkMode;
    }
    
    if (document.getElementById('notifications-toggle')) {
        document.getElementById('notifications-toggle').checked = settings.notificationsEnabled;
    }
    
    if (document.getElementById('reminder-time')) {
        document.getElementById('reminder-time').value = settings.reminderTime;
    }
    
    // Update color picker selections
    document.querySelectorAll('.color-option').forEach(option => {
        const color = option.getAttribute('data-color');
        if (color === settings.accentColor) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Update the active list name in the header
function updateActiveListName() {
    const activeList = lists.find(list => list.id === activeListId);
    if (activeList) {
        appTitle.textContent = activeList.name;
    } else if (lists.length > 0) {
        activeListId = lists[0].id;
        appTitle.textContent = lists[0].name;
        saveActiveList();
    } else {
        appTitle.textContent = 'My Todo List';
    }
}

// Update the filter buttons
function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        if (filter === currentFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Get tasks filtered by the active list and current filter
function getFilteredTasks() {
    return tasks
        .filter(task => {
            // Filter by list
            const listMatch = task.list === activeListId;
            
            // Filter by status
            if (currentFilter === 'all') return listMatch;
            if (currentFilter === 'active') return listMatch && !task.completed;
            if (currentFilter === 'completed') return listMatch && task.completed;
            
            return listMatch;
        })
        .sort((a, b) => {
            // First by completion status
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            
            // Then by priority for incomplete tasks
            if (!a.completed && !b.completed) {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
            }
            
            // Then by due date if it exists
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate + 'T' + (a.dueTime || '00:00')) - 
                       new Date(b.dueDate + 'T' + (b.dueTime || '00:00'));
            }
            
            // Finally by creation date
            return a.createdAt - b.createdAt;
        });
}

// Update the task list UI
function updateTaskList() {
    const filteredTasks = getFilteredTasks();
    tasksList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <p>No tasks found</p>
                <p class="empty-description">Add a new task to get started</p>
            </div>
        `;
    } else {
        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskElement.dataset.id = task.id;
            
            let dueContent = '';
            if (task.dueDate) {
                dueContent = `
                    <div class="task-due-date">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${formatDueDate(task.dueDate, task.dueTime)}
                    </div>
                `;
            }
            
            taskElement.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-details">
                        ${dueContent}
                        <div class="task-priority">
                            <span class="priority-indicator priority-${task.priority}"></span>
                            ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="edit-task-btn">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
            `;
            
            tasksList.appendChild(taskElement);
        });
    }
    
    // Update tasks counter
    const activeTasks = tasks.filter(task => task.list === activeListId && !task.completed).length;
    tasksCounter.textContent = `${activeTasks} item${activeTasks !== 1 ? 's' : ''} left`;
}

// Format due date for display
function formatDueDate(dateStr, timeStr) {
    const date = new Date(dateStr + 'T' + (timeStr || '00:00'));
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    let formattedDate;
    if (isToday) {
        formattedDate = 'Today';
    } else if (isTomorrow) {
        formattedDate = 'Tomorrow';
    } else {
        formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    if (timeStr) {
        return `${formattedDate}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return formattedDate;
}

// Add a new task
function addTask(title, description = '', dueDate = '', dueTime = '', priority = 'medium', list = activeListId) {
    const newTask = {
        id: generateId(),
        title,
        description,
        dueDate,
        dueTime,
        completed: false,
        priority,
        list,
        createdAt: Date.now()
    };
    
    tasks.push(newTask);
    saveTasks();
    updateTaskList();
    
    return newTask;
}

// Update an existing task
function updateTask(taskId, updates) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        saveTasks();
        updateTaskList();
    }
}

// Delete a task
function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks();
    updateTaskList();
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
    const task = tasks.find(task => task.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        updateTaskList();
    }
}

// Clear all completed tasks
function clearCompletedTasks() {
    tasks = tasks.filter(task => task.list !== activeListId || !task.completed);
    saveTasks();
    updateTaskList();
}

// Add a new list
function addList(name, color) {
    const newList = {
        id: generateId(),
        name,
        color
    };
    
    lists.push(newList);
    saveLists();
    
    return newList;
}

// Update an existing list
function updateList(listId, updates) {
    const listIndex = lists.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
        lists[listIndex] = { ...lists[listIndex], ...updates };
        saveLists();
        
        // If updating the active list, update the header
        if (listId === activeListId) {
            updateActiveListName();
        }
    }
}

// Delete a list
function deleteList(listId) {
    // Don't delete the last list
    if (lists.length <= 1) {
        return;
    }
    
    // Delete the list
    lists = lists.filter(list => list.id !== listId);
    
    // Update tasks assigned to this list
    if (lists.length > 0) {
        const defaultListId = lists[0].id;
        tasks.forEach(task => {
            if (task.list === listId) {
                task.list = defaultListId;
            }
        });
    }
    
    // If the active list was deleted, change to the first available list
    if (listId === activeListId && lists.length > 0) {
        activeListId = lists[0].id;
        saveActiveList();
        updateActiveListName();
    }
    
    saveLists();
    saveTasks();
}

// Change the active list
function changeActiveList(listId) {
    activeListId = listId;
    saveActiveList();
    updateActiveListName();
    updateTaskList();
}

// Change the current filter
function changeFilter(filter) {
    currentFilter = filter;
    saveFilter();
    updateFilterButtons();
    updateTaskList();
}

// Update the settings panel UI
function updateSettingsPanelUI() {
    const colorOptions = document.querySelectorAll('.settings-panel .color-option');
    colorOptions.forEach(option => {
        const color = option.getAttribute('data-color');
        option.classList.toggle('selected', color === settings.accentColor);
    });
    
    document.getElementById('dark-mode-toggle').checked = settings.darkMode;
    document.getElementById('notifications-toggle').checked = settings.notificationsEnabled;
    document.getElementById('reminder-time').value = settings.reminderTime;
}

// Update the lists modal UI
function updateListsModal() {
    const listsContainer = document.getElementById('lists-container');
    listsContainer.innerHTML = '';
    
    lists.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = `list-item ${list.id === activeListId ? 'active' : ''}`;
        listElement.dataset.id = list.id;
        
        listElement.innerHTML = `
            <div class="list-color" style="background-color: ${list.color}"></div>
            <div class="list-name">${list.name}</div>
            <button class="list-delete-btn" ${lists.length <= 1 ? 'disabled' : ''}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;
        
        listsContainer.appendChild(listElement);
    });
    
    // Reset color picker selection
    document.querySelectorAll('#lists-modal .color-option').forEach(option => {
        option.classList.toggle('selected', option.getAttribute('data-color') === '#9764c7');
    });
    
    // Clear the input
    document.getElementById('new-list-input').value = '';
}

// Show the edit task modal
function showEditTaskModal(taskId = null) {
    editingTaskId = taskId;
    const modal = document.getElementById('edit-task-modal');
    const form = document.getElementById('edit-task-form');
    const titleInput = document.getElementById('edit-task-title');
    const descriptionInput = document.getElementById('edit-task-description');
    const dueDateInput = document.getElementById('edit-task-due-date');
    const prioritySelect = document.getElementById('edit-task-priority');
    const deleteBtn = document.getElementById('delete-task-btn');
    
    // Reset form
    form.reset();
    
    // Fill in form if editing an existing task
    if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            titleInput.value = task.title;
            descriptionInput.value = task.description || '';
            dueDateInput.value = task.dueDate || '';
            prioritySelect.value = task.priority;
            deleteBtn.style.display = 'block';
        }
    } else {
        // New task
        deleteBtn.style.display = 'none';
    }
    
    // Show modal
    modal.classList.add('open');
}

// Populate the list select dropdown
function populateListSelect() {
    const listSelect = document.createElement('select');
    listSelect.id = 'edit-task-list';
    
    lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.name;
        listSelect.appendChild(option);
    });
    
    return listSelect;
}

// Handle the edit task form submission
function handleEditTaskSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('edit-task-title').value.trim();
    if (!title) return;
    
    const description = document.getElementById('edit-task-description').value.trim();
    const dueDate = document.getElementById('edit-task-due-date').value;
    const priority = document.getElementById('edit-task-priority').value;
    
    if (editingTaskId) {
        // Update existing task
        updateTask(editingTaskId, {
            title,
            description,
            dueDate,
            priority
        });
    } else {
        // Add new task
        addTask(title, description, dueDate, '', priority);
    }
    
    // Close modal
    document.getElementById('edit-task-modal').classList.remove('open');
}

// Show the lists modal
function showListsModal() {
    updateListsModal();
    listsModal.classList.add('open');
}

// Show the settings panel
function showSettingsPanel() {
    updateSettingsPanelUI();
    settingsPanel.classList.add('open');
}

// Generate a unique ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// Set up event listeners
function setupEventListeners() {
    // Add new task on Enter key
    newTaskInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && newTaskInput.value.trim()) {
            addTask(newTaskInput.value.trim());
            newTaskInput.value = '';
        }
    });
    
    // Add task button
    document.getElementById('add-task-btn').addEventListener('click', () => {
        if (newTaskInput.value.trim()) {
            addTask(newTaskInput.value.trim());
            newTaskInput.value = '';
        }
    });
    
    // Show lists modal
    document.querySelector('.header-left').addEventListener('click', showListsModal);
    
    // Close lists modal
    document.getElementById('close-lists-modal').addEventListener('click', () => {
        listsModal.classList.remove('open');
    });
    
    // Close modal when clicking backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', () => {
            document.querySelectorAll('.edit-task-modal, .lists-modal').forEach(modal => {
                modal.classList.remove('open');
            });
        });
    });
    
    // Close settings panel
    document.getElementById('close-settings').addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });
    
    // Close settings panel when clicking backdrop
    document.querySelector('.settings-backdrop').addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            changeFilter(filter);
        });
    });
    
    // Clear completed tasks
    document.getElementById('clear-completed-btn').addEventListener('click', clearCompletedTasks);
    
    // Edit task form submission
    document.getElementById('edit-task-form').addEventListener('submit', handleEditTaskSubmit);
    
    // Close edit task modal
    document.getElementById('close-edit-modal').addEventListener('click', () => {
        editTaskModal.classList.remove('open');
    });
    
    // Delete task button
    document.getElementById('delete-task-btn').addEventListener('click', () => {
        if (editingTaskId) {
            deleteTask(editingTaskId);
            editTaskModal.classList.remove('open');
        }
    });
    
    // Task checkbox toggle
    tasksList.addEventListener('click', e => {
        if (e.target.classList.contains('task-checkbox')) {
            const taskItem = e.target.closest('.task-item');
            if (taskItem) {
                toggleTaskCompletion(taskItem.dataset.id);
            }
        }
    });
    
    // Edit task button
    tasksList.addEventListener('click', e => {
        if (e.target.closest('.edit-task-btn')) {
            const taskItem = e.target.closest('.task-item');
            if (taskItem) {
                showEditTaskModal(taskItem.dataset.id);
            }
        }
    });
    
    // Add list button
    document.getElementById('add-list-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('new-list-input');
        const name = nameInput.value.trim();
        if (name) {
            const selectedColor = document.querySelector('#lists-modal .color-option.selected');
            const color = selectedColor ? selectedColor.getAttribute('data-color') : '#9764c7';
            
            const newList = addList(name, color);
            changeActiveList(newList.id);
            updateListsModal();
            nameInput.value = '';
            
            // Close modal after a short delay
            setTimeout(() => {
                listsModal.classList.remove('open');
            }, 500);
        }
    });
    
    // List selection
    document.getElementById('lists-container').addEventListener('click', e => {
        const listItem = e.target.closest('.list-item');
        if (listItem && !e.target.closest('.list-delete-btn')) {
            const listId = listItem.dataset.id;
            changeActiveList(listId);
            listsModal.classList.remove('open');
        }
    });
    
    // Delete list button
    document.getElementById('lists-container').addEventListener('click', e => {
        if (e.target.closest('.list-delete-btn')) {
            const listItem = e.target.closest('.list-item');
            if (listItem) {
                deleteList(listItem.dataset.id);
                updateListsModal();
            }
            
            e.stopPropagation();
        }
    });
    
    // Color picker selection
    document.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('click', e => {
            if (e.target.classList.contains('color-option')) {
                const colorPicker = e.target.closest('.color-picker');
                colorPicker.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                e.target.classList.add('selected');
            }
        });
    });
    
    // Save settings button
    document.getElementById('save-settings').addEventListener('click', () => {
        // Update settings object
        settings.darkMode = document.getElementById('dark-mode-toggle').checked;
        settings.notificationsEnabled = document.getElementById('notifications-toggle').checked;
        settings.reminderTime = document.getElementById('reminder-time').value;
        
        const selectedColor = document.querySelector('.settings-panel .color-option.selected');
        if (selectedColor) {
            settings.accentColor = selectedColor.getAttribute('data-color');
        }
        
        // Save and apply settings
        saveSettings();
        applySettings();
        
        // Close settings panel
        settingsPanel.classList.remove('open');
    });
    
    // Export data button
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    
    // Import data button
    document.getElementById('import-data-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    
    // Import file handler
    document.getElementById('import-file').addEventListener('change', importData);
    
    // Clear all data button
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
}

// Export data as JSON file
function exportData() {
    const data = {
        tasks,
        lists,
        settings,
        activeList: activeListId,
        filter: currentFilter
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todo-list-backup.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import data from JSON file
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            // Validate data structure
            if (data.tasks && Array.isArray(data.tasks) &&
                data.lists && Array.isArray(data.lists) &&
                data.settings && typeof data.settings === 'object') {
                
                // Import data
                tasks = data.tasks;
                lists = data.lists;
                settings = data.settings;
                
                if (data.activeList) {
                    activeListId = data.activeList;
                }
                
                if (data.filter) {
                    currentFilter = data.filter;
                }
                
                // Save all data
                saveTasks();
                saveLists();
                saveSettings();
                saveActiveList();
                saveFilter();
                
                // Update UI
                applySettings();
                updateTaskList();
                updateActiveListName();
                updateFilterButtons();
                
                alert('Data imported successfully!');
            } else {
                alert('Invalid data format.');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import data. The file may be corrupted.');
        }
        
        // Reset file input
        e.target.value = '';
    };
    
    reader.readAsText(file);
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem('tasks');
        localStorage.removeItem('lists');
        localStorage.removeItem('settings');
        localStorage.removeItem('activeList');
        localStorage.removeItem('filter');
        
        // Reload page
        window.location.reload();
    }
}

// Helper function to lighten a hex color
function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

// Helper function to darken a hex color
function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return '#' + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);