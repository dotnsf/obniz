"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class _7SegmentLEDArray {
    constructor() {
        this.identifier = "" + new Date().getTime();
        this.keys = ["segments"];
        this.requiredKeys = this.keys;
    }
    static info() {
        return {
            name: "7SegmentLEDArray",
        };
    }
    wired(obniz) {
        this.obniz = obniz;
        this.segments = this.params.segments;
    }
    print(data) {
        if (typeof data === "number") {
            data = Math.floor(data);
            const print = (index) => {
                let val = data;
                for (let i = 0; i < this.segments.length; i++) {
                    if (index === i) {
                        this.segments[i].print(val % 10);
                    }
                    else {
                        this.segments[i].off();
                    }
                    val = val / 10;
                }
            };
            const animations = [];
            for (let i = 0; i < this.segments.length; i++) {
                animations.push({
                    duration: 3,
                    state: print,
                });
            }
            this.obniz.io.animation(this.identifier, "loop", animations);
        }
    }
    on() {
        this.obniz.io.animation(this.identifier, "resume");
    }
    off() {
        this.obniz.io.animation(this.identifier, "pause");
        for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].off();
        }
    }
}
exports.default = _7SegmentLEDArray;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXJ0cy9EaXNwbGF5LzdTZWdtZW50TEVEQXJyYXkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNLGlCQUFpQjtJQWVyQjtRQUNFLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFNUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNoQyxDQUFDO0lBbEJNLE1BQU0sQ0FBQyxJQUFJO1FBQ2hCLE9BQU87WUFDTCxJQUFJLEVBQUUsa0JBQWtCO1NBQ3pCLENBQUM7SUFDSixDQUFDO0lBZ0JNLEtBQUssQ0FBQyxLQUFVO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBRW5CLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7SUFDdkMsQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFTO1FBQ3BCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQzVCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXhCLE1BQU0sS0FBSyxHQUFRLENBQUMsS0FBVSxFQUFFLEVBQUU7Z0JBQ2hDLElBQUksR0FBRyxHQUFRLElBQUksQ0FBQztnQkFFcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUM3QyxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUU7d0JBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO3FCQUNsQzt5QkFBTTt3QkFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO3FCQUN4QjtvQkFDRCxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztpQkFDaEI7WUFDSCxDQUFDLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBUSxFQUFFLENBQUM7WUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM3QyxVQUFVLENBQUMsSUFBSSxDQUFDO29CQUNkLFFBQVEsRUFBRSxDQUFDO29CQUNYLEtBQUssRUFBRSxLQUFLO2lCQUNiLENBQUMsQ0FBQzthQUNKO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1NBQzlEO0lBQ0gsQ0FBQztJQUVNLEVBQUU7UUFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRU0sR0FBRztRQUNSLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1NBQ3hCO0lBQ0gsQ0FBQztDQUNGO0FBRUQsa0JBQWUsaUJBQWlCLENBQUMiLCJmaWxlIjoic3JjL3BhcnRzL0Rpc3BsYXkvN1NlZ21lbnRMRURBcnJheS9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNsYXNzIF83U2VnbWVudExFREFycmF5IHtcblxuICBwdWJsaWMgc3RhdGljIGluZm8oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IFwiN1NlZ21lbnRMRURBcnJheVwiLFxuICAgIH07XG4gIH1cblxuICBwdWJsaWMgaWRlbnRpZmllcjogYW55O1xuICBwdWJsaWMga2V5czogYW55O1xuICBwdWJsaWMgcmVxdWlyZWRLZXlzOiBhbnk7XG4gIHB1YmxpYyBvYm5pejogYW55O1xuICBwdWJsaWMgc2VnbWVudHM6IGFueTtcbiAgcHVibGljIHBhcmFtczogYW55O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaWRlbnRpZmllciA9IFwiXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAgIHRoaXMua2V5cyA9IFtcInNlZ21lbnRzXCJdO1xuICAgIHRoaXMucmVxdWlyZWRLZXlzID0gdGhpcy5rZXlzO1xuICB9XG5cbiAgcHVibGljIHdpcmVkKG9ibml6OiBhbnkpIHtcbiAgICB0aGlzLm9ibml6ID0gb2JuaXo7XG5cbiAgICB0aGlzLnNlZ21lbnRzID0gdGhpcy5wYXJhbXMuc2VnbWVudHM7XG4gIH1cblxuICBwdWJsaWMgcHJpbnQoZGF0YTogYW55KSB7XG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSBcIm51bWJlclwiKSB7XG4gICAgICBkYXRhID0gTWF0aC5mbG9vcihkYXRhKTtcblxuICAgICAgY29uc3QgcHJpbnQ6IGFueSA9IChpbmRleDogYW55KSA9PiB7XG4gICAgICAgIGxldCB2YWw6IGFueSA9IGRhdGE7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKGluZGV4ID09PSBpKSB7XG4gICAgICAgICAgICB0aGlzLnNlZ21lbnRzW2ldLnByaW50KHZhbCAlIDEwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZWdtZW50c1tpXS5vZmYoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsID0gdmFsIC8gMTA7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFuaW1hdGlvbnM6IGFueSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFuaW1hdGlvbnMucHVzaCh7XG4gICAgICAgICAgZHVyYXRpb246IDMsXG4gICAgICAgICAgc3RhdGU6IHByaW50LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5vYm5pei5pby5hbmltYXRpb24odGhpcy5pZGVudGlmaWVyLCBcImxvb3BcIiwgYW5pbWF0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIG9uKCkge1xuICAgIHRoaXMub2JuaXouaW8uYW5pbWF0aW9uKHRoaXMuaWRlbnRpZmllciwgXCJyZXN1bWVcIik7XG4gIH1cblxuICBwdWJsaWMgb2ZmKCkge1xuICAgIHRoaXMub2JuaXouaW8uYW5pbWF0aW9uKHRoaXMuaWRlbnRpZmllciwgXCJwYXVzZVwiKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuc2VnbWVudHNbaV0ub2ZmKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IF83U2VnbWVudExFREFycmF5O1xuIl19
