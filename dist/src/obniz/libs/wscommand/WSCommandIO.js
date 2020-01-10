"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const WSCommand_1 = __importDefault(require("./WSCommand"));
const COMMAND_IO_ERRORS_IO_TOO_HEAVY_WHEN_HIGH = 1;
const COMMAND_IO_ERRORS_IO_TOO_HEAVY_WHEN_LOW = 2;
const COMMAND_IO_ERRORS_IO_TOO_LOW = 3;
const COMMAND_IO_ERRORS_IO_TOO_HIGH = 4;
const COMMAND_IO_ERRORS_IO_FORCE_RELEASED = 0xf0;
const COMMAND_IO_ERROR_MESSAGES = {
    0: "unknown error",
    1: "heavy output. output voltage is too low when driving high",
    2: "heavy output. output voltage is too high when driving low",
    3: "output voltage is too low when driving high. io state has changed output to input",
    4: "output voltage is too high when driving low. io state has changed output to input",
};
const COMMAND_IO_MUTEX_NAMES = {
    1: "io.input",
    2: "io.output",
    3: "pwm",
    4: "uart",
    5: "i2c",
    6: "spi",
    7: "LogicAnalyzer",
    8: "Measure",
};
class WSCommandIO extends WSCommand_1.default {
    constructor() {
        super();
        this.module = 2;
        this._CommandOutput = 0;
        this._CommandInputStream = 1;
        this._CommandInputOnece = 2;
        this._CommandOutputType = 3;
        this._CommandPullResisterType = 4;
        this._CommandEnd = 5;
    }
    // Commands
    output(value, id) {
        const buf = new Uint8Array([id, value]);
        this.sendCommand(this._CommandOutput, buf);
    }
    outputDetail(params, id) {
        const buf = new Uint8Array([id, params.value]);
        this.sendCommand(this._CommandOutput, buf);
    }
    input(params, id) {
        const buf = new Uint8Array([id]);
        this.sendCommand(this._CommandInputOnece, buf);
    }
    inputDetail(params, id) {
        const buf = new Uint8Array([id]);
        this.sendCommand(params.stream ? this._CommandInputStream : this._CommandInputOnece, buf);
    }
    outputType(params, id) {
        const buf = new Uint8Array(2);
        buf[0] = id;
        if (params.output_type === "push-pull5v") {
            buf[1] = 0;
        }
        else if (params.output_type === "push-pull3v") {
            buf[1] = 2;
        }
        else if (params.output_type === "open-drain") {
            buf[1] = 3;
        }
        else {
            return "io unknown outputtype: " + params.output_type;
        }
        this.sendCommand(this._CommandOutputType, buf);
    }
    pullType(params, id) {
        const buf = new Uint8Array(2);
        buf[0] = id;
        if (params.pull_type === "float") {
            buf[1] = 0;
        }
        else if (params.pull_type === "pull-up3v") {
            buf[1] = 1;
        }
        else if (params.pull_type === "pull-down") {
            buf[1] = 2;
        }
        else if (params.pull_type === "pull-up5v") {
            buf[1] = 3;
        }
        else {
            return "io unknown pull_type: " + params.pull_type;
        }
        this.sendCommand(this._CommandPullResisterType, buf);
    }
    deinit(params, id) {
        const buf = new Uint8Array([id]);
        this.sendCommand(this._CommandEnd, buf);
    }
    parseFromJson(json) {
        for (let i = 0; i < 40; i++) {
            const module = json["io" + i];
            if (module === undefined) {
                continue;
            }
            const schemaData = [
                { uri: "/request/io/input", onValid: this.input },
                { uri: "/request/io/input_detail", onValid: this.inputDetail },
                { uri: "/request/io/output", onValid: this.output },
                { uri: "/request/io/output_detail", onValid: this.outputDetail },
                { uri: "/request/io/output_type", onValid: this.outputType },
                { uri: "/request/io/pull_type", onValid: this.pullType },
                { uri: "/request/io/deinit", onValid: this.deinit },
            ];
            const res = this.validateCommandSchema(schemaData, module, "io" + i, i);
            if (res.valid === 0) {
                if (res.invalidButLike.length > 0) {
                    throw new Error(res.invalidButLike[0].message);
                }
                else {
                    throw new this.WSCommandNotFoundError(`[io${i}]unknown command`);
                }
            }
        }
    }
    notifyFromBinary(objToSend, func, payload) {
        if (func === this._CommandInputStream || func === this._CommandInputOnece) {
            for (let i = 0; i < payload.byteLength; i += 2) {
                objToSend["io" + payload[i]] = payload[i + 1] > 0;
            }
        }
        else if (func === this.COMMAND_FUNC_ID_ERROR && payload.byteLength >= 4) {
            // const esperr = payload[0];
            const err = payload[1];
            // const ref_func_id = payload[2];
            const module_index = payload[3];
            if (err === COMMAND_IO_ERRORS_IO_TOO_HEAVY_WHEN_HIGH ||
                err === COMMAND_IO_ERRORS_IO_TOO_HEAVY_WHEN_LOW) {
                this.envelopWarning(objToSend, `io${module_index}`, {
                    message: COMMAND_IO_ERROR_MESSAGES[err],
                });
            }
            else if (err === COMMAND_IO_ERRORS_IO_TOO_LOW ||
                err === COMMAND_IO_ERRORS_IO_TOO_HIGH) {
                this.envelopError(objToSend, `io${module_index}`, {
                    message: COMMAND_IO_ERROR_MESSAGES[err],
                });
            }
            else if (err === COMMAND_IO_ERRORS_IO_FORCE_RELEASED &&
                payload.byteLength >= 6) {
                const oldMutexOwner = payload[4];
                const newMutexOwner = payload[5];
                this.envelopWarning(objToSend, "debug", {
                    message: `io${module_index} binded "${COMMAND_IO_MUTEX_NAMES[oldMutexOwner]}" was stopped. "${COMMAND_IO_MUTEX_NAMES[newMutexOwner]}" have started using this io.`,
                });
            }
        }
        else {
            super.notifyFromBinary(objToSend, func, payload);
        }
    }
}
exports.default = WSCommandIO;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vYm5pei9saWJzL3dzY29tbWFuZC9XU0NvbW1hbmRJTy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDREQUFvQztBQUVwQyxNQUFNLHdDQUF3QyxHQUFRLENBQUMsQ0FBQztBQUN4RCxNQUFNLHVDQUF1QyxHQUFRLENBQUMsQ0FBQztBQUN2RCxNQUFNLDRCQUE0QixHQUFRLENBQUMsQ0FBQztBQUM1QyxNQUFNLDZCQUE2QixHQUFRLENBQUMsQ0FBQztBQUM3QyxNQUFNLG1DQUFtQyxHQUFRLElBQUksQ0FBQztBQUV0RCxNQUFNLHlCQUF5QixHQUFRO0lBQ3JDLENBQUMsRUFBRSxlQUFlO0lBQ2xCLENBQUMsRUFBRSwyREFBMkQ7SUFDOUQsQ0FBQyxFQUFFLDJEQUEyRDtJQUM5RCxDQUFDLEVBQUUsbUZBQW1GO0lBQ3RGLENBQUMsRUFBRSxtRkFBbUY7Q0FDdkYsQ0FBQztBQUVGLE1BQU0sc0JBQXNCLEdBQVE7SUFDbEMsQ0FBQyxFQUFFLFVBQVU7SUFDYixDQUFDLEVBQUUsV0FBVztJQUNkLENBQUMsRUFBRSxLQUFLO0lBQ1IsQ0FBQyxFQUFFLE1BQU07SUFDVCxDQUFDLEVBQUUsS0FBSztJQUNSLENBQUMsRUFBRSxLQUFLO0lBQ1IsQ0FBQyxFQUFFLGVBQWU7SUFDbEIsQ0FBQyxFQUFFLFNBQVM7Q0FDYixDQUFDO0FBRUYsTUFBTSxXQUFZLFNBQVEsbUJBQVM7SUFlakM7UUFDRSxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBRWhCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFB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QUFDLENBQUM7WUFFckMsSUFDRSxHQUFHLEtBQUssd0NBQXdDO2dCQUNoRCxHQUFHLEtBQUssdUNBQXVDLEVBQy9DO2dCQUNBLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEtBQUssWUFBWSxFQUFFLEVBQUU7b0JBQ2xELE9BQU8sRUFBRSx5QkFBeUIsQ0FBQyxHQUFHLENBQUM7aUJBQ3hDLENBQUMsQ0FBQzthQUNKO2lCQUFNLElBQ0wsR0FBRyxLQUFLLDRCQUE0QjtnQkFDcEMsR0FBRyxLQUFLLDZCQUE2QixFQUNyQztnQkFDQSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxLQUFLLFlBQVksRUFBRSxFQUFFO29CQUNoRCxPQUFPLEVBQUUseUJBQXlCLENBQUMsR0FBRyxDQUFDO2lCQUN4QyxDQUFDLENBQUM7YUFDSjtpQkFBTSxJQUNMLEdBQUcsS0FBSyxtQ0FBbUM7Z0JBQzNDLE9BQU8sQ0FBQyxVQUFVLElBQUksQ0FBQyxFQUN2QjtnQkFDQSxNQUFNLGFBQWEsR0FBUSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RDLE1BQU0sYUFBYSxHQUFRLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFO29CQUN0QyxPQUFPLEVBQUUsS0FBSyxZQUFZLFlBQ3hCLHNCQUFzQixDQUFDLGFBQWEsQ0FDdEMsbUJBQ0Usc0JBQXNCLENBQUMsYUFBYSxDQUN0QywrQkFBK0I7aUJBQ2hDLENBQUMsQ0FBQzthQUNKO1NBQ0Y7YUFBTTtZQUNMLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2xEO0lBQ0gsQ0FBQztDQUNGO0FBRUQsa0JBQWUsV0FBVyxDQUFDIiwiZmlsZSI6InNyYy9vYm5pei9saWJzL3dzY29tbWFuZC9XU0NvbW1hbmRJTy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBXU0NvbW1hbmQgZnJvbSBcIi4vV1NDb21tYW5kXCI7XG5cbmNvbnN0IENPTU1BTkRfSU9fRVJST1JTX0lPX1RPT19IRUFWWV9XSEVOX0hJR0g6IGFueSA9IDE7XG5jb25zdCBDT01NQU5EX0lPX0VSUk9SU19JT19UT09fSEVBVllfV0hFTl9MT1c6IGFueSA9IDI7XG5jb25zdCBDT01NQU5EX0lPX0VSUk9SU19JT19UT09fTE9XOiBhbnkgPSAzO1xuY29uc3QgQ09NTUFORF9JT19FUlJPUlNfSU9fVE9PX0hJR0g6IGFueSA9IDQ7XG5jb25zdCBDT01NQU5EX0lPX0VSUk9SU19JT19GT1JDRV9SRUxFQVNFRDogYW55ID0gMHhmMDtcblxuY29uc3QgQ09NTUFORF9JT19FUlJPUl9NRVNTQUdFUzogYW55ID0ge1xuICAwOiBcInVua25vd24gZXJyb3JcIixcbiAgMTogXCJoZWF2eSBvdXRwdXQuIG91dHB1dCB2b2x0YWdlIGlzIHRvbyBsb3cgd2hlbiBkcml2aW5nIGhpZ2hcIixcbiAgMjogXCJoZWF2eSBvdXRwdXQuIG91dHB1dCB2b2x0YWdlIGlzIHRvbyBoaWdoIHdoZW4gZHJpdmluZyBsb3dcIixcbiAgMzogXCJvdXRwdXQgdm9sdGFnZSBpcyB0b28gbG93IHdoZW4gZHJpdmluZyBoaWdoLiBpbyBzdGF0ZSBoYXMgY2hhbmdlZCBvdXRwdXQgdG8gaW5wdXRcIixcbiAgNDogXCJvdXRwdXQgdm9sdGFnZSBpcyB0b28gaGlnaCB3aGVuIGRyaXZpbmcgbG93LiBpbyBzdGF0ZSBoYXMgY2hhbmdlZCBvdXRwdXQgdG8gaW5wdXRcIixcbn07XG5cbmNvbnN0IENPTU1BTkRfSU9fTVVURVhfTkFNRVM6IGFueSA9IHtcbiAgMTogXCJpby5pbnB1dFwiLFxuICAyOiBcImlvLm91dHB1dFwiLFxuICAzOiBcInB3bVwiLFxuICA0OiBcInVhcnRcIixcbiAgNTogXCJpMmNcIixcbiAgNjogXCJzcGlcIixcbiAgNzogXCJMb2dpY0FuYWx5emVyXCIsXG4gIDg6IFwiTWVhc3VyZVwiLFxufTtcblxuY2xhc3MgV1NDb21tYW5kSU8gZXh0ZW5kcyBXU0NvbW1hbmQge1xuICBwdWJsaWMgbW9kdWxlOiBhbnk7XG4gIHB1YmxpYyBfQ29tbWFuZE91dHB1dDogYW55O1xuICBwdWJsaWMgX0NvbW1hbmRJbnB1dFN0cmVhbTogYW55O1xuICBwdWJsaWMgX0NvbW1hbmRJbnB1dE9uZWNlOiBhbnk7XG4gIHB1YmxpYyBfQ29tbWFuZE91dHB1dFR5cGU6IGFueTtcbiAgcHVibGljIF9Db21tYW5kUHVsbFJlc2lzdGVyVHlwZTogYW55O1xuICBwdWJsaWMgX0NvbW1hbmRFbmQ6IGFueTtcbiAgcHVibGljIHNlbmRDb21tYW5kOiBhbnk7XG4gIHB1YmxpYyB2YWxpZGF0ZUNvbW1hbmRTY2hlbWE6IGFueTtcbiAgcHVibGljIFdTQ29tbWFuZE5vdEZvdW5kRXJyb3I6IGFueTtcbiAgcHVibGljIENPTU1BTkRfRlVOQ19JRF9FUlJPUjogYW55O1xuICBwdWJsaWMgZW52ZWxvcFdhcm5pbmc6IGFueTtcbiAgcHVibGljIGVudmVsb3BFcnJvcjogYW55O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5tb2R1bGUgPSAyO1xuXG4gICAgdGhpcy5fQ29tbWFuZE91dHB1dCA9IDA7XG4gICAgdGhpcy5fQ29tbWFuZElucHV0U3RyZWFtID0gMTtcbiAgICB0aGlzLl9Db21tYW5kSW5wdXRPbmVjZSA9IDI7XG4gICAgdGhpcy5fQ29tbWFuZE91dHB1dFR5cGUgPSAzO1xuICAgIHRoaXMuX0NvbW1hbmRQdWxsUmVzaXN0ZXJUeXBlID0gNDtcbiAgICB0aGlzLl9Db21tYW5kRW5kID0gNTtcbiAgfVxuXG4gIC8vIENvbW1hbmRzXG5cbiAgcHVibGljIG91dHB1dCh2YWx1ZTogYW55LCBpZDogYW55KSB7XG4gICAgY29uc3QgYnVmOiBhbnkgPSBuZXcgVWludDhBcnJheShbaWQsIHZhbHVlXSk7XG4gICAgdGhpcy5zZW5kQ29tbWFuZCh0aGlzLl9Db21tYW5kT3V0cHV0LCBidWYpO1xuICB9XG5cbiAgcHVibGljIG91dHB1dERldGFpbChwYXJhbXM6IGFueSwgaWQ6IGFueSkge1xuICAgIGNvbnN0IGJ1ZjogYW55ID0gbmV3IFVpbnQ4QXJyYXkoW2lkLCBwYXJhbXMudmFsdWVdKTtcbiAgICB0aGlzLnNlbmRDb21tYW5kKHRoaXMuX0NvbW1hbmRPdXRwdXQsIGJ1Zik7XG4gIH1cblxuICBwdWJsaWMgaW5wdXQocGFyYW1zOiBhbnksIGlkOiBhbnkpIHtcbiAgICBjb25zdCBidWY6IGFueSA9IG5ldyBVaW50OEFycmF5KFtpZF0pO1xuICAgIHRoaXMuc2VuZENvbW1hbmQodGhpcy5fQ29tbWFuZElucHV0T25lY2UsIGJ1Zik7XG4gIH1cblxuICBwdWJsaWMgaW5wdXREZXRhaWwocGFyYW1zOiBhbnksIGlkOiBhbnkpIHtcbiAgICBjb25zdCBidWY6IGFueSA9IG5ldyBVaW50OEFycmF5KFtpZF0pO1xuICAgIHRoaXMuc2VuZENvbW1hbmQoXG4gICAgICBwYXJhbXMuc3RyZWFtID8gdGhpcy5fQ29tbWFuZElucHV0U3RyZWFtIDogdGhpcy5fQ29tbWFuZElucHV0T25lY2UsXG4gICAgICBidWYsXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBvdXRwdXRUeXBlKHBhcmFtczogYW55LCBpZDogYW55KSB7XG4gICAgY29uc3QgYnVmOiBhbnkgPSBuZXcgVWludDhBcnJheSgyKTtcbiAgICBidWZbMF0gPSBpZDtcbiAgICBpZiAocGFyYW1zLm91dHB1dF90eXBlID09PSBcInB1c2gtcHVsbDV2XCIpIHtcbiAgICAgIGJ1ZlsxXSA9IDA7XG4gICAgfSBlbHNlIGlmIChwYXJhbXMub3V0cHV0X3R5cGUgPT09IFwicHVzaC1wdWxsM3ZcIikge1xuICAgICAgYnVmWzFdID0gMjtcbiAgICB9IGVsc2UgaWYgKHBhcmFtcy5vdXRwdXRfdHlwZSA9PT0gXCJvcGVuLWRyYWluXCIpIHtcbiAgICAgIGJ1ZlsxXSA9IDM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcImlvIHVua25vd24gb3V0cHV0dHlwZTogXCIgKyBwYXJhbXMub3V0cHV0X3R5cGU7XG4gICAgfVxuICAgIHRoaXMuc2VuZENvbW1hbmQodGhpcy5fQ29tbWFuZE91dHB1dFR5cGUsIGJ1Zik7XG4gIH1cblxuICBwdWJsaWMgcHVsbFR5cGUocGFyYW1zOiBhbnksIGlkOiBhbnkpIHtcbiAgICBjb25zdCBidWY6IGFueSA9IG5ldyBVaW50OEFycmF5KDIpO1xuICAgIGJ1ZlswXSA9IGlkO1xuICAgIGlmIChwYXJhbXMucHVsbF90eXBlID09PSBcImZsb2F0XCIpIHtcbiAgICAgIGJ1ZlsxXSA9IDA7XG4gICAgfSBlbHNlIGlmIChwYXJhbXMucHVsbF90eXBlID09PSBcInB1bGwtdXAzdlwiKSB7XG4gICAgICBidWZbMV0gPSAxO1xuICAgIH0gZWxzZSBpZiAocGFyYW1zLnB1bGxfdHlwZSA9PT0gXCJwdWxsLWRvd25cIikge1xuICAgICAgYnVmWzFdID0gMjtcbiAgICB9IGVsc2UgaWYgKHBhcmFtcy5wdWxsX3R5cGUgPT09IFwicHVsbC11cDV2XCIpIHtcbiAgICAgIGJ1ZlsxXSA9IDM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcImlvIHVua25vd24gcHVsbF90eXBlOiBcIiArIHBhcmFtcy5wdWxsX3R5cGU7XG4gICAgfVxuICAgIHRoaXMuc2VuZENvbW1hbmQodGhpcy5fQ29tbWFuZFB1bGxSZXNpc3RlclR5cGUsIGJ1Zik7XG4gIH1cblxuICBwdWJsaWMgZGVpbml0KHBhcmFtczogYW55LCBpZDogYW55KSB7XG4gICAgY29uc3QgYnVmOiBhbnkgPSBuZXcgVWludDhBcnJheShbaWRdKTtcbiAgICB0aGlzLnNlbmRDb21tYW5kKHRoaXMuX0NvbW1hbmRFbmQsIGJ1Zik7XG4gIH1cblxuICBwdWJsaWMgcGFyc2VGcm9tSnNvbihqc29uOiBhbnkpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQwOyBpKyspIHtcbiAgICAgIGNvbnN0IG1vZHVsZTogYW55ID0ganNvbltcImlvXCIgKyBpXTtcbiAgICAgIGlmIChtb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2NoZW1hRGF0YTogYW55ID0gW1xuICAgICAgICB7dXJpOiBcIi9yZXF1ZXN0L2lvL2lucHV0XCIsIG9uVmFsaWQ6IHRoaXMuaW5wdXR9LFxuICAgICAgICB7dXJpOiBcIi9yZXF1ZXN0L2lvL2lucHV0X2RldGFpbFwiLCBvblZhbGlkOiB0aGlzLmlucHV0RGV0YWlsfSxcbiAgICAgICAge3VyaTogXCIvcmVxdWVzdC9pby9vdXRwdXRcIiwgb25WYWxpZDogdGhpcy5vdXRwdXR9LFxuICAgICAgICB7dXJpOiBcIi9yZXF1ZXN0L2lvL291dHB1dF9kZXRhaWxcIiwgb25WYWxpZDogdGhpcy5vdXRwdXREZXRhaWx9LFxuICAgICAgICB7dXJpOiBcIi9yZXF1ZXN0L2lvL291dHB1dF90eXBlXCIsIG9uVmFsaWQ6IHRoaXMub3V0cHV0VHlwZX0sXG4gICAgICAgIHt1cmk6IFwiL3JlcXVlc3QvaW8vcHVsbF90eXBlXCIsIG9uVmFsaWQ6IHRoaXMucHVsbFR5cGV9LFxuICAgICAgICB7dXJpOiBcIi9yZXF1ZXN0L2lvL2RlaW5pdFwiLCBvblZhbGlkOiB0aGlzLmRlaW5pdH0sXG4gICAgICBdO1xuICAgICAgY29uc3QgcmVzOiBhbnkgPSB0aGlzLnZhbGlkYXRlQ29tbWFuZFNjaGVtYShzY2hlbWFEYXRhLCBtb2R1bGUsIFwiaW9cIiArIGksIGkpO1xuXG4gICAgICBpZiAocmVzLnZhbGlkID09PSAwKSB7XG4gICAgICAgIGlmIChyZXMuaW52YWxpZEJ1dExpa2UubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZXMuaW52YWxpZEJ1dExpa2VbMF0ubWVzc2FnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IHRoaXMuV1NDb21tYW5kTm90Rm91bmRFcnJvcihgW2lvJHtpfV11bmtub3duIGNvbW1hbmRgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBub3RpZnlGcm9tQmluYXJ5KG9ialRvU2VuZDogYW55LCBmdW5jOiBhbnksIHBheWxvYWQ6IGFueSkge1xuICAgIGlmIChmdW5jID09PSB0aGlzLl9Db21tYW5kSW5wdXRTdHJlYW0gfHwgZnVuYyA9PT0gdGhpcy5fQ29tbWFuZElucHV0T25lY2UpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGF5bG9hZC5ieXRlTGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgb2JqVG9TZW5kW1wiaW9cIiArIHBheWxvYWRbaV1dID0gcGF5bG9hZFtpICsgMV0gPiAwO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZnVuYyA9PT0gdGhpcy5DT01NQU5EX0ZVTkNfSURfRVJST1IgJiYgcGF5bG9hZC5ieXRlTGVuZ3RoID49IDQpIHtcbiAgICAgIC8vIGNvbnN0IGVzcGVyciA9IHBheWxvYWRbMF07XG4gICAgICBjb25zdCBlcnI6IGFueSA9IHBheWxvYWRbMV07XG4gICAgICAvLyBjb25zdCByZWZfZnVuY19pZCA9IHBheWxvYWRbMl07XG4gICAgICBjb25zdCBtb2R1bGVfaW5kZXg6IGFueSA9IHBheWxvYWRbM107XG5cbiAgICAgIGlmIChcbiAgICAgICAgZXJyID09PSBDT01NQU5EX0lPX0VSUk9SU19JT19UT09fSEVBVllfV0hFTl9ISUdIIHx8XG4gICAgICAgIGVyciA9PT0gQ09NTUFORF9JT19FUlJPUlNfSU9fVE9PX0hFQVZZX1dIRU5fTE9XXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5lbnZlbG9wV2FybmluZyhvYmpUb1NlbmQsIGBpbyR7bW9kdWxlX2luZGV4fWAsIHtcbiAgICAgICAgICBtZXNzYWdlOiBDT01NQU5EX0lPX0VSUk9SX01FU1NBR0VTW2Vycl0sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgZXJyID09PSBDT01NQU5EX0lPX0VSUk9SU19JT19UT09fTE9XIHx8XG4gICAgICAgIGVyciA9PT0gQ09NTUFORF9JT19FUlJPUlNfSU9fVE9PX0hJR0hcbiAgICAgICkge1xuICAgICAgICB0aGlzLmVudmVsb3BFcnJvcihvYmpUb1NlbmQsIGBpbyR7bW9kdWxlX2luZGV4fWAsIHtcbiAgICAgICAgICBtZXNzYWdlOiBDT01NQU5EX0lPX0VSUk9SX01FU1NBR0VTW2Vycl0sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgZXJyID09PSBDT01NQU5EX0lPX0VSUk9SU19JT19GT1JDRV9SRUxFQVNFRCAmJlxuICAgICAgICBwYXlsb2FkLmJ5dGVMZW5ndGggPj0gNlxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IG9sZE11dGV4T3duZXI6IGFueSA9IHBheWxvYWRbNF07XG4gICAgICAgIGNvbnN0IG5ld011dGV4T3duZXI6IGFueSA9IHBheWxvYWRbNV07XG4gICAgICAgIHRoaXMuZW52ZWxvcFdhcm5pbmcob2JqVG9TZW5kLCBcImRlYnVnXCIsIHtcbiAgICAgICAgICBtZXNzYWdlOiBgaW8ke21vZHVsZV9pbmRleH0gYmluZGVkIFwiJHtcbiAgICAgICAgICAgIENPTU1BTkRfSU9fTVVURVhfTkFNRVNbb2xkTXV0ZXhPd25lcl1cbiAgICAgICAgICB9XCIgd2FzIHN0b3BwZWQuIFwiJHtcbiAgICAgICAgICAgIENPTU1BTkRfSU9fTVVURVhfTkFNRVNbbmV3TXV0ZXhPd25lcl1cbiAgICAgICAgICB9XCIgaGF2ZSBzdGFydGVkIHVzaW5nIHRoaXMgaW8uYCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1cGVyLm5vdGlmeUZyb21CaW5hcnkob2JqVG9TZW5kLCBmdW5jLCBwYXlsb2FkKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgV1NDb21tYW5kSU87XG4iXX0=
