# AI Task Router

## Operating model
We use two coding agents:

- Claude = architect, planner, reviewer, refactor strategist, product/UI thinker
- Codex = implementer, debugger, test runner, parallel task executor

## Global rules
1. Claude does:
   - architecture
   - PRD interpretation
   - UI/UX structure
   - naming conventions
   - file/folder planning
   - database/schema planning
   - review of Codex output
   - refactor plans
   - migration plans
   - risk spotting
   - final acceptance criteria

2. Codex does:
   - code implementation
   - file creation
   - bug fixes
   - repetitive edits
   - test writing
   - lint/type error cleanup
   - API route implementation
   - component wiring
   - CRUD flows
   - form validation
   - documentation of what changed

3. Claude should not do large blind rewrites when Codex can implement directly.
4. Codex should not invent product requirements or architecture if not specified.
5. Claude always defines acceptance criteria before Codex starts major work.
6. Codex always returns:
   - files changed
   - summary of implementation
   - remaining issues
   - test status
7. Claude always reviews Codex output for:
   - architecture consistency
   - UI consistency
   - edge cases
   - security/privacy concerns
   - maintainability

---

## Task assignment rules

### Send to Claude when task involves:
- "design"
- "architecture"
- "PRD"
- "wireframe"
- "review"
- "critique"
- "refactor strategy"
- "migration planning"
- "data model"
- "security model"
- "naming conventions"
- "component system"
- "design system"
- "go/no-go recommendation"

### Send to Codex when task involves:
- "build"
- "implement"
- "fix"
- "write code"
- "connect"
- "integrate"
- "create files"
- "generate tests"
- "patch bug"
- "add endpoint"
- "wire up UI"
- "hook up database"
- "run lint"
- "run typecheck"

### Split between Claude and Codex when task involves:
- new feature
- dashboard
- checkout flow
- auth flow
- admin system
- API integration
- payment flow
- document upload flow
- production hardening

Split pattern:
1. Claude plans
2. Codex implements
3. Claude reviews
4. Codex patches
5. Claude signs off

---

## Standard handoff format

Every task must be written as:

### Context
What this feature is and why it matters.

### Objective
Exactly what needs to be done.

### Constraints
Libraries, stack, style, rules, things to avoid.

### Acceptance Criteria
Bullet list of what must be true when done.

### Output Format
What the agent should return.

---

## Claude output format
Claude must return:
1. approach
2. architecture/file plan
3. risks
4. acceptance criteria
5. implementation brief for Codex

---

## Codex output format
Codex must return:
1. files changed
2. implementation summary
3. tests run
4. remaining issues
5. exact next steps for Claude review