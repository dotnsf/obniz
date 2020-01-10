"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const WSCommand_1 = __importDefault(require("./WSCommand"));
class WSCommandLogicAnalyzer extends WSCommand_1.default {
    constructor() {
        super();
        this.module = 10;
        this._CommandInit = 0;
        this._CommandDeinit = 1;
        this._CommandRecv = 2;
    }
    // Commands
    init(params) {
        const io = params.io[0];
        const intervalUsec = params.interval * 1000;
        const durationUsec = params.duration * 1000;
        const matchValue = parseInt(params.trigger.value);
        const matchCount = params.trigger.samples;
        const buf = new Uint8Array(12);
        buf[0] = 1;
        buf[1] = io;
        buf[2] = intervalUsec >> (8 * 3);
        buf[3] = intervalUsec >> (8 * 2);
        buf[4] = intervalUsec >> (8 * 1);
        buf[5] = intervalUsec;
        buf[6] = durationUsec >> (8 * 3);
        buf[7] = durationUsec >> (8 * 2);
        buf[8] = durationUsec >> (8 * 1);
        buf[9] = durationUsec;
        buf[10] = matchValue;
        buf[11] = matchCount;
        this.sendCommand(this._CommandInit, buf);
    }
    deinit(params) {
        const buf = new Uint8Array(0);
        this.sendCommand(this._CommandDeinit, buf);
    }
    parseFromJson(json) {
        const module = json.logic_analyzer;
        if (module === undefined) {
            return;
        }
        const schemaData = [
            { uri: "/request/logicAnalyzer/init", onValid: this.init },
            { uri: "/request/logicAnalyzer/deinit", onValid: this.deinit },
        ];
        const res = this.validateCommandSchema(schemaData, module, "logic_analyzer");
        if (res.valid === 0) {
            if (res.invalidButLike.length > 0) {
                throw new Error(res.invalidButLike[0].message);
            }
            else {
                throw new this.WSCommandNotFoundError(`[logic_analyzer]unknown command`);
            }
        }
    }
    notifyFromBinary(objToSend, func, payload) {
        if (func === this._CommandRecv) {
            const arr = new Array(payload.byteLength * 8);
            let offset = 0;
            for (let i = 0; i < payload.byteLength; i++) {
                const byte = payload[i];
                for (let bit = 0; bit < 8; bit++) {
                    arr[offset] = byte & (0x80 >>> bit) ? 1 : 0;
                    offset++;
                }
            }
            objToSend.logic_analyzer = {
                data: arr,
            };
        }
        else {
            super.notifyFromBinary(objToSend, func, payload);
        }
    }
}
exports.default = WSCommandLogicAnalyzer;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vYm5pei9saWJzL3dzY29tbWFuZC9XU0NvbW1hbmRMb2dpY0FuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsNERBQW9DO0FBRXBDLE1BQU0sc0JBQXVCLFNBQVEsbUJBQVM7SUFTNUM7UUFDRSxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBRWpCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxXQUFXO0lBRUosSUFBSSxDQUFDLE1BQVc7UUFDckIsTUFBTSxFQUFFLEdBQVEsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBUSxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUNqRCxNQUFNLFlBQVksR0FBUSxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUVqRCxNQUFNLFVBQVUsR0FBUSxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLFVBQVUsR0FBUSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUMvQyxNQUFNLEdBQUcsR0FBUSxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNaLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENB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Q0Y7WUFDRCxTQUFTLENBQUMsY0FBYyxHQUFHO2dCQUN6QixJQUFJLEVBQUUsR0FBRzthQUNWLENBQUM7U0FDSDthQUFNO1lBQ0wsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDbEQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxrQkFBZSxzQkFBc0IsQ0FBQyIsImZpbGUiOiJzcmMvb2JuaXovbGlicy93c2NvbW1hbmQvV1NDb21tYW5kTG9naWNBbmFseXplci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBXU0NvbW1hbmQgZnJvbSBcIi4vV1NDb21tYW5kXCI7XG5cbmNsYXNzIFdTQ29tbWFuZExvZ2ljQW5hbHl6ZXIgZXh0ZW5kcyBXU0NvbW1hbmQge1xuICBwdWJsaWMgbW9kdWxlOiBhbnk7XG4gIHB1YmxpYyBfQ29tbWFuZEluaXQ6IGFueTtcbiAgcHVibGljIF9Db21tYW5kRGVpbml0OiBhbnk7XG4gIHB1YmxpYyBfQ29tbWFuZFJlY3Y6IGFueTtcbiAgcHVibGljIHNlbmRDb21tYW5kOiBhbnk7XG4gIHB1YmxpYyB2YWxpZGF0ZUNvbW1hbmRTY2hlbWE6IGFueTtcbiAgcHVibGljIFdTQ29tbWFuZE5vdEZvdW5kRXJyb3I6IGFueTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMubW9kdWxlID0gMTA7XG5cbiAgICB0aGlzLl9Db21tYW5kSW5pdCA9IDA7XG4gICAgdGhpcy5fQ29tbWFuZERlaW5pdCA9IDE7XG4gICAgdGhpcy5fQ29tbWFuZFJlY3YgPSAyO1xuICB9XG5cbiAgLy8gQ29tbWFuZHNcblxuICBwdWJsaWMgaW5pdChwYXJhbXM6IGFueSkge1xuICAgIGNvbnN0IGlvOiBhbnkgPSBwYXJhbXMuaW9bMF07XG4gICAgY29uc3QgaW50ZXJ2YWxVc2VjOiBhbnkgPSBwYXJhbXMuaW50ZXJ2YWwgKiAxMDAwO1xuICAgIGNvbnN0IGR1cmF0aW9uVXNlYzogYW55ID0gcGFyYW1zLmR1cmF0aW9uICogMTAwMDtcblxuICAgIGNvbnN0IG1hdGNoVmFsdWU6IGFueSA9IHBhcnNlSW50KHBhcmFtcy50cmlnZ2VyLnZhbHVlKTtcbiAgICBjb25zdCBtYXRjaENvdW50OiBhbnkgPSBwYXJhbXMudHJpZ2dlci5zYW1wbGVzO1xuICAgIGNvbnN0IGJ1ZjogYW55ID0gbmV3IFVpbnQ4QXJyYXkoMTIpO1xuICAgIGJ1ZlswXSA9IDE7XG4gICAgYnVmWzFdID0gaW87XG4gICAgYnVmWzJdID0gaW50ZXJ2YWxVc2VjID4+ICg4ICogMyk7XG4gICAgYnVmWzNdID0gaW50ZXJ2YWxVc2VjID4+ICg4ICogMik7XG4gICAgYnVmWzRdID0gaW50ZXJ2YWxVc2VjID4+ICg4ICogMSk7XG4gICAgYnVmWzVdID0gaW50ZXJ2YWxVc2VjO1xuICAgIGJ1Zls2XSA9IGR1cmF0aW9uVXNlYyA+PiAoOCAqIDMpO1xuICAgIGJ1Zls3XSA9IGR1cmF0aW9uVXNlYyA+PiAoOCAqIDIpO1xuICAgIGJ1Zls4XSA9IGR1cmF0aW9uVXNlYyA+PiAoOCAqIDEpO1xuICAgIGJ1Zls5XSA9IGR1cmF0aW9uVXNlYztcbiAgICBidWZbMTBdID0gbWF0Y2hWYWx1ZTtcbiAgICBidWZbMTFdID0gbWF0Y2hDb3VudDtcbiAgICB0aGlzLnNlbmRDb21tYW5kKHRoaXMuX0NvbW1hbmRJbml0LCBidWYpO1xuICB9XG5cbiAgcHVibGljIGRlaW5pdChwYXJhbXM6IGFueSkge1xuICAgIGNvbnN0IGJ1ZjogYW55ID0gbmV3IFVpbnQ4QXJyYXkoMCk7XG4gICAgdGhpcy5zZW5kQ29tbWFuZCh0aGlzLl9Db21tYW5kRGVpbml0LCBidWYpO1xuICB9XG5cbiAgcHVibGljIHBhcnNlRnJvbUpzb24oanNvbjogYW55KSB7XG4gICAgY29uc3QgbW9kdWxlOiBhbnkgPSBqc29uLmxvZ2ljX2FuYWx5emVyO1xuICAgIGlmIChtb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzY2hlbWFEYXRhOiBhbnkgPSBbXG4gICAgICB7dXJpOiBcIi9yZXF1ZXN0L2xvZ2ljQW5hbHl6ZXIvaW5pdFwiLCBvblZhbGlkOiB0aGlzLmluaXR9LFxuICAgICAge3VyaTogXCIvcmVxdWVzdC9sb2dpY0FuYWx5emVyL2RlaW5pdFwiLCBvblZhbGlkOiB0aGlzLmRlaW5pdH0sXG4gICAgXTtcbiAgICBjb25zdCByZXM6IGFueSA9IHRoaXMudmFsaWRhdGVDb21tYW5kU2NoZW1hKHNjaGVtYURhdGEsIG1vZHVsZSwgXCJsb2dpY19hbmFseXplclwiKTtcblxuICAgIGlmIChyZXMudmFsaWQgPT09IDApIHtcbiAgICAgIGlmIChyZXMuaW52YWxpZEJ1dExpa2UubGVuZ3RoID4gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzLmludmFsaWRCdXRMaWtlWzBdLm1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IHRoaXMuV1NDb21tYW5kTm90Rm91bmRFcnJvcihcbiAgICAgICAgICBgW2xvZ2ljX2FuYWx5emVyXXVua25vd24gY29tbWFuZGAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG5vdGlmeUZyb21CaW5hcnkob2JqVG9TZW5kOiBhbnksIGZ1bmM6IGFueSwgcGF5bG9hZDogYW55KSB7XG4gICAgaWYgKGZ1bmMgPT09IHRoaXMuX0NvbW1hbmRSZWN2KSB7XG4gICAgICBjb25zdCBhcnI6IGFueSA9IG5ldyBBcnJheShwYXlsb2FkLmJ5dGVMZW5ndGggKiA4KTtcbiAgICAgIGxldCBvZmZzZXQ6IGFueSA9IDA7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBheWxvYWQuYnl0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGJ5dGU6IGFueSA9IHBheWxvYWRbaV07XG4gICAgICAgIGZvciAobGV0IGJpdCA9IDA7IGJpdCA8IDg7IGJpdCsrKSB7XG4gICAgICAgICAgYXJyW29mZnNldF0gPSBieXRlICYgKDB4ODAgPj4+IGJpdCkgPyAxIDogMDtcbiAgICAgICAgICBvZmZzZXQrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb2JqVG9TZW5kLmxvZ2ljX2FuYWx5emVyID0ge1xuICAgICAgICBkYXRhOiBhcnIsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdXBlci5ub3RpZnlGcm9tQmluYXJ5KG9ialRvU2VuZCwgZnVuYywgcGF5bG9hZCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdTQ29tbWFuZExvZ2ljQW5hbHl6ZXI7XG4iXX0=
