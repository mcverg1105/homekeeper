import React, { useState, useMemo } from "react";
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
// ============================================================================
// MOCK DATA
// All data below is hardcoded mock data for frontend development only.
// No real database, API keys, or backend connections are present here.
// ============================================================================

const INITIAL_CONTRACTORS = [
  {
    id: "c1",
    name: "Mike Donnelly",
    company: "Donnelly Plumbing & Heating",
    trade: "Plumbing",
    phoneMobile: "(555) 412-8890",
    phoneOffice: "(555) 412-8800",
    email: "mike@donnellyplumbing.com",
    licenseNumber: "PA-PL-009284",
    rating: 5,
    notes: "Fixed the kitchen faucet leak in Feb 2026. Fast and reasonably priced. Ask for Mike directly.",
  },
  {
    id: "c2",
    name: "Priya Anand",
    company: "Anand Electric",
    trade: "Electrical",
    phoneMobile: "(555) 778-2210",
    phoneOffice: "",
    email: "priya@anandelectric.com",
    licenseNumber: "PA-EL-114477",
    rating: 4,
    notes: "Rewired the garage outlets. Licensed and insured, takes a couple days to schedule.",
  },
  {
    id: "c3",
    name: "Tom Belcher",
    company: "Belcher Roofing",
    trade: "Roofing",
    phoneMobile: "(555) 309-6644",
    phoneOffice: "(555) 309-6600",
    email: "tom@belcherroofing.com",
    licenseNumber: "PA-RF-552031",
    rating: 5,
    notes: "Did the roof inspection after the spring storms. Honest about what did and didn't need fixing.",
  },
];

const INITIAL_HOMES = [
  {
    id: "home-1",
    name: "Maple Street House",
    address: "412 Maple Street, Springfield",
    color: "#2F4A3E",
    tasks: [
      { id: "t1", title: "Replace HVAC filter", category: "HVAC", frequencyMonths: 3, lastDone: "2026-03-10", nextDue: "2026-06-10" },
      { id: "t2", title: "Clean gutters", category: "Exterior", frequencyMonths: 6, lastDone: "2025-12-01", nextDue: "2026-06-01" },
      { id: "t3", title: "Test smoke & CO detectors", category: "Safety", frequencyMonths: 6, lastDone: "2026-01-15", nextDue: "2026-07-15" },
      { id: "t4", title: "Service HVAC system", category: "HVAC", frequencyMonths: 12, lastDone: "2025-09-01", nextDue: "2026-09-01" },
      { id: "t5", title: "Flush water heater", category: "Plumbing", frequencyMonths: 12, lastDone: "2025-05-20", nextDue: "2026-05-20" },
    ],
    projects: [
      {
        id: "p1",
        title: "Living room repaint",
        date: "2025-09-12",
        notes: "Two coats over primer. Removed old wallpaper first.",
        paints: [
          { name: "Sherwin-Williams Sea Salt", hex: "#C7D4CC", location: "Living room walls" },
          { name: "Behr Polar Bear", hex: "#F2F1EC", location: "Trim & ceiling" },
        ],
      },
      {
        id: "p2",
        title: "Replaced kitchen faucet",
        date: "2026-02-03",
        notes: "Moen brand, model number on receipt in project folder.",
        paints: [],
      },
    ],
    warranties: [
      {
        id: "w1",
        name: "Kitchen Faucet",
        manufacturer: "Moen",
        model: "Arbor 7594",
        serialNumber: "MA-2026-00451",
        purchasedFrom: "Home Depot",
        purchasePrice: "189.00",
        dateInstalled: "2026-02-03",
        dateExpires: "2031-02-03",
        provider: "Moen Limited Lifetime Warranty",
        providerContact: "1-800-289-6636",
        contractorId: "c1",
        notes: "Lifetime warranty on finish and function, registered online.",
        images: [],
      },
    ],
  },
  {
    id: "home-2",
    name: "Lakeview Cabin",
    address: "88 Birchwood Trail, Lake Carmel",
    color: "#C4644A",
    tasks: [
      { id: "t6", title: "Inspect roof for damage", category: "Exterior", frequencyMonths: 12, lastDone: "2025-05-01", nextDue: "2026-05-01" },
      { id: "t7", title: "Check sump pump", category: "Plumbing", frequencyMonths: 6, lastDone: "2026-04-01", nextDue: "2026-10-01" },
      { id: "t8", title: "Deep clean dryer vent", category: "Appliances", frequencyMonths: 12, lastDone: "2025-06-15", nextDue: "2026-06-15" },
    ],
    projects: [
      {
        id: "p3",
        title: "Exterior deck stain",
        date: "2025-07-04",
        notes: "Applied two coats, sanded lightly between coats.",
        paints: [
          { name: "Cabot Semi-Solid Cordovan Brown", hex: "#6E4534", location: "Deck boards & railing" },
        ],
      },
    ],
    warranties: [
      {
        id: "w2",
        name: "Roof Shingles",
        manufacturer: "GAF",
        model: "Timberline HDZ",
        serialNumber: "",
        purchasedFrom: "Belcher Roofing",
        purchasePrice: "",
        dateInstalled: "2024-08-15",
        dateExpires: "2054-08-15",
        provider: "GAF System Plus Limited Warranty",
        providerContact: "",
        contractorId: "c3",
        notes: "30-year manufacturer warranty, registration confirmation in email.",
        images: [],
      },
    ],
  },
];

