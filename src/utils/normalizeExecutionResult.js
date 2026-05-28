/**
 * Helper to clean outputs and compare them.
 * Normalizes line endings (\r\n -> \n) and strips trailing/leading whitespaces.
 */
export function cleanOutput(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * Normalizes JDoodle API execution results into a unified schema for the frontend and submissions.
 *
 * @param {object} jdoodleResponse - Raw JSON returned from JDoodle API.
 * @param {string} expectedOutput - The expected output for the executed test case.
 * @returns {object} Normalized result object.
 */
export function normalizeExecutionResult(jdoodleResponse, expectedOutput) {
  // 1. Check for infrastructure, authorization, or rate limit issues from provider
  const isProviderError = 
    !jdoodleResponse || 
    jdoodleResponse.statusCode === 403 || 
    jdoodleResponse.statusCode === 429 || 
    jdoodleResponse.statusCode === 500 || 
    jdoodleResponse.error === "Execution Provider Unavailable" ||
    typeof jdoodleResponse.output === "undefined";

  if (isProviderError) {
    return {
      status: "RUNTIME_ERROR",
      stdout: "",
      stderr: "Execution service temporarily unavailable.\nThe remote execution provider rate limit was exceeded.\nPlease retry shortly.",
      compileError: "",
      executionReliable: false
    };
  }

  const outputStr = jdoodleResponse.output || "";
  const errorStr = jdoodleResponse.error || "";

  // 1. Check for timeouts
  // JDoodle typically outputs "Time Limit Exceeded"
  const isTimeout = outputStr.includes("Time Limit Exceeded") || errorStr.includes("Time Limit Exceeded");
  if (isTimeout) {
    return {
      status: "TIME_LIMIT_EXCEEDED",
      stdout: cleanOutput(outputStr),
      stderr: "Execution timed out (Time Limit Exceeded).",
      compileError: "",
      executionReliable: true
    };
  }

  // 2. Check for compilation or runtime errors
  // In JDoodle, if memory/cpuTime are null/empty, or output contains compiler/stacktrace keywords
  const outputLower = outputStr.toLowerCase();
  const isCompileError = 
    outputLower.includes("error:") || 
    outputLower.includes("compilation failed") || 
    outputLower.includes("syntaxerror") || 
    jdoodleResponse.statusCode === 400;

  const isRuntimeError = 
    outputStr.includes("Exception in thread") || 
    outputStr.includes("Traceback (most recent call last)") || 
    outputStr.includes("ReferenceError:") ||
    outputStr.includes("TypeError:") ||
    outputStr.includes("RangeError:") ||
    jdoodleResponse.isExecutionSuccess === false;

  if (isCompileError) {
    return {
      status: "COMPILE_ERROR",
      stdout: "",
      stderr: cleanOutput(outputStr),
      compileError: cleanOutput(outputStr),
      executionReliable: true
    };
  }

  if (isRuntimeError || errorStr) {
    return {
      status: "RUNTIME_ERROR",
      stdout: "",
      stderr: cleanOutput(outputStr + (errorStr ? "\n" + errorStr : "")),
      compileError: "",
      executionReliable: true
    };
  }

  // 3. Success Run - Compare outputs
  const cleanedActual = cleanOutput(outputStr);
  const cleanedExpected = cleanOutput(expectedOutput);
  
  const isPassed = cleanedActual === cleanedExpected;

  return {
    status: isPassed ? "ACCEPTED" : "WRONG_ANSWER",
    stdout: cleanedActual,
    stderr: "",
    compileError: "",
    executionReliable: true
  };
}
