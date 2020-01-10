"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class LED {
    constructor() {
        this.keys = ["anode", "cathode"];
        this.requiredKeys = ["anode"];
    }
    static info() {
        return {
            name: "LED",
        };
    }
    wired(obniz) {
        function getIO(io) {
            if (io && typeof io === "object") {
                if (typeof io.output === "function") {
                    return io;
                }
            }
            return obniz.getIO(io);
        }
        this.obniz = obniz;
        this.io_anode = getIO(this.params.anode);
        this.io_anode.output(false);
        if (this.obniz.isValidIO(this.params.cathode)) {
            this.io_cathode = getIO(this.params.cathode);
            this.io_cathode.output(false);
        }
        this.animationName = "Led-" + this.params.anode;
    }
    on() {
        this.endBlink();
        this.io_anode.output(true);
    }
    off() {
        this.endBlink();
        this.io_anode.output(false);
    }
    output(value) {
        if (value) {
            this.on();
        }
        else {
            this.off();
        }
    }
    endBlink() {
        this.obniz.io.animation(this.animationName, "pause");
    }
    blink(interval) {
        if (!interval) {
            interval = 100;
        }
        const frames = [
            {
                duration: interval,
                state: (index) => {
                    // index = 0
                    this.io_anode.output(true); // on
                },
            },
            {
                duration: interval,
                state: (index) => {
                    // index = 0
                    this.io_anode.output(false); // off
                },
            },
        ];
        this.obniz.io.animation(this.animationName, "loop", frames);
    }
}
exports.default = LED;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXJ0cy9MaWdodC9MRUQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNLEdBQUc7SUFnQlA7UUFDRSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBakJNLE1BQU0sQ0FBQyxJQUFJO1FBQ2hCLE9BQU87WUFDTCxJQUFJLEVBQUUsS0FBSztTQUNaLENBQUM7SUFDSixDQUFDO0lBZU0sS0FBSyxDQUFDLEtBQVU7UUFDckIsU0FBUyxLQUFLLENBQUMsRUFBTztZQUNwQixJQUFJLEVBQUUsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUU7Z0JBQ2hDLElBQUksT0FBTyxFQUFFLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRTtvQkFDbkMsT0FBTyxFQUFFLENBQUM7aUJBQ1g7YUFDRjtZQUNELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDN0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMvQjtRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2xELENBQUM7SUFFTSxFQUFFO1FBQ1AsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFTSxHQUFHO1FBQ1IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBVTtRQUN0QixJQUFJLEtBQUssRUFBRTtZQUNULElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNYO2FBQU07WUFDTCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDWjtJQUNILENBQUM7SUFFTSxRQUFRO1FBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVNLEtBQUssQ0FBQyxRQUFhO1FBQ3hCLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDYixRQUFRLEdBQUcsR0FBRyxDQUFDO1NBQ2hCO1FBQ0QsTUFBTSxNQUFNLEdBQVE7WUFDbEI7Z0JBQ0UsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLEtBQUssRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFO29CQUNwQixZQUFZO29CQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSztnQkFDbkMsQ0FBQzthQUNGO1lBQ0Q7Z0JBQ0UsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLEtBQUssRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFO29CQUNwQixZQUFZO29CQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTTtnQkFDckMsQ0FBQzthQUNGO1NBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5RCxDQUFDO0NBQ0Y7QUFFRCxrQkFBZSxHQUFHLENBQUMiLCJmaWxlIjoic3JjL3BhcnRzL0xpZ2h0L0xFRC9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNsYXNzIExFRCB7XG5cbiAgcHVibGljIHN0YXRpYyBpbmZvKCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBcIkxFRFwiLFxuICAgIH07XG4gIH1cblxuICBwdWJsaWMga2V5czogYW55O1xuICBwdWJsaWMgcmVxdWlyZWRLZXlzOiBhbnk7XG4gIHB1YmxpYyBvYm5pejogYW55O1xuICBwdWJsaWMgaW9fYW5vZGU6IGFueTtcbiAgcHVibGljIHBhcmFtczogYW55O1xuICBwdWJsaWMgaW9fY2F0aG9kZTogYW55O1xuICBwdWJsaWMgYW5pbWF0aW9uTmFtZTogYW55O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMua2V5cyA9IFtcImFub2RlXCIsIFwiY2F0aG9kZVwiXTtcbiAgICB0aGlzLnJlcXVpcmVkS2V5cyA9IFtcImFub2RlXCJdO1xuICB9XG5cbiAgcHVibGljIHdpcmVkKG9ibml6OiBhbnkpIHtcbiAgICBmdW5jdGlvbiBnZXRJTyhpbzogYW55KSB7XG4gICAgICBpZiAoaW8gJiYgdHlwZW9mIGlvID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW8ub3V0cHV0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICByZXR1cm4gaW87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvYm5pei5nZXRJTyhpbyk7XG4gICAgfVxuXG4gICAgdGhpcy5vYm5peiA9IG9ibml6O1xuICAgIHRoaXMuaW9fYW5vZGUgPSBnZXRJTyh0aGlzLnBhcmFtcy5hbm9kZSk7XG4gICAgdGhpcy5pb19hbm9kZS5vdXRwdXQoZmFsc2UpO1xuICAgIGlmICh0aGlzLm9ibml6LmlzVmFsaWRJTyh0aGlzLnBhcmFtcy5jYXRob2RlKSkge1xuICAgICAgdGhpcy5pb19jYXRob2RlID0gZ2V0SU8odGhpcy5wYXJhbXMuY2F0aG9kZSk7XG4gICAgICB0aGlzLmlvX2NhdGhvZGUub3V0cHV0KGZhbHNlKTtcbiAgICB9XG4gICAgdGhpcy5hbmltYXRpb25OYW1lID0gXCJMZWQtXCIgKyB0aGlzLnBhcmFtcy5hbm9kZTtcbiAgfVxuXG4gIHB1YmxpYyBvbigpIHtcbiAgICB0aGlzLmVuZEJsaW5rKCk7XG4gICAgdGhpcy5pb19hbm9kZS5vdXRwdXQodHJ1ZSk7XG4gIH1cblxuICBwdWJsaWMgb2ZmKCkge1xuICAgIHRoaXMuZW5kQmxpbmsoKTtcbiAgICB0aGlzLmlvX2Fub2RlLm91dHB1dChmYWxzZSk7XG4gIH1cblxuICBwdWJsaWMgb3V0cHV0KHZhbHVlOiBhbnkpIHtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHRoaXMub24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vZmYoKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZW5kQmxpbmsoKSB7XG4gICAgdGhpcy5vYm5pei5pby5hbmltYXRpb24odGhpcy5hbmltYXRpb25OYW1lLCBcInBhdXNlXCIpO1xuICB9XG5cbiAgcHVibGljIGJsaW5rKGludGVydmFsOiBhbnkpIHtcbiAgICBpZiAoIWludGVydmFsKSB7XG4gICAgICBpbnRlcnZhbCA9IDEwMDtcbiAgICB9XG4gICAgY29uc3QgZnJhbWVzOiBhbnkgPSBbXG4gICAgICB7XG4gICAgICAgIGR1cmF0aW9uOiBpbnRlcnZhbCxcbiAgICAgICAgc3RhdGU6IChpbmRleDogYW55KSA9PiB7XG4gICAgICAgICAgLy8gaW5kZXggPSAwXG4gICAgICAgICAgdGhpcy5pb19hbm9kZS5vdXRwdXQodHJ1ZSk7IC8vIG9uXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBkdXJhdGlvbjogaW50ZXJ2YWwsXG4gICAgICAgIHN0YXRlOiAoaW5kZXg6IGFueSkgPT4ge1xuICAgICAgICAgIC8vIGluZGV4ID0gMFxuICAgICAgICAgIHRoaXMuaW9fYW5vZGUub3V0cHV0KGZhbHNlKTsgLy8gb2ZmXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIF07XG5cbiAgICB0aGlzLm9ibml6LmlvLmFuaW1hdGlvbih0aGlzLmFuaW1hdGlvbk5hbWUsIFwibG9vcFwiLCBmcmFtZXMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExFRDtcbiJdfQ==
