# Day Planner

A time-bound task management application designed to help users stay disciplined with their time allocation. The app allows users to plan tasks with specific start times and durations, track progress, and receive alerts before tasks are due.

## Features

- **Task Management**: Add tasks with start times and duration in minutes
- **Time Tracking**: Monitor remaining time for active tasks
- **Status Tracking**: Tasks can be marked as pending, active, completed, or late
- **Alert System**: Audio warning 1 minute before a task is due to finish
- **Statistics**: Daily and weekly completion statistics
- **Archiving**: Previous week's tasks are automatically archived
- **Persistent Storage**: All tasks are saved in browser's local storage
- **Dark Theme**: Optimized for evening use and reduced eye strain
- **Mobile Responsive**: Works on both desktop and mobile devices

## How to Use

1. **Add a Task**: Fill in the start time, duration (in minutes), and task name, then click "Add Task"
2. **Start a Task**: Click "Start" when you begin working on a task
3. **Complete a Task**: Click "Complete" when finished (before deadline)
4. **Track Time**: For active tasks, the end time column shows remaining time
5. **Monitor Stats**: Check daily and weekly completion percentages
6. **View History**: Expand the "Previous Weeks" section to see archived tasks

## Stats Display

- **Daily**: Shows today's completed tasks, late tasks, and completion percentage
- **Weekly**: Shows the last 7 days' completed tasks, late tasks, and completion percentage

## Time Management Benefits

The Day Planner helps users:
- Maintain time discipline
- Avoid task overruns
- Stay focused on scheduled activities
- Track progress and completion rates
- Develop better time estimation skills

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- Uses browser's localStorage for data persistence
- Audio alert implemented with base64 encoded sound
- Responsive design for mobile and desktop
- Dark theme for reduced eye strain