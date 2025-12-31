// Day Planner App
class DayPlanner {
    constructor() {
        this.tasks = [];
        this.archivedTasks = JSON.parse(localStorage.getItem('archivedTasks')) || {};
        this.currentTaskTimers = new Map();
        this.init();
    }

    init() {
        this.loadTasks();
        this.setStartTimeToCurrent(); // Set current time before other operations
        this.renderTasks();
        this.setupEventListeners();

        // Start checking timers
        setInterval(() => this.checkTimers(), 1000);

        // Calculate and update stats
        this.updateStats();
    }

    setupEventListeners() {
        const form = document.getElementById('task-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        document.getElementById('toggle-archived').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleArchived();
        });

        document.getElementById('toggle-stats').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleStats();
        });

        // Set up tab functionality
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    setStartTimeToCurrent() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        document.getElementById('start-time').value = timeString;
    }

    switchTab(tabName) {
        // Hide all tab content
        document.querySelectorAll('.stats-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        // Show selected tab content and activate button
        document.getElementById(`${tabName}-stats`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update stats for the selected tab
        if (tabName === 'weekly') {
            this.updateWeeklyStats();
        } else if (tabName === 'monthly') {
            this.updateMonthlyStats();
        }
    }

    loadTasks() {
        const savedTasks = localStorage.getItem('dayPlannerTasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
            // Convert date strings back to Date objects
            this.tasks.forEach(task => {
                task.startTime = new Date(task.startTime);
                task.endTime = new Date(task.endTime);
            });
        }
    }

    saveTasks() {
        localStorage.setItem('dayPlannerTasks', JSON.stringify(this.tasks));
    }

    addTask() {
        const startTimeInput = document.getElementById('start-time');
        const durationInput = document.getElementById('duration');
        const taskNameInput = document.getElementById('task-name');

        const startTime = new Date();
        const [hours, minutes] = startTimeInput.value.split(':').map(Number);
        startTime.setHours(hours, minutes, 0, 0);

        const duration = parseInt(durationInput.value);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        const task = {
            id: Date.now(),
            startTime: startTime,
            endTime: endTime,
            name: taskNameInput.value.trim(),
            status: 'pending', // pending, active, completed, late
            duration: duration
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();

        // Reset form
        form.reset();
    }

    renderTasks() {
        const tbody = document.getElementById('current-tasks-body');
        tbody.innerHTML = '';

        this.tasks.forEach(task => {
            const row = this.createTaskRow(task);
            tbody.appendChild(row);
        });

        this.renderArchivedTasks();
        this.updateStats();
    }

    createTaskRow(task) {
        const row = document.createElement('tr');
        row.dataset.id = task.id;

        // Format start time as HH:MM
        const startTimeFormatted = task.startTime.toTimeString().substring(0, 5);

        // Calculate remaining time if task is active
        let endTimeFormatted;
        if (task.status === 'active') {
            const now = new Date();
            const diffMs = task.endTime - now;
            const diffMins = Math.ceil(diffMs / 60000);
            
            if (diffMins > 0) {
                if (diffMins >= 60) {
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    endTimeFormatted = `${hours}h ${mins}m`;
                } else {
                    endTimeFormatted = `${diffMins}m`;
                }
            } else {
                endTimeFormatted = '0m';
            }
        } else {
            // Format end time as HH:MM if not active
            endTimeFormatted = task.endTime.toTimeString().substring(0, 5);
        }

        row.innerHTML = `
            <td>${startTimeFormatted}</td>
            <td>${endTimeFormatted}</td>
            <td>${task.name}</td>
            <td><span class="status ${task.status}">${this.getStatusText(task.status)}</span></td>
            <td>
                <button class="action-btn start-btn" onclick="dayPlanner.startTask(${task.id})">Start</button>
                <button class="action-btn complete-btn" onclick="dayPlanner.completeTask(${task.id})">Complete</button>
                <button class="action-btn delete-btn" onclick="dayPlanner.deleteTask(${task.id})">Delete</button>
            </td>
        `;

        return row;
    }

    getStatusText(status) {
        switch(status) {
            case 'pending': return 'Pending';
            case 'active': return 'Active';
            case 'completed': return 'Completed';
            case 'late': return 'Late';
            default: return status;
        }
    }

    startTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && (task.status === 'pending' || task.status === 'late')) {
            task.status = 'active';
            
            // Cancel any existing timer for this task
            if (this.currentTaskTimers.has(taskId)) {
                clearInterval(this.currentTaskTimers.get(taskId));
            }
            
            // Set a new timer to check when the task should end
            const timer = setInterval(() => {
                const now = new Date();
                if (now >= task.endTime) {
                    // Task has ended
                    if (task.status === 'active') {
                        task.status = 'late';
                        this.saveTasks();
                        this.renderTasks();
                    }
                    clearInterval(timer);
                    this.currentTaskTimers.delete(taskId);
                } else {
                    // Check if we're 1 minute away from end time (for warning)
                    const timeLeft = task.endTime - now;
                    if (timeLeft <= 60000 && timeLeft > 59000) { // Within 1 minute window
                        this.playWarningSound();
                    }
                    
                    // Update the UI with remaining time
                    this.renderTasks();
                }
            }, 1000); // Check every second
            
            this.currentTaskTimers.set(taskId, timer);
            this.saveTasks();
            this.renderTasks();
        }
    }

    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            
            // Clear the timer if it exists
            if (this.currentTaskTimers.has(taskId)) {
                clearInterval(this.currentTaskTimers.get(taskId));
                this.currentTaskTimers.delete(taskId);
            }
            
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteTask(taskId) {
        // Clear timer if it exists
        if (this.currentTaskTimers.has(taskId)) {
            clearInterval(this.currentTaskTimers.get(taskId));
            this.currentTaskTimers.delete(taskId);
        }
        
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasks();
        this.renderTasks();
    }

    playWarningSound() {
        const audio = document.getElementById('alarm-audio');
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play prevented by browser policy:", e));
    }

    checkTimers() {
        const now = new Date();
        
        this.tasks.forEach(task => {
            if (task.status === 'active' && now >= task.endTime) {
                task.status = 'late';
            }
        });
        
        // Re-render if any status changed
        this.saveTasks();
        this.renderTasks();
    }

    updateStats() {
        this.updateWeeklyStats();
        this.updateMonthlyStats();
    }

    updateWeeklyStats() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyTasks = this.tasks.filter(task => {
            return new Date(task.startTime) >= weekAgo;
        });

        const weeklyCompleted = weeklyTasks.filter(t => t.status === 'completed').length;
        const weeklyLate = weeklyTasks.filter(t => t.status === 'late').length;
        const weeklyTotal = weeklyTasks.length;
        const weeklyPercentage = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

        // Update UI
        document.getElementById('weekly-completed').textContent = weeklyCompleted;
        document.getElementById('weekly-late').textContent = weeklyLate;
        document.getElementById('weekly-percentage').textContent = `${weeklyPercentage}%`;
    }

    updateMonthlyStats() {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const monthlyTasks = this.tasks.filter(task => {
            return new Date(task.startTime) >= monthAgo;
        });

        const monthlyCompleted = monthlyTasks.filter(t => t.status === 'completed').length;
        const monthlyLate = monthlyTasks.filter(t => t.status === 'late').length;
        const monthlyTotal = monthlyTasks.length;
        const monthlyPercentage = monthlyTotal > 0 ? Math.round((monthlyCompleted / monthlyTotal) * 100) : 0;

        // Update UI
        document.getElementById('monthly-completed').textContent = monthlyCompleted;
        document.getElementById('monthly-late').textContent = monthlyLate;
        document.getElementById('monthly-percentage').textContent = `${monthlyPercentage}%`;
    }

    toggleArchived() {
        const archivedContent = document.getElementById('archived-tasks');
        const toggleLink = document.getElementById('toggle-archived');

        if (archivedContent.style.display === 'none') {
            archivedContent.style.display = 'block';
            toggleLink.textContent = 'Hide';
        } else {
            archivedContent.style.display = 'none';
            toggleLink.textContent = 'Show';
        }
    }

    toggleStats() {
        const statsContainer = document.getElementById('stats-container');
        const toggleLink = document.getElementById('toggle-stats');

        if (statsContainer.style.display === 'none') {
            statsContainer.style.display = 'block';
            toggleLink.textContent = 'Hide';
        } else {
            statsContainer.style.display = 'none';
            toggleLink.textContent = 'Show';
        }
    }

    renderArchivedTasks() {
        const archivedContainer = document.getElementById('archived-tasks');
        
        // Group tasks by week
        const weeks = {};
        const now = new Date();
        
        this.tasks.forEach(task => {
            // Only archive tasks that are not today's tasks
            const taskDate = new Date(task.startTime);
            if (taskDate.toDateString() !== now.toDateString()) {
                // Calculate week number (Monday as first day of week)
                const weekStart = new Date(taskDate);
                const day = weekStart.getDay();
                const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when Sunday is the first day
                const monday = new Date(weekStart);
                monday.setDate(diff);
                monday.setHours(0, 0, 0, 0);
                
                const weekKey = monday.toISOString().split('T')[0];
                
                if (!weeks[weekKey]) {
                    weeks[weekKey] = [];
                }
                weeks[weekKey].push(task);
            }
        });
        
        // Render archived weeks
        archivedContainer.innerHTML = '';
        
        if (Object.keys(weeks).length === 0) {
            archivedContainer.innerHTML = '<p>No archived tasks to display.</p>';
            return;
        }
        
        for (const [weekStart, weekTasks] of Object.entries(weeks)) {
            const weekDate = new Date(weekStart);
            const weekEnd = new Date(weekDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const weekDiv = document.createElement('div');
            weekDiv.className = 'archived-week';
            
            weekDiv.innerHTML = `
                <h3>Week of ${weekDate.toDateString()} - ${weekEnd.toDateString()}</h3>
                <table class="archived-table">
                    <thead>
                        <tr>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Task</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${weekTasks.map(task => `
                            <tr>
                                <td>${task.startTime.toTimeString().substring(0, 5)}</td>
                                <td>${task.endTime.toTimeString().substring(0, 5)}</td>
                                <td>${task.name}</td>
                                <td><span class="status ${task.status}">${this.getStatusText(task.status)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            archivedContainer.appendChild(weekDiv);
        }
    }

    archiveOldTasks() {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const tasksToArchive = this.tasks.filter(task => {
            const taskDate = new Date(task.startTime);
            return taskDate < weekAgo;
        });
        
        if (tasksToArchive.length > 0) {
            const weekStart = new Date(weekAgo);
            const day = weekStart.getDay();
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(weekStart);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);
            
            const weekKey = monday.toISOString().split('T')[0];
            
            if (!this.archivedTasks[weekKey]) {
                this.archivedTasks[weekKey] = [];
            }
            
            this.archivedTasks[weekKey] = this.archivedTasks[weekKey].concat(tasksToArchive);
            
            // Remove archived tasks from current tasks
            this.tasks = this.tasks.filter(task => {
                return !tasksToArchive.includes(task);
            });
            
            // Save to localStorage
            localStorage.setItem('archivedTasks', JSON.stringify(this.archivedTasks));
            this.saveTasks();
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dayPlanner = new DayPlanner();
});