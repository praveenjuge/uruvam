import { readFile } from "node:fs/promises";
const skill = await readFile(".agents/skills/test-uruvam/SKILL.md", "utf8");
if (
  !skill.startsWith("---\nname: test-uruvam\n") ||
  !skill.includes("# Test Uruvam")
)
  throw new Error("Invalid test-uruvam skill");
if (!skill.includes("references/test-matrix.md"))
  throw new Error("Skill must route full validation to the test matrix");
