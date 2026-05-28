import fetch from "node-fetch"; // or global fetch if Node >= 18

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";

const LANGUAGE_MAP = {
  javascript: { lang: "nodejs", versionIndex: "4" },
  python: { lang: "python3", versionIndex: "4" },
  java: { lang: "java", versionIndex: "4" },
  cpp: { lang: "cpp17", versionIndex: "1" }
};

export async function executeCode(language, code, stdin) {
  const mapping = LANGUAGE_MAP[language];
  if (!mapping) {
    throw new Error(`Language ${language} is not supported by JDoodle provider.`);
  }

  const clientId = process.env.JDOODLE_CLIENT_ID || "DEMO_CLIENT_ID";
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET || "DEMO_CLIENT_SECRET";

  const payload = {
    clientId,
    clientSecret,
    script: code,
    language: mapping.lang,
    versionIndex: mapping.versionIndex,
    stdin: stdin || ""
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const res = await fetch(JDOODLE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`JDoodle API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(`Execution provider failed: ${error.message}`);
  }
}
