import { generateContentWithRetry, cleanGeminiError } from "./geminiService.js";
import { validateAndRepairProblem } from "./problemParserValidator.js";
import { systemMonitor } from "../utils/systemMonitor.js";

/**
 * Service to parse a raw text problem statement into a structured Problem + TestCases payload.
 *
 * @param {string} rawText - The raw problem description pasted by the user.
 * @returns {Promise<object>} The parsed and structured problem object.
 */
export async function parseProblemText(rawText) {

  const systemInstruction = `
You are an expert algorithm designer and parser. Your job is to take a raw, unstructured programming problem statement (which may be copy-pasted from LeetCode, Codeforces, or textbooks) and convert it into a structured, clean, competitive programming-style problem format using standard input (stdin) and standard output (stdout).

Guidelines:
1. Translate any functional-style examples into plain text stdin/stdout equivalents.
2. CRITICAL: You MUST explicitly extract the true "title" of the problem. Do not make up a generic title.
3. Generate ONLY starter boilerplate code for a coding interview platform.
   
   IMPORTANT RULES:
   * DO NOT solve the problem.
   * DO NOT include algorithm logic.
   * DO NOT include implementation steps.
   * DO NOT include the final answer.
   * DO NOT include hidden hints inside comments.
   * DO NOT include optimized logic.
   * DO NOT include brute force logic.
   
   The boilerplate should feel similar to LeetCode starter templates.
   The goal is to:
   * provide structure
   * provide function/class signature
   * provide input/output skeleton
   * allow the candidate to implement the solution themselves
   
   Requirements:
   1. Keep the code minimal and clean.
   2. Include only required imports.
   3. Include TODO comments where appropriate.
   4. Match the selected language conventions.
   5. Ensure the code compiles successfully before user edits.
   6. Do NOT print placeholder outputs (such as hardcoding the correct answer for the first test case).
   7. Do NOT include example solutions.
   
   For stdin/stdout problems:
   * generate clean input parsing structure
   * generate output placeholder structure
   * leave solving logic empty
   
   For function-signature problems:
   * generate only the function/class skeleton.
   
   Desired tone:
   professional, interview-style, minimal.
   
   Example GOOD boilerplate:
   Java:
   import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: Read input\n        // TODO: Solve problem\n        // TODO: Print output\n        sc.close();\n    }\n}
   
   Example BAD boilerplate (DO NOT DO THIS because it already solves the problem):
   Scanner sc = new Scanner(System.in);\nint a = sc.nextInt();\nint b = sc.nextInt();\nSystem.out.println(a + b);
4. Generate 3-5 visible test cases (standard examples) and 10-15 hidden edge-case test cases (e.g. empty arrays, extreme bounds, negative numbers, duplicates).
5. Do NOT include markdown styling inside the JSON string properties unless specified.
6. Provide a valid difficulty estimate ('Easy', 'Medium', 'Hard') and a primary category ('Arrays', 'Hashing', 'Sliding Window', 'Trees', 'Graphs', 'DP', 'Greedy', 'Binary Search').

You MUST return your output strictly in JSON format matching this JSON schema:
{
  "title": "Exact Title of the Problem",
  "difficulty": "Easy" | "Medium" | "Hard",
  "category": "Arrays" | "Hashing" | "Sliding Window" | "Trees" | "Graphs" | "DP" | "Greedy" | "Binary Search",
  "topicTags": ["array", "string", etc.],
  "description": "Markdown problem description (clean, explaining problem, stdin format, and stdout format)",
  "constraints": ["Constraint string 1", "Constraint string 2"],
  "boilerplate": {
    "python": "Python boilerplate code",
    "javascript": "Node.js boilerplate code",
    "typescript": "TypeScript boilerplate code",
    "java": "Java boilerplate code",
    "cpp": "C++ boilerplate code"
  },
  "visibleTestCases": [
    { "input": "stdin string", "expectedOutput": "stdout string" }
  ],
  "hiddenTestCases": [
    { "input": "stdin string", "expectedOutput": "stdout string" }
  ]
}
`;

  try {
    const response = await generateContentWithRetry({
      contents: `Parse the following raw problem statement:\n\n${rawText}`,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.1
    });

    systemMonitor.recordGeminiCall(true, "problem_parser");

    const text = response.text;
    if (!text) {
      systemMonitor.recordParsing(false);
      throw new Error("Empty response received from Gemini parser API");
    }

    const parsed = JSON.parse(text.trim());

    const sanitizedProblem = validateAndRepairProblem(parsed);

    systemMonitor.recordParsing(true);
    return sanitizedProblem;
  } catch (error) {
    systemMonitor.recordGeminiCall(false, "problem_parser");
    systemMonitor.recordParsing(false);
    console.error("Error in parseProblemText service:", error);
    const cleanMsg = cleanGeminiError(error);
    throw new Error(`AI Problem Ingestion failed: ${cleanMsg}`);
  }
}
