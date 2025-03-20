const config = require("./config");
const metricBuilder = require("./metricBuilder");

const requests = {};
const requestMethods = {};
let totalRequests = 0;

const os = require("os");

function requestTracker(req, res, next) {
  const endpoint = req.originalUrl;
  requests[endpoint] = (requests[endpoint] || 0) + 1;
  const method = req.method;
  //   const status = res.statusCode;
  // Do something useful with the method and status
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

function getActiveUsers() {
  // Replace with method of counting active users
}

function getLoginCount() {
  // Replace with method of counting logins
}

function getSuccessfulLogins() {
  // Replace with method of counting successful logins
}

function getFailedLogins() {
  // Replace with method of counting failed logins
}

function getPizzasSold() {
  // Replace with method of counting pizzas sold per minute
}

function getPizzasFailed() {
  // Replace with method of counting failed pizza creations
}

function getPizzaRevenue() {
  // Replace with method of calculating pizza revenue per minute
}

function getRequestLatency() {
  // Replace with method of calculating request latency
}

function getPizzaLatency() {
  // Replace with method of calculating pizza creation latency
}

function httpMetrics(buf) {
  //   const totalRequests = requests["/some-endpoint"] || 0; // Example of tracking requests to a specific endpoint
  const totalRequestsMetrics = totalRequests;
  const totalGetRequests = requestMethods["GET"] || 0;
  const totalPutRequests = requestMethods["PUT"] || 0;
  const totalPostRequests = requestMethods["POST"] || 0;
  const totalDeleteRequests = requestMethods["DELETE"] || 0;
  // Track requests to get, put, post, delete individually
  //   const totalErrors = requests["/error-endpoint"] || 0; // Example of tracking error requests

  buf.addMetric("http_requests_total", totalRequestsMetrics, {});
  // Add metric for get, put, post, delete individually
  buf.addMetric("http_get_total", totalGetRequests, { method: "GET" });
  buf.addMetric("http_put_total", totalPutRequests, { method: "PUT" });
  buf.addMetric("http_post_total", totalPostRequests, { method: "POST" });
  buf.addMetric("http_delete_total", totalDeleteRequests, { method: "DELETE" });
}

function systemMetrics(buf) {
  const cpuUsage = getCpuUsagePercentage();
  const memoryUsage = getMemoryUsagePercentage();

  buf.addMetric("system_cpu_usage", cpuUsage, { source: "system" });
  buf.addMetric("system_memory_usage", memoryUsage, { source: "system" });
}

function userMetrics(buf) {
  const activeUsers = getActiveUsers(); // Replace with method of counting active users
  const loginCount = getLoginCount(); // Replace with method of counting logins

  buf.addMetric("user_active_count", activeUsers, { source: "user" });
  buf.addMetric("user_login_count", loginCount, { source: "user" });
}

function purchaseMetrics(buf) {
  const pizzasSold = getPizzasSold(); // Replace with method of counting purchases
  const failedPizzas = getPizzasFailed(); // Replace with method of counting failed purchases
  const pizzaRevenue = getPizzaRevenue(); // Replace with method of calculating total revenue

  buf.addMetric("pizza_sold", pizzasSold, { source: "purchase" });
  buf.addMetric("pizza_failed", failedPizzas, { source: "purchase" });
  buf.addMetric("pizza_revenue", pizzaRevenue, { source: "purchase" });
}

function authMetrics(buf) {
  const successfulLogins = getSuccessfulLogins(); // Replace with method of counting successful logins
  const failedLogins = getFailedLogins(); // Replace with method of counting failed logins

  buf.addMetric("auth_successful_logins", successfulLogins, { source: "auth" });
  buf.addMetric("auth_failed_logins", failedLogins, { source: "auth" });
}

function latencyMetrics(buf) {
  const requestLatency = getRequestLatency(); // Replace with method of calculating request latency (latency is the time it takes to process a request)
  const pizzaLatency = getPizzaLatency(); // Replace with method of calculating pizza creation latency

  buf.addMetric("request_latency", requestLatency, { source: "latency" });
  buf.addMetric("pizza_latency", pizzaLatency, { source: "latency" });
}

// This will periodically send metrics to Grafana
// const timer = setInterval(() => {
//   Object.keys(requests).forEach((endpoint) => {
//     sendMetricToGrafana("requests", requests[endpoint], { endpoint });
//   });
// }, 10000);

function sendMetricsPeriodically(period) {
  setInterval(() => {
    try {
      const buf = new metricBuilder.MetricBuilder();
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
  fetch(`${config.url}`, {
    method: "POST",
    body: metrics,
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to push metrics data to Grafana");
      } else {
        console.log(`Pushed metrics`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

// function sendMetricToGrafana(metricName, metricValue, attributes) {
//   attributes = { ...attributes, source: config.source };

//   const metric = {
//     resourceMetrics: [
//       {
//         scopeMetrics: [
//           {
//             metrics: [
//               {
//                 name: metricName,
//                 unit: "1",   // Note that this will not work if you are trying to send float metrics
//                 sum: {
//                   dataPoints: [
//                     {
//                       asInt: metricValue,
//                       timeUnixNano: Date.now() * 1000000,
//                       attributes: []
//                     }
//                   ],
//                   aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
//                   isMonotonic: true
//                 }
//               }
//             ]
//           }
//         ]
//       }
//     ]
//   };

//   Object.keys(attributes).forEach((key) => {
//     metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
//       key: key,
//       value: { stringValue: attributes[key] }
//     });
//   });

//   fetch(`${config.url}`, {
//     method: "POST",
//     body: JSON.stringify(metric),
//     headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }
//   })
//     .then((response) => {
//       if (!response.ok) {
//         console.error("Failed to push metrics data to Grafana");
//       } else {
//         console.log(`Pushed ${metricName}`);
//       }
//     })
//     .catch((error) => {
//       console.error("Error pushing metrics:", error);
//     });
// }

module.exports = { requestTracker, sendMetricsPeriodically };
