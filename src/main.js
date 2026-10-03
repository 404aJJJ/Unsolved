import { loadCase } from "./engine/case.js";
import { renderCase } from "./ui/casefile.js";

const app = document.getElementById("app");
const caseData = await loadCase("case-001");
renderCase(app, caseData);
