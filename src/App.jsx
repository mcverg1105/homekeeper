import { useState, useEffect, useMemo } from "react";
import {
  Home,
  Plus,
  Check,
  Paintbrush,
  Wrench,
  ChevronDown,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Star,
  ImagePlus,
  Image as ImageIcon,
  Settings,
  FileText,
  Sun,
  Moon,
  Shield,
  ShoppingBag,
  Calendar,
  History,
} from "lucide-react";
import { supabase } from "./supabase";
import StorageImage from "./StorageImage";
import StorageDocument from "./StorageDocument";
import {
  uploadImage,
  deleteStorageImage,
  deleteStorageImages,
  imageForDb,
  imagesForDb,
  expensesForDb,
  collectImagePaths,
  collectImagePathsFromExpenses,
  collectImagePathsFromHome,
  newImageId,
  imageUploadErrorMessage,
} from "./imageStorage";
import {
  uploadDocument,
  deleteStorageDocuments,
  documentsForDb,
  newDocumentId,
} from "./documentStorage";
import { readFormDraft, writeFormDraft, clearFormDraft, imagesForDraft, documentsForDraft } from "./formDrafts";

// ============================================================================
// HELPERS
// ============================================================================

const TODAY = new Date();

function daysUntil(dateStr) {
  const due = new Date(dateStr);
  return Math.round((due - TODAY) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function statusForTask(task) {
  const days = daysUntil(task.nextDue);
  if (days < 0) return "overdue";
  if (days <= 14) return "soon";
  return "ok";
}

function contractorLabel(c) {
  if (!c) return "";
  return c.company || c.name;
}

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function sortWithOtherLast(items) {
  const catchAlls = ["Other", "General"];
  const others = items.filter((i) => catchAlls.includes(i));
  const rest = items.filter((i) => !catchAlls.includes(i)).sort((a, b) => a.localeCompare(b));
  return [...rest, ...others];
}

function removedImagePaths(before, after) {
  const afterPaths = new Set(collectImagePaths(after));
  return collectImagePaths(before).filter((p) => !afterPaths.has(p));
}

function removedReceiptPaths(before, after) {
  const afterPaths = new Set(collectImagePathsFromExpenses(after));
  return collectImagePathsFromExpenses(before).filter((p) => !afterPaths.has(p));
}

const TASK_CATEGORIES = ["HVAC", "Exterior", "Safety", "Plumbing", "Appliances", "Other"];

function trimRequired(value) {
  return (value ?? "").trim();
}

function trimOptional(value) {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDateStr(dateStr) {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}

function isValidHexColor(color) {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

function validateFrequencyMonths(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 120 ? Math.round(n) : null;
}

function validateTaskCategory(category) {
  return TASK_CATEGORIES.includes(category) ? category : null;
}

function validateRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}

function filesStillUploading(files) {
  if (!Array.isArray(files)) return false;
  return files.some((file) => file.uploading || (!file.path && !file.src));
}

function imagesStillUploading(images) {
  return filesStillUploading(images);
}

function saveErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function validateContractorIds(ids, contractors) {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id) => contractors.some((c) => c.id === id));
}

function mapCompletionFromDb(row) {
  return {
    id: row.id,
    dateCompleted: row.date_completed,
    contractorIds: row.contractor_ids || [],
    notes: row.notes,
    images: row.images || [],
    expenses: row.expenses || [],
  };
}

function mapTaskFromDb(row, completionHistory = []) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    frequencyMonths: row.frequency_months,
    lastDone: row.last_done,
    nextDue: row.next_due,
    contractorId: row.contractor_id,
    notes: row.notes,
    images: row.images || [],
    documents: row.documents || [],
    completionNotes: row.completion_notes,
    completionExpenses: row.completion_expenses || [],
    completionHistory,
  };
}

function mapProjectFromDb(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    notes: row.notes,
    paints: row.paints || [],
    contractorIds: row.contractor_ids || [],
    images: row.images || [],
    documents: row.documents || [],
    expenses: row.expenses || [],
  };
}

function mapWarrantyFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer,
    model: row.model,
    serialNumber: row.serial_number,
    purchasedFrom: row.purchased_from,
    purchasePrice: row.purchase_price,
    dateInstalled: row.date_installed,
    dateExpires: row.date_expires,
    provider: row.provider,
    providerContact: row.provider_contact,
    contractorId: row.contractor_id,
    notes: row.notes,
    images: row.images || [],
    documents: row.documents || [],
  };
}

const STATUS_STYLES = {
  overdue: { bg: "#FBEAF0", text: "#72243E", label: "Overdue", icon: AlertCircle },
  soon: { bg: "#FAEEDA", text: "#854F0B", label: "Due soon", icon: Clock },
  ok: { bg: "#EAF3DE", text: "#3B6D11", label: "On track", icon: CheckCircle2 },
};

const CATEGORY_COLORS = {
  HVAC: "#378ADD",
  Exterior: "#1D9E75",
  Safety: "#D85A30",
  Plumbing: "#7F77DD",
  Appliances: "#D4537E",
  Other: "var(--text-muted)",
};

const TRADE_COLORS = {
  Plumbing: "#7F77DD",
  Electrical: "#378ADD",
  Roofing: "#1D9E75",
  HVAC: "#D85A30",
  Landscaping: "#639922",
  General: "var(--text-muted)",
};

function mergeHomesFromDb(homesData, prevHomes) {
  const prevById = new Map(prevHomes.map((h) => [h.id, h]));
  return homesData.map((h) => {
    const existing = prevById.get(h.id);
    return {
      id: h.id,
      user_id: h.user_id,
      name: h.name,
      address: h.address,
      color: h.color,
      image: h.image,
      created_at: h.created_at,
      tasks: existing?.tasks ?? [],
      projects: existing?.projects ?? [],
      warranties: existing?.warranties ?? [],
    };
  });
}

function homeDetailsFromQueries(tasksData, projectsData, warrantiesData, completionsByTask) {
  return {
    tasks: (tasksData || []).map((t) => mapTaskFromDb(t, completionsByTask[t.id] || [])),
    projects: (projectsData || []).map(mapProjectFromDb),
    warranties: (warrantiesData || []).map(mapWarrantyFromDb),
  };
}

async function fetchCompletionsByTask(tasksData) {
  const completionsByTask = {};
  if (!tasksData || tasksData.length === 0) return completionsByTask;

  const taskIds = tasksData.map((t) => t.id);
  const { data: completionsData, error: completionsError } = await supabase
    .from("task_completions")
    .select("*")
    .in("task_id", taskIds)
    .order("date_completed", { ascending: false });

  if (completionsError) console.error("Error loading task completions:", completionsError);
  if (completionsData) {
    for (const row of completionsData) {
      if (!completionsByTask[row.task_id]) completionsByTask[row.task_id] = [];
      completionsByTask[row.task_id].push(mapCompletionFromDb(row));
    }
  }
  return completionsByTask;
}

