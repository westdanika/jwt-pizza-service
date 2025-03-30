const config = require("./config");
const MetricBuilder = require("./metricBuilder");

// const requests = {};
const requestMethods = {};
const requestLatency = {};
let pizzaLatency = 0;
let totalRequests = 0;

let activeUsers = 0;
let successfulLogins = 0;
let failedLogins = 0;
let pizzasSold = 0;
let pizzasFailed = 0;
let pizzaRevenue = 0;

const os = require("os");

function requestTracker(req, res, next) {
  const startTime = new Date();

  const endpoint = req.originalUrl;
  // requests[endpoint] = (requests[endpoint] || 0) + 1;
  const method = req.method;
  // const status = res.statusCode;
  totalRequests += 1;

  if (method === "GET") {
    requestMethods["GET"] = (requestMethods["GET"] || 0) + 1;
  } else if (method === "PUT") {
    requestMethods["PUT"] = (requestMethods["PUT"] || 0) + 1;
  } else if (method === "POST") {
    requestMethods["POST"] = (requestMethods["POST"] || 0) + 1;
  } else if (method === "DELETE") {
    requestMethods["DELETE"] = (requestMethods["DELETE"] || 0) + 1;
  }

  res.on("finish", () => {
    const endTime = new Date();
    const latency = endTime - startTime;
    requestLatency[endpoint] = latency;
  });
  next();
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function addActiveUser() {
  activeUsers += 1;
}

function removeActiveUser() {
  activeUsers -= 1;
}

function addSuccessfulLogin() {
  successfulLogins += 1;
}

function addFailedLogin() {
  failedLogins += 1;
}

function addPizzasSold(numPizzas = 1) {
  pizzasSold += numPizzas;
}

function addPizzasFailed(numPizzas = 1) {
  pizzasFailed += numPizzas;
}

function addPizzaRevenue(amount) {
  pizzaRevenue += amount;
}

function updatePizzaLatency(latency) {
  pizzaLatency = latency;
}
function httpMetrics(buf) {
  const totalRequestsMetrics = totalRequests;
  const totalGetRequests = requestMethods["GET"] || 0;
  const totalPutRequests = requestMethods["PUT"] || 0;
  const totalPostRequests = requestMethods["POST"] || 0;
  const totalDeleteRequests = requestMethods["DELETE"] || 0;

  buf.addMetric("http_requests_total", totalRequestsMetrics, "sum", "1", { method: "ALL" });
  // Add metric for get, put, post, delete individually
  buf.addMetric("http_get_total", totalGetRequests, "sum", "1", { method: "GET" });
  buf.addMetric("http_put_total", totalPutRequests, "sum", "1", { method: "PUT" });
  buf.addMetric("http_post_total", totalPostRequests, "sum", "1", { method: "POST" });
  buf.addMetric("http_delete_total", totalDeleteRequests, "sum", "1", { method: "DELETE" });
}

function systemMetrics(buf) {
  const cpuUsage = getCpuUsagePercentage();
  const memoryUsage = getMemoryUsagePercentage();

  buf.addMetric("system_cpu_usage", cpuUsage, "gauge", "%", { source: "system" });
  buf.addMetric("system_memory_usage", memoryUsage, "gauge", "%", { source: "system" });
}

function userMetrics(buf) {
  buf.addMetric("user_active_count", activeUsers, "sum", "1", { source: "user" });
}

function purchaseMetrics(buf) {
  buf.addMetric("pizza_sold", pizzasSold, "sum", "1", { source: "purchase" });
  buf.addMetric("pizza_failed", pizzasFailed, "sum", "1", { source: "purchase" });
  buf.addMetric("pizza_revenue", pizzaRevenue, "sum", "1.0", { source: "purchase" });
}

function authMetrics(buf) {
  buf.addMetric("auth_successful_logins", successfulLogins, "sum", "1", { source: "auth" });
  buf.addMetric("auth_failed_logins", failedLogins, "sum", "1", { source: "auth" });
}

function latencyMetrics(buf) {
  Object.entries(requestLatency).forEach(([endpoint, latency]) => {
    buf.addMetric("request_latency", latency, "gauge", "ms", { endpoint });
  });

  buf.addMetric("pizza_latency", pizzaLatency, "gauge", "ms", { source: "latency" });
}

function sendMetricsPeriodically(period) {
  setInterval(() => {
    try {
      const buf = new MetricBuilder();
      httpMetrics(buf);
      systemMetrics(buf);
      userMetrics(buf);
      purchaseMetrics(buf);
      authMetrics(buf);
      latencyMetrics(buf);

      const metrics = buf.toString("\n");
      sendMetricsToGrafana(metrics);
    } catch (error) {
      console.log("Error sending metrics", error);
    }
  }, period);
}

function sendMetricsToGrafana(metrics) {
  if (!config.metrics.url) {
    console.error("Config URL is not defined."); // FIGURE OUT WHY ON EARTH JEST IS RUNNING TESTS AND GETTING HERE!!
    return;
  }

  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: metrics,
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json"
    }
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push metrics data to Grafana: ${text}\n`);
        });
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

module.exports = {
  requestTracker,
  sendMetricsPeriodically,
  addActiveUser,
  removeActiveUser,
  addSuccessfulLogin,
  addFailedLogin,
  addPizzasSold,
  addPizzasFailed,
  addPizzaRevenue,
  updatePizzaLatency
};
