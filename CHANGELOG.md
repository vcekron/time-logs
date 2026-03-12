# Time Logs Changelog

## [1.1.1] - 2026-03-12

### Fixed
- Menu bar timer not refreshing immediately when starting or stopping a timer from View Time Logs

## [1.1.0] - 2026-03-09

### Added
- CSV export format with proper RFC 4180 field escaping
- Export to file on disk with configurable export directory preference
- Date range encoded in exported filenames (e.g. `time-logs_2026-03-01_2026-03-09.csv`)
- Menu bar display preference: show elapsed time or a minimal clock icon
- Optional label preference to show project and task name in menu bar
- Reveal in Finder action on successful file export

### Changed
- Menu bar timer defaults to elapsed time only; project/task label is opt-in
- Compact time format in menu bar (H:MM instead of HH:MM)
- Export to File is now the primary export action; Export to Clipboard is secondary
- CSV is the default export format

## [1.0.0] - 2024-03-09

### Features
- Complete time tracking solution with start and stop timer commands
- Project management with color coding and organization
- Detailed time logs view with filtering and search capabilities
- Summary and detailed view modes for time entries
- Export time logs to markdown with customizable formatting
- Menu bar timer that shows active time log for quick visibility
- Configurable time rounding (5, 10, 15, 30, or 60 minute intervals)
- Track time with or without project assignment
- Edit existing time entries with task descriptions and project assignments
- Monthly and project-based reporting views
- One-click timer controls for efficient workflow