// ============================================================================
// HELPERS
// ============================================================================

const TODAY = new Date("2026-06-13");

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

const DEFAULT_TRADES = ["Plumbing", "Electrical", "Roofing", "HVAC", "Landscaping", "General"];

const DEFAULT_TASK_LIBRARY = [
  { id: "tl1", title: "Replace HVAC filter", category: "HVAC", frequencyMonths: 3 },
  { id: "tl2", title: "Test smoke & CO detectors", category: "Safety", frequencyMonths: 6 },
  { id: "tl3", title: "Clean gutters", category: "Exterior", frequencyMonths: 6 },
  { id: "tl4", title: "Flush water heater", category: "Plumbing", frequencyMonths: 12 },
  { id: "tl5", title: "Service HVAC system", category: "HVAC", frequencyMonths: 12 },
  { id: "tl6", title: "Inspect roof for damage", category: "Exterior", frequencyMonths: 12 },
  { id: "tl7", title: "Deep clean dryer vent", category: "Appliances", frequencyMonths: 12 },
  { id: "tl8", title: "Reseal exterior wood/deck", category: "Exterior", frequencyMonths: 24 },
  { id: "tl9", title: "Check sump pump", category: "Plumbing", frequencyMonths: 6 },
  { id: "tl10", title: "Inspect caulking around windows", category: "Exterior", frequencyMonths: 12 },
];

// ============================================================================
// MAIN APP
// ============================================================================

