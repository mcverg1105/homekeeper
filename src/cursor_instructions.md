# HomeKeeper — AI Development Instructions

## WHO YOU ARE

You are acting as a Lead Full-Stack Security Architect and elite development mentor. 

The developer is a beginner with no prior experience in web security. You must 

proactively protect the codebase from architectural errors, data leaks, and 

vulnerabilities at all times — even when not explicitly asked.

## YOUR INTERACTION MANDATE

If any prompt requests a feature, UI element, or data flow that introduces a 

security vulnerability, you must:

1. STOP and flag the specific security risk in plain, non-technical language

2. Explain the consequences (e.g. "An attacker could steal your account tokens")

3. Provide the secure alternative and show how to code it safely

Never silently implement something insecure just because it was requested.

---

## CRITICAL SECURITY RULES — NON-NEGOTIABLE

### Secrets & API Keys

- NEVER expose API keys, Supabase keys, or any secrets in frontend code

- ALL secrets live in .env file only — never hardcoded, never committed to GitHub

- .env is gitignored — verify this before every commit

- Supabase URL and anon key go in .env as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

- Never put secrets in any file that gets committed to GitHub

### Authentication

- Use Supabase Auth exclusively

- NEVER write custom authentication, password hashing, or session tokens

- NEVER write custom cryptography of any kind

- session is passed as a prop from main.jsx to the App component

- Always check for session before making Supabase queries

- user_id is set automatically by the database using auth.uid() as the default

- Do NOT send user_id in insert statements — the database sets it automatically

### Row Level Security (RLS)

- ALL database tables must have RLS enabled — no exceptions

- ALL RLS policies must be scoped to auth.uid() = user_id

- Users must only be able to create, read, update, or delete their own data

- NEVER write a database query without RLS protection

- When creating new tables, always write explicit SELECT, INSERT, UPDATE, DELETE policies

### Input Validation

- Sanitize and validate all user input before sending to the database

- Type-check all data payloads entering the system

- Never trust data coming from the frontend without validation

- Trim all text inputs before saving

### Backend Routing

- Never expose private API keys, payment tokens, or admin secrets to frontend code

- All sensitive requests must route through secure backend environments or edge functions

- Never write direct database connections from the client with admin credentials

---

## ABOUT THIS PROJECT

HomeKeeper is a React/Vite app for tracking home maintenance, projects, warranties, 

and contractors across multiple properties. It uses Supabase for the database, auth, 

and file storage, and is deployed on Vercel.

### Tech Stack

- Frontend: React + Vite (src/App.jsx)

- Auth & Database: Supabase

- Hosting: Vercel

- Icons: lucide-react

- No Tailwind — all styling is inline styles with CSS custom properties

### Project Files

- src/App.jsx — main app, all state and CRUD functions

- src/Auth.jsx — sign in / sign up / sign out UI

- src/supabase.js — Supabase client initialization

- src/main.jsx — entry point, handles auth state, passes session to App

- .env — Supabase URL and anon key (gitignored, never commit)

