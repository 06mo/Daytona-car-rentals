#!/usr/bin/env node

const fs = require("fs");

const taskText = process.argv.slice(2).join(" ").trim();

if (!taskText) {
  console.error("Usage: node scripts/dispatch-task.js \"your task here\"");
  process.exit(1);
}

const claudeKeywords = [
  "architecture",
  "design",
  "prd",
  "review",
  "refactor",
  "migration",
  "schema",
  "model",
  "security",
  "ux",
  "ui system",
  "wireframe",
  "strategy",
  "plan"
];

const codexKeywords = [
  "implement",
  "build",
  "fix",
  "write code",
  "create component",
  "endpoint",
  "api",
  "integrate",
  "connect",
  "test",
  "debug",
  "lint",
  "typecheck",
  "patch"
];

const lower = taskText.toLowerCase();

const score = (keywords) =>
  keywords.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0);

const claudeScore = score(claudeKeywords);
const codexScore = score(codexKeywords);

let owner = "split";
if (claudeScore > codexScore) owner = "claude";
if (codexScore > claudeScore) owner = "codex";

const result = {
  task: taskText,
  assigned_to: owner,
  claude_score: claudeScore,
  codex_score: codexScore,
  workflow:
    owner === "split"
      ? ["claude_plan", "codex_implement", "claude_review", "codex_patch"]
      : owner === "claude"
      ? ["claude"]
      : ["codex"]
};

console.log(JSON.stringify(result, null, 2));

fs.writeFileSync(
  "last-task-routing.json",
  JSON.stringify(result, null, 2),
  "utf8"
);