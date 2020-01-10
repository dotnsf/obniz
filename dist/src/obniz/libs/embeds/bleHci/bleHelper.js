"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BleHelper = {
    uuidFilter(uuid) {
        return uuid.toLowerCase().replace(/[^0-9abcdef]/g, "");
    },
    toCamelCase(str) {
        str = str.charAt(0).toLowerCase() + str.slice(1);
        return str.replace(/[-_](.)/g, (match, group1) => {
            return group1.toUpperCase();
        });
    },
    toSnakeCase(str) {
        const camel = this.toCamelCase(str);
        return camel.replace(/[A-Z]/g, (s) => {
            return "_" + s.charAt(0).toLowerCase();
        });
    },
};
exports.default = BleHelper;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vYm5pei9saWJzL2VtYmVkcy9ibGVIY2kvYmxlSGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsTUFBTSxTQUFTLEdBQVE7SUFDckIsVUFBVSxDQUFDLElBQVM7UUFDbEIsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsV0FBVyxDQUFDLEdBQVE7UUFDbEIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsS0FBVSxFQUFFLE1BQVcsRUFBRyxFQUFFO1lBQzFELE9BQU8sTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFdBQVcsQ0FBQyxHQUFRO1FBQ2xCLE1BQU0sS0FBSyxHQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQU0sRUFBRyxFQUFFO1lBQ3pDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0YsQ0FBQztBQUVGLGtCQUFlLFNBQVMsQ0FBQyIsImZpbGUiOiJzcmMvb2JuaXovbGlicy9lbWJlZHMvYmxlSGNpL2JsZUhlbHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IEJsZUhlbHBlcjogYW55ID0ge1xuICB1dWlkRmlsdGVyKHV1aWQ6IGFueSkge1xuICAgIHJldHVybiB1dWlkLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW14wLTlhYmNkZWZdL2csIFwiXCIpO1xuICB9LFxuXG4gIHRvQ2FtZWxDYXNlKHN0cjogYW55KSB7XG4gICAgc3RyID0gc3RyLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgc3RyLnNsaWNlKDEpO1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvWy1fXSguKS9nLCAobWF0Y2g6IGFueSwgZ3JvdXAxOiBhbnkgKSA9PiB7XG4gICAgICByZXR1cm4gZ3JvdXAxLnRvVXBwZXJDYXNlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgdG9TbmFrZUNhc2Uoc3RyOiBhbnkpIHtcbiAgICBjb25zdCBjYW1lbDogYW55ID0gdGhpcy50b0NhbWVsQ2FzZShzdHIpO1xuICAgIHJldHVybiBjYW1lbC5yZXBsYWNlKC9bQS1aXS9nLCAoczogYW55ICkgPT4ge1xuICAgICAgcmV0dXJuIFwiX1wiICsgcy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKTtcbiAgICB9KTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEJsZUhlbHBlcjtcbiJdfQ==
