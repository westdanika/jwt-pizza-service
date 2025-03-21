const config = require("./config");

class MetricBuilder {
  constructor() {
    this.metrics = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: []
            }
          ]
        }
      ]
    };
  }

  // Method to add a metric to the builder
  addMetric(name, value, type, unit, attributes = {}) {
    attributes = { ...attributes, source: config.metrics.source };

    const metric = {
      name,
      unit: unit,
      [type]: {
        dataPoints: [
          {
            timeUnixNano: Date.now() * 1000000, // Unix timestamp in nanoseconds
            attributes: []
          }
        ]
      }
    };

    if (type === "sum") {
      metric[type].aggregationTemporality = "AGGREGATION_TEMPORALITY_CUMULATIVE";
      metric[type].isMonotonic = true;
      if (Number.isInteger(value)) {
        metric[type].dataPoints[0].asInt = value;
      } else {
        metric[type].dataPoints[0].asDouble = value;
      }
    } else {
      metric[type].dataPoints[0].asDouble = value;
    }

    // Add additional attributes to the metric
    Object.keys(attributes).forEach((key) => {
      metric[type].dataPoints[0].attributes.push({
        key: key,
        value: { stringValue: attributes[key] }
      });
    });

    // Push the metric into the builder's metrics array
    this.metrics.resourceMetrics[0].scopeMetrics[0].metrics.push(metric);
  }

  // Method to build the final metrics payload (a string or object that can be sent to Grafana)
  toString() {
    // This will return a JSON string that matches Grafana's expected format for a metrics payload
    return JSON.stringify(this.metrics, null, 2); // Pretty-printing the JSON payload
  }
}

module.exports = MetricBuilder;
