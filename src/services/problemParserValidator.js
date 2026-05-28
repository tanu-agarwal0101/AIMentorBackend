/**
 * Validator and Repair service for unstructured programming problem statements
 * generated via LLM parsing.
 */

const DEFAULT_BOILERPLATES = {
  python: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    # TODO: Implement solution\n    print("0")\n\nif __name__ == '__main__':\n    solve()`,
  javascript: `const fs = require('fs');\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    // TODO: Implement solution\n    console.log("0");\n}\nsolve();`,
  typescript: `import * as fs from 'fs';\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    // TODO: Implement solution\n    console.log("0");\n}\nsolve();`,
  java: `import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        // TODO: Implement solution\n        System.out.println("0");\n    }\n}`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    // TODO: Implement solution\n    cout << "0" << endl;\n    return 0;\n}`
};

/**
 * Validates and repairs a parsed problem payload defensively.
 *
 * @param {object} parsed - The raw parsed JSON payload from Gemini.
 * @returns {object} The validated, deduplicated, and fully repaired problem payload.
 */
export function validateAndRepairProblem(parsed) {
  if (!parsed || typeof parsed !== "object") {
    parsed = {};
  }

  parsed.title = typeof parsed.title === "string" && parsed.title.trim() 
    ? parsed.title.trim() 
    : "Untitled Ingested Problem";

  const validDifficulties = ["Easy", "Medium", "Hard"];
  parsed.difficulty = validDifficulties.includes(parsed.difficulty) 
    ? parsed.difficulty 
    : "Medium";

  const validCategories = ["Arrays", "Hashing", "Sliding Window", "Trees", "Graphs", "DP", "Greedy", "Binary Search"];
  parsed.category = validCategories.includes(parsed.category) 
    ? parsed.category 
    : "Arrays";

  parsed.description = typeof parsed.description === "string" && parsed.description.trim() 
    ? parsed.description.trim() 
    : `This is a parsed problem statement for **${parsed.title}**.\n\n### Input Format\n- Standard stdin inputs.\n\n### Output Format\n- Standard stdout outputs.`;

  if (!Array.isArray(parsed.constraints) || parsed.constraints.length === 0) {

    parsed.constraints = [
      "1 <= N <= 10^5",
      "Time Limit: 1.0s",
      "Memory Limit: 256MB"
    ];
  } else {
    parsed.constraints = parsed.constraints
      .map(c => String(c).trim())
      .filter(Boolean);
  }

  if (!Array.isArray(parsed.topicTags)) {
    parsed.topicTags = [parsed.category.toLowerCase()];
  } else {
    parsed.topicTags = parsed.topicTags
      .map(t => String(t).trim().toLowerCase())
      .filter(Boolean);
    if (parsed.topicTags.length === 0) {
      parsed.topicTags = [parsed.category.toLowerCase()];
    }
  }

  if (!parsed.boilerplate || typeof parsed.boilerplate !== "object") {
    parsed.boilerplate = {};
  }
  const languages = ["python", "javascript", "typescript", "java", "cpp"];
  languages.forEach(lang => {
    if (!parsed.boilerplate[lang] || typeof parsed.boilerplate[lang] !== "string" || !parsed.boilerplate[lang].trim()) {
      parsed.boilerplate[lang] = DEFAULT_BOILERPLATES[lang];
    }
  });


  if (!Array.isArray(parsed.visibleTestCases)) {
    parsed.visibleTestCases = [];
  }
  if (!Array.isArray(parsed.hiddenTestCases)) {
    parsed.hiddenTestCases = [];
  }

  const cleanTestCases = (casesList) => {
    return casesList
      .map(tc => {
        if (!tc || typeof tc !== "object") return null;
        const input = typeof tc.input === "string" ? tc.input.trim() : String(tc.input || "").trim();
        const expectedOutput = typeof tc.expectedOutput === "string" ? tc.expectedOutput.trim() : String(tc.expectedOutput || "").trim();
        

        if (!input && !expectedOutput) return null;
        return { input, expectedOutput };
      })
      .filter(Boolean);
  };

  let cleanVisible = cleanTestCases(parsed.visibleTestCases);
  let cleanHidden = cleanTestCases(parsed.hiddenTestCases);

  
  if (cleanVisible.length === 0) {
    cleanVisible = [{ input: "1 2 3", expectedOutput: "0" }];
  }

  if (cleanHidden.length === 0) {
    cleanHidden = [{ input: "4 5 6", expectedOutput: "0" }];
  }

  const seenInputs = new Set();
  const deduplicatedVisible = [];
  cleanVisible.forEach(tc => {
    if (!seenInputs.has(tc.input)) {
      seenInputs.add(tc.input);
      deduplicatedVisible.push(tc);
    }
  });

  const deduplicatedHidden = [];
  cleanHidden.forEach(tc => {

    if (!seenInputs.has(tc.input)) {
      seenInputs.add(tc.input);
      deduplicatedHidden.push(tc);
    }
  });

  parsed.visibleTestCases = deduplicatedVisible;
  parsed.hiddenTestCases = deduplicatedHidden.length > 0 ? deduplicatedHidden : [{ input: "7 8 9", expectedOutput: "0" }];

  return parsed;
}
