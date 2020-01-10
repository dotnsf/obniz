"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const semver = require("semver");
class Directive {
    constructor(Obniz, id) {
        this.Obniz = Obniz;
        this.observers = [];
        this._reset();
    }
    _reset() {
        for (let i = 0; i < this.observers.length; i++) {
            this.observers[i].reject(new Error("reset called"));
        }
        this.observers = [];
        this._animationIdentifier = 0;
    }
    addObserver(name, resolve, reject) {
        if (name && resolve && reject) {
            this.observers.push({
                name,
                resolve,
                reject,
            });
        }
    }
    animation(name, status, array, repeat) {
        if ((typeof repeat === "number" || status === "registrate") &&
            semver.lt(this.Obniz.firmware_ver, "2.0.0")) {
            throw new Error(`Please update obniz firmware >= 2.0.0`);
        }
        const obj = {};
        obj.io = {
            animation: {
                name,
                status,
            },
        };
        if (typeof repeat === "number") {
            obj.io.animation.repeat = repeat;
        }
        if (!array) {
            array = [];
        }
        const states = [];
        for (let i = 0; i < array.length; i++) {
            const state = array[i];
            const duration = state.duration;
            const operation = state.state;
            // dry run. and get json commands
            this.Obniz.sendPool = [];
            operation(i);
            const pooledJsonArray = this.Obniz.sendPool;
            this.Obniz.sendPool = null;
            states.push({
                duration,
                state: pooledJsonArray,
            });
        }
        if (status === "loop" || status === "registrate") {
            obj.io.animation.states = states;
        }
        this.Obniz.send(obj);
    }
    repeatWait(array, repeat) {
        if (semver.lt(this.Obniz.firmware_ver, "2.0.0")) {
            throw new Error(`Please update obniz firmware >= 2.0.0`);
        }
        if (typeof repeat !== "number" || repeat < 1) {
            throw new Error("please specify repeat count > 0");
        }
        if (Math.floor(repeat) !== repeat) {
            throw new Error("please provide integer number like 1, 2, 3,,,");
        }
        return new Promise((resolve, reject) => {
            const name = "_repeatwait" + Date.now() + this._animationIdentifier;
            if (++this._animationIdentifier > 1000) {
                this._animationIdentifier = 0;
            }
            this.animation(name, "loop", array, repeat);
            this.addObserver(name, resolve, reject);
        });
    }
    notified(obj) {
        if (obj.animation.status === "finish") {
            for (let i = this.observers.length - 1; i >= 0; i--) {
                if (obj.animation.name === this.observers[i].name) {
                    this.observers[i].resolve();
                    this.observers.splice(i, 1);
                }
            }
        }
    }
}
exports.default = Directive;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vYm5pei9saWJzL2lvX3BlcmlwaGVyYWxzL2RpcmVjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlDQUFrQztBQUVsQyxNQUFNLFNBQVM7SUFLYixZQUFZLEtBQVUsRUFBRSxFQUFPO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBRU0sTUFBTTtRQUNYLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRU0sV0FBVyxDQUFDLElBQVMsRUFBRSxPQUFZLEVBQUUsTUFBVztRQUNyRCxJQUFJLElBQUksSUFBSSxPQUFPLElBQUksTUFBTSxFQUFFO1lBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO2dCQUNsQixJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsTUFBTTthQUNQLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztJQUVNLFNBQVMsQ0FBQyxJQUFTLEVBQUUsTUFBVyxFQUFFLEtBQVUsRUFBRSxNQUFXO1FBQzlELElBQ0UsQ0FBQyxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksTUFBTSxLQUFLLFlBQVksQ0FBQztZQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxF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SyxRQUFRLEVBQUU7WUFDckMsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtvQkFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUM3QjthQUNGO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxrQkFBZSxTQUFTLENBQUMiLCJmaWxlIjoic3JjL29ibml6L2xpYnMvaW9fcGVyaXBoZXJhbHMvZGlyZWN0aXZlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNlbXZlciA9IHJlcXVpcmUoXCJzZW12ZXJcIik7XG5cbmNsYXNzIERpcmVjdGl2ZSB7XG4gIHB1YmxpYyBPYm5pejogYW55O1xuICBwdWJsaWMgb2JzZXJ2ZXJzOiBhbnk7XG4gIHB1YmxpYyBfYW5pbWF0aW9uSWRlbnRpZmllcjogYW55O1xuXG4gIGNvbnN0cnVjdG9yKE9ibml6OiBhbnksIGlkOiBhbnkpIHtcbiAgICB0aGlzLk9ibml6ID0gT2JuaXo7XG4gICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICB0aGlzLl9yZXNldCgpO1xuICB9XG5cbiAgcHVibGljIF9yZXNldCgpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMub2JzZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLm9ic2VydmVyc1tpXS5yZWplY3QobmV3IEVycm9yKFwicmVzZXQgY2FsbGVkXCIpKTtcbiAgICB9XG4gICAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgICB0aGlzLl9hbmltYXRpb25JZGVudGlmaWVyID0gMDtcbiAgfVxuXG4gIHB1YmxpYyBhZGRPYnNlcnZlcihuYW1lOiBhbnksIHJlc29sdmU6IGFueSwgcmVqZWN0OiBhbnkpIHtcbiAgICBpZiAobmFtZSAmJiByZXNvbHZlICYmIHJlamVjdCkge1xuICAgICAgdGhpcy5vYnNlcnZlcnMucHVzaCh7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHJlc29sdmUsXG4gICAgICAgIHJlamVjdCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhbmltYXRpb24obmFtZTogYW55LCBzdGF0dXM6IGFueSwgYXJyYXk6IGFueSwgcmVwZWF0OiBhbnkpIHtcbiAgICBpZiAoXG4gICAgICAodHlwZW9mIHJlcGVhdCA9PT0gXCJudW1iZXJcIiB8fCBzdGF0dXMgPT09IFwicmVnaXN0cmF0ZVwiKSAmJlxuICAgICAgc2VtdmVyLmx0KHRoaXMuT2JuaXouZmlybXdhcmVfdmVyLCBcIjIuMC4wXCIpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFBsZWFzZSB1cGRhdGUgb2JuaXogZmlybXdhcmUgPj0gMi4wLjBgKTtcbiAgICB9XG4gICAgY29uc3Qgb2JqOiBhbnkgPSB7fTtcbiAgICBvYmouaW8gPSB7XG4gICAgICBhbmltYXRpb246IHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgc3RhdHVzLFxuICAgICAgfSxcbiAgICB9O1xuICAgIGlmICh0eXBlb2YgcmVwZWF0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICBvYmouaW8uYW5pbWF0aW9uLnJlcGVhdCA9IHJlcGVhdDtcbiAgICB9XG4gICAgaWYgKCFhcnJheSkge1xuICAgICAgYXJyYXkgPSBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZXM6IGFueSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN0YXRlOiBhbnkgPSBhcnJheVtpXTtcbiAgICAgIGNvbnN0IGR1cmF0aW9uOiBhbnkgPSBzdGF0ZS5kdXJhdGlvbjtcbiAgICAgIGNvbnN0IG9wZXJhdGlvbjogYW55ID0gc3RhdGUuc3RhdGU7XG5cbiAgICAgIC8vIGRyeSBydW4uIGFuZCBnZXQganNvbiBjb21tYW5kc1xuICAgICAgdGhpcy5PYm5pei5zZW5kUG9vbCA9IFtdO1xuICAgICAgb3BlcmF0aW9uKGkpO1xuICAgICAgY29uc3QgcG9vbGVkSnNvbkFycmF5OiBhbnkgPSB0aGlzLk9ibml6LnNlbmRQb29sO1xuICAgICAgdGhpcy5PYm5pei5zZW5kUG9vbCA9IG51bGw7XG4gICAgICBzdGF0ZXMucHVzaCh7XG4gICAgICAgIGR1cmF0aW9uLFxuICAgICAgICBzdGF0ZTogcG9vbGVkSnNvbkFycmF5LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChzdGF0dXMgPT09IFwibG9vcFwiIHx8IHN0YXR1cyA9PT0gXCJyZWdpc3RyYXRlXCIpIHtcbiAgICAgIG9iai5pby5hbmltYXRpb24uc3RhdGVzID0gc3RhdGVzO1xuICAgIH1cbiAgICB0aGlzLk9ibml6LnNlbmQob2JqKTtcbiAgfVxuXG4gIHB1YmxpYyByZXBlYXRXYWl0KGFycmF5OiBhbnksIHJlcGVhdDogYW55KSB7XG4gICAgaWYgKHNlbXZlci5sdCh0aGlzLk9ibml6LmZpcm13YXJlX3ZlciwgXCIyLjAuMFwiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBQbGVhc2UgdXBkYXRlIG9ibml6IGZpcm13YXJlID49IDIuMC4wYCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcmVwZWF0ICE9PSBcIm51bWJlclwiIHx8IHJlcGVhdCA8IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInBsZWFzZSBzcGVjaWZ5IHJlcGVhdCBjb3VudCA+IDBcIik7XG4gICAgfVxuICAgIGlmIChNYXRoLmZsb29yKHJlcGVhdCkgIT09IHJlcGVhdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGxlYXNlIHByb3ZpZGUgaW50ZWdlciBudW1iZXIgbGlrZSAxLCAyLCAzLCwsXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSkgPT4ge1xuICAgICAgY29uc3QgbmFtZTogYW55ID0gXCJfcmVwZWF0d2FpdFwiICsgRGF0ZS5ub3coKSArIHRoaXMuX2FuaW1hdGlvbklkZW50aWZpZXI7XG4gICAgICBpZiAoKyt0aGlzLl9hbmltYXRpb25JZGVudGlmaWVyID4gMTAwMCkge1xuICAgICAgICB0aGlzLl9hbmltYXRpb25JZGVudGlmaWVyID0gMDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hbmltYXRpb24obmFtZSwgXCJsb29wXCIsIGFycmF5LCByZXBlYXQpO1xuICAgICAgdGhpcy5hZGRPYnNlcnZlcihuYW1lLCByZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIG5vdGlmaWVkKG9iajogYW55KSB7XG4gICAgaWYgKG9iai5hbmltYXRpb24uc3RhdHVzID09PSBcImZpbmlzaFwiKSB7XG4gICAgICBmb3IgKGxldCBpID0gdGhpcy5vYnNlcnZlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKG9iai5hbmltYXRpb24ubmFtZSA9PT0gdGhpcy5vYnNlcnZlcnNbaV0ubmFtZSkge1xuICAgICAgICAgIHRoaXMub2JzZXJ2ZXJzW2ldLnJlc29sdmUoKTtcbiAgICAgICAgICB0aGlzLm9ic2VydmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRGlyZWN0aXZlO1xuIl19