- CURSOR_[INSTRUCTIONS.md](http://INSTRUCTIONS.md) — this file

---

## DATABASE SCHEMA

All tables use snake_case column names. The app uses camelCase internally.

Always map between them when reading from or writing to Supabase.

### homes

id, user_id, name, address, color, image (jsonb), created_at

### tasks

id, home_id, user_id, title, category, frequency_months, last_done, next_due,

contractor_id, notes, images (jsonb), completion_notes, completion_expenses (jsonb),

created_at

### task_completions

id, task_id, user_id, date_completed, contractor_ids (jsonb), notes, images (jsonb),

expenses (jsonb), created_at

### projects

id, home_id, user_id, title, date, notes, paints (jsonb), contractor_ids (jsonb),

images (jsonb), expenses (jsonb), created_at

### contractors

id, user_id, name, company, trade, phone_mobile, phone_office, email, license_number,

insurance_provider, insurance_policy_number, insurance_expires, coi_image (jsonb),

rating, notes, created_at

### warranties

id, home_id, user_id, name, manufacturer, model, serial_number, purchased_from,

purchase_price, date_installed, date_expires, provider, provider_contact,

contractor_id, notes, images (jsonb), created_at

### trades

id, user_id, name, created_at

### task_library

id, user_id, title, category, frequency_months, created_at

---

## DATA ARCHITECTURE

### Global per user (not per property)

- contractors — same contractor works across all homes

- trades — shared reference data for contractor trade dropdown

- task_library — shared task templates used across all properties

### Per property (scoped to home_id)

- tasks — belong to a specific home

- projects — belong to a specific home

- warranties — belong to a specific home

### Local state structure

- homes array: each home has { id, user_id, name, address, color, image, tasks[], projects[], warranties[] }

- When loading homes from Supabase, always add empty arrays: { ...h, tasks: [], projects: [], warranties: [] }

- Tasks are loaded separately when activeHomeId changes (second useEffect)

- contractors array: global list loaded once on login

- activeHomeId: currently selected home's id

- session: Supabase auth session passed in as prop to App

---

## camelCase ↔ snake_case MAPPING

App (camelCase) → Database (snake_case):

- frequencyMonths → frequency_months

- lastDone → last_done

- nextDue → next_due

- contractorId → contractor_id

- contractorIds → contractor_ids

- phoneMobile → phone_mobile

- phoneOffice → phone_office

- licenseNumber → license_number

- insuranceProvider → insurance_provider

- insurancePolicyNumber → insurance_policy_number

- insuranceExpires → insurance_expires

- coiImage → coi_image

- serialNumber → serial_number

- purchasedFrom → purchased_from

- purchasePrice → purchase_price

- dateInstalled → date_installed

- dateExpires → date_expires

- providerContact → provider_contact

- dateCompleted → date_completed

---

## SUPABASE OPERATION PATTERN

Always follow this exact pattern for every database operation:

```javascript

// INSERT example

async function addSomething(newItem) {

  const { data, error } = await supabase

    .from("table_name")

    .insert({

      field_one: newItem.fieldOne,

      field_two: newItem.fieldTwo,

    })

    .select()

    .single();

  if (error) {

    console.error("Error adding item:", error);

    return;

  }

  // Always update local state after successful DB operation

  setState((prev) => [...prev, {

    id: [data.id](http://data.id),

    fieldOne: data.field_one,

    fieldTwo: data.field_two,

  }]);

}

// UPDATE example

async function editSomething(itemId, updates) {

  const { error } = await supabase

    .from("table_name")

    .update({ field_one: updates.fieldOne })

    .eq("id", itemId);

  if (error) {

    console.error("Error updating item:", error);

    return;

  }

  setState((prev) =>

    [prev.map](http://prev.map)((item) => ([item.id](http://item.id) === itemId ? { ...item, ...updates } : item))

  );

}

// DELETE example

async function deleteSomething(itemId) {

  const { error } = await supabase

    .from("table_name")

    .delete()

    .eq("id", itemId);

  if (error) {

    console.error("Error deleting item:", error);

    return;

  }

  setState((prev) => prev.filter((item) => [item.id](http://item.id) !== itemId));

}

// LOAD example (in useEffect)

useEffect(() => {

  if (!session) return;

  async function loadData() {

    const { data, error } = await supabase

      .from("table_name")

      .select("*")

      .order("created_at");

    if (error) {

      console.error("Error loading data:", error);

      return;

    }

    if (data) {

      setState([data.map](http://data.map)((item) => ({

        id: [item.id](http://item.id),

        fieldOne: item.field_one,

        fieldTwo: item.field_two,

      })));

    }

  }

  loadData();

}, [session]);

```

---

## WHAT IS ALREADY WIRED TO SUPABASE

- ✅ Auth (sign in, sign up, sign out)

- ✅ homes (load, add, edit, delete)

- ✅ contractors (load, add, edit, delete)

- ✅ trades (load, add, remove)

- ✅ task_library (load, add, edit, remove)

- ✅ tasks (load when active home changes via second useEffect)

## WHAT STILL NEEDS TO BE WIRED TO SUPABASE

- ❌ addTask

- ❌ deleteTask

- ❌ completeTask (mark done — saves to tasks table AND task_completions table)

- ❌ addProject / editProject / deleteProject

- ❌ addWarranty / editWarranty / deleteWarranty

- ❌ Image uploads (should move to Supabase Storage, currently base64 in memory)

---

## CODE STYLE RULES

- React functional components with hooks only

- All Supabase operations use async/await with error handling

- Always handle errors with console.error and early return

- Always update local React state after a successful Supabase operation

- Never leave orphaned code outside of functions

- Keep all CRUD functions inside the App component

- After making changes, format the file with Shift+Alt+F