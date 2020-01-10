"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// var debug = require('debug')('gap');
const debug = () => {
};
const events = require("events");
const os = require("os");
const Hci = require("../hci");
const isLinux = os.platform() === "linux";
const isIntelEdison = isLinux && os.release().indexOf("edison") !== -1;
const isYocto = isLinux && os.release().indexOf("yocto") !== -1;
class Gap extends events.EventEmitter {
    constructor(hci) {
        super();
        this._hci = hci;
        this._advertiseState = null;
        this._hci.on("error", this.onHciError.bind(this));
        this._hci.on("leAdvertisingParametersSet", this.onHciLeAdvertisingParametersSet.bind(this));
        this._hci.on("leAdvertisingDataSet", this.onHciLeAdvertisingDataSet.bind(this));
        this._hci.on("leScanResponseDataSet", this.onHciLeScanResponseDataSet.bind(this));
        this._hci.on("leAdvertiseEnableSet", this.onHciLeAdvertiseEnableSet.bind(this));
    }
    startAdvertising(name, serviceUuids) {
        debug("startAdvertising: name = " +
            name +
            ", serviceUuids = " +
            JSON.stringify(serviceUuids, null, 2));
        let advertisementDataLength = 3;
        let scanDataLength = 0;
        const serviceUuids16bit = [];
        const serviceUuids128bit = [];
        let i = 0;
        if (name && name.length) {
            scanDataLength += 2 + name.length;
        }
        if (serviceUuids && serviceUuids.length) {
            for (i = 0; i < serviceUuids.length; i++) {
                const serviceUuid = Buffer.from(serviceUuids[i]
                    .match(/.{1,2}/g)
                    .reverse()
                    .join(""), "hex");
                if (serviceUuid.length === 2) {
                    serviceUuids16bit.push(serviceUuid);
                }
                else if (serviceUuid.length === 16) {
                    serviceUuids128bit.push(serviceUuid);
                }
            }
        }
        if (serviceUuids16bit.length) {
            advertisementDataLength += 2 + 2 * serviceUuids16bit.length;
        }
        if (serviceUuids128bit.length) {
            advertisementDataLength += 2 + 16 * serviceUuids128bit.length;
        }
        const advertisementData = Buffer.alloc(advertisementDataLength);
        const scanData = Buffer.alloc(scanDataLength);
        // flags
        advertisementData.writeUInt8(2, 0);
        advertisementData.writeUInt8(0x01, 1);
        advertisementData.writeUInt8(0x06, 2);
        let advertisementDataOffset = 3;
        if (serviceUuids16bit.length) {
            advertisementData.writeUInt8(1 + 2 * serviceUuids16bit.length, advertisementDataOffset);
            advertisementDataOffset++;
            advertisementData.writeUInt8(0x03, advertisementDataOffset);
            advertisementDataOffset++;
            for (i = 0; i < serviceUuids16bit.length; i++) {
                serviceUuids16bit[i].copy(advertisementData, advertisementDataOffset);
                advertisementDataOffset += serviceUuids16bit[i].length;
            }
        }
        if (serviceUuids128bit.length) {
            advertisementData.writeUInt8(1 + 16 * serviceUuids128bit.length, advertisementDataOffset);
            advertisementDataOffset++;
            advertisementData.writeUInt8(0x06, advertisementDataOffset);
            advertisementDataOffset++;
            for (i = 0; i < serviceUuids128bit.length; i++) {
                serviceUuids128bit[i].copy(advertisementData, advertisementDataOffset);
                advertisementDataOffset += serviceUuids128bit[i].length;
            }
        }
        // name
        if (name && name.length) {
            const nameBuffer = Buffer.alloc(name);
            scanData.writeUInt8(1 + nameBuffer.length, 0);
            scanData.writeUInt8(0x08, 1);
            nameBuffer.copy(scanData, 2);
        }
        this.startAdvertisingWithEIRData(advertisementData, scanData);
    }
    startAdvertisingIBeacon(data) {
        debug("startAdvertisingIBeacon: data = " + data.toString("hex"));
        const dataLength = data.length;
        const manufacturerDataLength = 4 + dataLength;
        const advertisementDataLength = 5 + manufacturerDataLength;
        // let scanDataLength = 0;
        const advertisementData = Buffer.alloc(advertisementDataLength);
        const scanData = Buffer.alloc(0);
        // flags
        advertisementData.writeUInt8(2, 0);
        advertisementData.writeUInt8(0x01, 1);
        advertisementData.writeUInt8(0x06, 2);
        advertisementData.writeUInt8(manufacturerDataLength + 1, 3);
        advertisementData.writeUInt8(0xff, 4);
        advertisementData.writeUInt16LE(0x004c, 5); // Apple Company Identifier LE (16 bit)
        advertisementData.writeUInt8(0x02, 7); // type, 2 => iBeacon
        advertisementData.writeUInt8(dataLength, 8);
        data.copy(advertisementData, 9);
        this.startAdvertisingWithEIRData(advertisementData, scanData);
    }
    startAdvertisingWithEIRData(advertisementData, scanData) {
        advertisementData = advertisementData || Buffer.alloc(0);
        scanData = scanData || Buffer.alloc(0);
        debug("startAdvertisingWithEIRData: advertisement data = " +
            advertisementData.toString("hex") +
            ", scan data = " +
            scanData.toString("hex"));
        let error = null;
        if (advertisementData.length > 31) {
            error = new Error("Advertisement data is over maximum limit of 31 bytes");
        }
        else if (scanData.length > 31) {
            error = new Error("Scan data is over maximum limit of 31 bytes");
        }
        if (error) {
            this.emit("advertisingStart", error);
        }
        else {
            this._advertiseState = "starting";
            if (isIntelEdison || isYocto) {
                // work around for Intel Edison
                debug("skipping first set of scan response and advertisement data");
            }
            else {
                this._hci.setScanResponseData(scanData);
                this._hci.setAdvertisingData(advertisementData);
            }
            this._hci.setAdvertiseEnable(true);
            this._hci.setScanResponseData(scanData);
            this._hci.setAdvertisingData(advertisementData);
        }
    }
    restartAdvertising() {
        this._advertiseState = "restarting";
        this._hci.setAdvertiseEnable(true);
    }
    stopAdvertising() {
        this._advertiseState = "stopping";
        this._hci.setAdvertiseEnable(false);
    }
    onHciError(error) {
    }
    onHciLeAdvertisingParametersSet(status) {
    }
    onHciLeAdvertisingDataSet(status) {
    }
    onHciLeScanResponseDataSet(status) {
    }
    onHciLeAdvertiseEnableSet(status) {
        if (this._advertiseState === "starting") {
            this._advertiseState = "started";
            let error = null;
            if (status) {
                error = new Error(Hci.STATUS_MAPPER[status] || "Unknown (" + status + ")");
            }
            this.emit("advertisingStart", error);
        }
        else if (this._advertiseState === "stopping") {
            this._advertiseState = "stopped";
            this.emit("advertisingStop");
        }
    }
}
exports.default = Gap;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vYm5pei9saWJzL2VtYmVkcy9ibGVIY2kvcHJvdG9jb2wvcGVyaXBoZXJhbC9nYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBdUM7QUFDdkMsTUFBTSxLQUFLLEdBQVEsR0FBRyxFQUFFO0FBQ3hCLENBQUMsQ0FBQztBQUVGLE1BQU0sTUFBTSxHQUFRLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN0QyxNQUFNLEVBQUUsR0FBUSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFOUIsTUFBTSxHQUFHLEdBQVEsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRW5DLE1BQU0sT0FBTyxHQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxPQUFPLENBQUM7QUFDL0MsTUFBTSxhQUFhLEdBQVEsT0FBTyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDNUUsTUFBTSxPQUFPLEdBQVEsT0FBTyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFFckUsTUFBTSxHQUFJLFNBQVEsTUFBTSxDQUFDLFlBQVk7SUFLbkMsWUFBWSxHQUFRO1FBQ2xCLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7UUFFaEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFFNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ1YsNEJBQTRCLEVBQzVCLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ2hELENBQUM7UUFD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YSxDQUFDLE1BQU0sQ0FBQyxJQUFJLFdBQVcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUN4RCxDQUFDO2FBQ0g7WUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3RDO2FBQU0sSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLFVBQVUsRUFBRTtZQUM5QyxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQztZQUVqQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDOUI7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxrQkFBZSxHQUFHLENBQUMiLCJmaWxlIjoic3JjL29ibml6L2xpYnMvZW1iZWRzL2JsZUhjaS9wcm90b2NvbC9wZXJpcGhlcmFsL2dhcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2dhcCcpO1xuY29uc3QgZGVidWc6IGFueSA9ICgpID0+IHtcbn07XG5cbmNvbnN0IGV2ZW50czogYW55ID0gcmVxdWlyZShcImV2ZW50c1wiKTtcbmNvbnN0IG9zOiBhbnkgPSByZXF1aXJlKFwib3NcIik7XG5cbmNvbnN0IEhjaTogYW55ID0gcmVxdWlyZShcIi4uL2hjaVwiKTtcblxuY29uc3QgaXNMaW51eDogYW55ID0gb3MucGxhdGZvcm0oKSA9PT0gXCJsaW51eFwiO1xuY29uc3QgaXNJbnRlbEVkaXNvbjogYW55ID0gaXNMaW51eCAmJiBvcy5yZWxlYXNlKCkuaW5kZXhPZihcImVkaXNvblwiKSAhPT0gLTE7XG5jb25zdCBpc1lvY3RvOiBhbnkgPSBpc0xpbnV4ICYmIG9zLnJlbGVhc2UoKS5pbmRleE9mKFwieW9jdG9cIikgIT09IC0xO1xuXG5jbGFzcyBHYXAgZXh0ZW5kcyBldmVudHMuRXZlbnRFbWl0dGVyIHtcbiAgcHVibGljIF9oY2k6IGFueTtcbiAgcHVibGljIF9hZHZlcnRpc2VTdGF0ZTogYW55O1xuICBwdWJsaWMgZW1pdDogYW55O1xuXG4gIGNvbnN0cnVjdG9yKGhjaTogYW55KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLl9oY2kgPSBoY2k7XG5cbiAgICB0aGlzLl9hZHZlcnRpc2VTdGF0ZSA9IG51bGw7XG5cbiAgICB0aGlzLl9oY2kub24oXCJlcnJvclwiLCB0aGlzLm9uSGNpRXJyb3IuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9oY2kub24oXG4gICAgICBcImxlQWR2ZXJ0aXNpbmdQYXJhbWV0ZXJzU2V0XCIsXG4gICAgICB0aGlzLm9uSGNpTGVBZHZlcnRpc2luZ1BhcmFtZXRlcnNTZXQuYmluZCh0aGlzKSxcbiAgICApO1xuICAgIHRoaXMuX2hjaS5vbihcbiAgICAgIFwibGVBZHZlcnRpc2luZ0RhdGFTZXRcIixcbiAgICAgIHRoaXMub25IY2lMZUFkdmVydGlzaW5nRGF0YVNldC5iaW5kKHRoaXMpLFxuICAgICk7XG4gICAgdGhpcy5faGNpLm9uKFxuICAgICAgXCJsZVNjYW5SZXNwb25zZURhdGFTZXRcIixcbiAgICAgIHRoaXMub25IY2lMZVNjYW5SZXNwb25zZURhdGFTZXQuYmluZCh0aGlzKSxcbiAgICApO1xuICAgIHRoaXMuX2hjaS5vbihcbiAgICAgIFwibGVBZHZlcnRpc2VFbmFibGVTZXRcIixcbiAgICAgIHRoaXMub25IY2lMZUFkdmVydGlzZUVuYWJsZVNldC5iaW5kKHRoaXMpLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgc3RhcnRBZHZlcnRpc2luZyhuYW1lOiBhbnksIHNlcnZpY2VVdWlkczogYW55KSB7XG4gICAgZGVidWcoXG4gICAgICBcInN0YXJ0QWR2ZXJ0aXNpbmc6IG5hbWUgPSBcIiArXG4gICAgICBuYW1lICtcbiAgICAgIFwiLCBzZXJ2aWNlVXVpZHMgPSBcIiArXG4gICAgICBKU09OLnN0cmluZ2lmeShzZXJ2aWNlVXVpZHMsIG51bGwsIDIpLFxuICAgICk7XG5cbiAgICBsZXQgYWR2ZXJ0aXNlbWVudERhdGFMZW5ndGg6IGFueSA9IDM7XG4gICAgbGV0IHNjYW5EYXRhTGVuZ3RoOiBhbnkgPSAwO1xuXG4gICAgY29uc3Qgc2VydmljZVV1aWRzMTZiaXQ6IGFueSA9IFtdO1xuICAgIGNvbnN0IHNlcnZpY2VVdWlkczEyOGJpdDogYW55ID0gW107XG4gICAgbGV0IGk6IGFueSA9IDA7XG5cbiAgICBpZiAobmFtZSAmJiBuYW1lLmxlbmd0aCkge1xuICAgICAgc2NhbkRhdGFMZW5ndGggKz0gMiArIG5hbWUubGVuZ3RoO1xuICAgIH1cblxuICAgIGlmIChzZXJ2aWNlVXVpZHMgJiYgc2VydmljZVV1aWRzLmxlbmd0aCkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IHNlcnZpY2VVdWlkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBzZXJ2aWNlVXVpZDogYW55ID0gQnVmZmVyLmZyb20oXG4gICAgICAgICAgc2VydmljZVV1aWRzW2ldXG4gICAgICAgICAgICAubWF0Y2goLy57MSwyfS9nKVxuICAgICAgICAgICAgLnJldmVyc2UoKVxuICAgICAgICAgICAgLmpvaW4oXCJcIiksXG4gICAgICAgICAgXCJoZXhcIixcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoc2VydmljZVV1aWQubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgc2VydmljZVV1aWRzMTZiaXQucHVzaChzZXJ2aWNlVXVpZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2VydmljZVV1aWQubGVuZ3RoID09PSAxNikge1xuICAgICAgICAgIHNlcnZpY2VVdWlkczEyOGJpdC5wdXNoKHNlcnZpY2VVdWlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZXJ2aWNlVXVpZHMxNmJpdC5sZW5ndGgpIHtcbiAgICAgIGFkdmVydGlzZW1lbnREYXRhTGVuZ3RoICs9IDIgKyAyICogc2VydmljZVV1aWRzMTZiaXQubGVuZ3RoO1xuICAgIH1cblxuICAgIGlmIChzZXJ2aWNlVXVpZHMxMjhiaXQubGVuZ3RoKSB7XG4gICAgICBhZHZlcnRpc2VtZW50RGF0YUxlbmd0aCArPSAyICsgMTYgKiBzZXJ2aWNlVXVpZHMxMjhiaXQubGVuZ3RoO1xuICAgIH1cblxuICAgIGNvbnN0IGFkdmVydGlzZW1lbnREYXRhOiBhbnkgPSBCdWZmZXIuYWxsb2MoYWR2ZXJ0aXNlbWVudERhdGFMZW5ndGgpO1xuICAgIGNvbnN0IHNjYW5EYXRhOiBhbnkgPSBCdWZmZXIuYWxsb2Moc2NhbkRhdGFMZW5ndGgpO1xuXG4gICAgLy8gZmxhZ3NcbiAgICBhZHZlcnRpc2VtZW50RGF0YS53cml0ZVVJbnQ4KDIsIDApO1xuICAgIGFkdmVydGlzZW1lbnREYXRhLndyaXRlVUludDgoMHgwMSwgMSk7XG4gICAgYWR2ZXJ0aXNlbWVudERhdGEud3JpdGVVSW50OCgweDA2LCAyKTtcblxuICAgIGxldCBhZHZlcnRpc2VtZW50RGF0YU9mZnNldDogYW55ID0gMztcblxuICAgIGlmIChzZXJ2aWNlVXVpZHMxNmJpdC5sZW5ndGgpIHtcbiAgICAgIGFkdmVydGlzZW1lbnREYXRhLndyaXRlVUludDgoXG4gICAgICAgIDEgKyAyICogc2VydmljZVV1aWRzMTZiaXQubGVuZ3RoLFxuICAgICAgICBhZHZlcnRpc2VtZW50RGF0YU9mZnNldCxcbiAgICAgICk7XG4gICAgICBhZHZlcnRpc2VtZW50RGF0YU9mZnNldCsrO1xuXG4gICAgICBhZHZlcnRpc2VtZW50RGF0YS53cml0ZVVJbnQ4KDB4MDMsIGFkdmVydGlzZW1lbnREYXRhT2Zmc2V0KTtcbiAgICAgIGFkdmVydGlzZW1lbnREYXRhT2Zmc2V0Kys7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBzZXJ2aWNlVXVpZHMxNmJpdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBzZXJ2aWNlVXVpZHMxNmJpdFtpXS5jb3B5KGFkdmVydGlzZW1lbnREYXRhLCBhZHZlcnRpc2VtZW50RGF0YU9mZnNldCk7XG4gICAgICAgIGFkdmVydGlzZW1lbnREYXRhT2Zmc2V0ICs9IHNlcnZpY2VVdWlkczE2Yml0W2ldLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2VydmljZVV1aWRzMTI4Yml0Lmxlbmd0aCkge1xuICAgICAgYWR2ZXJ0aXNlbWVudERhdGEud3JpdGVVSW50OChcbiAgICAgICAgMSArIDE2ICogc2VydmljZVV1aWRzMTI4Yml0Lmxlbmd0aCxcbiAgICAgICAgYWR2ZXJ0aXNlbWVudERhdGFPZmZzZXQsXG4gICAgICApO1xuICAgICAgYWR2ZXJ0aXNlbWVudERhdGFPZmZzZXQrKztcblxuICAgICAgYWR2ZXJ0aXNlbWVudERhdGEud3JpdGVVSW50OCgweDA2LCBhZHZlcnRpc2VtZW50RGF0YU9mZnNldCk7XG4gICAgICBhZHZlcnRpc2VtZW50RGF0YU9mZnNldCsrO1xuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc2VydmljZVV1aWRzMTI4Yml0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHNlcnZpY2VVdWlkczEyOGJpdFtpXS5jb3B5KGFkdmVydGlzZW1lbnREYXRhLCBhZHZlcnRpc2VtZW50RGF0YU9mZnNldCk7XG4gICAgICAgIGFkdmVydGlzZW1lbnREYXRhT2Zmc2V0ICs9IHNlcnZpY2VVdWlkczEyOGJpdFtpXS5sZW5ndGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbmFtZVxuICAgIGlmIChuYW1lICYmIG5hbWUubGVuZ3RoKSB7XG4gICAgICBjb25zdCBuYW1lQnVmZmVyOiBhbnkgPSBCdWZmZXIuYWxsb2MobmFtZSk7XG5cbiAgICAgIHNjYW5EYXRhLndyaXRlVUludDgoMSArIG5hbWVCdWZmZXIubGVuZ3RoLCAwKTtcbiAgICAgIHNjYW5EYXRhLndyaXRlVUludDgoMHgwOCwgMSk7XG4gICAgICBuYW1lQnVmZmVyLmNvcHkoc2NhbkRhdGEsIDIpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRBZHZlcnRpc2luZ1dpdGhFSVJEYXRhKGFkdmVydGlzZW1lbnREYXRhLCBzY2FuRGF0YSk7XG4gIH1cblxuICBwdWJsaWMgc3RhcnRBZHZlcnRpc2luZ0lCZWFjb24oZGF0YTogYW55KSB7XG4gICAgZGVidWcoXCJzdGFydEFkdmVydGlzaW5nSUJlYWNvbjogZGF0YSA9IFwiICsgZGF0YS50b1N0cmluZyhcImhleFwiKSk7XG5cbiAgICBjb25zdCBkYXRhTGVuZ3RoOiBhbnkgPSBkYXRhLmxlbmd0aDtcbiAgICBjb25zdCBtYW51ZmFjdHVyZXJEYXRhTGVuZ3RoOiBhbnkgPSA0ICsgZGF0YUxlbmd0aDtcbiAgICBjb25zdCBhZHZlcnRpc2VtZW50RGF0YUxlbmd0aDogYW55ID0gNSArIG1hbnVmYWN0dXJlckRhdGFMZW5ndGg7XG4gICAgLy8gbGV0IHNjYW5EYXRhTGVuZ3RoID0gMDtcblxuICAgIGNvbnN0IGFkdmVydGlzZW1lbnREYXRhOiBhbnkgPSBCdWZmZXIuYWxsb2MoYWR2ZXJ0aXNlbWVudERhdGFMZW5ndGgpO1xuICAgIGNvbnN0IHNjYW5EYXRhOiBhbnkgPSBCdWZmZXIuYWxsb2MoMCk7XG5cbiAgICAvLyBmbGFnc1xuICAgIGFkdmVydGlzZW1lbnREYXRhLndyaXRlVUludDgoMiwgMCk7XG4gICAgYWR2ZXJ0aXNlbWVudERhdGEud3JpdGVVSW50OCgweDAxLCAxKTtcbiAgICBhZHZlcnRpc2VtZW50RGF0YS53cml0ZVVJbnQ4KDB4MDYsIDIpO1xuXG4gICAgYWR2ZXJ0aXNlbWVudERhdGEud3JpdGVVSW50OChtYW51ZmFjdHVyZXJEYXRhTGVuZ3RoICsgMSwgMyk7XG4gICAgYWR2ZXJ0aXNlbWVudERhdGEud3JpdGVVSW50OCgweGZmLCA0KTtcbiAgICBhZHZlcnRpc2VtZW50RGF0YS53cml0ZVVJbnQxNkxFKDB4MDA0YywgNSk7IC8vIEFwcGxlIENvbXBhbnkgSWRlbnRpZmllciBMRSAoMTYgYml0KVxuICAgIGFkdmVydGlzZW1lbnREYXRhLndyaXRlVUludDgoMHgwMiwgNyk7IC8vIHR5cGUsIDIgPT4gaUJlYWNvblxuICAgIGFkdmVydGlzZW1lbnREYXRhLndyaXRlVUludDgoZGF0YUxlbmd0aCwgOCk7XG5cbiAgICBkYXRhLmNvcHkoYWR2ZXJ0aXNlbWVudERhdGEsIDkpO1xuXG4gICAgdGhpcy5zdGFydEFkdmVydGlzaW5nV2l0aEVJUkRhdGEoYWR2ZXJ0aXNlbWVudERhdGEsIHNjYW5EYXRhKTtcbiAgfVxuXG4gIHB1YmxpYyBzdGFydEFkdmVydGlzaW5nV2l0aEVJUkRhdGEoYWR2ZXJ0aXNlbWVudERhdGE6IGFueSwgc2NhbkRhdGE6IGFueSkge1xuICAgIGFkdmVydGlzZW1lbnREYXRhID0gYWR2ZXJ0aXNlbWVudERhdGEgfHwgQnVmZmVyLmFsbG9jKDApO1xuICAgIHNjYW5EYXRhID0gc2NhbkRhdGEgfHwgQnVmZmVyLmFsbG9jKDApO1xuXG4gICAgZGVidWcoXG4gICAgICBcInN0YXJ0QWR2ZXJ0aXNpbmdXaXRoRUlSRGF0YTogYWR2ZXJ0aXNlbWVudCBkYXRhID0gXCIgK1xuICAgICAgYWR2ZXJ0aXNlbWVudERhdGEudG9TdHJpbmcoXCJoZXhcIikgK1xuICAgICAgXCIsIHNjYW4gZGF0YSA9IFwiICtcbiAgICAgIHNjYW5EYXRhLnRvU3RyaW5nKFwiaGV4XCIpLFxuICAgICk7XG5cbiAgICBsZXQgZXJyb3I6IGFueSA9IG51bGw7XG5cbiAgICBpZiAoYWR2ZXJ0aXNlbWVudERhdGEubGVuZ3RoID4gMzEpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFwiQWR2ZXJ0aXNlbWVudCBkYXRhIGlzIG92ZXIgbWF4aW11bSBsaW1pdCBvZiAzMSBieXRlc1wiKTtcbiAgICB9IGVsc2UgaWYgKHNjYW5EYXRhLmxlbmd0aCA+IDMxKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcIlNjYW4gZGF0YSBpcyBvdmVyIG1heGltdW0gbGltaXQgb2YgMzEgYnl0ZXNcIik7XG4gICAgfVxuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICB0aGlzLmVtaXQoXCJhZHZlcnRpc2luZ1N0YXJ0XCIsIGVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fYWR2ZXJ0aXNlU3RhdGUgPSBcInN0YXJ0aW5nXCI7XG5cbiAgICAgIGlmIChpc0ludGVsRWRpc29uIHx8IGlzWW9jdG8pIHtcbiAgICAgICAgLy8gd29yayBhcm91bmQgZm9yIEludGVsIEVkaXNvblxuICAgICAgICBkZWJ1ZyhcInNraXBwaW5nIGZpcnN0IHNldCBvZiBzY2FuIHJlc3BvbnNlIGFuZCBhZHZlcnRpc2VtZW50IGRhdGFcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9oY2kuc2V0U2NhblJlc3BvbnNlRGF0YShzY2FuRGF0YSk7XG4gICAgICAgIHRoaXMuX2hjaS5zZXRBZHZlcnRpc2luZ0RhdGEoYWR2ZXJ0aXNlbWVudERhdGEpO1xuICAgICAgfVxuICAgICAgdGhpcy5faGNpLnNldEFkdmVydGlzZUVuYWJsZSh0cnVlKTtcbiAgICAgIHRoaXMuX2hjaS5zZXRTY2FuUmVzcG9uc2VEYXRhKHNjYW5EYXRhKTtcbiAgICAgIHRoaXMuX2hjaS5zZXRBZHZlcnRpc2luZ0RhdGEoYWR2ZXJ0aXNlbWVudERhdGEpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyByZXN0YXJ0QWR2ZXJ0aXNpbmcoKSB7XG4gICAgdGhpcy5fYWR2ZXJ0aXNlU3RhdGUgPSBcInJlc3RhcnRpbmdcIjtcblxuICAgIHRoaXMuX2hjaS5zZXRBZHZlcnRpc2VFbmFibGUodHJ1ZSk7XG4gIH1cblxuICBwdWJsaWMgc3RvcEFkdmVydGlzaW5nKCkge1xuICAgIHRoaXMuX2FkdmVydGlzZVN0YXRlID0gXCJzdG9wcGluZ1wiO1xuXG4gICAgdGhpcy5faGNpLnNldEFkdmVydGlzZUVuYWJsZShmYWxzZSk7XG4gIH1cblxuICBwdWJsaWMgb25IY2lFcnJvcihlcnJvcjogYW55KSB7XG4gIH1cblxuICBwdWJsaWMgb25IY2lMZUFkdmVydGlzaW5nUGFyYW1ldGVyc1NldChzdGF0dXM6IGFueSkge1xuICB9XG5cbiAgcHVibGljIG9uSGNpTGVBZHZlcnRpc2luZ0RhdGFTZXQoc3RhdHVzOiBhbnkpIHtcbiAgfVxuXG4gIHB1YmxpYyBvbkhjaUxlU2NhblJlc3BvbnNlRGF0YVNldChzdGF0dXM6IGFueSkge1xuICB9XG5cbiAgcHVibGljIG9uSGNpTGVBZHZlcnRpc2VFbmFibGVTZXQoc3RhdHVzOiBhbnkpIHtcbiAgICBpZiAodGhpcy5fYWR2ZXJ0aXNlU3RhdGUgPT09IFwic3RhcnRpbmdcIikge1xuICAgICAgdGhpcy5fYWR2ZXJ0aXNlU3RhdGUgPSBcInN0YXJ0ZWRcIjtcblxuICAgICAgbGV0IGVycm9yOiBhbnkgPSBudWxsO1xuXG4gICAgICBpZiAoc3RhdHVzKSB7XG4gICAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAgIEhjaS5TVEFUVVNfTUFQUEVSW3N0YXR1c10gfHwgXCJVbmtub3duIChcIiArIHN0YXR1cyArIFwiKVwiLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmVtaXQoXCJhZHZlcnRpc2luZ1N0YXJ0XCIsIGVycm9yKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2FkdmVydGlzZVN0YXRlID09PSBcInN0b3BwaW5nXCIpIHtcbiAgICAgIHRoaXMuX2FkdmVydGlzZVN0YXRlID0gXCJzdG9wcGVkXCI7XG5cbiAgICAgIHRoaXMuZW1pdChcImFkdmVydGlzaW5nU3RvcFwiKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2FwO1xuIl19