export default function App({ session }) {
  const [homes, setHomes] = useState(INITIAL_HOMES);
  const [contractors, setContractors] = useState(INITIAL_CONTRACTORS);
  const [theme, setTheme] = useState("light"); // 'light' | 'dark'
  const [activeHomeId, setActiveHomeId] = useState(INITIAL_HOMES[0].id);
  const [view, setView] = useState("maintenance"); // 'maintenance' | 'projects'
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // null | "new" | project object
  const [editingContractor, setEditingContractor] = useState(null); // null | "new" | contractor object
  const [showSettings, setShowSettings] = useState(false);
  const [tradeOptions, setTradeOptions] = useState(DEFAULT_TRADES);
  const [taskLibrary, setTaskLibrary] = useState(DEFAULT_TASK_LIBRARY);
  const [completingTask, setCompletingTask] = useState(null);
  const [editingWarranty, setEditingWarranty] = useState(null); // null | "new" | warranty object

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

  function completeTask(taskId, completion) {
    updateHome(activeHomeId, (home) => ({
      ...home,
      tasks: home.tasks.map((t) =>
        t.id === taskId
          ? {
            ...t,
            lastDone: completion.dateCompleted,
            nextDue: completion.nextDate,
            contractorIds: completion.contractorIds,
            completionNotes: completion.notes,
            images: [...(t.images || []), ...(completion.images || [])],
            completionExpenses: completion.expenses || [],
            completionHistory: [
              {
                id: "ch" + Math.random().toString(36).slice(2, 9),
                dateCompleted: completion.dateCompleted,
                contractorIds: completion.contractorIds || [],
                notes: completion.notes,
                images: completion.images || [],
                expenses: completion.expenses || [],
              },
              ...(t.completionHistory || []),
            ],
          }
          : t
      ),
    }));
  }

  function addTask(newTask) {
    const id = "t" + Math.random().toString(36).slice(2, 9);
    updateHome(activeHomeId, (home) => ({
      ...home,
      tasks: [
        ...home.tasks,
        {
          id,
          title: newTask.title,
          category: newTask.category,
          frequencyMonths: newTask.frequencyMonths,
          lastDone: null,
          nextDue: newTask.nextDue || addMonths(TODAY.toISOString().split("T")[0], newTask.frequencyMonths),
          contractorId: newTask.contractorId || null,
          images: newTask.images || [],
        },
      ],
    }));
    setShowAddTask(false);
  }

  function deleteTask(taskId) {
    updateHome(activeHomeId, (home) => ({
      ...home,
      tasks: home.tasks.filter((t) => t.id !== taskId),
    }));
  }

  function addProject(newProject) {
    const id = "p" + Math.random().toString(36).slice(2, 9);
    updateHome(activeHomeId, (home) => ({
      ...home,
      projects: [{ id, ...newProject }, ...home.projects],
    }));
    setEditingProject(null);
  }

  function editProject(projectId, updates) {
    updateHome(activeHomeId, (home) => ({
      ...home,
      projects: home.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates } : p
      ),
    }));
  }

  function deleteProject(projectId) {
    updateHome(activeHomeId, (home) => ({
      ...home,
      projects: home.projects.filter((p) => p.id !== projectId),
    }));
  }

  function addHome(newHome) {
    const id = "home-" + Math.random().toString(36).slice(2, 9);
    setHomes((prev) => [
      ...prev,
      { id, ...newHome, tasks: [], projects: [], warranties: [] },
    ]);
    setActiveHomeId(id);
  }

  function editHome(homeId, updates) {
    setHomes((prev) =>
      prev.map((h) => (h.id === homeId ? { ...h, ...updates } : h))
    );
  }

  function deleteHome(homeId) {
    setHomes((prev) => {
      const next = prev.filter((h) => h.id !== homeId);
      if (activeHomeId === homeId && next.length > 0) {
        setActiveHomeId(next[0].id);
      }
      return next;
    });
  }

  function addContractor(newContractor) {
    const id = "c" + Math.random().toString(36).slice(2, 9);
    setContractors((prev) => [...prev, { id, ...newContractor }]);
    setEditingContractor(null);
  }

  function editContractor(contractorId, updates) {
    setContractors((prev) =>
      prev.map((c) => (c.id === contractorId ? { ...c, ...updates } : c))
    );
  }

  function deleteContractor(contractorId) {
    setContractors((prev) => prev.filter((c) => c.id !== contractorId));
    setHomes((prev) =>
      prev.map((home) => ({
        ...home,
        tasks: home.tasks.map((t) => ({
          ...t,
          contractorId: t.contractorId === contractorId ? null : t.contractorId,
          contractorIds: (t.contractorIds || []).filter((id) => id !== contractorId),
        })),
        projects: home.projects.map((p) => ({
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

  function addWarranty(newWarranty) {
    const id = "w" + Math.random().toString(36).slice(2, 9);
    updateHome(activeHomeId, (home) => ({
      ...home,
      warranties: [...(home.warranties || []), { id, ...newWarranty }],
    }));
    setEditingWarranty(null);
  }

  function editWarranty(warrantyId, updates) {
    updateHome(activeHomeId, (home) => ({
      ...home,
      warranties: (home.warranties || []).map((w) =>
        w.id === warrantyId ? { ...w, ...updates } : w
      ),
    }));
  }

  function deleteWarranty(warrantyId) {
    updateHome(activeHomeId, (home) => ({
      ...home,
      warranties: (home.warranties || []).filter((w) => w.id !== warrantyId),
    }));
  }

  function addTrade(trade) {
    setTradeOptions((prev) =>
      prev.some((t) => t.toLowerCase() === trade.toLowerCase()) ? prev : [...prev, trade]
    );
  }

  function removeTrade(trade) {
    setTradeOptions((prev) => prev.filter((t) => t !== trade));
  }

  function addLibraryTask(item) {
    const id = "tl" + Math.random().toString(36).slice(2, 9);
    setTaskLibrary((prev) => [...prev, { id, ...item }]);
  }

  function updateLibraryTask(id, updates) {
    setTaskLibrary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  function removeLibraryTask(id) {
    setTaskLibrary((prev) => prev.filter((item) => item.id !== id));
  }

  if (!activeHome) return null;

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

      {/* Home switcher */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
          }}
        >
          <select
            value={activeHomeId}
            onChange={(e) => setActiveHomeId(e.target.value)}
            style={{
              ...inputStyle,
              marginBottom: 0,
              width: "auto",
              minWidth: 220,
              maxWidth: "100%",
              fontWeight: 500,
              borderColor: homes.find((h) => h.id === activeHomeId)?.color,
            }}
          >
            {[...homes].sort((a, b) => a.name.localeCompare(b.name)).map((home) => (
              <option key={home.id} value={home.id}>{home.name}</option>
            ))}
          </select>
        </div>
      </div>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 80px" }}>
        {/* Home info strip */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
          {activeHome.image && (
            <img
              src={activeHome.image.src}
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
          <div>
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
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
              {activeHome.address}
            </p>
          </div>
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
            icon={Shield}
            label="Warranties"
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
            contractors={contractors}
            onAddProject={() => setEditingProject("new")}
            onEditProject={(p) => setEditingProject(p)}
            onDeleteProject={deleteProject}
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
          contractors={contractors}
          initial={editingProject === "new" ? null : editingProject}
          onClose={() => setEditingProject(null)}
          onSave={(data) => {
            if (editingProject === "new") {
              addProject(data);
            } else {
              editProject(editingProject.id, data);
              setEditingProject(null);
            }
          }}
        />
      )}
      {editingContractor && (
        <AddContractorModal
          tradeOptions={tradeOptions}
          initial={editingContractor === "new" ? null : editingContractor}
          onClose={() => setEditingContractor(null)}
          onSave={(data) => {
            if (editingContractor === "new") {
              addContractor(data);
            } else {
              editContractor(editingContractor.id, data);
              setEditingContractor(null);
            }
          }}
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
          onEditContractor={(c) => setEditingContractor(c)}
          onDeleteContractor={deleteContractor}
          onClose={() => setShowSettings(false)}
        />
      )}
      {editingWarranty && (
        <AddWarrantyModal
          contractors={contractors}
          propertyName={activeHome.name}
          initial={editingWarranty === "new" ? null : editingWarranty}
          onClose={() => setEditingWarranty(null)}
          onSave={(data) => {
            if (editingWarranty === "new") {
              addWarranty(data);
            } else {
              editWarranty(editingWarranty.id, data);
              setEditingWarranty(null);
            }
          }}
        />
      )}
      {completingTask && (
        <CompleteTaskModal
          task={completingTask}
          contractors={contractors}
          onClose={() => setCompletingTask(null)}
          onSave={(completion) => {
            completeTask(completingTask.id, completion);
            setCompletingTask(null);
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
                        <img
                          key={img.id}
                          src={img.src}
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
                          <img
                            key={img.id}
                            src={img.src}
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


function ProjectsView({ projects, contractors, onAddProject, onEditProject, onDeleteProject }) {
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              contractors={contractors.filter((c) => (project.contractorIds || []).includes(c.id))}
              onEdit={() => onEditProject(project)}
              onDelete={() => onDeleteProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, contractors, onEdit, onDelete }) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <h3
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 17,
            fontWeight: 600,
            margin: 0,
          }}
        >
          {project.title}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(project.date)}</span>
          <div style={{ display: "flex", gap: 6 }}>
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
      </div>
      {contractors.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {contractors.map((c) => (
            <div
              key={c.id}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--subtle)", borderRadius: 6, padding: "3px 8px" }}
            >
              <User size={12} />
              {contractorLabel(c)}{c.company && c.name ? ` · ${c.name}` : ""}
            </div>
          ))}
        </div>
      )}
      {project.notes && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.6 }}>
          {project.notes}
        </p>
      )}
      {project.paints.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: project.notes ? 0 : 4 }}>
          {project.paints.map((paint, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid var(--subtle)",
                borderRadius: 8,
                padding: "6px 10px 6px 6px",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: paint.hex,
                  border: "1px solid rgba(0,0,0,0.08)",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{paint.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {paint.location} · {paint.hex}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {project.images && project.images.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {project.images.map((img) => (
            <img
              key={img.id}
              src={img.src}
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
      {project.expenses && project.expenses.length > 0 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid var(--subtle)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Expenses
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {formatCurrency(project.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {project.expenses.map((expense) => (
              <div key={expense.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                {expense.receipt && (
                  <img
                    src={expense.receipt.src}
                    alt={expense.receipt.name}
                    style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
                  />
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  {expense.description || expense.category}
                  <span style={{ color: "var(--text-muted)" }}> · {expense.category}</span>
                </span>
                <span style={{ flexShrink: 0 }}>{formatCurrency(expense.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
            <img
              src={contractor.coiImage.src}
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
        zIndex: 50,
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
    onChange(expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeExpense(id) {
    onChange(expenses.filter((e) => e.id !== id));
  }

  function handleReceiptUpload(id, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateExpense(id, "receipt", { src: reader.result, name: file.name });
    };
    reader.readAsDataURL(file);
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
                <img
                  src={expense.receipt.src}
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
                  accept="image/*"
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


function ImageUploadGrid({ images, onChange }) {
  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        onChange((prev) => [...prev, { id: "img" + Math.random().toString(36).slice(2, 9), src: reader.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeImage(id) {
    onChange((prev) => prev.filter((img) => img.id !== id));
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
            <img src={img.src} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </div>
  );
}


function AddTaskModal({ contractors, taskLibrary, existingTasks, onClose, onSave, onAddLibraryTask }) {
  const [mode, setMode] = useState("library"); // 'library' | 'custom'
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("HVAC");
  const [frequencyMonths, setFrequencyMonths] = useState(6);
  const [contractorId, setContractorId] = useState("");
  const [images, setImages] = useState([]);
  const [libraryTaskId, setLibraryTaskId] = useState("");
  const [error, setError] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [saveToLibrary, setSaveToLibrary] = useState(true);

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

  function handleSave() {
    if (mode === "library") {
      if (!selectedLibraryItem) {
        setError("Choose a task from the library, or switch to adding a custom task.");
        return;
      }
      if (checkDuplicate(selectedLibraryItem.title)) {
        setError(`"${selectedLibraryItem.title}" is already on this property's maintenance list.`);
        return;
      }
      onSave({
        title: selectedLibraryItem.title.trim(),
        category: selectedLibraryItem.category,
        frequencyMonths: Number(selectedLibraryItem.frequencyMonths),
        contractorId: contractorId || null,
        images,
        nextDue: nextDue || null,
      });
      return;
    }

    // Custom mode
    const trimmed = title.trim();
    if (!trimmed) return;

    if (checkDuplicate(trimmed)) {
      setError(`"${trimmed}" is already on this property's maintenance list.`);
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

    onSave({
      title: trimmed,
      category,
      frequencyMonths: Number(frequencyMonths),
      contractorId: contractorId || null,
      images,
      nextDue: nextDue || null,
    });
  }

  return (
    <Modal title="Add maintenance task" onClose={onClose}>
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
              <ImageUploadGrid images={images} onChange={setImages} />
            </>
          )}

          <button style={saveButtonStyle} onClick={handleSave}>
            Add task
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
          <ImageUploadGrid images={images} onChange={setImages} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(e) => setSaveToLibrary(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Save this as a reusable task in the task library
          </label>

          <button style={saveButtonStyle} onClick={handleSave}>
            Add task
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
      <ImageUploadGrid images={images} onChange={setImages} />

      <label style={labelStyle}>Expenses</label>
      <ExpenseEditor expenses={expenses} onChange={setExpenses} />

      <button style={saveButtonStyle} onClick={handleSave}>
        Save
      </button>
    </Modal>
  );
}


function AddProjectModal({ contractors, initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [date, setDate] = useState(initial?.date || TODAY.toISOString().split("T")[0]);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [paints, setPaints] = useState(initial?.paints || []);
  const [contractorIds, setContractorIds] = useState(initial?.contractorIds || []);
  const [images, setImages] = useState(initial?.images || []);
  const [expenses, setExpenses] = useState(initial?.expenses || []);

  function addPaintRow() {
    setPaints([...paints, { name: "", hex: "#CCCCCC", location: "" }]);
  }

  function updatePaint(index, field, value) {
    setPaints(paints.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removePaint(index) {
    setPaints(paints.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      date,
      notes: notes.trim(),
      paints: paints.filter((p) => p.name.trim()),
      contractorIds,
      images,
      expenses,
    });
  }

  return (
    <Modal title={initial ? "Edit project" : "Log a project"} onClose={onClose}>
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
      <ImageUploadGrid images={images} onChange={setImages} />

      <label style={labelStyle}>Expenses</label>
      <ExpenseEditor expenses={expenses} onChange={setExpenses} />

      <button style={saveButtonStyle} onClick={handleSave}>
        {initial ? "Save changes" : "Save project"}
      </button>
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
  const [name, setName] = useState(initial?.name || "");
  const [company, setCompany] = useState(initial?.company || "");
  const [trade, setTrade] = useState(initial?.trade || tradeOptions[0] || "General");
  const [phoneMobile, setPhoneMobile] = useState(initial?.phoneMobile || "");
  const [phoneOffice, setPhoneOffice] = useState(initial?.phoneOffice || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber || "");
  const [insuranceProvider, setInsuranceProvider] = useState(initial?.insuranceProvider || "");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(initial?.insurancePolicyNumber || "");
  const [insuranceExpires, setInsuranceExpires] = useState(initial?.insuranceExpires || "");
  const [coiImage, setCoiImage] = useState(initial?.coiImage || null);
  const [rating, setRating] = useState(initial?.rating || 0);
  const [notes, setNotes] = useState(initial?.notes || "");

  function handleCoiUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCoiImage({ src: reader.result, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
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
  }

  return (
    <Modal title={initial ? "Edit contractor" : "Add contractor"} onClose={onClose}>
      <label style={labelStyle}>Name</label>
      <input
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Mike Donnelly"
        autoFocus
      />
      <label style={labelStyle}>Company</label>
      <input
        style={inputStyle}
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="e.g. Donnelly Plumbing & Heating"
      />
      <label style={labelStyle}>Trade</label>
      <select style={inputStyle} value={trade} onChange={(e) => setTrade(e.target.value)}>
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
            <img
              src={coiImage.src}
              alt={coiImage.name}
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", display: "block" }}
            />
            <button
              onClick={() => setCoiImage(null)}
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
              accept="image/*"
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
      <button style={saveButtonStyle} onClick={handleSave}>
        {initial ? "Save changes" : "Add contractor"}
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
                <img
                  src={home.image.src}
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

  function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage({ src: reader.result, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
            <img
              src={image.src}
              alt={image.name}
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", display: "block" }}
            />
            <button
              onClick={() => setImage(null)}
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
              accept="image/*"
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
        <ActionButton onClick={onAddWarranty} icon={Plus} label="Add warranty" primary />
      </div>

      {warranties.length === 0 ? (
        <EmptyState
          title="No warranties saved yet"
          body="Track appliance and installation warranties, including expiration dates and proof of purchase."
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
            <img
              key={img.id}
              src={img.src}
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
    </div>
  );
}

// ============================================================================
// ADD/EDIT WARRANTY MODAL
// ============================================================================

function AddWarrantyModal({ contractors, propertyName, initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer || "");
  const [model, setModel] = useState(initial?.model || "");
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber || "");
  const [purchasedFrom, setPurchasedFrom] = useState(initial?.purchasedFrom || "");
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice || "");
  const [dateInstalled, setDateInstalled] = useState(initial?.dateInstalled || "");
  const [dateExpires, setDateExpires] = useState(initial?.dateExpires || "");
  const [provider, setProvider] = useState(initial?.provider || "");
  const [providerContact, setProviderContact] = useState(initial?.providerContact || "");
  const [contractorId, setContractorId] = useState(initial?.contractorId || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [images, setImages] = useState(initial?.images || []);

  function handleSave() {
    if (!name.trim()) return;
    onSave({
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
    });
  }

  return (
    <Modal title={initial ? "Edit warranty" : "Add warranty"} onClose={onClose}>
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

      <label style={labelStyle}>Warranty provider</label>
      <input
        style={inputStyle}
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="e.g. Moen Limited Lifetime Warranty"
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
      <ImageUploadGrid images={images} onChange={setImages} />

      <button style={saveButtonStyle} onClick={handleSave}>
        {initial ? "Save changes" : "Add warranty"}
      </button>
    </Modal>
  );
}
