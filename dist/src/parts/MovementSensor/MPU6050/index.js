"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class MPU6050 {
    constructor() {
        this.keys = [
            "gnd",
            "vcc",
            "sda",
            "scl",
            "i2c",
            "address",
            "accelerometer_range",
            "gyroscope_range",
        ];
        this.required = [];
    }
    static info() {
        return {
            name: "MPU6050",
        };
    }
    wired(obniz) {
        this.obniz = obniz;
        obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
        this.params.clock = 100000;
        this.params.pull = "3v";
        this.params.mode = "master";
        this._address = this.params.address || 0x68;
        this.i2c = obniz.getI2CWithConfig(this.params);
        this.setConfig(this.params.accelerometer_range || 2, this.params.gyroscope_range || 250);
    }
    setConfig(accelerometer_range, gyroscope_range) {
        // accel range set (0x00:2g, 0x08:4g, 0x10:8g, 0x18:16g)
        switch (accelerometer_range) {
            case 2:
                this.i2c.write(this._address, [0x1c, 0x00]);
                break;
            case 4:
                this.i2c.write(this._address, [0x1c, 0x08]);
                break;
            case 8:
                this.i2c.write(this._address, [0x1c, 0x10]);
                break;
            case 16:
                this.i2c.write(this._address, [0x1c, 0x18]);
                break;
            default:
                throw new Error("accel_range variable 2,4,8,16 setting");
        }
        // gyro range & LPF set (0x00:250, 0x08:500, 0x10:1000, 0x18:2000[deg/s])
        switch (gyroscope_range) {
            case 250:
                this.i2c.write(this._address, [0x1b, 0x00]);
                break;
            case 500:
                this.i2c.write(this._address, [0x1b, 0x08]);
                break;
            case 1000:
                this.i2c.write(this._address, [0x1b, 0x10]);
                break;
            case 2000:
                this.i2c.write(this._address, [0x1b, 0x18]);
                break;
            default:
                throw new Error("accel_range variable 250,500,1000,2000 setting");
        }
        this._accel_range = accelerometer_range;
        this._gyro_range = gyroscope_range;
    }
    getWait() {
        return __awaiter(this, void 0, void 0, function* () {
            this.i2c.write(this._address, [0x3b]); // request MPU6050 data
            const raw_data_MPU6050 = yield this.i2c.readWait(this._address, 14); // read 14byte
            const ac_scale = this._accel_range / 32768;
            const gy_scale = this._gyro_range / 32768;
            return {
                accelerometer: {
                    x: this.char2short(raw_data_MPU6050[0], raw_data_MPU6050[1]) * ac_scale,
                    y: this.char2short(raw_data_MPU6050[2], raw_data_MPU6050[3]) * ac_scale,
                    z: this.char2short(raw_data_MPU6050[4], raw_data_MPU6050[5]) * ac_scale,
                },
                temp: this.char2short(raw_data_MPU6050[6], raw_data_MPU6050[7]) / 333.87 + 21,
                gyroscope: {
                    x: this.char2short(raw_data_MPU6050[8], raw_data_MPU6050[9]) * gy_scale,
                    y: this.char2short(raw_data_MPU6050[10], raw_data_MPU6050[11]) *
                        gy_scale,
                    z: this.char2short(raw_data_MPU6050[12], raw_data_MPU6050[13]) *
                        gy_scale,
                },
            };
        });
    }
    char2short(valueH, valueL) {
        const buffer = new ArrayBuffer(2);
        const dv = new DataView(buffer);
        dv.setUint8(0, valueH);
        dv.setUint8(1, valueL);
        return dv.getInt16(0, false);
    }
}
exports.default = MPU6050;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXJ0cy9Nb3ZlbWVudFNlbnNvci9NUFU2MDUwL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsTUFBTSxPQUFPO0lBaUJYO1FBQ0UsSUFBSSxDQUFDLElBQUksR0FBRztZQUNWLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsU0FBUztZQUNULHFCQUFxQjtZQUNyQixpQkFBaUI7U0FDbEIsQ0FBQztRQUNGLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUEzQk0sTUFBTSxDQUFDLElBQUk7UUFDaEIsT0FBTztZQUNMLElBQUksRUFBRSxTQUFTO1NBQ2hCLENBQUM7SUFDSixDQUFDO0lBeUJNLEtBQUssQ0FBQyxLQUFVO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7UUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUM7UUFDNUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxTQUFTLENBQ1osSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLEVBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJ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QyIsImZpbGUiOiJzcmMvcGFydHMvTW92ZW1lbnRTZW5zb3IvTVBVNjA1MC9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNsYXNzIE1QVTYwNTAge1xuXG4gIHB1YmxpYyBzdGF0aWMgaW5mbygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogXCJNUFU2MDUwXCIsXG4gICAgfTtcbiAgfVxuXG4gIHB1YmxpYyBrZXlzOiBhbnk7XG4gIHB1YmxpYyByZXF1aXJlZDogYW55O1xuICBwdWJsaWMgb2JuaXo6IGFueTtcbiAgcHVibGljIHBhcmFtczogYW55O1xuICBwdWJsaWMgX2FkZHJlc3M6IGFueTtcbiAgcHVibGljIGkyYzogYW55O1xuICBwdWJsaWMgX2FjY2VsX3JhbmdlOiBhbnk7XG4gIHB1YmxpYyBfZ3lyb19yYW5nZTogYW55O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMua2V5cyA9IFtcbiAgICAgIFwiZ25kXCIsXG4gICAgICBcInZjY1wiLFxuICAgICAgXCJzZGFcIixcbiAgICAgIFwic2NsXCIsXG4gICAgICBcImkyY1wiLFxuICAgICAgXCJhZGRyZXNzXCIsXG4gICAgICBcImFjY2VsZXJvbWV0ZXJfcmFuZ2VcIixcbiAgICAgIFwiZ3lyb3Njb3BlX3JhbmdlXCIsXG4gICAgXTtcbiAgICB0aGlzLnJlcXVpcmVkID0gW107XG4gIH1cblxuICBwdWJsaWMgd2lyZWQob2JuaXo6IGFueSkge1xuICAgIHRoaXMub2JuaXogPSBvYm5pejtcbiAgICBvYm5pei5zZXRWY2NHbmQodGhpcy5wYXJhbXMudmNjLCB0aGlzLnBhcmFtcy5nbmQsIFwiNXZcIik7XG4gICAgdGhpcy5wYXJhbXMuY2xvY2sgPSAxMDAwMDA7XG4gICAgdGhpcy5wYXJhbXMucHVsbCA9IFwiM3ZcIjtcbiAgICB0aGlzLnBhcmFtcy5tb2RlID0gXCJtYXN0ZXJcIjtcbiAgICB0aGlzLl9hZGRyZXNzID0gdGhpcy5wYXJhbXMuYWRkcmVzcyB8fCAweDY4O1xuICAgIHRoaXMuaTJjID0gb2JuaXouZ2V0STJDV2l0aENvbmZpZyh0aGlzLnBhcmFtcyk7XG4gICAgdGhpcy5zZXRDb25maWcoXG4gICAgICB0aGlzLnBhcmFtcy5hY2NlbGVyb21ldGVyX3JhbmdlIHx8IDIsXG4gICAgICB0aGlzLnBhcmFtcy5neXJvc2NvcGVfcmFuZ2UgfHwgMjUwLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgc2V0Q29uZmlnKGFjY2VsZXJvbWV0ZXJfcmFuZ2U6IGFueSwgZ3lyb3Njb3BlX3JhbmdlOiBhbnkpIHtcbiAgICAvLyBhY2NlbCByYW5nZSBzZXQgKDB4MDA6MmcsIDB4MDg6NGcsIDB4MTA6OGcsIDB4MTg6MTZnKVxuICAgIHN3aXRjaCAoYWNjZWxlcm9tZXRlcl9yYW5nZSkge1xuICAgICAgY2FzZSAyOlxuICAgICAgICB0aGlzLmkyYy53cml0ZSh0aGlzLl9hZGRyZXNzLCBbMHgxYywgMHgwMF0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgdGhpcy5pMmMud3JpdGUodGhpcy5fYWRkcmVzcywgWzB4MWMsIDB4MDhdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDg6XG4gICAgICAgIHRoaXMuaTJjLndyaXRlKHRoaXMuX2FkZHJlc3MsIFsweDFjLCAweDEwXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAxNjpcbiAgICAgICAgdGhpcy5pMmMud3JpdGUodGhpcy5fYWRkcmVzcywgWzB4MWMsIDB4MThdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJhY2NlbF9yYW5nZSB2YXJpYWJsZSAyLDQsOCwxNiBzZXR0aW5nXCIpO1xuICAgIH1cbiAgICAvLyBneXJvIHJhbmdlICYgTFBGIHNldCAoMHgwMDoyNTAsIDB4MDg6NTAwLCAweDEwOjEwMDAsIDB4MTg6MjAwMFtkZWcvc10pXG4gICAgc3dpdGNoIChneXJvc2NvcGVfcmFuZ2UpIHtcbiAgICAgIGNhc2UgMjUwOlxuICAgICAgICB0aGlzLmkyYy53cml0ZSh0aGlzLl9hZGRyZXNzLCBbMHgxYiwgMHgwMF0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNTAwOlxuICAgICAgICB0aGlzLmkyYy53cml0ZSh0aGlzLl9hZGRyZXNzLCBbMHgxYiwgMHgwOF0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTAwMDpcbiAgICAgICAgdGhpcy5pMmMud3JpdGUodGhpcy5fYWRkcmVzcywgWzB4MWIsIDB4MTBdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDIwMDA6XG4gICAgICAgIHRoaXMuaTJjLndyaXRlKHRoaXMuX2FkZHJlc3MsIFsweDFiLCAweDE4XSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYWNjZWxfcmFuZ2UgdmFyaWFibGUgMjUwLDUwMCwxMDAwLDIwMDAgc2V0dGluZ1wiKTtcbiAgICB9XG4gICAgdGhpcy5fYWNjZWxfcmFuZ2UgPSBhY2NlbGVyb21ldGVyX3JhbmdlO1xuICAgIHRoaXMuX2d5cm9fcmFuZ2UgPSBneXJvc2NvcGVfcmFuZ2U7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZ2V0V2FpdCgpIHtcbiAgICB0aGlzLmkyYy53cml0ZSh0aGlzLl9hZGRyZXNzLCBbMHgzYl0pOyAvLyByZXF1ZXN0IE1QVTYwNTAgZGF0YVxuICAgIGNvbnN0IHJhd19kYXRhX01QVTYwNTA6IGFueSA9IGF3YWl0IHRoaXMuaTJjLnJlYWRXYWl0KHRoaXMuX2FkZHJlc3MsIDE0KTsgLy8gcmVhZCAxNGJ5dGVcbiAgICBjb25zdCBhY19zY2FsZTogYW55ID0gdGhpcy5fYWNjZWxfcmFuZ2UgLyAzMjc2ODtcbiAgICBjb25zdCBneV9zY2FsZTogYW55ID0gdGhpcy5fZ3lyb19yYW5nZSAvIDMyNzY4O1xuICAgIHJldHVybiB7XG4gICAgICBhY2NlbGVyb21ldGVyOiB7XG4gICAgICAgIHg6IHRoaXMuY2hhcjJzaG9ydChyYXdfZGF0YV9NUFU2MDUwWzBdLCByYXdfZGF0YV9NUFU2MDUwWzFdKSAqIGFjX3NjYWxlLFxuICAgICAgICB5OiB0aGlzLmNoYXIyc2hvcnQocmF3X2RhdGFfTVBVNjA1MFsyXSwgcmF3X2RhdGFfTVBVNjA1MFszXSkgKiBhY19zY2FsZSxcbiAgICAgICAgejogdGhpcy5jaGFyMnNob3J0KHJhd19kYXRhX01QVTYwNTBbNF0sIHJhd19kYXRhX01QVTYwNTBbNV0pICogYWNfc2NhbGUsXG4gICAgICB9LFxuICAgICAgdGVtcDpcbiAgICAgICAgdGhpcy5jaGFyMnNob3J0KHJhd19kYXRhX01QVTYwNTBbNl0sIHJhd19kYXRhX01QVTYwNTBbN10pIC8gMzMzLjg3ICsgMjEsXG4gICAgICBneXJvc2NvcGU6IHtcbiAgICAgICAgeDogdGhpcy5jaGFyMnNob3J0KHJhd19kYXRhX01QVTYwNTBbOF0sIHJhd19kYXRhX01QVTYwNTBbOV0pICogZ3lfc2NhbGUsXG4gICAgICAgIHk6XG4gICAgICAgICAgdGhpcy5jaGFyMnNob3J0KHJhd19kYXRhX01QVTYwNTBbMTBdLCByYXdfZGF0YV9NUFU2MDUwWzExXSkgKlxuICAgICAgICAgIGd5X3NjYWxlLFxuICAgICAgICB6OlxuICAgICAgICAgIHRoaXMuY2hhcjJzaG9ydChyYXdfZGF0YV9NUFU2MDUwWzEyXSwgcmF3X2RhdGFfTVBVNjA1MFsxM10pICpcbiAgICAgICAgICBneV9zY2FsZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHB1YmxpYyBjaGFyMnNob3J0KHZhbHVlSDogYW55LCB2YWx1ZUw6IGFueSkge1xuICAgIGNvbnN0IGJ1ZmZlcjogYW55ID0gbmV3IEFycmF5QnVmZmVyKDIpO1xuICAgIGNvbnN0IGR2OiBhbnkgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcbiAgICBkdi5zZXRVaW50OCgwLCB2YWx1ZUgpO1xuICAgIGR2LnNldFVpbnQ4KDEsIHZhbHVlTCk7XG4gICAgcmV0dXJuIGR2LmdldEludDE2KDAsIGZhbHNlKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNUFU2MDUwO1xuIl19
