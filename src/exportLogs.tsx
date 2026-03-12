import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Clipboard,
  useNavigation,
  getPreferenceValues,
  openExtensionPreferences,
  showInFinder,
} from "@raycast/api";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getTimeEntries, getProjects } from "./storage";
import { TimeEntry, Project } from "./models";
import { calculateDuration } from "./utils";

type ExportFormat = "markdown" | "csv";

interface Preferences {
  roundingInterval: string;
  exportDirectory?: string;
}

function csvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ExportLogs() {
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeFrame, setTimeFrame] = useState<string>("this_month");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dailySummary, setDailySummary] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const { pop } = useNavigation();

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        const allProjects = await getProjects();
        setProjects(allProjects);
        setDateRangeFromTimeFrame(timeFrame);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    setDateRangeFromTimeFrame(timeFrame);
  }, [timeFrame]);

  function setDateRangeFromTimeFrame(selectedTimeFrame: string) {
    const now = new Date();

    if (selectedTimeFrame === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay);
      setEndDate(now);
    } else if (selectedTimeFrame === "last_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatISODate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  }

  function getDateKey(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  }

  function getFilteredEntries(allEntries: TimeEntry[]): TimeEntry[] {
    const filtered = allEntries.filter((entry) => {
      if (entry.isActive) return false;
      const entryDate = new Date(entry.startTime);
      return entryDate >= startDate && entryDate <= endDate;
    });

    if (selectedProject === "all") return filtered;
    return filtered.filter((entry) => entry.projectId === selectedProject);
  }

  function buildProjectMap(): Record<string, Project> {
    const map: Record<string, Project> = {};
    projects.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }

  function getProjectName(entry: TimeEntry, projectMap: Record<string, Project>): string {
    if (!entry.projectId) return "Unassigned";
    return projectMap[entry.projectId]?.name || "Unknown Project";
  }

  // --- Markdown generation (unchanged logic) ---

  function generateProjectMarkdown(
    projectName: string,
    entries: TimeEntry[],
    rangeStart: Date,
    rangeEnd: Date,
    useDailySummary: boolean,
    selectedTimeFrame: string,
  ): string {
    let markdown = `# ${projectName} — Time Logs\n`;

    let displayStartDate = rangeStart;
    let displayEndDate = rangeEnd;

    if (selectedTimeFrame === "this_month" || selectedTimeFrame === "last_month") {
      const year = displayStartDate.getFullYear();
      const month = displayStartDate.getMonth();
      displayStartDate = new Date(year, month, 1);
      displayEndDate = new Date(year, month + 1, 0);
    }

    markdown += `Dates: ${formatDate(displayStartDate)} – ${formatDate(displayEndDate)}\n`;

    let totalMinutes = 0;
    entries.forEach((entry) => {
      if (entry.endTime) {
        totalMinutes += calculateDuration(new Date(entry.startTime), new Date(entry.endTime));
      }
    });

    markdown += `Total Hours: ${formatDuration(totalMinutes)}\n\n`;

    if (useDailySummary) {
      const entriesByDayAndTask: Record<string, Record<string, number>> = {};

      entries.forEach((entry) => {
        if (!entry.endTime) return;
        const dateKey = getDateKey(new Date(entry.startTime));
        const description = entry.description || "No description";

        if (!entriesByDayAndTask[dateKey]) entriesByDayAndTask[dateKey] = {};
        if (!entriesByDayAndTask[dateKey][description]) entriesByDayAndTask[dateKey][description] = 0;

        entriesByDayAndTask[dateKey][description] += calculateDuration(
          new Date(entry.startTime),
          new Date(entry.endTime),
        );
      });

      const sortedDays = Object.keys(entriesByDayAndTask).sort();

      sortedDays.forEach((dateKey) => {
        const tasks = entriesByDayAndTask[dateKey];
        const [year, month, day] = dateKey.split("-").map((part) => parseInt(part));
        const date = new Date(year, month - 1, day);

        const sortedTasks = Object.entries(tasks).sort(([, a], [, b]) => b - a);

        sortedTasks.forEach(([description, duration]) => {
          markdown += `- [${formatDate(date)}] ${description} — ${formatDuration(duration)}\n`;
        });
      });
    } else {
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      sortedEntries.forEach((entry) => {
        const entryDate = new Date(entry.startTime);
        let duration = "00:00";
        if (entry.endTime) {
          duration = formatDuration(calculateDuration(new Date(entry.startTime), new Date(entry.endTime)));
        }
        const description = entry.description || "No description";
        markdown += `- [${formatDate(entryDate)}] ${description} — ${duration}\n`;
      });
    }

    return markdown;
  }

  async function generateMarkdown(): Promise<string> {
    const allEntries = await getTimeEntries();
    const filteredEntries = getFilteredEntries(allEntries);

    if (filteredEntries.length === 0) {
      throw new Error("No entries found for the selected criteria");
    }

    if (selectedProject !== "all") {
      const project = projects.find((p) => p.id === selectedProject);
      const projectName = project ? project.name : "Unknown Project";
      return generateProjectMarkdown(projectName, filteredEntries, startDate, endDate, dailySummary, timeFrame);
    }

    const entriesByProject: Record<string, TimeEntry[]> = {};
    const projectMap = buildProjectMap();

    projects.forEach((p) => {
      entriesByProject[p.id] = [];
    });
    entriesByProject["unassigned"] = [];

    filteredEntries.forEach((entry) => {
      if (!entry.projectId) {
        entriesByProject["unassigned"].push(entry);
      } else if (entriesByProject[entry.projectId]) {
        entriesByProject[entry.projectId].push(entry);
      }
    });

    const sections: string[] = [];

    const sortedProjects = Object.entries(entriesByProject)
      .filter(([id, entries]) => id !== "unassigned" && entries.length > 0)
      .sort(([idA], [idB]) => {
        const nameA = projectMap[idA]?.name || "";
        const nameB = projectMap[idB]?.name || "";
        return nameA.localeCompare(nameB);
      });

    sortedProjects.forEach(([projectId, entries]) => {
      const projectName = projectMap[projectId]?.name || "Unknown Project";
      sections.push(generateProjectMarkdown(projectName, entries, startDate, endDate, dailySummary, timeFrame));
    });

    if (entriesByProject["unassigned"].length > 0) {
      sections.push(
        generateProjectMarkdown("Unassigned", entriesByProject["unassigned"], startDate, endDate, dailySummary, timeFrame),
      );
    }

    return sections.join("\n---\n\n");
  }

  // --- CSV generation ---

  async function generateCSV(): Promise<string> {
    const allEntries = await getTimeEntries();
    const filteredEntries = getFilteredEntries(allEntries);

    if (filteredEntries.length === 0) {
      throw new Error("No entries found for the selected criteria");
    }

    const projectMap = buildProjectMap();

    if (dailySummary) {
      const rows: string[] = ["Date,Project,Task,Duration"];
      const grouped: Record<string, Record<string, Record<string, number>>> = {};

      filteredEntries.forEach((entry) => {
        if (!entry.endTime) return;
        const dateKey = getDateKey(new Date(entry.startTime));
        const project = getProjectName(entry, projectMap);
        const description = entry.description || "No description";
        const key = `${project}|||${description}`;

        if (!grouped[dateKey]) grouped[dateKey] = {};
        if (!grouped[dateKey][key]) grouped[dateKey][key] = 0;
        grouped[dateKey][key] += calculateDuration(new Date(entry.startTime), new Date(entry.endTime));
      });

      const sortedDays = Object.keys(grouped).sort();
      sortedDays.forEach((dateKey) => {
        const [year, month, day] = dateKey.split("-").map((p) => parseInt(p));
        const date = new Date(year, month - 1, day);

        const sortedTasks = Object.entries(grouped[dateKey]).sort(([, a], [, b]) => b - a);

        sortedTasks.forEach(([key, duration]) => {
          const [project, description] = key.split("|||");
          rows.push(
            `${formatISODate(date)},${csvField(project)},${csvField(description)},${formatDuration(duration)}`,
          );
        });
      });

      return rows.join("\n");
    }

    const rows: string[] = ["Date,Project,Task,Start,End,Duration"];

    const sortedEntries = [...filteredEntries].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    sortedEntries.forEach((entry) => {
      const entryDate = new Date(entry.startTime);
      const project = getProjectName(entry, projectMap);
      const description = entry.description || "No description";
      const startTimeStr = new Date(entry.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const endTimeStr = entry.endTime
        ? new Date(entry.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        : "";
      const duration = entry.endTime
        ? formatDuration(calculateDuration(new Date(entry.startTime), new Date(entry.endTime)))
        : "00:00";

      rows.push(
        `${formatISODate(entryDate)},${csvField(project)},${csvField(description)},${startTimeStr},${endTimeStr},${duration}`,
      );
    });

    return rows.join("\n");
  }

  // --- Export handlers ---

  async function generateContent(): Promise<string> {
    return exportFormat === "csv" ? generateCSV() : generateMarkdown();
  }

  async function handleExportClipboard() {
    try {
      setIsLoading(true);
      const content = await generateContent();
      await Clipboard.copy(content);

      showToast({
        style: Toast.Style.Success,
        title: "Exported successfully",
        message: `Time logs copied to clipboard as ${exportFormat === "csv" ? "CSV" : "Markdown"}`,
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportFile() {
    try {
      setIsLoading(true);

      const preferences = getPreferenceValues<Preferences>();
      if (!preferences.exportDirectory) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Export directory not set",
          message: "Set an export directory in extension preferences",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
        return;
      }

      const content = await generateContent();
      const ext = exportFormat === "csv" ? "csv" : "md";
      const filename = `time-logs_${formatISODate(startDate)}_${formatISODate(endDate)}.${ext}`;
      const filePath = join(preferences.exportDirectory, filename);

      await writeFile(filePath, content, "utf8");

      await showToast({
        style: Toast.Style.Success,
        title: "Exported successfully",
        message: filename,
        primaryAction: {
          title: "Reveal in Finder",
          onAction: () => showInFinder(filePath),
        },
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Export to File" icon={Icon.Download} onAction={handleExportFile} />
          <Action title="Export to Clipboard" icon={Icon.Clipboard} onAction={handleExportClipboard} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Format" value={exportFormat} onChange={(v) => setExportFormat(v as ExportFormat)}>
        <Form.Dropdown.Item value="markdown" title="Markdown" icon={Icon.Document} />
        <Form.Dropdown.Item value="csv" title="CSV" icon={Icon.List} />
      </Form.Dropdown>

      <Form.Dropdown id="project" title="Project" value={selectedProject} onChange={setSelectedProject}>
        <Form.Dropdown.Item value="all" title="All Projects" icon={Icon.Tag} />
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id}
            title={project.name}
            icon={{ source: Icon.Dot, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="timeFrame" title="Time Frame" value={timeFrame} onChange={setTimeFrame}>
        <Form.Dropdown.Item value="this_month" title="This Month" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="last_month" title="Last Month" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="custom" title="Custom" icon={Icon.Calendar} />
      </Form.Dropdown>

      {timeFrame === "custom" && (
        <>
          <Form.DatePicker
            id="startDate"
            title="Start Date"
            type={Form.DatePicker.Type.Date}
            value={startDate}
            onChange={(newValue) => newValue && setStartDate(newValue)}
          />

          <Form.DatePicker
            id="endDate"
            title="End Date"
            type={Form.DatePicker.Type.Date}
            value={endDate}
            onChange={(newValue) => newValue && setEndDate(newValue)}
          />
        </>
      )}

      <Form.Checkbox
        id="dailySummary"
        title="Grouping"
        label="Export Daily Summary"
        value={dailySummary}
        onChange={setDailySummary}
        info="Daily Summary combines same tasks within a day to simplify reports."
      />
    </Form>
  );
}
