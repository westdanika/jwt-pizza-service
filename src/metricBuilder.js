class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  // Method to add a metric to the builder
  addMetric(name, value, attributes = {}) {
    const metric = {
      name,
      unit: "1",
      sum: {
        dataPoints: [
          {
            asInt: value,
            timeUnixNano: Date.now() * 1000000, // Unix timestamp in nanoseconds
            attributes: []
          }
        ],
        aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
        isMonotonic: true
      }
    };

    // Add additional attributes to the metric
    Object.keys(attributes).forEach((key) => {
      metric.sum.dataPoints[0].attributes.push({
        key: key,
        value: { stringValue: attributes[key] }
      });
    });

    // Push the metric into the builder's metrics array
    this.metrics.push({
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: [metric]
            }
          ]
        }
      ]
    });
  }

  // Method to build the final metrics payload (a string or object that can be sent to Grafana)
  toString(separator = ",") {
    // This will return a JSON string that matches Grafana's expected format for a metrics payload
    return JSON.stringify(this.metrics, null, 2); // Pretty-printing the JSON payload
  }
}

module.exports = MetricBuilder;
