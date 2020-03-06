"use strict";
/**
 * @packageDocumentation
 * @module ObnizCore.Components
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = __importDefault(require("../utils/util"));
/**
 * The measure module provides hardware level measurement.
 * @category Measurement
 */
class ObnizMeasure {
    constructor(obniz) {
        this.obniz = obniz;
        this._reset();
    }
    /**
     * @ignore
     * @private
     */
    _reset() {
        this.observers = [];
    }
    /**
     * Some electrical parts or circuits accept "pulse" and echo the "pulse" after delay.
     * This module is best suited for measuring that delay.
     *
     * This module generates one pulse shot on an io, then measures the response time.
     *
     *
     * ```javascript
     * // Javascript Example
     * obniz.measure.echo({
     *   io_pulse: 0, // io for generate pulse
     *   io_echo: 1, // io to be measured
     *   pulse: "positive", // generate pulse pattern
     *   pulse_width: 0.1,  // generate pulse width
     *   measure_edges: 3, // 1 to 4. maximum edges to measure
     *   timeout: 1000, // this is optional. 1000(1sec) is default
     *   callback: function(edges) {
     *     // callback function
     *     console.log(edges);
     *   }
     * });
     * ```
     *
     * @param params
     */
    echo(params) {
        const err = util_1.default._requiredKeys(params, ["io_pulse", "pulse", "pulse_width", "io_echo", "measure_edges"]);
        if (err) {
            throw new Error("Measure start param '" + err + "' required, but not found ");
        }
        this.params = util_1.default._keyFilter(params, [
            "io_pulse",
            "pulse",
            "pulse_width",
            "io_echo",
            "measure_edges",
            "timeout",
            "callback",
        ]);
        const echo = {};
        echo.io_pulse = this.params.io_pulse;
        echo.pulse = this.params.pulse;
        echo.pulse_width = this.params.pulse_width;
        echo.io_echo = this.params.io_echo;
        echo.measure_edges = this.params.measure_edges;
        if (typeof this.params.timeout === "number") {
            echo.timeout = this.params.timeout;
        }
        this.obniz.send({
            measure: {
                echo,
            },
        });
        if (this.params.callback) {
            this.observers.push(this.params.callback);
        }
    }
    /**
     * @ignore
     * @param obj
     */
    notified(obj) {
        const callback = this.observers.shift();
        if (callback) {
            callback(obj.echo);
        }
    }
}
exports.default = ObnizMeasure;

//# sourceMappingURL=measure.js.map
