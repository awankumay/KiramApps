<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## 🔒 Strict Task Execution Policy

### 1. **NO OUT-OF-SCOPE WORK**

- Implement ONLY what is explicitly defined in:
  - `openspec/changes/<change>/tasks.md`, OR
  - A user request that has been formalized into an OpenSpec change proposal.
- DO NOT add features, libraries, UI enhancements, logging, analytics, or any "nice-to-have" functionality unless explicitly listed.

### 2. **NO OVERENGINEERING**

- Prefer simple, direct, and minimal implementations.
- Avoid design patterns, abstractions, or architectural layers not required by the task.
- Example: If the task is “CRUD for leave requests,” implement ONLY basic create/read/update/delete — no RBAC, audit trails, email notifications, or validation beyond core requirements.

### 3. **ALWAYS VERIFY EXISTING SPECS FIRST**

- Before writing code, read:
  - `openspec/specs/` (source of truth for current system behavior)
  - Active proposals in `openspec/changes/`
- If no spec exists for the requested feature, **STOP** and prompt the user to create a formal proposal.

### 4. **ENFORCE OPENSPEC WORKFLOW**

- For any non-trivial change (≥1 new file or logic unit):
  - Require a change proposal via `/openspec-proposal` or equivalent.
  - Generate a change folder (`openspec/changes/<name>/`) containing `proposal.md`, `tasks.md`, and spec deltas.
  - Begin implementation ONLY after tasks are confirmed.

### 5. **AGENT BEHAVIOR RULES**

- Treat all natural language requests as _intent drafts_.
- Convert them into structured OpenSpec change proposals before generating code.
- Never assume scope—clarify in writing.

### 6. **CODE & OPERATIONS STANDARDS**

- Store documentation in `/docs/`; never in project root.
- Never use `sudo`, `rm -rf`, or destructive shell commands.
- Never hardcode or commit secrets; use environment variables.
- Never perform Git operations (`git add`, `commit`, `push`, etc.) without explicit user instruction.
- Responses must be concise, factual, and free of validation, praise, or filler.

## 🖥️ Development Environment

- Primary IDE: **Visual Studio Code**
- Database SQLite Path `C:\Users\LENOVO\AppData\Roaming\kiram-site\app-data.db`
- Integrated terminal: **Git Bash on Windows**
- Working directory: **Always the project root upon terminal launch**
- **NEVER prepend commands with `cd <project-name>` or `cd .`**
- All CLI tools (`npm`, `npx`, `node`, `php artisan`, `openspec`, etc.) are available and should be invoked directly.
- Use forward slashes for paths: `docs/proposal.md`
- Prefer LF line endings (Unix-style)

> ✅ Correct:  
> `npm run build`  
> `openspec list`  
> `php artisan migrate`
>
> ❌ Incorrect:  
> `cd my-hris-app && npm run dev`  
> `cd . && openspec init`

> Violation of these rules will result in task rejection. Stay minimal. Stay on-spec.