function applyActiveHomeDetails(activeHomeId, tasksData, projectsData, warrantiesData, completionsByTask, errors) {
  const details = homeDetailsFromQueries(tasksData, projectsData, warrantiesData, completionsByTask);
  return (prev) =>
    prev.map((h) => {
      if (h.id !== activeHomeId) return h;
      return {
        ...h,
        tasks: errors.tasksError ? h.tasks : details.tasks,
        projects: errors.projectsError ? h.projects : details.projects,
        warranties: errors.warrantiesError ? h.warranties : details.warranties,
      };
    });
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App({ session }) {
  const userId = session?.user?.id;
  const [homes, setHomes] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [theme, setTheme] = useState("light"); // 'light' | 'dark'
  const [activeHomeId, setActiveHomeId] = useState(null);
  const [view, setView] = useState("maintenance"); // 'maintenance' | 'projects'
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // null | "new" | project object
  const [editingContractor, setEditingContractor] = useState(null); // null | "new" | contractor object
  const [showSettings, setShowSettings] = useState(false);
  const [tradeOptions, setTradeOptions] = useState([]);
  const [taskLibrary, setTaskLibrary] = useState([]);
  const [completingTask, setCompletingTask] = useState(null);
  const [editingWarranty, setEditingWarranty] = useState(null); // null | "new" | warranty object

  useEffect(() => {
    if (!userId) return;

    async function loadData() {
      setLoadingData(true);

      const { data: homesData, error: homesError } = await supabase
        .from("homes")
        .select("*")
        .order("name");

      const { data: contractorsData, error: contractorsError } = await supabase
        .from("contractors")
        .select("*")
        .order("name");

      const { data: tradesData, error: tradesError } = await supabase
        .from("trades")
        .select("*")
        .order("name");

      const { data: taskLibraryData, error: taskLibraryError } = await supabase
        .from("task_library")
        .select("*")
        .order("title");

      if (homesError) console.error("Error loading homes:", homesError);
      if (contractorsError) console.error("Error loading contractors:", contractorsError);
      if (tradesError) console.error("Error loading trades:", tradesError);
      if (taskLibraryError) console.error("Error loading task library:", taskLibraryError);

      if (homesData) {
        if (homesData.length > 0) {
          setHomes((prev) => mergeHomesFromDb(homesData, prev));
          setActiveHomeId((prev) =>
            prev && homesData.some((h) => h.id === prev) ? prev : homesData[0].id
          );
        } else {
          setHomes([]);
          setActiveHomeId(null);
        }
      }
      if (contractorsData) setContractors(contractorsData);
      if (tradesData) setTradeOptions(tradesData.map((t) => t.name));
      if (taskLibraryData) setTaskLibrary(taskLibraryData.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        frequencyMonths: t.frequency_months,
      })));

      setLoadingData(false);
    }

    loadData();
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeHomeId) return;

    async function loadHomeData() {
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("home_id", activeHomeId)
        .order("next_due");

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("home_id", activeHomeId)
        .order("date", { ascending: false });

      const { data: warrantiesData, error: warrantiesError } = await supabase
        .from("warranties")
        .select("*")
        .eq("home_id", activeHomeId)
        .order("date_expires");

      if (tasksError) console.error("Error loading tasks:", tasksError);
      if (projectsError) console.error("Error loading projects:", projectsError);
      if (warrantiesError) console.error("Error loading warranties:", warrantiesError);

      const completionsByTask = tasksError
        ? {}
        : await fetchCompletionsByTask(tasksData);

      setHomes(applyActiveHomeDetails(
        activeHomeId,
        tasksData,
        projectsData,
        warrantiesData,
        completionsByTask,
        { tasksError, projectsError, warrantiesError }
      ));
    }

    loadHomeData();
  }, [userId, activeHomeId]);

  async function reloadHomeData(homeId) {
    if (!userId || !homeId) return;

    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("home_id", homeId)
      .order("next_due");

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("home_id", homeId)
      .order("date", { ascending: false });

    const { data: warrantiesData, error: warrantiesError } = await supabase
      .from("warranties")
      .select("*")
      .eq("home_id", homeId)
      .order("date_expires");

    if (tasksError) console.error("Error loading tasks:", tasksError);
    if (projectsError) console.error("Error loading projects:", projectsError);
    if (warrantiesError) console.error("Error loading warranties:", warrantiesError);

    const completionsByTask = tasksError
      ? {}
      : await fetchCompletionsByTask(tasksData);

    setHomes(applyActiveHomeDetails(
      homeId,
      tasksData,
      projectsData,
      warrantiesData,
      completionsByTask,
      { tasksError, projectsError, warrantiesError }
    ));
  }

  async function reloadActiveHomeData() {
    await reloadHomeData(activeHomeId);
  }

  const activeHome = homes.find((h) => h.id === activeHomeId);

  const sortedTasks = useMemo(() => {
    if (!activeHome) return [];
    return [...activeHome.tasks].sort(
      (a, b) => new Date(a.nextDue) - new Date(b.nextDue)
    );
  }, [activeHome]);

  function updateHome(homeId, updater) {
    setHomes((prev) =>
      prev.map((h) => (h.id === homeId ? updater(h) : h))
    );
  }

  async function completeTask(taskId, completion) {
    const userId = session?.user?.id;
    if (!userId || !activeHomeId || !taskId) return false;

    const task = activeHome?.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    if (!isValidDateStr(completion.dateCompleted) || !isValidDateStr(completion.nextDate)) {
      return false;
    }

    const contractorIds = validateContractorIds(completion.contractorIds, contractors);
    const notes = trimOptional(completion.notes);
    const images = imagesForDb(completion.images);
    const expenses = expensesForDb(completion.expenses);
    const mergedImages = imagesForDb([...(task.images || []), ...(completion.images || [])]);

    const { data: completionRow, error: completionError } = await supabase
      .from("task_completions")
      .insert({
        task_id: taskId,
        user_id: userId,
        date_completed: completion.dateCompleted,
        contractor_ids: contractorIds,
        notes,
        images,
        expenses,
      })
      .select()
      .single();

    if (completionError) {
      console.error("Error saving task completion:", completionError);
      return false;
    }

    const { data: updatedTask, error: taskError } = await supabase
      .from("tasks")
      .update({
        last_done: completion.dateCompleted,
        next_due: completion.nextDate,
        completion_notes: notes,
        completion_expenses: expenses,
        images: mergedImages,
      })
      .eq("id", taskId)
      .eq("user_id", userId)
      .select()
      .single();

    if (taskError) {
      console.error("Error updating task:", taskError);
      return false;
    }

    const historyEntry = mapCompletionFromDb(completionRow);

    updateHome(activeHomeId, (home) => ({
      ...home,
      tasks: home.tasks.map((t) =>
        t.id === taskId
          ? {
            ...mapTaskFromDb(updatedTask, [historyEntry, ...(t.completionHistory || [])]),
            contractorIds,
          }
          : t
      ),
    }));
    return true;
  }

  async function addTask(newTask) {
    if (!session?.user?.id || !activeHomeId) {
      return { ok: false, error: "No active property selected." };
    }

    const title = trimRequired(newTask.title);
    if (!title) return { ok: false, error: "Task title is required." };

    const category = validateTaskCategory(newTask.category);
    if (!category) {
      return { ok: false, error: `Invalid category "${newTask.category}". Use a standard maintenance category.` };
    }

    const frequencyMonths = validateFrequencyMonths(newTask.frequencyMonths);
    if (frequencyMonths === null) {
      return { ok: false, error: "Repeat interval must be between 1 and 120 months." };
    }

    const contractorId = newTask.contractorId || null;
    if (contractorId && !contractors.some((c) => c.id === contractorId)) {
      return { ok: false, error: "Selected contractor is no longer available." };
    }

    if (imagesStillUploading(newTask.images) || filesStillUploading(newTask.documents)) {
      return { ok: false, error: "Wait for files to finish uploading before saving." };
    }

    const nextDueValue = newTask.nextDue
      ? (isValidDateStr(newTask.nextDue) ? newTask.nextDue : null)
      : addMonths(TODAY.toISOString().split("T")[0], frequencyMonths);
    if (!nextDueValue) return { ok: false, error: "Enter a valid first due date." };

    const { error } = await supabase
      .from("tasks")
      .insert({
        home_id: activeHomeId,
        title,
        category,
        frequency_months: frequencyMonths,
        last_done: null,
        next_due: nextDueValue,
        contractor_id: contractorId,
        images: imagesForDb(newTask.images),
        documents: documentsForDb(newTask.documents),
      });

    if (error) {
      console.error("Error adding task:", error);
      return { ok: false, error: saveErrorMessage(error, "Could not save task.") };
    }

    await reloadActiveHomeData();
    setShowAddTask(false);
    return { ok: true };
  }

  async function deleteTask(taskId) {
    const userId = session?.user?.id;
    if (!userId || !taskId) return;

    const task = activeHome?.tasks.find((t) => t.id === taskId);
    const paths = [
      ...collectImagePaths(task?.images),
      ...collectImagePaths(task?.documents),
      ...(task?.completionHistory || []).flatMap((entry) => [
        ...collectImagePaths(entry.images),
        ...collectImagePathsFromExpenses(entry.expenses),
      ]),
    ];

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting task:", error);
      return;
    }

    await deleteStorageImages(paths);

    updateHome(activeHomeId, (home) => ({
      ...home,
      tasks: home.tasks.filter((t) => t.id !== taskId),
    }));
  }

  async function addProject(newProject) {
    if (!session?.user?.id || !activeHomeId) {
      return { ok: false, error: "No active property selected." };
    }

    const title = trimRequired(newProject.title);
    if (!title) return { ok: false, error: "Project title is required." };

    if (imagesStillUploading(newProject.images) || filesStillUploading(newProject.documents)) {
      return { ok: false, error: "Wait for files to finish uploading before saving." };
    }

    const date = isValidDateStr(newProject.date)
      ? newProject.date
      : TODAY.toISOString().split("T")[0];

    const contractorIds = validateContractorIds(newProject.contractorIds, contractors);

    const { error } = await supabase
      .from("projects")
      .insert({
        home_id: activeHomeId,
        title,
        date,
        notes: trimOptional(newProject.notes),
        paints: Array.isArray(newProject.paints) ? newProject.paints : [],
        contractor_ids: contractorIds,
        images: imagesForDb(newProject.images),
        documents: documentsForDb(newProject.documents),
        expenses: expensesForDb(newProject.expenses),
      });

    if (error) {
      console.error("Error adding project:", error);
      return { ok: false, error: saveErrorMessage(error, "Could not save project.") };
    }

    await reloadActiveHomeData();
    setEditingProject(null);
    return { ok: true };
  }

  async function editProject(projectId, updates, sourceHomeId = activeHomeId) {
    if (!session?.user?.id || !projectId) {
      return { ok: false, error: "Could not update project." };
    }

    const title = trimRequired(updates.title);
    if (!title) return { ok: false, error: "Project title is required." };

    if (imagesStillUploading(updates.images) || filesStillUploading(updates.documents)) {
      return { ok: false, error: "Wait for files to finish uploading before saving." };
    }

    const date = isValidDateStr(updates.date)
      ? updates.date
      : TODAY.toISOString().split("T")[0];

    const contractorIds = validateContractorIds(updates.contractorIds, contractors);
    const targetHomeId = updates.homeId && homes.some((h) => h.id === updates.homeId)
      ? updates.homeId
      : sourceHomeId;

    if (!targetHomeId || !homes.some((h) => h.id === targetHomeId)) {
      return { ok: false, error: "Choose a valid property." };
    }

    const oldProject = homes
      .find((h) => h.id === sourceHomeId)
      ?.projects?.find((p) => p.id === projectId);

    if (!oldProject) {
      return { ok: false, error: "Project not found on this property." };
    }

    const sanitized = {
      title,
      date,
      notes: trimOptional(updates.notes),
      paints: Array.isArray(updates.paints) ? updates.paints : [],
      contractor_ids: contractorIds,
      images: imagesForDb(updates.images),
      documents: documentsForDb(updates.documents),
      expenses: expensesForDb(updates.expenses),
    };

    if (targetHomeId !== sourceHomeId) {
      sanitized.home_id = targetHomeId;
    }

    const { error } = await supabase
      .from("projects")
      .update(sanitized)
      .eq("id", projectId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating project:", error);
      return { ok: false, error: saveErrorMessage(error, "Could not update project.") };
    }

    await deleteStorageImages([
      ...removedImagePaths(oldProject?.images, updates.images),
      ...removedImagePaths(oldProject?.documents, updates.documents),
      ...removedReceiptPaths(oldProject?.expenses, updates.expenses),
    ]);

    if (targetHomeId !== sourceHomeId) {
      await reloadHomeData(sourceHomeId);
      await reloadHomeData(targetHomeId);
    } else {
      await reloadHomeData(sourceHomeId);
    }

    return { ok: true };
  }

  async function deleteProject(projectId) {
    const userId = session?.user?.id;
    if (!userId || !projectId) return;

    const project = activeHome?.projects.find((p) => p.id === projectId);
    const paths = [
      ...collectImagePaths(project?.images),
      ...collectImagePaths(project?.documents),
      ...collectImagePathsFromExpenses(project?.expenses),
    ];

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting project:", error);
      return;
    }

    await deleteStorageImages(paths);

    updateHome(activeHomeId, (home) => ({
      ...home,
      projects: home.projects.filter((p) => p.id !== projectId),
    }));
  }

  async function addHome(newHome) {
    const userId = session?.user?.id;
    if (!userId) return;

    const name = trimRequired(newHome.name);
    if (!name) return;

    const color = isValidHexColor(newHome.color) ? newHome.color : "#2F4A3E";

    const { data, error } = await supabase
      .from("homes")
      .insert({
        user_id: userId,
        name,
        address: trimOptional(newHome.address),
        color,
        image: imageForDb(newHome.image),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding home:", error);
      return;
    }

    setHomes((prev) => [...prev, { ...data, tasks: [], projects: [], warranties: [] }]);
    setActiveHomeId(data.id);
  }

  async function editHome(homeId, updates) {
    const userId = session?.user?.id;
    if (!userId || !homeId) return;

    const name = trimRequired(updates.name);
    if (!name) return;

    const color = isValidHexColor(updates.color) ? updates.color : "#2F4A3E";
    const oldHome = homes.find((h) => h.id === homeId);
    const newImage = imageForDb(updates.image);

    const { error } = await supabase
      .from("homes")
      .update({
        name,
        address: trimOptional(updates.address),
        color,
        image: newImage,
      })
      .eq("id", homeId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating home:", error);
      return;
    }

    if (oldHome?.image?.path && oldHome.image.path !== newImage?.path) {
      await deleteStorageImage(oldHome.image.path);
    }

    setHomes((prev) =>
      prev.map((h) => (h.id === homeId ? { ...h, name, address: trimOptional(updates.address), color, image: newImage } : h))
    );
  }

  async function deleteHome(homeId) {
    const userId = session?.user?.id;
    if (!userId || !homeId) return;

    const home = homes.find((h) => h.id === homeId);
    const paths = collectImagePathsFromHome(home);

    const { error } = await supabase
      .from("homes")
      .delete()
      .eq("id", homeId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting home:", error);
      return;
    }

    await deleteStorageImages(paths);

    const remaining = homes.filter((h) => h.id !== homeId);
    setHomes(remaining);
    if (activeHomeId === homeId) {
      setActiveHomeId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  async function addContractor(newContractor) {
    if (!session?.user?.id) {
      return { ok: false, error: "Sign in to add a contractor." };
    }

    const name = trimRequired(newContractor.name);
    if (!name) return { ok: false, error: "Contact name is required." };

    const email = trimOptional(newContractor.email);
    if (email && !isValidEmail(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }

    const trade = trimRequired(newContractor.trade);
    if (!trade) return { ok: false, error: "Choose a trade." };

    const payload = {
      user_id: session.user.id,
      name,
      company: trimOptional(newContractor.company),
      trade,
      phone_mobile: trimOptional(newContractor.phoneMobile),
      phone_office: trimOptional(newContractor.phoneOffice),
      email,
      license_number: trimOptional(newContractor.licenseNumber),
      insurance_provider: trimOptional(newContractor.insuranceProvider),
      insurance_policy_number: trimOptional(newContractor.insurancePolicyNumber),
      insurance_expires: newContractor.insuranceExpires && isValidDateStr(newContractor.insuranceExpires)
        ? newContractor.insuranceExpires
        : null,
      coi_image: imageForDb(newContractor.coiImage),
      rating: validateRating(newContractor.rating),
      notes: trimOptional(newContractor.notes),
    };

    const { data, error } = await supabase
      .from("contractors")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error adding contractor:", error);
      return { ok: false, error: saveErrorMessage(error, "Could not save contractor.") };
    }

    setContractors((prev) => [...prev, {
      id: data.id,
      name: data.name,
      company: data.company,
      trade: data.trade,
      phoneMobile: data.phone_mobile,
      phoneOffice: data.phone_office,
      email: data.email,
      licenseNumber: data.license_number,
      insuranceProvider: data.insurance_provider,
      insurancePolicyNumber: data.insurance_policy_number,
      insuranceExpires: data.insurance_expires,
      coiImage: data.coi_image,
      rating: data.rating,
      notes: data.notes,
    }]);
    setEditingContractor(null);
    return { ok: true };
  }

  async function editContractor(contractorId, updates) {
    if (!session?.user?.id || !contractorId) {
      return { ok: false, error: "Could not update contractor." };
    }

    const name = trimRequired(updates.name);
    if (!name) return { ok: false, error: "Contact name is required." };

    const email = trimOptional(updates.email);
    if (email && !isValidEmail(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }

    const trade = trimRequired(updates.trade);
    if (!trade) return { ok: false, error: "Choose a trade." };

    const oldContractor = contractors.find((c) => c.id === contractorId);
    const newCoiImage = imageForDb(updates.coiImage);

    const sanitized = {
      name,
      company: trimOptional(updates.company),
      trade,
      phone_mobile: trimOptional(updates.phoneMobile),
      phone_office: trimOptional(updates.phoneOffice),
      email,
      license_number: trimOptional(updates.licenseNumber),
      insurance_provider: trimOptional(updates.insuranceProvider),
      insurance_policy_number: trimOptional(updates.insurancePolicyNumber),
      insurance_expires: updates.insuranceExpires && isValidDateStr(updates.insuranceExpires)
        ? updates.insuranceExpires
        : null,
      coi_image: newCoiImage,
      rating: validateRating(updates.rating),
      notes: trimOptional(updates.notes),
    };

    const { error } = await supabase
      .from("contractors")
      .update(sanitized)
      .eq("id", contractorId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating contractor:", error);
      return { ok: false, error: saveErrorMessage(error, "Could not update contractor.") };
    }

    if (oldContractor?.coiImage?.path && oldContractor.coiImage.path !== newCoiImage?.path) {
      await deleteStorageImage(oldContractor.coiImage.path);
    }

    setContractors((prev) =>
      prev.map((c) => (c.id === contractorId ? {
        ...c,
        name: sanitized.name,
        company: sanitized.company,
        trade: sanitized.trade,
        phoneMobile: sanitized.phone_mobile,
        phoneOffice: sanitized.phone_office,
        email: sanitized.email,
        licenseNumber: sanitized.license_number,
        insuranceProvider: sanitized.insurance_provider,
        insurancePolicyNumber: sanitized.insurance_policy_number,
        insuranceExpires: sanitized.insurance_expires,
        coiImage: sanitized.coi_image,
        rating: sanitized.rating,
        notes: sanitized.notes,
      } : c))
    );
    return { ok: true };
  }

  async function deleteContractor(contractorId) {
    const userId = session?.user?.id;
    if (!userId || !contractorId) return;

    const contractor = contractors.find((c) => c.id === contractorId);
    const coiPath = contractor?.coiImage?.path;

    const { error } = await supabase
      .from("contractors")
      .delete()
      .eq("id", contractorId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting contractor:", error);
      return;
    }

    if (coiPath) await deleteStorageImage(coiPath);

    setContractors((prev) => prev.filter((c) => c.id !== contractorId));
    setHomes((prev) =>
      prev.map((home) => ({
        ...home,
        tasks: (home.tasks || []).map((t) => ({
          ...t,
          contractorId: t.contractorId === contractorId ? null : t.contractorId,
          contractorIds: (t.contractorIds || []).filter((id) => id !== contractorId),
        })),
        projects: (home.projects || []).map((p) => ({
          ...p,
          contractorIds: (p.contractorIds || []).filter((id) => id !== contractorId),
        })),
        warranties: (home.warranties || []).map((w) => ({
          ...w,
          contractorId: w.contractorId === contractorId ? null : w.contractorId,
        })),
      }))
    );
  }

  async function addWarranty(newWarranty) {
    if (!session?.user?.id || !activeHomeId) {
      return { ok: false, error: "No active property selected." };
    }

    const name = trimRequired(newWarranty.name);
    if (!name) return { ok: false, error: "Purchase name is required." };

    if (imagesStillUploading(newWarranty.images) || filesStillUploading(newWarranty.documents)) {
      return { ok: false, error: "Wait for files to finish uploading before saving." };
    }

    const contractorId = newWarranty.contractorId || null;
    if (contractorId && !contractors.some((c) => c.id === contractorId)) {
      return { ok: false, error: "Selected contractor is no longer available." };
    }

    const { error } = await supabase
      .from("warranties")
      .insert({
        home_id: activeHomeId,
        name,
        manufacturer: trimOptional(newWarranty.manufacturer),
        model: trimOptional(newWarranty.model),
        serial_number: trimOptional(newWarranty.serialNumber),
        purchased_from: trimOptional(newWarranty.purchasedFrom),
        purchase_price: trimOptional(newWarranty.purchasePrice),
        date_installed: newWarranty.dateInstalled && isValidDateStr(newWarranty.dateInstalled)
          ? newWarranty.dateInstalled
          : null,
        date_expires: newWarranty.dateExpires && isValidDateStr(newWarranty.dateExpires)
          ? newWarranty.dateExpires
          : null,
        provider: trimOptional(newWarranty.provider),
        provider_contact: trimOptional(newWarranty.providerContact),
        contractor_id: contractorId,
        notes: trimOptional(newWarranty.notes),
        images: imagesForDb(newWarranty.images),
        documents: documentsForDb(newWarranty.documents),
      });

    if (error) {
      console.error("Error adding warranty:", error);
      return { ok: false, error: saveErrorMessage(error, "Could not save purchase.") };
    }

    await reloadActiveHomeData();
    setEditingWarranty(null);
    return { ok: true };
  }

  async function editWarranty(warrantyId, updates) {
    if (!session?.user?.id || !warrantyId) {
      return { ok: false, error: "Could not update purchase." };
    }

    const name = trimRequired(updates.name);
    if (!name) return { ok: false, error: "Purchase name is required." };

    if (imagesStillUploading(updates.images) || filesStillUploading(updates.documents)) {
      return { ok: false, error: "Wait for files to finish uploading before saving." };
    }

    const contractorId = updates.contractorId || null;
    if (contractorId && !contractors.some((c) => c.id === contractorId)) {
      return { ok: false, error: "Selected contractor is no longer available." };
    }

    const oldWarranty = activeHome?.warranties?.find((w) => w.id === warrantyId);

    const sanitized = {
      name,
      manufacturer: trimOptional(updates.manufacturer),
      model: trimOptional(updates.model),
      serial_number: trimOptional(updates.serialNumber),
      purchased_from: trimOptional(updates.purchasedFrom),
      purchase_price: trimOptional(updates.purchasePrice),
      date_installed: updates.dateInstalled && isValidDateStr(updates.dateInstalled)
        ? updates.dateInstalled
        : null,
      date_expires: updates.dateExpires && isValidDateStr(updates.dateExpires)
        ? updates.dateExpires
        : null,
      provider: trimOptional(updates.provider),
      provider_contact: trimOptional(updates.providerContact),
      contractor_id: contractorId,
      notes: trimOptional(updates.notes),
      images: imagesForDb(updates.images),
      documents: documentsForDb(updates.documents),
    };

    const { error } = await supabase
      .from("warranties")
      .update(sanitized)
      .eq("id", warrantyId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating warranty:", error);
      return { ok: false, error: saveErrorMessage(error, "Could not update purchase.") };
    }

    await deleteStorageImages([
      ...removedImagePaths(oldWarranty?.images, updates.images),
      ...removedImagePaths(oldWarranty?.documents, updates.documents),
    ]);

    await reloadActiveHomeData();
    return { ok: true };
  }

  async function deleteWarranty(warrantyId) {
    const userId = session?.user?.id;
    if (!userId || !warrantyId) return;

    const warranty = activeHome?.warranties?.find((w) => w.id === warrantyId);
    const paths = [
      ...collectImagePaths(warranty?.images),
      ...collectImagePaths(warranty?.documents),
    ];

    const { error } = await supabase
      .from("warranties")
      .delete()
      .eq("id", warrantyId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting warranty:", error);
      return;
    }

    await deleteStorageImages(paths);

    updateHome(activeHomeId, (home) => ({
      ...home,
      warranties: (home.warranties || []).filter((w) => w.id !== warrantyId),
    }));
  }

  async function addTrade(trade) {
    const userId = session?.user?.id;
    if (!userId) return;

    const trimmed = trimRequired(trade);
    if (!trimmed) return;
    if (tradeOptions.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;

    const { error } = await supabase
      .from("trades")
      .insert({ user_id: userId, name: trimmed });

    if (error) {
      console.error("Error adding trade:", error);
      return;
    }

    setTradeOptions((prev) => [...prev, trimmed]);
  }

  async function removeTrade(trade) {
    const userId = session?.user?.id;
    if (!userId || !trade) return;

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("user_id", userId)
      .eq("name", trade);

    if (error) {
      console.error("Error removing trade:", error);
      return;
    }

    setTradeOptions((prev) => prev.filter((t) => t !== trade));
  }

  async function addLibraryTask(item) {
    const userId = session?.user?.id;
    if (!userId) return;

    const title = trimRequired(item.title);
    if (!title) return;

    const category = validateTaskCategory(item.category);
    if (!category) return;

    const frequencyMonths = validateFrequencyMonths(item.frequencyMonths);
    if (frequencyMonths === null) return;

    const { data, error } = await supabase
      .from("task_library")
      .insert({
        user_id: userId,
        title,
        category,
        frequency_months: frequencyMonths,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding library task:", error);
      return;
    }

    setTaskLibrary((prev) => [...prev, {
      id: data.id,
      title: data.title,
      category: data.category,
      frequencyMonths: data.frequency_months,
    }]);
  }

  async function updateLibraryTask(id, updates) {
    const userId = session?.user?.id;
    if (!userId || !id) return;

    const title = trimRequired(updates.title);
    if (!title) return;

    const category = validateTaskCategory(updates.category);
    if (!category) return;

    const frequencyMonths = validateFrequencyMonths(updates.frequencyMonths);
    if (frequencyMonths === null) return;

    const sanitized = { title, category, frequencyMonths };

    const { error } = await supabase
      .from("task_library")
      .update({
        title,
        category,
        frequency_months: frequencyMonths,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating library task:", error);
      return;
    }

    setTaskLibrary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...sanitized } : item))
    );
  }

  async function removeLibraryTask(id) {
    const userId = session?.user?.id;
    if (!userId || !id) return;

    const { error } = await supabase
      .from("task_library")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing library task:", error);
      return;
    }

    setTaskLibrary((prev) => prev.filter((item) => item.id !== id));
  }

  if (loadingData) {
    return (
      <div
        data-theme={theme}
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        <style>{`
          :root { --bg: #F7F4EF; --text-muted: #888780; }
          [data-theme="dark"] { --bg: #1C1C1A; --text-muted: #8A8780; }
        `}</style>
        Loading…
      </div>
    );
  }

  if (!activeHome) return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        :root { --bg: #F7F4EF; --surface: #FFFFFF; --text: #2C2C2A; --text-secondary: #5F5E5A; --text-muted: #888780; --border: #E4DFD3; --subtle: #F1EFE8; }
        [data-theme="dark"] { --bg: #1C1C1A; --surface: #262624; --text: #EDEAE3; --text-secondary: #B8B5AD; --text-muted: #8A8780; --border: #3A3936; --subtle: #303030; }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 600 }}>HomeKeeper</span>
        <button
          onClick={() => setShowSettings(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", cursor: "pointer" }}
        >
          <Settings size={17} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, minHeight: "calc(100vh - 77px)" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No properties yet. Add one under the gear icon.</p>
      </div>
      {showSettings && (
      <SettingsModal
        tradeOptions={tradeOptions}
        onAddTrade={addTrade}
        onRemoveTrade={removeTrade}
        taskLibrary={taskLibrary}
        onAddLibraryTask={addLibraryTask}
        onUpdateLibraryTask={updateLibraryTask}
        onRemoveLibraryTask={removeLibraryTask}
        homes={homes}
        onAddHome={addHome}
        onEditHome={editHome}
        onDeleteHome={deleteHome}
        contractors={contractors}
        tasks={homes.flatMap((h) => h.tasks || [])}
        projects={homes.flatMap((h) => h.projects || [])}
        onAddContractor={() => setEditingContractor("new")}
        onEditContractor={(c) => {
          setEditingContractor(c);
          setShowSettings(false);
        }}
        onDeleteContractor={deleteContractor}
        onClose={() => setShowSettings(false)}
      />
    )}
  </div>
);

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "var(--text)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button { font-family: inherit; cursor: pointer; }
        input, select, textarea { font-family: inherit; }

        :root {
          --bg: #F7F4EF;
          --surface: #FFFFFF;
          --text: #2C2C2A;
          --text-secondary: #5F5E5A;
          --text-muted: #888780;
          --border: #E4DFD3;
          --subtle: #F1EFE8;
        }
        [data-theme="dark"] {
          --bg: #1C1C1A;
          --surface: #262624;
          --text: #EDEAE3;
          --text-secondary: #B8B5AD;
          --text-muted: #8A8780;
          --border: #3A3936;
          --subtle: #303030;
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "0 24px",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontWeight: 600,
                fontSize: 26,
                letterSpacing: "-0.01em",
              }}
            >
              HomeKeeper
            </span>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 36,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              fontSize: 13,
              marginRight: 8,
            }}
          >
            Sign out
          </button>
          <button
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label="Toggle color theme"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              flexShrink: 0,
              marginRight: 6,
            }}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="Manage"
            aria-label="Manage"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 80px" }}>
        {/* Property header with inline switcher */}
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 200px" }}>
            {activeHome.image && (
              <StorageImage
                image={activeHome.image}
                alt={activeHome.image.name}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  objectFit: "cover",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: "'Source Serif 4', serif",
                  fontSize: 28,
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                {activeHome.name}
              </h1>
              {activeHome.address && (
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
                  {activeHome.address}
                </p>
              )}
            </div>
          </div>
          <select
            value={activeHomeId}
            onChange={(e) => setActiveHomeId(e.target.value)}
            aria-label="Switch property"
            style={{
              ...inputStyle,
              marginBottom: 0,
              width: "auto",
              minWidth: 140,
              maxWidth: "100%",
              flexShrink: 0,
              fontWeight: 500,
              borderColor: homes.find((h) => h.id === activeHomeId)?.color,
            }}
          >
            {[...homes].sort((a, b) => a.name.localeCompare(b.name)).map((home) => (
              <option key={home.id} value={home.id}>{home.name}</option>
            ))}
          </select>
        </div>

        {/* View tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          <ViewTab
            active={view === "maintenance"}
            onClick={() => setView("maintenance")}
            icon={Wrench}
            label="Maintenance"
            count={activeHome.tasks.filter((t) => statusForTask(t) === "overdue").length}
          />
          <ViewTab
            active={view === "projects"}
            onClick={() => setView("projects")}
            icon={Paintbrush}
            label="Projects & Paint"
          />
          <ViewTab
            active={view === "warranties"}
            onClick={() => setView("warranties")}
            icon={ShoppingBag}
            label="Purchases"
          />
          <ViewTab
            active={view === "activity"}
            onClick={() => setView("activity")}
            icon={History}
            label="History"
          />
        </div>

        {view === "maintenance" && (
          <MaintenanceView
            tasks={sortedTasks}
            contractors={contractors}
            onMarkDone={(task) => setCompletingTask(task)}
            onAddTask={() => setShowAddTask(true)}
            onDeleteTask={deleteTask}
          />
        )}

        {view === "projects" && (
          <ProjectsView
            projects={activeHome.projects}
            onAddProject={() => setEditingProject("new")}
            onEditProject={(p) => setEditingProject(p)}
          />
        )}

        {view === "warranties" && (
          <WarrantiesView
            warranties={activeHome.warranties || []}
            contractors={contractors}
            onAddWarranty={() => setEditingWarranty("new")}
            onEditWarranty={(w) => setEditingWarranty(w)}
            onDeleteWarranty={deleteWarranty}
          />
        )}

        {view === "activity" && (
          <ActivityView
            tasks={activeHome.tasks}
            projects={activeHome.projects}
            contractors={contractors}
          />
        )}
      </main>

      {/* Modals */}
      {showAddTask && (
        <AddTaskModal
          homeId={activeHomeId}
          contractors={contractors}
          taskLibrary={taskLibrary}
          existingTasks={activeHome.tasks}
          onClose={() => setShowAddTask(false)}
          onSave={addTask}
          onAddLibraryTask={addLibraryTask}
        />
      )}
      {editingProject && (
        <AddProjectModal
          homeId={activeHomeId}
          homes={homes}
          sourceHomeId={activeHomeId}
          contractors={contractors}
          initial={editingProject === "new" ? null : editingProject}
          onClose={() => setEditingProject(null)}
          onSave={async (data) => {
            if (editingProject === "new") {
              return addProject(data);
            }
            const result = await editProject(editingProject.id, data, activeHomeId);
            if (result?.ok !== false) setEditingProject(null);
            return result;
          }}
          onDelete={
            editingProject === "new"
              ? undefined
              : async () => {
                  await deleteProject(editingProject.id);
                  setEditingProject(null);
                }
          }
        />
      )}
 
      {showSettings && (
        <SettingsModal
          tradeOptions={tradeOptions}
          onAddTrade={addTrade}
          onRemoveTrade={removeTrade}
          taskLibrary={taskLibrary}
          onAddLibraryTask={addLibraryTask}
          onUpdateLibraryTask={updateLibraryTask}
          onRemoveLibraryTask={removeLibraryTask}
          homes={homes}
          onAddHome={addHome}
          onEditHome={editHome}
          onDeleteHome={deleteHome}
          contractors={contractors}
          tasks={homes.flatMap((h) => h.tasks)}
          projects={homes.flatMap((h) => h.projects)}
          onAddContractor={() => setEditingContractor("new")}
          onEditContractor={(c) => {
            setEditingContractor(c);
            setShowSettings(false);
          }}
          onDeleteContractor={deleteContractor}
          onClose={() => setShowSettings(false)}
        />
      )}     
      {editingContractor && (
        <AddContractorModal
          tradeOptions={tradeOptions}
          initial={editingContractor === "new" ? null : editingContractor}
          onClose={() => setEditingContractor(null)}
          onSave={async (data) => {
            if (editingContractor === "new") {
              return addContractor(data);
            }
            const result = await editContractor(editingContractor.id, data);
            if (result?.ok !== false) setEditingContractor(null);
            return result;
          }}
        />
      )}
      {editingWarranty && (
        <AddWarrantyModal
          homeId={activeHomeId}
          contractors={contractors}
          propertyName={activeHome.name}
          initial={editingWarranty === "new" ? null : editingWarranty}
          onClose={() => setEditingWarranty(null)}
          onSave={async (data) => {
            if (editingWarranty === "new") {
              return addWarranty(data);
            }
            const result = await editWarranty(editingWarranty.id, data);
            if (result?.ok !== false) setEditingWarranty(null);
            return result;
          }}
        />
      )}
      {completingTask && (
        <CompleteTaskModal
          task={completingTask}
          contractors={contractors}
          onClose={() => setCompletingTask(null)}
          onSave={async (completion) => {
            const ok = await completeTask(completingTask.id, completion);
            if (ok) setCompletingTask(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// VIEW TAB
// ============================================================================

function ViewTab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "9px 12px",
        borderRadius: 8,
        border: active ? "1px solid #2F4A3E" : "1px solid var(--border)",
        background: active ? "#2F4A3E" : "var(--surface)",
        color: active ? "#FFFFFF" : "var(--text-secondary)",
        fontSize: 14,
        fontWeight: 500,
        flex: "1 1 150px",
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={15} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {typeof count === "number" && (
        <span
          style={{
            fontSize: 12,
            padding: "1px 7px",
            borderRadius: 10,
            background: active ? "rgba(255,255,255,0.18)" : "var(--subtle)",
            color: active ? "#FFFFFF" : "var(--text-muted)",
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// MAINTENANCE VIEW
// ============================================================================

function MaintenanceView({ tasks, contractors, onMarkDone, onAddTask, onDeleteTask }) {
  return (
    <div>
      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <ActionButton onClick={onAddTask} icon={Plus} label="Add task" primary />
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No maintenance tasks yet"
          body="Add a task to start tracking recurring upkeep for this home."
        />
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {tasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              contractor={contractors.find((c) => c.id === task.contractorId)}
              completedContractors={contractors.filter((c) => (task.contractorIds || []).includes(c.id))}
              allContractors={contractors}
              onMarkDone={() => onMarkDone(task)}
              onDelete={() => onDeleteTask(task.id)}
              isLast={i === tasks.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 8,
        border: primary ? "1px solid #2F4A3E" : "1px solid var(--border)",
        background: primary ? "#2F4A3E" : "var(--surface)",
        color: primary ? "#FFFFFF" : "var(--text)",
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function TaskRow({ task, contractor, completedContractors, allContractors, onMarkDone, onDelete, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = statusForTask(task);
  const style = STATUS_STYLES[status];
  const StatusIcon = style.icon;
  const days = daysUntil(task.nextDue);
  const categoryColor = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Other;
  const history = task.completionHistory || [];

  let dueText;
  if (days < 0) dueText = `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  else if (days === 0) dueText = "Due today";
  else dueText = `Due in ${days} day${days === 1 ? "" : "s"}`;

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--subtle)" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "14px 18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: categoryColor,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            {task.title}
            {task.images && task.images.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>
                <ImageIcon size={12} />
                {task.images.length}
              </span>
            )}
            {task.documents && task.documents.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>
                <FileText size={12} />
                {task.documents.length}
              </span>
            )}
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? "Hide history" : "View history"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              <ChevronDown size={15} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>
          )}
          <button
            onClick={onMarkDone}
            title="Mark as done"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
          >
            <Check size={15} />
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                title="Confirm delete"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "1px solid #A32D2D",
                  background: "#A32D2D",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 500,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                title="Cancel"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Remove task"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div style={{ paddingLeft: 18 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {task.category} · every {task.frequencyMonths} month{task.frequencyMonths === 1 ? "" : "s"}
            {task.lastDone && ` · last done ${formatDate(task.lastDone)}`}
            {completedContractors && completedContractors.length > 0
              ? ` · ${completedContractors.map(contractorLabel).join(", ")}`
              : contractor && ` · ${contractorLabel(contractor)}`}
            {task.completionExpenses && task.completionExpenses.length > 0
              && ` · ${formatCurrency(task.completionExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}`}
          </div>
          {task.completionNotes && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, fontStyle: "italic" }}>
              {task.completionNotes}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 6,
            background: style.bg,
            color: style.text,
            whiteSpace: "nowrap",
            alignSelf: "flex-start",
            marginLeft: 18,
          }}
        >
          <StatusIcon size={13} />
          {dueText}
        </div>
        <DocumentListDisplay documents={task.documents} />
      </div>
      {expanded && history.length > 0 && (
        <div style={{ padding: "0 18px 14px 40px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
            Completion history
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((entry) => {
              const entryContractors = allContractors.filter((c) => (entry.contractorIds || []).includes(c.id));
              const entryTotal = (entry.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
              return (
                <div key={entry.id} style={{ borderLeft: "2px solid var(--border)", paddingLeft: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, fontWeight: 500 }}>
                    <span>{formatDate(entry.dateCompleted)}</span>
                    {entryTotal > 0 && <span>{formatCurrency(entryTotal)}</span>}
                  </div>
                  {entryContractors.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {entryContractors.map(contractorLabel).join(", ")}
                    </div>
                  )}
                  {entry.notes && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {entry.notes}
                    </div>
                  )}
                  {entry.images && entry.images.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {entry.images.map((img) => (
                        <StorageImage
                          key={img.id}
                          image={img}
                          alt={img.name}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACTIVITY VIEW (property-wide history)
// ============================================================================

function ActivityView({ tasks, projects, contractors }) {
  const entries = [];

  tasks.forEach((task) => {
    (task.completionHistory || []).forEach((entry) => {
      entries.push({
        kind: "task",
        date: entry.dateCompleted,
        title: task.title,
        category: task.category,
        contractorIds: entry.contractorIds || [],
        notes: entry.notes,
        images: entry.images || [],
        expenses: entry.expenses || [],
      });
    });
  });

  projects.forEach((project) => {
    entries.push({
      kind: "project",
      date: project.date,
      title: project.title,
      category: null,
      contractorIds: project.contractorIds || [],
      notes: project.notes,
      images: project.images || [],
      expenses: project.expenses || [],
    });
  });

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalSpend = entries.reduce(
    (sum, e) => sum + (e.expenses || []).reduce((s, ex) => s + (Number(ex.amount) || 0), 0),
    0
  );

  return (
    <div>
      {entries.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Once you mark maintenance tasks done or log projects, they'll show up here as a timeline for this property."
        />
      ) : (
        <>
          {totalSpend > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--subtle)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Total recorded spend</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(totalSpend)}</span>
            </div>
          )}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {entries.map((entry, i) => {
              const entryContractors = contractors.filter((c) => entry.contractorIds.includes(c.id));
              const entryTotal = (entry.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
              const Icon = entry.kind === "task" ? Wrench : Paintbrush;
              const categoryColor = entry.category ? (CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.Other) : "#888780";

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "14px 18px",
                    borderBottom: i === entries.length - 1 ? "none" : "1px solid var(--subtle)",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: categoryColor + "1A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Icon size={15} color={categoryColor} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{entry.title}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(entry.date)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {entry.kind === "task" ? "Maintenance" : "Project"}
                      {entry.category && ` · ${entry.category}`}
                      {entryContractors.length > 0 && ` · ${entryContractors.map(contractorLabel).join(", ")}`}
                      {entryTotal > 0 && ` · ${formatCurrency(entryTotal)}`}
                    </div>
                    {entry.notes && (
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                        {entry.notes}
                      </div>
                    )}
                    {entry.images.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {entry.images.map((img) => (
                          <StorageImage
                            key={img.id}
                            image={img}
                            alt={img.name}
                            style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover", border: "1px solid var(--subtle)" }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


function ProjectsView({ projects, onAddProject, onEditProject }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <ActionButton onClick={onAddProject} icon={Plus} label="Log a project" primary />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects logged yet"
          body="Record home improvement projects, including any paint colors used, so you can find them again later."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => onEditProject(project)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onOpen }) {
  const totalCost = (project.expenses || []).reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 16px",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h3
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            minWidth: 0,
            flex: 1,
          }}
        >
          {project.title}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 2 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(project.date)}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{formatCurrency(totalCost)}</span>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// CONTRACTORS VIEW
// ============================================================================

function ContractorsEditor({ contractors, tasks, projects, homes, onAddContractor, onEditContractor, onDeleteContractor }) {
  function workHistoryFor(contractorId) {
    const fromTasks = tasks
      .filter((t) => t.lastDone && (t.contractorIds || []).includes(contractorId))
      .map((t) => ({
        type: "task",
        title: t.title,
        date: t.lastDone,
        notes: t.completionNotes,
      }));

    const fromProjects = projects
      .filter((p) => (p.contractorIds || []).includes(contractorId))
      .map((p) => ({
        type: "project",
        title: p.title,
        date: p.date,
        notes: p.notes,
      }));

    return [...fromTasks, ...fromProjects].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }

  function propertiesFor(contractorId) {
    return homes
      .filter((home) => {
        const inTasks = home.tasks.some((t) => (t.contractorIds || []).includes(contractorId) || t.contractorId === contractorId);
        const inProjects = home.projects.some((p) => (p.contractorIds || []).includes(contractorId));
        const inWarranties = (home.warranties || []).some((w) => w.contractorId === contractorId);
        return inTasks || inProjects || inWarranties;
      })
      .map((home) => home.name);
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
        Contractors are shared across all your properties. Keep track of trusted plumbers, electricians, and other pros so you can find their info quickly next time.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <ActionButton onClick={onAddContractor} icon={Plus} label="Add contractor" primary />
      </div>

      {contractors.length === 0 ? (
        <EmptyState
          title="No contractors saved yet"
          body="Keep track of trusted plumbers, electricians, and other pros so you can find their info quickly next time."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {[...contractors].sort((a, b) => contractorLabel(a).localeCompare(contractorLabel(b))).map((contractor) => (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              properties={propertiesFor(contractor.id)}
              workHistory={workHistoryFor(contractor.id)}
              onEdit={() => onEditContractor(contractor)}
              onDelete={() => onDeleteContractor(contractor.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContractorCard({ contractor, properties, workHistory, onEdit, onDelete }) {
  const tradeColor = TRADE_COLORS[contractor.trade] || TRADE_COLORS.General;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <h3
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 16,
              fontWeight: 600,
              margin: "0 0 2px",
            }}
          >
            {contractor.company || contractor.name}
          </h3>
          {contractor.company && contractor.name && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{contractor.name}</div>
          )}
        </div>
        {contractor.rating > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                fill={i < contractor.rating ? "#D9A05B" : "none"}
                color={i < contractor.rating ? "#D9A05B" : "var(--border)"}
              />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: contractor.rating > 0 ? 10 : "auto" }}>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                title="Confirm delete"
                style={{
                  ...iconButtonStyle,
                  width: "auto",
                  padding: "0 10px",
                  border: "1px solid #A32D2D",
                  background: "#A32D2D",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} title="Cancel" style={iconButtonStyle}>
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit} title="Edit" style={iconButtonStyle}>
                <Settings size={12} />
              </button>
              <button onClick={() => setConfirmDelete(true)} title="Delete" style={iconButtonStyle}>
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <span
        style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 500,
          padding: "3px 9px",
          borderRadius: 6,
          background: tradeColor + "1A",
          color: tradeColor,
          marginBottom: 12,
        }}
      >
        {contractor.trade}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: (contractor.notes || contractor.licenseNumber || contractor.insuranceProvider || contractor.coiImage) ? 12 : 0 }}>
        {properties && properties.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Home size={13} color="var(--text-muted)" />
            {properties.join(", ")}
          </div>
        )}
        {contractor.phoneMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Phone size={13} color="var(--text-muted)" />
            <a href={telHref(contractor.phoneMobile)} style={{ color: "inherit", textDecoration: "none" }}>
              {contractor.phoneMobile}
            </a>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Mobile</span>
          </div>
        )}
        {contractor.phoneOffice && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Phone size={13} color="var(--text-muted)" />
            <a href={telHref(contractor.phoneOffice)} style={{ color: "inherit", textDecoration: "none" }}>
              {contractor.phoneOffice}
            </a>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Office</span>
          </div>
        )}
        {contractor.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Mail size={13} color="var(--text-muted)" />
            <a href={`mailto:${contractor.email}`} style={{ color: "inherit", textDecoration: "none" }}>
              {contractor.email}
            </a>
          </div>
        )}
        {contractor.licenseNumber && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <FileText size={13} color="var(--text-muted)" />
            License: {contractor.licenseNumber}
          </div>
        )}
        {contractor.insuranceProvider && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Shield size={13} color="var(--text-muted)" />
            {contractor.insuranceProvider}
            {contractor.insurancePolicyNumber && ` · #${contractor.insurancePolicyNumber}`}
            {contractor.insuranceExpires && (() => {
              const expired = new Date(contractor.insuranceExpires) < TODAY;
              return (
                <span style={{ color: expired ? "#A32D2D" : "var(--text-muted)" }}>
                  {" "}· {expired ? "Expired" : "Expires"} {formatDate(contractor.insuranceExpires)}
                </span>
              );
            })()}
          </div>
        )}
        {contractor.coiImage && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <StorageImage
              image={contractor.coiImage}
              alt={contractor.coiImage.name}
              style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
            />
            <span style={{ color: "var(--text-muted)" }}>Certificate of Insurance on file</span>
          </div>
        )}
      </div>

      {contractor.notes && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            margin: 0,
            paddingTop: 10,
            borderTop: "1px solid var(--subtle)",
            lineHeight: 1.6,
          }}
        >
          {contractor.notes}
        </p>
      )}

      {workHistory && workHistory.length > 0 && (
        <div
          style={{
            paddingTop: 10,
            marginTop: contractor.notes ? 10 : 0,
            borderTop: "1px solid var(--subtle)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Work history
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {workHistory.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                {entry.type === "task" ? (
                  <Wrench size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                ) : (
                  <Paintbrush size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>{entry.title}</span>
                    <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(entry.date)}</span>
                  </div>
                  {entry.notes && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{entry.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



function EmptyState({ title, body }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        border: "1px dashed var(--border)",
        borderRadius: 12,
        background: "var(--surface)",
      }}
    >
      <h3 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 17, margin: "0 0 6px" }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
        {body}
      </p>
    </div>
  );
}

// ============================================================================
// MODAL SHELL
// ============================================================================

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44,44,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 19, fontWeight: 600, margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "none",
              background: "var(--subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 14,
  marginBottom: 14,
  background: "var(--surface)",
  color: "var(--text)",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
  marginBottom: 6,
};

const saveButtonStyle = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: 8,
  border: "1px solid #2F4A3E",
  background: "#2F4A3E",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 500,
};

// ============================================================================
// CONTRACTOR MULTI-SELECT
// A dropdown to add contractors, with selected ones shown as removable chips.
// ============================================================================

function ContractorMultiSelect({ contractors, selectedIds, onChange }) {
  const available = contractors.filter((c) => !selectedIds.includes(c.id));
  const selected = contractors.filter((c) => selectedIds.includes(c.id));

  function addContractor(id) {
    if (!id) return;
    onChange([...selectedIds, id]);
  }

  function removeContractor(id) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <select
        style={inputStyle}
        value=""
        onChange={(e) => addContractor(e.target.value)}
        disabled={available.length === 0}
      >
        <option value="">
          {available.length === 0 ? "All contractors selected" : "Select a contractor..."}
        </option>
        {[...available].sort((a, b) => contractorLabel(a).localeCompare(contractorLabel(b))).map((c) => (
          <option key={c.id} value={c.id}>
            {contractorLabel(c)}{c.trade ? ` — ${c.trade}` : ""}
          </option>
        ))}
      </select>

      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {selected.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "4px 6px 4px 10px",
              }}
            >
              {contractorLabel(c)}{c.trade ? ` — ${c.trade}` : ""}
              <button
                onClick={() => removeContractor(c.id)}
                title="Remove"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--subtle)",
                  color: "var(--text-secondary)",
                  padding: 0,
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ============================================================================
// EXPENSE EDITOR
// Itemized line items with description, category, amount, and an optional
// receipt photo per item.
// ============================================================================

const EXPENSE_CATEGORIES = ["Materials", "Labor", "Permit/Fee", "Tax", "Other"];

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ExpenseEditor({ expenses, onChange }) {
  function addExpense() {
    onChange([
      ...expenses,
      { id: "exp" + Math.random().toString(36).slice(2, 9), description: "", category: "Materials", amount: "", receipt: null },
    ]);
  }

  function updateExpense(id, field, value) {
    if (field === "receipt") {
      const old = expenses.find((e) => e.id === id)?.receipt;
      if (old?.path && old.path !== value?.path) deleteStorageImage(old.path);
    }
    onChange(expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeExpense(id) {
    const expense = expenses.find((e) => e.id === id);
    if (expense?.receipt?.path) deleteStorageImage(expense.receipt.path);
    onChange(expenses.filter((e) => e.id !== id));
  }

  async function handleReceiptUpload(id, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const uploaded = await uploadImage(file, "receipts");
    if (uploaded?.path) {
      updateExpense(id, "receipt", { ...uploaded, preview: URL.createObjectURL(file) });
    }
    e.target.value = "";
  }

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {expenses.map((expense) => (
          <div
            key={expense.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                style={{ ...inputStyle, marginBottom: 0, flex: 1.6 }}
                placeholder="Description"
                value={expense.description}
                onChange={(e) => updateExpense(expense.id, "description", e.target.value)}
              />
              <select
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                value={expense.category}
                onChange={(e) => updateExpense(expense.id, "category", e.target.value)}
              >
                {sortWithOtherLast(EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                style={{ ...inputStyle, marginBottom: 0, flex: 0.8 }}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={expense.amount}
                onChange={(e) => updateExpense(expense.id, "amount", e.target.value)}
              />
              <button
                onClick={() => removeExpense(expense.id)}
                title="Remove expense"
                style={{ ...iconButtonStyle, height: 36 }}
              >
                <X size={14} />
              </button>
            </div>

            {expense.receipt ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StorageImage
                  image={expense.receipt}
                  alt={expense.receipt.name}
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)" }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {expense.receipt.name}
                </span>
                <button
                  onClick={() => updateExpense(expense.id, "receipt", null)}
                  title="Remove receipt"
                  style={iconButtonStyle}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  border: "1px dashed var(--border)",
                  borderRadius: 6,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                <ImagePlus size={12} />
                Add receipt photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleReceiptUpload(expense.id, e)}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={addExpense} style={settingsAddButtonStyle}>
          <Plus size={13} /> Add expense
        </button>
        {expenses.length > 0 && (
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            Total: {formatCurrency(total)}
          </span>
        )}
      </div>
    </div>
  );
}


function ImageUploadGrid({ images, onChange, uploadFolder }) {
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";

    for (const file of files) {
      const tempId = newImageId();
      const preview = URL.createObjectURL(file);
      setUploadError("");
      setUploadNotice("");
      onChange((prev) => [...prev, { id: tempId, name: file.name, preview, uploading: true }]);

      const uploaded = await uploadImage(file, uploadFolder);
      if (uploaded?.path) {
        onChange((prev) =>
          prev.map((img) => (img.id === tempId ? { ...uploaded, preview } : img))
        );
        if (uploaded.compressed) {
          setUploadNotice("Large photo was resized automatically to fit the 5 MB limit.");
        }
      } else {
        URL.revokeObjectURL(preview);
        onChange((prev) => prev.filter((img) => img.id !== tempId));
        setUploadError(uploaded?.error || imageUploadErrorMessage(file, null));
      }
    }
  }

  function removeImage(id) {
    const img = images.find((i) => i.id === id);
    if (img?.path) deleteStorageImage(img.path);
    if (img?.preview) URL.revokeObjectURL(img.preview);
    onChange((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {images.map((img) => (
          <div
            key={img.id}
            style={{
              position: "relative",
              width: 64,
              height: 64,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <StorageImage
              image={img}
              alt={img.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {img.uploading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 10,
              }}>
                …
              </div>
            )}
            <button
              onClick={() => removeImage(img.id)}
              title="Remove photo"
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "none",
                background: "rgba(44,44,42,0.6)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <label
          style={{
            width: 64,
            height: 64,
            borderRadius: 8,
            border: "1px dashed var(--border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 11,
            cursor: "pointer",
            flexShrink: 0,
            gap: 2,
          }}
        >
          <ImagePlus size={16} />
          Add
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
        </label>
      </div>
      {uploadNotice && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>
          {uploadNotice}
        </p>
      )}
      {uploadError && (
        <p style={{ fontSize: 12, color: "#A32D2D", margin: uploadNotice ? "4px 0 0" : "8px 0 0" }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}


function DocumentUploadList({ documents, onChange, uploadFolder }) {
  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";

    for (const file of files) {
      const tempId = newDocumentId();
      onChange((prev) => [...prev, { id: tempId, name: file.name, mimeType: file.type, uploading: true }]);

      const uploaded = await uploadDocument(file, uploadFolder);
      if (uploaded) {
        onChange((prev) => prev.map((doc) => (doc.id === tempId ? uploaded : doc)));
      } else {
        onChange((prev) => prev.filter((doc) => doc.id !== tempId));
      }
    }
  }

  function removeDocument(id) {
    const doc = documents.find((d) => d.id === id);
    if (doc?.path) deleteStorageDocuments([doc.path]);
    onChange((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {documents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {doc.name}
              </span>
              {doc.uploading && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>Uploading…</span>
              )}
              <button
                onClick={() => removeDocument(doc.id)}
                title="Remove document"
                disabled={doc.uploading}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: "none",
                  background: "rgba(44,44,42,0.08)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  flexShrink: 0,
                  opacity: doc.uploading ? 0.5 : 1,
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px dashed var(--border)",
          background: "var(--subtle)",
          color: "var(--text-secondary)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <FileText size={16} />
        Add PDF
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}


function DocumentListDisplay({ documents }) {
  if (!documents || documents.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {documents.map((doc) => (
        <StorageDocument key={doc.id} document={doc} />
      ))}
    </div>
  );
}


function AddTaskModal({ homeId, contractors, taskLibrary, existingTasks, onClose, onSave, onAddLibraryTask }) {
  const draftKey = homeId ? `task:${homeId}` : null;

  const [mode, setMode] = useState(() => readFormDraft(draftKey)?.mode ?? "library");
  const [title, setTitle] = useState(() => readFormDraft(draftKey)?.title ?? "");
  const [category, setCategory] = useState(() => readFormDraft(draftKey)?.category ?? "HVAC");
  const [frequencyMonths, setFrequencyMonths] = useState(() => readFormDraft(draftKey)?.frequencyMonths ?? 6);
  const [contractorId, setContractorId] = useState(() => readFormDraft(draftKey)?.contractorId ?? "");
  const [images, setImages] = useState(() => readFormDraft(draftKey)?.images ?? []);
  const [documents, setDocuments] = useState(() => readFormDraft(draftKey)?.documents ?? []);
  const [libraryTaskId, setLibraryTaskId] = useState(() => readFormDraft(draftKey)?.libraryTaskId ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [nextDue, setNextDue] = useState(() => readFormDraft(draftKey)?.nextDue ?? "");
  const [saveToLibrary, setSaveToLibrary] = useState(() => readFormDraft(draftKey)?.saveToLibrary ?? true);
  const [draftRestored] = useState(() => {
    const draft = readFormDraft(draftKey);
    return !!(draft && (draft.title || draft.libraryTaskId || draft.nextDue || draft.contractorId));
  });

  useEffect(() => {
    if (!draftKey) return;
    writeFormDraft(draftKey, {
      mode,
      title,
      category,
      frequencyMonths,
      contractorId,
      images: imagesForDraft(images),
      documents: documentsForDraft(documents),
      libraryTaskId,
      nextDue,
      saveToLibrary,
    });
  }, [draftKey, mode, title, category, frequencyMonths, contractorId, images, documents, libraryTaskId, nextDue, saveToLibrary]);

  const sortedLibrary = [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title));
  const selectedLibraryItem = taskLibrary.find((t) => t.id === libraryTaskId);

  function applyLibraryItem(id) {
    setLibraryTaskId(id);
    const item = taskLibrary.find((t) => t.id === id);
    if (item) {
      setTitle(item.title);
      setCategory(item.category);
      setFrequencyMonths(item.frequencyMonths);
    }
    setError("");
  }

  function checkDuplicate(name) {
    const trimmed = name.trim();
    return existingTasks.some(
      (t) => t.title.trim().toLowerCase() === trimmed.toLowerCase()
    );
  }

  async function handleSave() {
    setError("");

    if (imagesStillUploading(images) || filesStillUploading(documents)) {
      setError("Wait for files to finish uploading before saving.");
      return;
    }

    setSaving(true);
    let result;

    if (mode === "library") {
      if (!selectedLibraryItem) {
        setError("Choose a task from the library, or switch to adding a custom task.");
        setSaving(false);
        return;
      }
      if (checkDuplicate(selectedLibraryItem.title)) {
        setError(`"${selectedLibraryItem.title}" is already on this property's maintenance list.`);
        setSaving(false);
        return;
      }
      result = await onSave({
        title: selectedLibraryItem.title.trim(),
        category: selectedLibraryItem.category,
        frequencyMonths: Number(selectedLibraryItem.frequencyMonths),
        contractorId: contractorId || null,
        images,
        documents,
        nextDue: nextDue || null,
      });
    } else {
      const trimmed = title.trim();
      if (!trimmed) {
        setSaving(false);
        return;
      }

      if (checkDuplicate(trimmed)) {
        setError(`"${trimmed}" is already on this property's maintenance list.`);
        setSaving(false);
        return;
      }

      if (saveToLibrary && onAddLibraryTask) {
        const alreadyInLibrary = taskLibrary.some(
          (t) => t.title.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (!alreadyInLibrary) {
          onAddLibraryTask({
            title: trimmed,
            category,
            frequencyMonths: Number(frequencyMonths),
          });
        }
      }

      result = await onSave({
        title: trimmed,
        category,
        frequencyMonths: Number(frequencyMonths),
        contractorId: contractorId || null,
        images,
        documents,
        nextDue: nextDue || null,
      });
    }

    setSaving(false);
    if (result?.ok === false) {
      setError(result.error || "Could not save task.");
    } else {
      clearFormDraft(draftKey);
    }
  }

  return (
    <Modal title="Add maintenance task" onClose={onClose}>
      {draftRestored && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
          Restored your unsaved draft.
        </p>
      )}
      {mode === "library" ? (
        <>
          {taskLibrary.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.6 }}>
              Your task library is empty. Add a custom task below — you can save it to the library so it's easy to reuse next time.
            </p>
          ) : (
            <>
              <label style={labelStyle}>Task</label>
              <select
                style={{ ...inputStyle, marginBottom: error ? 6 : 14, borderColor: error ? "#A32D2D" : "var(--border)" }}
                value={libraryTaskId}
                onChange={(e) => applyLibraryItem(e.target.value)}
                autoFocus
              >
                <option value="">Choose a task...</option>
                {sortedLibrary.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · every {item.frequencyMonths} month{item.frequencyMonths === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </>
          )}
          {error && (
            <p style={{ fontSize: 12, color: "#A32D2D", margin: "0 0 14px" }}>
              {error}
            </p>
          )}

          {selectedLibraryItem && (
            <>
              <label style={labelStyle}>First due date (optional)</label>
              <input
                style={inputStyle}
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-8px 0 14px", lineHeight: 1.6 }}>
                For a task that's never been done before but is due on a specific date. Leave blank to use today + the repeat interval.
              </p>
              <label style={labelStyle}>Contractor (optional)</label>
              <select
                style={inputStyle}
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">None</option>
                {[...contractors].sort((a, b) => contractorLabel(a).localeCompare(contractorLabel(b))).map((c) => (
                  <option key={c.id} value={c.id}>
                    {contractorLabel(c)}{c.trade ? ` — ${c.trade}` : ""}
                  </option>
                ))}
              </select>
              <label style={labelStyle}>Photos</label>
              <ImageUploadGrid images={images} onChange={setImages} uploadFolder="tasks" />
              <label style={labelStyle}>Documents</label>
              <DocumentUploadList documents={documents} onChange={setDocuments} uploadFolder="tasks" />
            </>
          )}

          <button style={saveButtonStyle} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Add task"}
          </button>

          {!selectedLibraryItem && (
            <button
              onClick={() => {
                setMode("custom");
                setError("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                marginTop: 12,
                padding: "8px 0",
                border: "none",
                background: "none",
                fontSize: 13,
                color: "var(--text-secondary)",
                textDecoration: "underline",
              }}
            >
              This task isn't in the library — add a custom task instead
            </button>
          )}
        </>
      ) : (
        <>
          <label style={labelStyle}>Task name</label>
          <input
            style={{ ...inputStyle, marginBottom: error ? 6 : 14, borderColor: error ? "#A32D2D" : "var(--border)" }}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="e.g. Clean refrigerator coils"
            autoFocus
          />
          {error && (
            <p style={{ fontSize: 12, color: "#A32D2D", margin: "0 0 14px" }}>
              {error}
            </p>
          )}
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {sortWithOtherLast(Object.keys(CATEGORY_COLORS)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label style={labelStyle}>Repeat every (months)</label>
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={frequencyMonths}
            onChange={(e) => setFrequencyMonths(e.target.value)}
          />
          <label style={labelStyle}>First due date (optional)</label>
          <input
            style={inputStyle}
            type="date"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
          />
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-8px 0 14px", lineHeight: 1.6 }}>
            For a task that's never been done before but is due on a specific date. Leave blank to use today + the repeat interval.
          </p>
          <label style={labelStyle}>Contractor (optional)</label>
          <select
            style={inputStyle}
            value={contractorId}
            onChange={(e) => setContractorId(e.target.value)}
          >
            <option value="">None</option>
            {[...contractors].sort((a, b) => contractorLabel(a).localeCompare(contractorLabel(b))).map((c) => (
              <option key={c.id} value={c.id}>
                {contractorLabel(c)}{c.trade ? ` — ${c.trade}` : ""}
              </option>
            ))}
          </select>
          <label style={labelStyle}>Photos</label>
          <ImageUploadGrid images={images} onChange={setImages} uploadFolder="tasks" />
          <label style={labelStyle}>Documents</label>
          <DocumentUploadList documents={documents} onChange={setDocuments} uploadFolder="tasks" />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(e) => setSaveToLibrary(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Save this as a reusable task in the task library
          </label>

          <button style={saveButtonStyle} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Add task"}
          </button>

          {taskLibrary.length > 0 && (
            <button
              onClick={() => {
                setMode("library");
                setError("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                marginTop: 12,
                padding: "8px 0",
                border: "none",
                background: "none",
                fontSize: 13,
                color: "var(--text-secondary)",
                textDecoration: "underline",
              }}
            >
              Choose from the task library instead
            </button>
          )}
        </>
      )}
    </Modal>
  );
}

// ============================================================================
// COMPLETE TASK MODAL
// ============================================================================

function CompleteTaskModal({ task, contractors, onClose, onSave }) {
  const todayStr = TODAY.toISOString().split("T")[0];
  const [dateCompleted, setDateCompleted] = useState(todayStr);
  const [nextDate, setNextDate] = useState(addMonths(todayStr, task.frequencyMonths));
  const [contractorIds, setContractorIds] = useState(task.contractorIds || (task.contractorId ? [task.contractorId] : []));
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState([]);
  const [expenses, setExpenses] = useState(task.completionExpenses || []);

  function handleDateCompletedChange(value) {
    setDateCompleted(value);
    setNextDate(addMonths(value, task.frequencyMonths));
  }

  function handleSave() {
    onSave({
      dateCompleted,
      nextDate,
      contractorIds,
      notes: notes.trim(),
      images,
      expenses,
    });
  }

  return (
    <Modal title={`Mark "${task.title}" done`} onClose={onClose}>
      <label style={labelStyle}>Date completed</label>
      <input
        style={inputStyle}
        type="date"
        value={dateCompleted}
        onChange={(e) => handleDateCompletedChange(e.target.value)}
      />

      <label style={labelStyle}>Next due date</label>
      <input
        style={inputStyle}
        type="date"
        value={nextDate}
        onChange={(e) => setNextDate(e.target.value)}
      />

      <label style={labelStyle}>Contractor (optional)</label>
      {contractors.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>
          No contractors saved for this home yet.
        </p>
      ) : (
        <ContractorMultiSelect
          contractors={contractors}
          selectedIds={contractorIds}
          onChange={setContractorIds}
        />
      )}

      <label style={labelStyle}>Notes</label>
      <textarea
        style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What was done, parts replaced, anything to remember next time..."
      />

      <label style={labelStyle}>Photos</label>
      <ImageUploadGrid images={images} onChange={setImages} uploadFolder="completions" />

      <label style={labelStyle}>Expenses</label>
      <ExpenseEditor expenses={expenses} onChange={setExpenses} />

      <button style={saveButtonStyle} onClick={handleSave}>
        Save
      </button>
    </Modal>
  );
}


function AddProjectModal({ homeId, homes, sourceHomeId, contractors, initial, onClose, onSave, onDelete }) {
  const isNew = !initial;
  const draftKey = isNew && homeId ? `project:${homeId}` : null;
  const savedDraft = isNew ? readFormDraft(draftKey) : null;

  const [projectHomeId, setProjectHomeId] = useState(() => sourceHomeId ?? homeId ?? "");
  const [title, setTitle] = useState(() => savedDraft?.title ?? initial?.title ?? "");
  const [date, setDate] = useState(() => savedDraft?.date ?? initial?.date ?? TODAY.toISOString().split("T")[0]);
  const [notes, setNotes] = useState(() => savedDraft?.notes ?? initial?.notes ?? "");
  const [paints, setPaints] = useState(() => savedDraft?.paints ?? initial?.paints ?? []);
  const [contractorIds, setContractorIds] = useState(() => savedDraft?.contractorIds ?? initial?.contractorIds ?? []);
  const [images, setImages] = useState(() => savedDraft?.images ?? initial?.images ?? []);
  const [documents, setDocuments] = useState(() => savedDraft?.documents ?? initial?.documents ?? []);
  const [expenses, setExpenses] = useState(() => savedDraft?.expenses ?? initial?.expenses ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draftRestored] = useState(() => {
    if (!savedDraft) return false;
    return !!(savedDraft.title || savedDraft.notes || savedDraft.paints?.length || savedDraft.contractorIds?.length);
  });

  useEffect(() => {
    if (!draftKey) return;
    writeFormDraft(draftKey, {
      title,
      date,
      notes,
      paints,
      contractorIds,
      images: imagesForDraft(images),
      documents: documentsForDraft(documents),
      expenses: expenses.map((e) => ({
        ...e,
        receipt: e.receipt ? imagesForDraft([e.receipt])[0] ?? null : null,
      })),
    });
  }, [draftKey, title, date, notes, paints, contractorIds, images, documents, expenses]);

  function addPaintRow() {
    setPaints([...paints, { name: "", hex: "#CCCCCC", location: "" }]);
  }

  function updatePaint(index, field, value) {
    setPaints(paints.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removePaint(index) {
    setPaints(paints.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!title.trim()) return;
    setError("");

    if (imagesStillUploading(images) || filesStillUploading(documents)) {
      setError("Wait for files to finish uploading before saving.");
      return;
    }

    setSaving(true);
    const result = await onSave({
      homeId: projectHomeId,
      title: title.trim(),
      date,
      notes: notes.trim(),
      paints: paints.filter((p) => p.name.trim()),
      contractorIds,
      images,
      documents,
      expenses,
    });
    setSaving(false);

    if (result?.ok === false) {
      setError(result.error || "Could not save project.");
    } else {
      clearFormDraft(draftKey);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <Modal title={initial ? "Edit project" : "Log a project"} onClose={onClose}>
      {draftRestored && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
          Restored your unsaved draft.
        </p>
      )}
      {!isNew && homes.length > 1 && (
        <>
          <label style={labelStyle}>Property</label>
          <select
            style={inputStyle}
            value={projectHomeId}
            onChange={(e) => setProjectHomeId(e.target.value)}
          >
            {[...homes].sort((a, b) => a.name.localeCompare(b.name)).map((home) => (
              <option key={home.id} value={home.id}>{home.name}</option>
            ))}
          </select>
        </>
      )}
      <label style={labelStyle}>Project title</label>
      <input
        style={inputStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Repainted guest bedroom"
        autoFocus
      />
      <label style={labelStyle}>Date</label>
      <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <label style={labelStyle}>Contractors (optional)</label>
      {contractors.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>
          No contractors saved for this home yet.
        </p>
      ) : (
        <ContractorMultiSelect
          contractors={contractors}
          selectedIds={contractorIds}
          onChange={setContractorIds}
        />
      )}
      <label style={labelStyle}>Notes</label>
      <textarea
        style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Details, products used, contractor info..."
      />

      <label style={labelStyle}>Paint colors used</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {paints.map((paint, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="color"
              value={paint.hex}
              onChange={(e) => updatePaint(i, "hex", e.target.value)}
              style={{ width: 36, height: 36, padding: 0, border: "1px solid var(--border)", borderRadius: 8, flexShrink: 0 }}
            />
            <input
              style={{ ...inputStyle, marginBottom: 0, flex: 1.4 }}
              placeholder="Paint name"
              value={paint.name}
              onChange={(e) => updatePaint(i, "name", e.target.value)}
            />
            <input
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              placeholder="Where used"
              value={paint.location}
              onChange={(e) => updatePaint(i, "location", e.target.value)}
            />
            <button
              onClick={() => removePaint(i)}
              style={{
                width: 32,
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addPaintRow}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        <Plus size={13} /> Add paint color
      </button>

      <label style={labelStyle}>Photos</label>
      <ImageUploadGrid images={images} onChange={setImages} uploadFolder="projects" />

      <label style={labelStyle}>Documents</label>
      <DocumentUploadList documents={documents} onChange={setDocuments} uploadFolder="projects" />

      <label style={labelStyle}>Expenses</label>
      <ExpenseEditor expenses={expenses} onChange={setExpenses} />

      {error && (
        <p style={{ fontSize: 12, color: "#A32D2D", margin: "0 0 14px" }}>
          {error}
        </p>
      )}

      <button style={saveButtonStyle} onClick={handleSave} disabled={saving || deleting}>
        {saving ? "Saving..." : initial ? "Save changes" : "Save project"}
      </button>

      {!isNew && onDelete && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #A32D2D",
                  background: "#A32D2D",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: deleting || saving ? "not-allowed" : "pointer",
                  opacity: deleting || saving ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting || saving}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  cursor: deleting || saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "#A32D2D",
                fontSize: 14,
                fontWeight: 500,
                cursor: saving || deleting ? "not-allowed" : "pointer",
              }}
            >
              Delete project
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

// ============================================================================
// HOME COLOR OPTIONS
// ============================================================================

const HOME_COLORS = ["#2F4A3E", "#C4644A", "#7F77DD", "#D4537E", "#378ADD", "#854F0B"];

// ============================================================================
// ADD CONTRACTOR MODAL
// ============================================================================

function AddContractorModal({ tradeOptions, initial, onClose, onSave }) {
  const isNew = !initial;
  const draftKey = isNew ? "contractor:new" : null;
  const savedDraft = isNew ? readFormDraft(draftKey) : null;

  const [company, setCompany] = useState(() => savedDraft?.company ?? initial?.company ?? "");
  const [name, setName] = useState(() => savedDraft?.name ?? initial?.name ?? "");
  const [trade, setTrade] = useState(() => savedDraft?.trade ?? initial?.trade ?? "");
  const [phoneMobile, setPhoneMobile] = useState(() => savedDraft?.phoneMobile ?? initial?.phoneMobile ?? "");
  const [phoneOffice, setPhoneOffice] = useState(() => savedDraft?.phoneOffice ?? initial?.phoneOffice ?? "");
  const [email, setEmail] = useState(() => savedDraft?.email ?? initial?.email ?? "");
  const [licenseNumber, setLicenseNumber] = useState(() => savedDraft?.licenseNumber ?? initial?.licenseNumber ?? "");
  const [insuranceProvider, setInsuranceProvider] = useState(() => savedDraft?.insuranceProvider ?? initial?.insuranceProvider ?? "");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(() => savedDraft?.insurancePolicyNumber ?? initial?.insurancePolicyNumber ?? "");
  const [insuranceExpires, setInsuranceExpires] = useState(() => savedDraft?.insuranceExpires ?? initial?.insuranceExpires ?? "");
  const [coiImage, setCoiImage] = useState(() => savedDraft?.coiImage ?? initial?.coiImage ?? null);
  const [rating, setRating] = useState(() => savedDraft?.rating ?? initial?.rating ?? 0);
  const [notes, setNotes] = useState(() => savedDraft?.notes ?? initial?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftRestored] = useState(() => {
    if (!savedDraft) return false;
    return !!(
      savedDraft.company ||
      savedDraft.name ||
      savedDraft.trade ||
      savedDraft.phoneMobile ||
      savedDraft.email ||
      savedDraft.notes
    );
  });

  useEffect(() => {
    if (!draftKey) return;
    writeFormDraft(draftKey, {
      company,
      name,
      trade,
      phoneMobile,
      phoneOffice,
      email,
      licenseNumber,
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpires,
      coiImage: coiImage ? imagesForDraft([coiImage])[0] ?? null : null,
      rating,
      notes,
    });
  }, [
    draftKey,
    company,
    name,
    trade,
    phoneMobile,
    phoneOffice,
    email,
    licenseNumber,
    insuranceProvider,
    insurancePolicyNumber,
    insuranceExpires,
    coiImage,
    rating,
    notes,
  ]);

  async function handleCoiUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (coiImage?.path) await deleteStorageImage(coiImage.path);
    const uploaded = await uploadImage(file, "coi");
    if (uploaded?.path) {
      setCoiImage({ ...uploaded, preview: URL.createObjectURL(file) });
    }
    e.target.value = "";
  }

  function handleRemoveCoi() {
    if (coiImage?.path) deleteStorageImage(coiImage.path);
    if (coiImage?.preview) URL.revokeObjectURL(coiImage.preview);
    setCoiImage(null);
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Contact name is required.");
      return;
    }
    if (!trade) {
      setError("Choose a trade.");
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    const result = await onSave({
      name: name.trim(),
      company: company.trim(),
      trade,
      phoneMobile: phoneMobile.trim(),
      phoneOffice: phoneOffice.trim(),
      email: email.trim(),
      licenseNumber: licenseNumber.trim(),
      insuranceProvider: insuranceProvider.trim(),
      insurancePolicyNumber: insurancePolicyNumber.trim(),
      insuranceExpires,
      coiImage,
      rating,
      notes: notes.trim(),
    });
    setSaving(false);

    if (result?.ok === false) {
      setError(result.error || "Could not save contractor.");
    } else {
      clearFormDraft(draftKey);
    }
  }

  return (
    <Modal title={initial ? "Edit contractor" : "Add contractor"} onClose={onClose}>
      {draftRestored && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
          Restored your unsaved draft.
        </p>
      )}
      <label style={labelStyle}>Company</label>
      <input
        style={inputStyle}
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="e.g. Donnelly Plumbing & Heating"
        autoFocus
      />
      <label style={labelStyle}>Contact name</label>
      <input
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Mike Donnelly"
      />
      <label style={labelStyle}>Trade</label>
      <select
        style={{ ...inputStyle, borderColor: error && !trade ? "#A32D2D" : "var(--border)" }}
        value={trade}
        onChange={(e) => setTrade(e.target.value)}
      >
        <option value="">Choose a trade...</option>
        {sortWithOtherLast(tradeOptions).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <label style={labelStyle}>Mobile phone</label>
      <input
        style={inputStyle}
        value={phoneMobile}
        onChange={(e) => setPhoneMobile(e.target.value)}
        placeholder="e.g. (555) 412-8890"
      />
      <label style={labelStyle}>Office phone</label>
      <input
        style={inputStyle}
        value={phoneOffice}
        onChange={(e) => setPhoneOffice(e.target.value)}
        placeholder="e.g. (555) 412-8800"
      />
      <label style={labelStyle}>Email</label>
      <input
        style={inputStyle}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="e.g. mike@example.com"
      />
      <label style={labelStyle}>License number</label>
      <input
        style={inputStyle}
        value={licenseNumber}
        onChange={(e) => setLicenseNumber(e.target.value)}
        placeholder="e.g. PA-PL-009284"
      />

      <label style={labelStyle}>Insurance provider</label>
      <input
        style={inputStyle}
        value={insuranceProvider}
        onChange={(e) => setInsuranceProvider(e.target.value)}
        placeholder="e.g. State Farm"
      />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Policy number</label>
          <input
            style={inputStyle}
            value={insurancePolicyNumber}
            onChange={(e) => setInsurancePolicyNumber(e.target.value)}
            placeholder="e.g. CL-4471-2026"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Expires</label>
          <input
            style={inputStyle}
            type="date"
            value={insuranceExpires}
            onChange={(e) => setInsuranceExpires(e.target.value)}
          />
        </div>
      </div>

      <label style={labelStyle}>Certificate of Insurance (COI)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {coiImage ? (
          <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            <StorageImage
              image={coiImage}
              alt={coiImage.name}
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", display: "block" }}
            />
            <button
              onClick={handleRemoveCoi}
              title="Remove COI"
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "none",
                background: "rgba(44,44,42,0.6)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <label
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              border: "1px dashed var(--border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: 11,
              cursor: "pointer",
              flexShrink: 0,
              gap: 2,
            }}
          >
            <ImagePlus size={16} />
            Add
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoiUpload}
              style={{ display: "none" }}
            />
          </label>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Upload a photo or scan of the certificate of insurance
        </span>
      </div>

      <label style={labelStyle}>Rating</label>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setRating(i + 1 === rating ? 0 : i + 1)}
            style={{ background: "none", border: "none", padding: 2 }}
          >
            <Star
              size={22}
              fill={i < rating ? "#D9A05B" : "none"}
              color={i < rating ? "#D9A05B" : "var(--border)"}
            />
          </button>
        ))}
      </div>
      <label style={labelStyle}>Notes</label>
      <textarea
        style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What did they do, would you hire them again..."
      />
      {error && (
        <p style={{ fontSize: 12, color: "#A32D2D", margin: "0 0 14px" }}>
          {error}
        </p>
      )}
      <button style={saveButtonStyle} onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : initial ? "Save changes" : "Add contractor"}
      </button>
    </Modal>
  );
}

// ============================================================================
// SETTINGS MODAL
// ============================================================================

function SettingsModal({
  tradeOptions,
  onAddTrade,
  onRemoveTrade,
  taskLibrary,
  onAddLibraryTask,
  onUpdateLibraryTask,
  onRemoveLibraryTask,
  homes,
  onAddHome,
  onEditHome,
  onDeleteHome,
  contractors,
  tasks,
  projects,
  onAddContractor,
  onEditContractor,
  onDeleteContractor,
  onClose,
}) {
  const [tab, setTab] = useState("trades"); // 'trades' | 'tasks' | 'properties' | 'contractors'
  const [newTrade, setNewTrade] = useState("");

  function handleAddTrade() {
    const trimmed = newTrade.trim();
    if (!trimmed) return;
    onAddTrade(trimmed);
    setNewTrade("");
  }

  return (
    <Modal title="Manage" onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <SettingsTab active={tab === "trades"} onClick={() => setTab("trades")} label="Trades" />
        <SettingsTab active={tab === "tasks"} onClick={() => setTab("tasks")} label="Tasks" />
        <SettingsTab active={tab === "properties"} onClick={() => setTab("properties")} label="Properties" />
        <SettingsTab active={tab === "contractors"} onClick={() => setTab("contractors")} label="Contractors" />
      </div>

      {tab === "trades" && (
        <div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
            These options appear in the trade dropdown when adding a contractor.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {sortWithOtherLast(tradeOptions).map((trade) => {
              const tradeColor = TRADE_COLORS[trade] || TRADE_COLORS.General;
              return (
                <div
                  key={trade}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid var(--subtle)",
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: tradeColor,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, flex: 1 }}>{trade}</span>
                  <button
                    onClick={() => onRemoveTrade(trade)}
                    title="Remove trade"
                    style={iconButtonStyle}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              value={newTrade}
              onChange={(e) => setNewTrade(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTrade();
                }
              }}
              placeholder="e.g. Pest Control"
            />
            <button onClick={handleAddTrade} style={settingsAddButtonStyle}>
              <Plus size={13} /> Add
            </button>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <TaskLibraryEditor
          taskLibrary={taskLibrary}
          onAddLibraryTask={onAddLibraryTask}
          onUpdateLibraryTask={onUpdateLibraryTask}
          onRemoveLibraryTask={onRemoveLibraryTask}
        />
      )}

      {tab === "properties" && (
        <PropertiesEditor
          homes={homes}
          onAddHome={onAddHome}
          onEditHome={onEditHome}
          onDeleteHome={onDeleteHome}
        />
      )}

      {tab === "contractors" && (
        <ContractorsEditor
          contractors={contractors}
          tasks={tasks}
          projects={projects}
          homes={homes}
          onAddContractor={onAddContractor}
          onEditContractor={onEditContractor}
          onDeleteContractor={onDeleteContractor}
        />
      )}
    </Modal>
  );
}

function SettingsTab({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 8,
        border: active ? "1px solid #2F4A3E" : "1px solid var(--border)",
        background: active ? "#2F4A3E" : "var(--surface)",
        color: active ? "#FFFFFF" : "var(--text-secondary)",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

const settingsAddButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #2F4A3E",
  background: "#2F4A3E",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const iconButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text-secondary)",
  flexShrink: 0,
};

// ============================================================================
// TASK LIBRARY EDITOR
// ============================================================================

function TaskLibraryEditor({ taskLibrary, onAddLibraryTask, onUpdateLibraryTask, onRemoveLibraryTask }) {
  const [editingId, setEditingId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
        These tasks appear as quick-select options when adding maintenance for any home.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {[...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)).map((item) =>
          editingId === item.id ? (
            <TaskLibraryItemForm
              key={item.id}
              initial={item}
              onSave={(updates) => {
                onUpdateLibraryTask(item.id, updates);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              saveLabel="Save changes"
            />
          ) : (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--subtle)",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {item.category} · every {item.frequencyMonths} month{item.frequencyMonths === 1 ? "" : "s"}
                </div>
              </div>
              <button
                onClick={() => setEditingId(item.id)}
                title="Edit"
                style={iconButtonStyle}
              >
                <Settings size={12} />
              </button>
              <button
                onClick={() => onRemoveLibraryTask(item.id)}
                title="Remove"
                style={iconButtonStyle}
              >
                <X size={12} />
              </button>
            </div>
          )
        )}
        {taskLibrary.length === 0 && !showNewForm && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>No tasks in the library yet.</p>
        )}
      </div>

      {showNewForm ? (
        <TaskLibraryItemForm
          onSave={(item) => {
            onAddLibraryTask(item);
            setShowNewForm(false);
          }}
          onCancel={() => setShowNewForm(false)}
          saveLabel="Add to library"
        />
      ) : (
        <button onClick={() => setShowNewForm(true)} style={settingsAddButtonStyle}>
          <Plus size={13} /> Add task to library
        </button>
      )}
    </div>
  );
}

function TaskLibraryItemForm({ initial, onSave, onCancel, saveLabel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState(initial?.category || Object.keys(CATEGORY_COLORS)[0]);
  const [frequencyMonths, setFrequencyMonths] = useState(initial?.frequencyMonths || 6);

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      category,
      frequencyMonths: Number(frequencyMonths),
    });
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <label style={labelStyle}>Title</label>
      <input
        style={inputStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Clean refrigerator coils"
        autoFocus
      />
      <label style={labelStyle}>Category</label>
      <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
        {sortWithOtherLast(Object.keys(CATEGORY_COLORS)).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <label style={labelStyle}>Repeat every (months)</label>
      <input
        style={{ ...inputStyle, marginBottom: 12 }}
        type="number"
        min={1}
        value={frequencyMonths}
        onChange={(e) => setFrequencyMonths(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} style={{ ...settingsAddButtonStyle, flex: 1, justifyContent: "center" }}>
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PROPERTIES EDITOR
// ============================================================================

function PropertiesEditor({ homes, onAddHome, onEditHome, onDeleteHome }) {
  const [editingId, setEditingId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
        Manage the homes shown in the property switcher. Deleting a home also removes its maintenance tasks, projects, and contractors.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {[...homes].sort((a, b) => a.name.localeCompare(b.name)).map((home) =>
          editingId === home.id ? (
            <PropertyForm
              key={home.id}
              initial={home}
              onSave={(updates) => {
                onEditHome(home.id, updates);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              saveLabel="Save changes"
            />
          ) : (
            <div
              key={home.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--subtle)",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              {home.image ? (
                <StorageImage
                  image={home.image}
                  alt={home.image.name}
                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
                />
              ) : (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: home.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{home.name}</div>
                {home.address && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{home.address}</div>
                )}
              </div>
              {confirmDeleteId === home.id ? (
                <>
                  <button
                    onClick={() => {
                      onDeleteHome(home.id);
                      setConfirmDeleteId(null);
                    }}
                    title="Confirm delete"
                    style={{
                      ...iconButtonStyle,
                      width: "auto",
                      padding: "0 10px",
                      border: "1px solid #A32D2D",
                      background: "#A32D2D",
                      color: "#FFFFFF",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    title="Cancel"
                    style={iconButtonStyle}
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingId(home.id)}
                    title="Edit"
                    style={iconButtonStyle}
                  >
                    <Settings size={12} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(home.id)}
                    title="Delete"
                    disabled={homes.length <= 1}
                    style={{
                      ...iconButtonStyle,
                      opacity: homes.length <= 1 ? 0.4 : 1,
                      cursor: homes.length <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <X size={12} />
                  </button>
                </>
              )}
            </div>
          )
        )}
      </div>

      {showNewForm ? (
        <PropertyForm
          onSave={(home) => {
            onAddHome(home);
            setShowNewForm(false);
          }}
          onCancel={() => setShowNewForm(false)}
          saveLabel="Add property"
        />
      ) : (
        <button onClick={() => setShowNewForm(true)} style={settingsAddButtonStyle}>
          <Plus size={13} /> Add property
        </button>
      )}
    </div>
  );
}

function PropertyForm({ initial, onSave, onCancel, saveLabel }) {
  const [name, setName] = useState(initial?.name || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [color, setColor] = useState(initial?.color || HOME_COLORS[0]);
  const [image, setImage] = useState(initial?.image || null);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), address: address.trim(), color, image });
  }

  async function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (image?.path) await deleteStorageImage(image.path);
    const uploaded = await uploadImage(file, "homes");
    if (uploaded?.path) {
      setImage({ ...uploaded, preview: URL.createObjectURL(file) });
    }
    e.target.value = "";
  }

  function handleRemoveImage() {
    if (image?.path) deleteStorageImage(image.path);
    if (image?.preview) URL.revokeObjectURL(image.preview);
    setImage(null);
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <label style={labelStyle}>Home name</label>
      <input
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Beach House"
        autoFocus
      />
      <label style={labelStyle}>Address</label>
      <input
        style={inputStyle}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="e.g. 123 Ocean Ave, Seaside"
      />
      <label style={labelStyle}>Color tag</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {HOME_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: c,
              border: color === c ? "2px solid var(--text)" : "2px solid transparent",
              padding: 0,
            }}
          />
        ))}
      </div>

      <label style={labelStyle}>Photo</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {image ? (
          <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
            <StorageImage
              image={image}
              alt={image.name}
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", display: "block" }}
            />
            <button
              onClick={handleRemoveImage}
              title="Remove photo"
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "none",
                background: "rgba(44,44,42,0.6)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <label
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              border: "1px dashed var(--border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: 11,
              cursor: "pointer",
              flexShrink: 0,
              gap: 2,
            }}
          >
            <ImagePlus size={16} />
            Add
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
          </label>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Shown next to the property name
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} style={{ ...settingsAddButtonStyle, flex: 1, justifyContent: "center" }}>
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// WARRANTIES EDITOR (Settings tab)
// ============================================================================

function WarrantiesView({ warranties, contractors, onAddWarranty, onEditWarranty, onDeleteWarranty }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <ActionButton onClick={onAddWarranty} icon={Plus} label="Add purchase" primary />
      </div>

      {warranties.length === 0 ? (
        <EmptyState
          title="No purchases saved yet"
          body="Track appliances, fixtures, and other purchases — including price, receipts, and coverage expiration dates."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {warranties.map((w) => (
            <WarrantyCard
              key={w.id}
              warranty={w}
              contractor={contractors.find((c) => c.id === w.contractorId)}
              onEdit={() => onEditWarranty(w)}
              onDelete={() => onDeleteWarranty(w.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WarrantyCard({ warranty, contractor, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const expired = warranty.dateExpires && new Date(warranty.dateExpires) < TODAY;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <h3
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 16,
              fontWeight: 600,
              margin: "0 0 2px",
            }}
          >
            {warranty.name}
          </h3>
          {(warranty.manufacturer || warranty.model) && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {[warranty.manufacturer, warranty.model].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                title="Confirm delete"
                style={{
                  ...iconButtonStyle,
                  width: "auto",
                  padding: "0 10px",
                  border: "1px solid #A32D2D",
                  background: "#A32D2D",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} title="Cancel" style={iconButtonStyle}>
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit} title="Edit" style={iconButtonStyle}>
                <Settings size={12} />
              </button>
              <button onClick={() => setConfirmDelete(true)} title="Delete" style={iconButtonStyle}>
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {warranty.dateExpires && (
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 9px",
            borderRadius: 6,
            background: expired ? "#FBEAF0" : "#EAF3DE",
            color: expired ? "#72243E" : "#3B6D11",
            marginBottom: 12,
          }}
        >
          {expired ? "Expired" : "Expires"} {formatDate(warranty.dateExpires)}
        </span>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: warranty.notes ? 12 : 0 }}>
        {warranty.dateInstalled && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Calendar size={13} color="var(--text-muted)" />
            Installed {formatDate(warranty.dateInstalled)}
          </div>
        )}
        {warranty.serialNumber && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <FileText size={13} color="var(--text-muted)" />
            S/N: {warranty.serialNumber}
          </div>
        )}
        {(warranty.purchasedFrom || warranty.purchasePrice) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <ShoppingBag size={13} color="var(--text-muted)" />
            {[warranty.purchasedFrom, warranty.purchasePrice && formatCurrency(warranty.purchasePrice)].filter(Boolean).join(" · ")}
          </div>
        )}
        {warranty.provider && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <Shield size={13} color="var(--text-muted)" />
            {warranty.provider}
            {warranty.providerContact && ` · ${warranty.providerContact}`}
          </div>
        )}
        {contractor && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <User size={13} color="var(--text-muted)" />
            Installed by {contractorLabel(contractor)}
          </div>
        )}
      </div>

      {warranty.notes && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            margin: 0,
            paddingTop: 10,
            borderTop: "1px solid var(--subtle)",
            lineHeight: 1.6,
          }}
        >
          {warranty.notes}
        </p>
      )}

      {warranty.images && warranty.images.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {warranty.images.map((img) => (
            <StorageImage
              key={img.id}
              image={img}
              alt={img.name}
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                objectFit: "cover",
                border: "1px solid var(--subtle)",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
      <DocumentListDisplay documents={warranty.documents} />
    </div>
  );
}

// ============================================================================
// ADD/EDIT WARRANTY MODAL
// ============================================================================

function AddWarrantyModal({ homeId, contractors, propertyName, initial, onClose, onSave }) {
  const isNew = !initial;
  const draftKey = isNew && homeId ? `warranty:${homeId}` : null;
  const savedDraft = isNew ? readFormDraft(draftKey) : null;

  const [name, setName] = useState(() => savedDraft?.name ?? initial?.name ?? "");
  const [manufacturer, setManufacturer] = useState(() => savedDraft?.manufacturer ?? initial?.manufacturer ?? "");
  const [model, setModel] = useState(() => savedDraft?.model ?? initial?.model ?? "");
  const [serialNumber, setSerialNumber] = useState(() => savedDraft?.serialNumber ?? initial?.serialNumber ?? "");
  const [purchasedFrom, setPurchasedFrom] = useState(() => savedDraft?.purchasedFrom ?? initial?.purchasedFrom ?? "");
  const [purchasePrice, setPurchasePrice] = useState(() => savedDraft?.purchasePrice ?? initial?.purchasePrice ?? "");
  const [dateInstalled, setDateInstalled] = useState(() => savedDraft?.dateInstalled ?? initial?.dateInstalled ?? "");
  const [dateExpires, setDateExpires] = useState(() => savedDraft?.dateExpires ?? initial?.dateExpires ?? "");
  const [provider, setProvider] = useState(() => savedDraft?.provider ?? initial?.provider ?? "");
  const [providerContact, setProviderContact] = useState(() => savedDraft?.providerContact ?? initial?.providerContact ?? "");
  const [contractorId, setContractorId] = useState(() => savedDraft?.contractorId ?? initial?.contractorId ?? "");
  const [notes, setNotes] = useState(() => savedDraft?.notes ?? initial?.notes ?? "");
  const [images, setImages] = useState(() => savedDraft?.images ?? initial?.images ?? []);
  const [documents, setDocuments] = useState(() => savedDraft?.documents ?? initial?.documents ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftRestored] = useState(() => {
    if (!savedDraft) return false;
    return !!(
      savedDraft.name ||
      savedDraft.manufacturer ||
      savedDraft.model ||
      savedDraft.serialNumber ||
      savedDraft.notes ||
      savedDraft.provider
    );
  });

  useEffect(() => {
    if (!draftKey) return;
    writeFormDraft(draftKey, {
      name,
      manufacturer,
      model,
      serialNumber,
      purchasedFrom,
      purchasePrice,
      dateInstalled,
      dateExpires,
      provider,
      providerContact,
      contractorId,
      notes,
      images: imagesForDraft(images),
      documents: documentsForDraft(documents),
    });
  }, [
    draftKey,
    name,
    manufacturer,
    model,
    serialNumber,
    purchasedFrom,
    purchasePrice,
    dateInstalled,
    dateExpires,
    provider,
    providerContact,
    contractorId,
    notes,
    images,
    documents,
  ]);

  async function handleSave() {
    if (!name.trim()) return;
    setError("");

    if (imagesStillUploading(images) || filesStillUploading(documents)) {
      setError("Wait for files to finish uploading before saving.");
      return;
    }

    setSaving(true);
    const result = await onSave({
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      purchasedFrom: purchasedFrom.trim(),
      purchasePrice: purchasePrice.trim(),
      dateInstalled,
      dateExpires,
      provider: provider.trim(),
      providerContact: providerContact.trim(),
      contractorId: contractorId || null,
      notes: notes.trim(),
      images,
      documents,
    });
    setSaving(false);

    if (result?.ok === false) {
      setError(result.error || "Could not save purchase.");
    } else {
      clearFormDraft(draftKey);
    }
  }

  return (
    <Modal title={initial ? "Edit purchase" : "Add purchase"} onClose={onClose}>
      {draftRestored && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
          Restored your unsaved draft.
        </p>
      )}
      {propertyName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 14,
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--subtle)",
          }}
        >
          <Home size={14} color="var(--text-muted)" />
          {propertyName}
        </div>
      )}
      <label style={labelStyle}>Name</label>
      <input
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Kitchen Faucet"
        autoFocus
      />
      <label style={labelStyle}>Manufacturer</label>
      <input
        style={inputStyle}
        value={manufacturer}
        onChange={(e) => setManufacturer(e.target.value)}
        placeholder="e.g. Moen"
      />
      <label style={labelStyle}>Model</label>
      <input
        style={inputStyle}
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="e.g. Arbor 7594"
      />
      <label style={labelStyle}>Serial number</label>
      <input
        style={inputStyle}
        value={serialNumber}
        onChange={(e) => setSerialNumber(e.target.value)}
        placeholder="e.g. MA-2026-00451"
      />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Date installed</label>
          <input
            style={inputStyle}
            type="date"
            value={dateInstalled}
            onChange={(e) => setDateInstalled(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Date expires</label>
          <input
            style={inputStyle}
            type="date"
            value={dateExpires}
            onChange={(e) => setDateExpires(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Purchased from</label>
          <input
            style={inputStyle}
            value={purchasedFrom}
            onChange={(e) => setPurchasedFrom(e.target.value)}
            placeholder="e.g. Home Depot"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Purchase price</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <label style={labelStyle}>Coverage provider</label>
      <input
        style={inputStyle}
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="e.g. Moen Limited Lifetime Coverage"
      />
      <label style={labelStyle}>Provider contact (phone or website)</label>
      <input
        style={inputStyle}
        value={providerContact}
        onChange={(e) => setProviderContact(e.target.value)}
        placeholder="e.g. 1-800-289-6636"
      />

      <label style={labelStyle}>Installed by (optional)</label>
      {contractors.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px" }}>
          No contractors saved for this home yet.
        </p>
      ) : (
        <select
          style={inputStyle}
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
        >
          <option value="">None</option>
          {[...contractors].sort((a, b) => contractorLabel(a).localeCompare(contractorLabel(b))).map((c) => (
            <option key={c.id} value={c.id}>
              {contractorLabel(c)}{c.trade ? ` — ${c.trade}` : ""}
            </option>
          ))}
        </select>
      )}

      <label style={labelStyle}>Notes</label>
      <textarea
        style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Coverage details, registration confirmation, exclusions..."
      />

      <label style={labelStyle}>Photos</label>
      <ImageUploadGrid images={images} onChange={setImages} uploadFolder="warranties" />

      <label style={labelStyle}>Documents</label>
      <DocumentUploadList documents={documents} onChange={setDocuments} uploadFolder="warranties" />

      {error && (
        <p style={{ fontSize: 12, color: "#A32D2D", margin: "0 0 14px" }}>
          {error}
        </p>
      )}

      <button style={saveButtonStyle} onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : initial ? "Save changes" : "Add purchase"}
      </button>
    </Modal>
  );
}
