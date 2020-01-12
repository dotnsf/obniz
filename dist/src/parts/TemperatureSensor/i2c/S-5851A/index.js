"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// sensor response not found
class S5851A {
    static info() {
        return {
            name: "S5851A",
        };
    }
    constructor() {
        this.requiredKeys = ["vcc", "gnd", "adr0", "adr1", "adr_select"];
        this.keys = ["sda", "scl", "adr0", "adr1", "adr_select", "i2c"];
    }
    wired(obniz) {
        // params: pwr, gnd, sda, scl, adr0, adr1, adr_select
        this.io_adr0 = obniz.getIO(this.params.adr0);
        this.io_adr1 = obniz.getIO(this.params.adr1);
        this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
        switch (this.params.adr_select) {
            case 8:
                this.io_adr0.output(false);
                this.io_adr1.output(false);
                this.address = 0x48;
                break;
            case 9:
                this.io_adr0.pull(null);
                this.io_adr1.output(false);
                this.address = 0x49;
                break;
            case "A":
                this.io_adr0.output(true);
                this.io_adr1.output(false);
                this.address = 0x4a;
                break;
            case "B":
                this.io_adr0.output(false);
                this.io_adr1.output(true);
                this.address = 0x4b;
                break;
            case "C":
                this.io_adr0.pull(null);
                this.io_adr1.output(true);
                this.address = 0x4c;
                break;
            case "D":
                this.io_adr0.output(true);
                this.io_adr1.output(true);
                this.address = 0x4d;
                break;
            case "E":
                this.io_adr0.output(false);
                this.io_adr1.pull(null);
                this.address = 0x4e;
                break;
            case "F":
                this.io_adr0.output(true);
                this.io_adr1.pull(null);
                this.address = 0x4f;
                break;
            default:
                this.io_adr0.output(false);
                this.io_adr1.output(false);
                this.address = 0x48;
                break;
        }
        console.log("i2c address=" + this.address);
        this.params.clock = this.params.clock || 400 * 1000; // for i2c
        this.params.mode = this.params.mode || "master"; // for i2c
        this.params.pull = this.params.pull || "5v"; // for i2c
        this.i2c = obniz.getI2CWithConfig(this.params);
        // obniz.i2c0.write(address, [0x20, 0x24]);
    }
    getTempWait() {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log("gettempwait");
            // obniz.i2c0.write(address, [0x20, 0x24]);
            // obniz.i2c0.write(address, [0xE0, 0x00]);
            const ret = yield this.i2c0.readWait(this.address, 2);
            // console.log('ret:' + ret);
            const tempBin = ret[0].toString(2) + ("00000000" + ret[1].toString(2)).slice(-8);
            const temperature = -45 + 175 * (parseInt(tempBin, 2) / (65536 - 1));
            return temperature;
        });
    }
    getHumdWait() {
        return __awaiter(this, void 0, void 0, function* () {
            this.i2c.write(this.address, [0x20, 0x24]);
            this.i2c.write(this.address, [0xe0, 0x00]);
            const ret = yield this.i2c.readWait(this.address, 4);
            const humdBin = ret[2].toString(2) + ("00000000" + ret[3].toString(2)).slice(-8);
            const humidity = 100 * (parseInt(humdBin, 2) / (65536 - 1));
            return humidity;
        });
    }
}
exports.default = S5851A;
//# sourceMappingURL=index.js.map