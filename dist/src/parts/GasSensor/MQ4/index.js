"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MQGas_1 = __importDefault(require("../MQGas"));
class MQ4 extends MQGas_1.default {
    static info() {
        return {
            name: "MQ4",
        };
    }
    constructor() {
        super();
    }
}
exports.default = MQ4;

//# sourceMappingURL=index.js.map