"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const semver = require("semver");
const util_1 = __importDefault(require("../utils/util"));
class PeripheralSPI {
    constructor(Obniz, id) {
        this.Obniz = Obniz;
        this.id = id;
        this._reset();
    }
    _reset() {
        this.observers = [];
        this.used = false;
    }
    addObserver(callback) {
        if (callback) {
            this.observers.push(callback);
        }
    }
    start(params) {
        const err = util_1.default._requiredKeys(params, ["mode", "frequency"]);
        if (err) {
            throw new Error("spi start param '" + err + "' required, but not found ");
        }
        this.params = util_1.default._keyFilter(params, [
            "mode",
            "clk",
            "mosi",
            "miso",
            "frequency",
            "drive",
            "pull",
            "gnd",
        ]);
        const obj = {};
        const ioKeys = ["clk", "mosi", "miso", "gnd"];
        for (const key of ioKeys) {
            if (this.params[key] && !this.Obniz.isValidIO(this.params[key])) {
                throw new Error("spi start param '" + key + "' are to be valid io no");
            }
        }
        obj["spi" + this.id] = {
            mode: this.params.mode,
            clock: this.params.frequency,
        };
        if (this.params.clk !== undefined) {
            obj["spi" + this.id].clk = this.params.clk;
        }
        if (this.params.mosi !== undefined) {
            obj["spi" + this.id].mosi = this.params.mosi;
        }
        if (this.params.miso !== undefined) {
            obj["spi" + this.id].miso = this.params.miso;
        }
        if (this.params.drive) {
            if (this.params.clk !== undefined) {
                this.Obniz.getIO(this.params.clk).drive(this.params.drive);
            }
            if (this.params.mosi !== undefined) {
                this.Obniz.getIO(this.params.mosi).drive(this.params.drive);
            }
            if (this.params.miso !== undefined) {
                this.Obniz.getIO(this.params.miso).drive(this.params.drive);
            }
        }
        else {
            if (this.params.clk !== undefined) {
                this.Obniz.getIO(this.params.clk).drive("5v");
            }
            if (this.params.mosi !== undefined) {
                this.Obniz.getIO(this.params.mosi).drive("5v");
            }
            if (this.params.miso !== undefined) {
                this.Obniz.getIO(this.params.miso).drive("5v");
            }
        }
        if (this.params.pull) {
            if (this.params.clk !== undefined) {
                this.Obniz.getIO(this.params.clk).pull(this.params.pull);
            }
            if (this.params.mosi !== undefined) {
                this.Obniz.getIO(this.params.mosi).pull(this.params.pull);
            }
            if (this.params.miso !== undefined) {
                this.Obniz.getIO(this.params.miso).pull(this.params.pull);
            }
        }
        else {
            if (this.params.clk !== undefined) {
                this.Obniz.getIO(this.params.clk).pull(null);
            }
            if (this.params.mosi !== undefined) {
                this.Obniz.getIO(this.params.mosi).pull(null);
            }
            if (this.params.miso !== undefined) {
                this.Obniz.getIO(this.params.miso).pull(null);
            }
        }
        if (this.params.gnd !== undefined) {
            this.Obniz.getIO(this.params.gnd).output(false);
            const ioNames = {};
            ioNames[this.params.gnd] = "gnd";
            this.Obniz.display.setPinNames("spi" + this.id, ioNames);
        }
        this.used = true;
        this.Obniz.send(obj);
    }
    writeWait(data) {
        if (!this.used) {
            throw new Error(`spi${this.id} is not started`);
        }
        if (semver.lte(this.Obniz.firmware_ver, "1.0.2") && data.length > 32) {
            throw new Error(`with your obniz ${this.Obniz.firmware_ver}. spi max length=32byte but yours ${data.length}. Please update obniz firmware`);
        }
        const self = this;
        return new Promise((resolve, reject) => {
            self.addObserver(resolve);
            const obj = {};
            obj["spi" + self.id] = {
                data,
                read: true,
            };
            self.Obniz.send(obj);
        });
    }
    write(data) {
        if (!this.used) {
            throw new Error(`spi${this.id} is not started`);
        }
        if (semver.lte(this.Obniz.firmware_ver, "1.0.2") && data.length > 32) {
            throw new Error(`with your obniz ${this.Obniz.firmware_ver}. spi max length=32byte but yours ${data.length}. Please update obniz firmware`);
        }
        const self = this;
        const obj = {};
        obj["spi" + self.id] = {
            data,
            read: false,
        };
        self.Obniz.send(obj);
    }
    notified(obj) {
        // TODO: we should compare byte length from sent
        const callback = this.observers.shift();
        if (callback) {
            callback(obj.data);
        }
    }
    isUsed() {
        return this.used;
    }
    end(reuse) {
        const self = this;
        const obj = {};
        obj["spi" + self.id] = null;
        this.params = null;
        self.Obniz.send(obj);
        if (!reuse) {
            this.used = false;
        }
    }
}
exports.default = PeripheralSPI;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vYm5pei9saWJzL2lvX3BlcmlwaGVyYWxzL3NwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGlDQUFrQztBQUNsQyx5REFBc0M7QUFFdEMsTUFBTSxhQUFhO0lBT2pCLFlBQVksS0FBVSxFQUFFLEVBQU87UUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVNLE1BQU07UUFDWCxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRU0sV0FBVyxDQUFDLFFBQWE7UUFDOUIsSUFBSSxRQUFRLEVBQUU7WUFDWixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMvQjtJQUNILENBQUM7SUFFTSxLQUFLLENBQUMsTUFBVztRQUN0QixNQUFNLEdBQUcsR0FBUSxjQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLElBQUksR0FBRyxFQUFFO1lBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLEdBQUcsNEJBQTRCLENBQUMsQ0FBQztTQUMzRTtRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBUyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7WUFDekMsTUFBTTtZQUNOLEtBQUs7WUFDTCxNQUFNO1lBQ04sTUFBTTtZQUNOLFdBQVc7WUFDWCxPQUFPO1lBQ1AsTUFBTTtZQUNOLEtBQUs7U0FDTixDQUFDLENBQUM7UUFDSCxNQUFNLEdBQUcsR0FBUSxFQUFFLENBQUM7UUFFcEIsTUFBTSxNQUFNLEdBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtZQUN4QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLEdBQUcsR0FBRyxHQUFHLHlCQUF5QixDQUFDLENBQUM7YUFDeEU7U0FDRjtRQUVELEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDdEIsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUztTQUM3QixDQUFDO1FBQ0YsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxTQUFTLEVBQUU7WUFDakMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1NBQzVDO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDbEMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQzlDO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDbEMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQzlDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTtZQUNyQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLFNBQVMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUM1RDtZQUNELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUNsQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzdEO1lBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDN0Q7U0FDRjthQUFNO1lBQ0wsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxTQUFTLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQy9DO1lBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxD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QyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxRQUFRLENBQUMsR0FBUTtRQUN0QixnREFBZ0Q7UUFDaEQsTUFBTSxRQUFRLEdBQVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM3QyxJQUFJLFFBQVEsRUFBRTtZQUNaLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEI7SUFDSCxDQUFDO0lBRU0sTUFBTTtRQUNYLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQVU7UUFDbkIsTUFBTSxJQUFJLEdBQVEsSUFBSSxDQUFDO1FBQ3ZCLE1BQU0sR0FBRyxHQUFRLEVBQUUsQ0FBQztRQUNwQixHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1NBQ25CO0lBQ0gsQ0FBQztDQUNGO0FBRUQsa0JBQWUsYUFBYSxDQUFDIiwiZmlsZSI6InNyYy9vYm5pei9saWJzL2lvX3BlcmlwaGVyYWxzL3NwaS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzZW12ZXIgPSByZXF1aXJlKFwic2VtdmVyXCIpO1xuaW1wb3J0IE9ibml6VXRpbCBmcm9tIFwiLi4vdXRpbHMvdXRpbFwiO1xuXG5jbGFzcyBQZXJpcGhlcmFsU1BJIHtcbiAgcHVibGljIE9ibml6OiBhbnk7XG4gIHB1YmxpYyBpZDogYW55O1xuICBwdWJsaWMgb2JzZXJ2ZXJzOiBhbnk7XG4gIHB1YmxpYyB1c2VkOiBhbnk7XG4gIHB1YmxpYyBwYXJhbXM6IGFueTtcblxuICBjb25zdHJ1Y3RvcihPYm5pejogYW55LCBpZDogYW55KSB7XG4gICAgdGhpcy5PYm5peiA9IE9ibml6O1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgICB0aGlzLl9yZXNldCgpO1xuICB9XG5cbiAgcHVibGljIF9yZXNldCgpIHtcbiAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xuICAgIHRoaXMudXNlZCA9IGZhbHNlO1xuICB9XG5cbiAgcHVibGljIGFkZE9ic2VydmVyKGNhbGxiYWNrOiBhbnkpIHtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzLnB1c2goY2FsbGJhY2spO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBzdGFydChwYXJhbXM6IGFueSkge1xuICAgIGNvbnN0IGVycjogYW55ID0gT2JuaXpVdGlsLl9yZXF1aXJlZEtleXMocGFyYW1zLCBbXCJtb2RlXCIsIFwiZnJlcXVlbmN5XCJdKTtcbiAgICBpZiAoZXJyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJzcGkgc3RhcnQgcGFyYW0gJ1wiICsgZXJyICsgXCInIHJlcXVpcmVkLCBidXQgbm90IGZvdW5kIFwiKTtcbiAgICB9XG4gICAgdGhpcy5wYXJhbXMgPSBPYm5pelV0aWwuX2tleUZpbHRlcihwYXJhbXMsIFtcbiAgICAgIFwibW9kZVwiLFxuICAgICAgXCJjbGtcIixcbiAgICAgIFwibW9zaVwiLFxuICAgICAgXCJtaXNvXCIsXG4gICAgICBcImZyZXF1ZW5jeVwiLFxuICAgICAgXCJkcml2ZVwiLFxuICAgICAgXCJwdWxsXCIsXG4gICAgICBcImduZFwiLFxuICAgIF0pO1xuICAgIGNvbnN0IG9iajogYW55ID0ge307XG5cbiAgICBjb25zdCBpb0tleXM6IGFueSA9IFtcImNsa1wiLCBcIm1vc2lcIiwgXCJtaXNvXCIsIFwiZ25kXCJdO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIGlvS2V5cykge1xuICAgICAgaWYgKHRoaXMucGFyYW1zW2tleV0gJiYgIXRoaXMuT2JuaXouaXNWYWxpZElPKHRoaXMucGFyYW1zW2tleV0pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInNwaSBzdGFydCBwYXJhbSAnXCIgKyBrZXkgKyBcIicgYXJlIHRvIGJlIHZhbGlkIGlvIG5vXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIG9ialtcInNwaVwiICsgdGhpcy5pZF0gPSB7XG4gICAgICBtb2RlOiB0aGlzLnBhcmFtcy5tb2RlLFxuICAgICAgY2xvY2s6IHRoaXMucGFyYW1zLmZyZXF1ZW5jeSwgLy8gbmFtZSBkaWZmZXJlbnRcbiAgICB9O1xuICAgIGlmICh0aGlzLnBhcmFtcy5jbGsgIT09IHVuZGVmaW5lZCkge1xuICAgICAgb2JqW1wic3BpXCIgKyB0aGlzLmlkXS5jbGsgPSB0aGlzLnBhcmFtcy5jbGs7XG4gICAgfVxuICAgIGlmICh0aGlzLnBhcmFtcy5tb3NpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG9ialtcInNwaVwiICsgdGhpcy5pZF0ubW9zaSA9IHRoaXMucGFyYW1zLm1vc2k7XG4gICAgfVxuICAgIGlmICh0aGlzLnBhcmFtcy5taXNvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG9ialtcInNwaVwiICsgdGhpcy5pZF0ubWlzbyA9IHRoaXMucGFyYW1zLm1pc287XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGFyYW1zLmRyaXZlKSB7XG4gICAgICBpZiAodGhpcy5wYXJhbXMuY2xrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5jbGspLmRyaXZlKHRoaXMucGFyYW1zLmRyaXZlKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnBhcmFtcy5tb3NpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5tb3NpKS5kcml2ZSh0aGlzLnBhcmFtcy5kcml2ZSk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5wYXJhbXMubWlzbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuT2JuaXouZ2V0SU8odGhpcy5wYXJhbXMubWlzbykuZHJpdmUodGhpcy5wYXJhbXMuZHJpdmUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5wYXJhbXMuY2xrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5jbGspLmRyaXZlKFwiNXZcIik7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5wYXJhbXMubW9zaSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuT2JuaXouZ2V0SU8odGhpcy5wYXJhbXMubW9zaSkuZHJpdmUoXCI1dlwiKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnBhcmFtcy5taXNvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5taXNvKS5kcml2ZShcIjV2XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnBhcmFtcy5wdWxsKSB7XG4gICAgICBpZiAodGhpcy5wYXJhbXMuY2xrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5jbGspLnB1bGwodGhpcy5wYXJhbXMucHVsbCk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5wYXJhbXMubW9zaSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuT2JuaXouZ2V0SU8odGhpcy5wYXJhbXMubW9zaSkucHVsbCh0aGlzLnBhcmFtcy5wdWxsKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnBhcmFtcy5taXNvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5taXNvKS5wdWxsKHRoaXMucGFyYW1zLnB1bGwpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5wYXJhbXMuY2xrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5jbGspLnB1bGwobnVsbCk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5wYXJhbXMubW9zaSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuT2JuaXouZ2V0SU8odGhpcy5wYXJhbXMubW9zaSkucHVsbChudWxsKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnBhcmFtcy5taXNvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5taXNvKS5wdWxsKG51bGwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnBhcmFtcy5nbmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5PYm5pei5nZXRJTyh0aGlzLnBhcmFtcy5nbmQpLm91dHB1dChmYWxzZSk7XG4gICAgICBjb25zdCBpb05hbWVzOiBhbnkgPSB7fTtcbiAgICAgIGlvTmFtZXNbdGhpcy5wYXJhbXMuZ25kXSA9IFwiZ25kXCI7XG4gICAgICB0aGlzLk9ibml6LmRpc3BsYXkuc2V0UGluTmFtZXMoXCJzcGlcIiArIHRoaXMuaWQsIGlvTmFtZXMpO1xuICAgIH1cbiAgICB0aGlzLnVzZWQgPSB0cnVlO1xuICAgIHRoaXMuT2JuaXouc2VuZChvYmopO1xuICB9XG5cbiAgcHVibGljIHdyaXRlV2FpdChkYXRhOiBhbnkpIHtcbiAgICBpZiAoIXRoaXMudXNlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzcGkke3RoaXMuaWR9IGlzIG5vdCBzdGFydGVkYCk7XG4gICAgfVxuICAgIGlmIChzZW12ZXIubHRlKHRoaXMuT2JuaXouZmlybXdhcmVfdmVyLCBcIjEuMC4yXCIpICYmIGRhdGEubGVuZ3RoID4gMzIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYHdpdGggeW91ciBvYm5peiAke1xuICAgICAgICAgIHRoaXMuT2JuaXouZmlybXdhcmVfdmVyXG4gICAgICAgIH0uIHNwaSBtYXggbGVuZ3RoPTMyYnl0ZSBidXQgeW91cnMgJHtcbiAgICAgICAgICBkYXRhLmxlbmd0aFxuICAgICAgICB9LiBQbGVhc2UgdXBkYXRlIG9ibml6IGZpcm13YXJlYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZjogYW55ID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmU6IGFueSwgcmVqZWN0OiBhbnkpID0+IHtcbiAgICAgIHNlbGYuYWRkT2JzZXJ2ZXIocmVzb2x2ZSk7XG4gICAgICBjb25zdCBvYmo6IGFueSA9IHt9O1xuICAgICAgb2JqW1wic3BpXCIgKyBzZWxmLmlkXSA9IHtcbiAgICAgICAgZGF0YSxcbiAgICAgICAgcmVhZDogdHJ1ZSxcbiAgICAgIH07XG4gICAgICBzZWxmLk9ibml6LnNlbmQob2JqKTtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyB3cml0ZShkYXRhOiBhbnkpIHtcbiAgICBpZiAoIXRoaXMudXNlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBzcGkke3RoaXMuaWR9IGlzIG5vdCBzdGFydGVkYCk7XG4gICAgfVxuICAgIGlmIChzZW12ZXIubHRlKHRoaXMuT2JuaXouZmlybXdhcmVfdmVyLCBcIjEuMC4yXCIpICYmIGRhdGEubGVuZ3RoID4gMzIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYHdpdGggeW91ciBvYm5peiAke1xuICAgICAgICAgIHRoaXMuT2JuaXouZmlybXdhcmVfdmVyXG4gICAgICAgIH0uIHNwaSBtYXggbGVuZ3RoPTMyYnl0ZSBidXQgeW91cnMgJHtcbiAgICAgICAgICBkYXRhLmxlbmd0aFxuICAgICAgICB9LiBQbGVhc2UgdXBkYXRlIG9ibml6IGZpcm13YXJlYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZjogYW55ID0gdGhpcztcbiAgICBjb25zdCBvYmo6IGFueSA9IHt9O1xuICAgIG9ialtcInNwaVwiICsgc2VsZi5pZF0gPSB7XG4gICAgICBkYXRhLFxuICAgICAgcmVhZDogZmFsc2UsXG4gICAgfTtcbiAgICBzZWxmLk9ibml6LnNlbmQob2JqKTtcbiAgfVxuXG4gIHB1YmxpYyBub3RpZmllZChvYmo6IGFueSkge1xuICAgIC8vIFRPRE86IHdlIHNob3VsZCBjb21wYXJlIGJ5dGUgbGVuZ3RoIGZyb20gc2VudFxuICAgIGNvbnN0IGNhbGxiYWNrOiBhbnkgPSB0aGlzLm9ic2VydmVycy5zaGlmdCgpO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2sob2JqLmRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBpc1VzZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMudXNlZDtcbiAgfVxuXG4gIHB1YmxpYyBlbmQocmV1c2U6IGFueSkge1xuICAgIGNvbnN0IHNlbGY6IGFueSA9IHRoaXM7XG4gICAgY29uc3Qgb2JqOiBhbnkgPSB7fTtcbiAgICBvYmpbXCJzcGlcIiArIHNlbGYuaWRdID0gbnVsbDtcbiAgICB0aGlzLnBhcmFtcyA9IG51bGw7XG4gICAgc2VsZi5PYm5pei5zZW5kKG9iaik7XG4gICAgaWYgKCFyZXVzZSkge1xuICAgICAgdGhpcy51c2VkID0gZmFsc2U7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFBlcmlwaGVyYWxTUEk7XG4iXX0=
