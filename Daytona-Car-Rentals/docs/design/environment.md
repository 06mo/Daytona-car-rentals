# Instruction discovery and persistence

Verified 2026-10-10 against the installed runtime, not inferred from filenames.
The document-card application baseline is `59207bc`; this setup adds guidance
and review tooling, not another application design.

## Canonical files

- Repository root `AGENTS.md`: short task routing only; no earlier project
  instruction file was present or overwritten.
- `.agents/skills/design-with-evidence/SKILL.md`: portable workflow.
- Its `references/`: on-demand catalog and review checklist.
- `Daytona-Car-Rentals/docs/design/daytona-guide.md`: project decisions, actual
  source values and component map; `lessons.md` records evidence/status.
- `Daytona-Car-Rentals/scripts/install-design-guidance.py` and
  `check-design-guidance.py`: non-overwriting registration and discovery checks.

These files belong to the current Git branch and live in the persistent checkout
`/projects/Daytona-coastal-experience`. They are not in the empty conversation
checkout under `/home/openhands/workspace/project/…`. No application configuration,
agent profile, launcher default or unrelated global instruction was changed.

## Actual launcher and loaders

- `/opt/agent-canvas/entrypoint.sh` starts the OpenHands agent server. The
  existing default agent profile selects `agent_kind=acp`, `acp_server=codex`.
- Installed OpenHands SDK 1.53.0 `sdk/agent/acp_agent.py::_drop_project_skills`
  deliberately disables duplicate project injection for ACP agents: their CLI
  reads project instructions from the session cwd.
- The installed `@agentclientprotocol/codex-acp` 1.10.0 adapter in
  `/acp-node/lib/node_modules/` starts the bundled Codex `app-server`; its README
  exposes `/skills`. The observed binary is Codex CLI 0.153.4.
- Codex `skills/list` with `forceReload:true` found the repo skill before user
  installation, then one enabled canonical skill via user registration from both
  the app cwd and `/home/openhands` (no duplicate entry, zero discovery errors).
- Native OpenHands `load_project_skills(app_cwd)` found both root AGENTS and the
  skill. `load_user_skills()` found the user registration. This validates loader
  discovery, not an independent native-OpenHands model conversation. Native
  SDK profile resolution supplies discovered user skills through `filtered_skills`
  and enables lazy project loading; a custom profile may disable skills. Raw SDK
  AgentContext flags default false, so filesystem presence alone is insufficient
  for a hand-built SDK agent. No profile flags were changed here.

For Daytona sessions, set cwd to `/projects/Daytona-coastal-experience` or its
`Daytona-Car-Rentals` child. A session started in the empty conversation checkout
has the user skill, but does not automatically inherit Daytona's root AGENTS.
The skill tells agents to locate the actual checkout and read its instructions.
Already-running sessions may need `/skills` refresh or a new session.

## Persistent registration

Observed mount sources:

| Container path | Host bind source |
| --- | --- |
| `/projects` | `/opt/msoolab-openhands/projects` |
| `/home/openhands/.codex` | `/opt/msoolab-openhands/codex` |
| `/home/openhands/.openhands` | `/opt/msoolab-openhands/state` |

`/home/openhands` itself is the container overlay, so a new unmounted
`~/.agents` directory was not used as the only persistent registration.
The installed runtime successfully discovers these persistent links:

- `~/.codex/skills/design-with-evidence` → canonical repo skill.
- `~/.openhands/skills/design-with-evidence` → same canonical repo skill.

Reproduce from the application folder:

```sh
python3 scripts/install-design-guidance.py
python3 scripts/check-design-guidance.py /absolute/path/to/installed/codex
```

In this container the executable is:
`/acp-node/lib/node_modules/@agentclientprotocol/codex-acp/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex`.
Use the actual installed launcher binary after an upgrade, not a downloaded CLI.
The checker uses initialize → skills/list; it does not call a model or print
credentials. The installer preserves existing files/links and respects existing
CODEX_HOME/OH_PERSISTENCE_DIR values without changing them.

The canonical checkout and branch files must remain available for the links to
resolve. On another machine, clone the guidance and verify that host's supported
roots. Modern [Codex skill documentation](https://learn.chatgpt.com/docs/build-skills)
also documents repository `.agents/skills`, user `~/.agents/skills` and symlinks;
this installation uses the additionally supported persistent Codex-home root
verified by the running version. [AGENTS discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
explains cwd ancestry. Do not assume arbitrary SKILL.md files are loaded.

## Verification records

Workspace evidence: `/projects/daytona-handoff/design-workflow/` contains discovery
JSON, fresh-session prompt/transcript and independent review artifacts. It is
outside Git; only guidance/configuration is committed. See the task results there
for the fresh-session outcome and any untested launcher/device limitations.

Fresh-session result: **PASS for Codex discovery and use**. A new CLI session using
the same installed binary as the ACP launcher received the skill metadata and
root instructions, read SKILL.md, the Daytona guide and review checklist, and
opened desktop/mobile images while testing the local journey. Session
`01a12468-b457-74c2-b7c3-ab070f2325b4` had no prior task history or supplied verdict.
The initial nested workspace-write sandbox could not create a namespace in this
container; the successful session used the existing full-access container mode
with the same review-only scope. This did not change launcher settings. A new
OpenHands UI conversation and a native OpenHands model conversation were not
separately exercised; their loader/source checks are recorded above.
