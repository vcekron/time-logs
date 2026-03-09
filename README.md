# Time Logs - Raycast Extension

Track, manage, and export time logs with CSV support and minimal menu bar display.

> Fork of [madebydamien/time-logs](https://github.com/damianredecki/time-logs) with added CSV export, file-to-disk export, and configurable menu bar display.

<img src="./assets/extension-icon.png" width="70" />

## Features

- **Start and stop timers** for different tasks and projects
- **View and manage** all your time entries in one place
- **Organize time entries** by project
- **Export time logs** as CSV or Markdown, to clipboard or to a file on disk
- **Menu bar timer** with configurable display: elapsed time, icon only, with or without project/task label
- **Time rounding** to your preferred interval (5, 10, 15, 30, or 60 minutes)
- **Automatic cleanup** of entries shorter than 1 minute

## Commands

### Start Timer
Start tracking time for a task with an optional project assignment.

### Stop Timer
Stop the currently running timer.

### View Time Logs
View and manage all your time logs. Filter by date, project, or search by task description.

### View Projects
View and manage all your projects, along with their associated time logs.

### Export Time Logs
Export your time logs as CSV or Markdown. Choose between exporting to a file on disk (primary action) or copying to clipboard.

Exported filenames include the date range, e.g. `time-logs_2026-03-01_2026-03-31.csv`.

### Menu Bar Timer
Shows the active time log in your menu bar. Configurable to show elapsed time or a clock icon, with an optional project/task label.

## Preferences

### Global
- **Time Rounding Interval**: Round time entries to the nearest interval (5, 10, 15, 30, or 60 minutes)
- **Export Directory**: Directory where exported files are saved

### Menu Bar Timer
- **Display Mode**: Show elapsed time (H:MM) or a clock icon
- **Show Label**: Optionally display project and task name alongside the timer

## Development

```bash
git clone https://github.com/vcekron/time-logs.git
cd time-logs
npm install
npm run dev
```

## License

MIT
