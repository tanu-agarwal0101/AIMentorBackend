/**
 * Structured system monitor tracking operational metrics:
 * execution latency, provider failures, Gemini failures, and parsing errors.
 */

const metrics = {
  providerSuccessCount: 0,
  providerFailureCount: 0,
  geminiSuccessCount: 0,
  geminiFailureCount: 0,
  parsingSuccessCount: 0,
  parsingFailureCount: 0,
  totalExecutions: 0,
  latencies: []
};

export const systemMonitor = {
  recordProviderRun: (isSuccess, latencyMs) => {
    metrics.totalExecutions++;
    if (isSuccess) {
      metrics.providerSuccessCount++;
      metrics.latencies.push(latencyMs);
      if (metrics.latencies.length > 100) metrics.latencies.shift(); 
    } else {
      metrics.providerFailureCount++;
    }
    console.log(`[MONITOR] Provider execution: ${isSuccess ? "SUCCESS" : "FAILURE"} | Latency: ${latencyMs}ms`);
  },

  recordGeminiCall: (isSuccess, serviceType = "chat") => {
    if (isSuccess) {
      metrics.geminiSuccessCount++;
    } else {
      metrics.geminiFailureCount++;
    }
    console.log(`[MONITOR] Gemini call [${serviceType}]: ${isSuccess ? "SUCCESS" : "FAILURE"}`);
  },

  recordParsing: (isSuccess) => {
    if (isSuccess) {
      metrics.parsingSuccessCount++;
    } else {
      metrics.parsingFailureCount++;
    }
    console.log(`[MONITOR] Problem statement parsing: ${isSuccess ? "SUCCESS" : "FAILURE"}`);
  },

  getMetrics: () => {
    const avgLatency = metrics.latencies.length > 0
      ? Math.round(metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length)
      : 0;

    return {
      provider: {
        successRate: metrics.totalExecutions > 0 ? Math.round((metrics.providerSuccessCount / (metrics.providerSuccessCount + metrics.providerFailureCount || 1)) * 100) : 100,
        averageLatency: avgLatency,
        failures: metrics.providerFailureCount
      },
      gemini: {
        successRate: Math.round((metrics.geminiSuccessCount / (metrics.geminiSuccessCount + metrics.geminiFailureCount || 1)) * 100),
        failures: metrics.geminiFailureCount
      },
      parsing: {
        successRate: Math.round((metrics.parsingSuccessCount / (metrics.parsingSuccessCount + metrics.parsingFailureCount || 1)) * 100),
        failures: metrics.parsingFailureCount
      }
    };
  }
};
