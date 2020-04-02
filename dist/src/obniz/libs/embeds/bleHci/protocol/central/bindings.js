"use strict";
/**
 * @packageDocumentation
 *
 * @ignore
 */
// var debug = require('debug')('bindings');
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const ObnizError_1 = require("../../../../../ObnizError");
const hci_1 = __importDefault(require("../hci"));
const acl_stream_1 = __importDefault(require("./acl-stream"));
const gap_1 = __importDefault(require("./gap"));
const gatt_1 = __importDefault(require("./gatt"));
const signaling_1 = __importDefault(require("./signaling"));
/**
 * @ignore
 */
class NobleBindings extends eventemitter3_1.default {
    constructor(hciProtocol) {
        super();
        this._state = null;
        this._addresses = {};
        this._addresseTypes = {};
        this._connectable = {};
        this._connectPromises = [];
        this._handles = {};
        this._gatts = {};
        this._aclStreams = {};
        this._signalings = {};
        this._hci = hciProtocol;
        this._gap = new gap_1.default(this._hci);
    }
    async startScanningWait(serviceUuids, allowDuplicates, activeScan) {
        this._scanServiceUuids = serviceUuids || [];
        await this._gap.startScanningWait(allowDuplicates, activeScan);
    }
    async stopScanningWait() {
        await this._gap.stopScanningWait();
    }
    connectWait(peripheralUuid) {
        const address = this._addresses[peripheralUuid];
        const addressType = this._addresseTypes[peripheralUuid];
        const doPromise = Promise.all(this._connectPromises)
            .then(() => {
            return this._hci.createLeConnWait(address, addressType);
        })
            .then((result) => {
            return this.onLeConnComplete(result.status, result.handle, result.role, result.addressType, result.address, result.interval, result.latency, result.supervisionTimeout, result.masterClockAccuracy);
        })
            .finally(() => {
            this._connectPromises = this._connectPromises.filter((e) => e === doPromise);
        });
        this._connectPromises.push(doPromise);
        return doPromise;
    }
    disconnect(peripheralUuid) {
        this._hci.disconnect(this._handles[peripheralUuid]);
    }
    async updateRssiWait(peripheralUuid) {
        const rssi = await this._hci.readRssiWait(this._handles[peripheralUuid]);
        return rssi;
    }
    init() {
        this._gap.on("scanStart", this.onScanStart.bind(this));
        this._gap.on("scanStop", this.onScanStop.bind(this));
        this._gap.on("discover", this.onDiscover.bind(this));
        this._hci.on("stateChange", this.onStateChange.bind(this));
        this._hci.on("disconnComplete", this.onDisconnComplete.bind(this));
        this._hci.on("encryptChange", this.onEncryptChange.bind(this));
        this._hci.on("aclDataPkt", this.onAclDataPkt.bind(this));
    }
    onStateChange(state) {
        if (this._state === state) {
            return;
        }
        this._state = state;
        if (state === "unauthorized") {
            console.log("noble warning: adapter state unauthorized, please run as root or with sudo");
            console.log("               or see README for information on running without root/sudo:");
            console.log("               https://github.com/sandeepmistry/noble#running-on-linux");
        }
        else if (state === "unsupported") {
            console.log("noble warning: adapter does not support Bluetooth Low Energy (BLE, Bluetooth Smart).");
            console.log("               Try to run with environment variable:");
            console.log("               [sudo] NOBLE_HCI_DEVICE_ID=x node ...");
        }
        this.emit("stateChange", state);
    }
    onScanStart(filterDuplicates) {
        this.emit("scanStart", filterDuplicates);
    }
    onScanStop() {
        this.emit("scanStop");
    }
    onDiscover(status, address, addressType, connectable, advertisement, rssi) {
        if (this._scanServiceUuids === undefined) {
            return;
        }
        let serviceUuids = advertisement.serviceUuids || [];
        const serviceData = advertisement.serviceData || [];
        let hasScanServiceUuids = this._scanServiceUuids.length === 0;
        if (!hasScanServiceUuids) {
            let i;
            serviceUuids = serviceUuids.slice();
            for (i in serviceData) {
                serviceUuids.push(serviceData[i].uuid);
            }
            for (i in serviceUuids) {
                hasScanServiceUuids = this._scanServiceUuids.indexOf(serviceUuids[i]) !== -1;
                if (hasScanServiceUuids) {
                    break;
                }
            }
        }
        if (hasScanServiceUuids) {
            const uuid = address.split(":").join("");
            this._addresses[uuid] = address;
            this._addresseTypes[uuid] = addressType;
            this._connectable[uuid] = connectable;
            this.emit("discover", uuid, address, addressType, connectable, advertisement, rssi);
        }
    }
    async onLeConnComplete(status, handle, role, addressType, address, interval, latency, supervisionTimeout, masterClockAccuracy) {
        if (role !== 0) {
            // not master, ignore
            return;
        }
        let uuid = null;
        const error = null;
        if (status === 0) {
            uuid = address
                .split(":")
                .join("")
                .toLowerCase();
            const aclStream = new acl_stream_1.default(this._hci, handle, this._hci.addressType, this._hci.address, addressType, address);
            const gatt = new gatt_1.default(address, aclStream);
            const signaling = new signaling_1.default(handle, aclStream);
            this._gatts[uuid] = this._gatts[handle] = gatt;
            this._signalings[uuid] = this._signalings[handle] = signaling;
            this._aclStreams[handle] = aclStream;
            this._handles[uuid] = handle;
            this._handles[handle] = uuid;
            this._gatts[handle].on("servicesDiscover", this.onServicesDiscovered.bind(this));
            this._gatts[handle].on("includedServicesDiscover", this.onIncludedServicesDiscovered.bind(this));
            this._gatts[handle].on("characteristicsDiscover", this.onCharacteristicsDiscovered.bind(this));
            this._gatts[handle].on("read", this.onRead.bind(this));
            this._gatts[handle].on("write", this.onWrite.bind(this));
            this._gatts[handle].on("broadcast", this.onBroadcast.bind(this));
            this._gatts[handle].on("notify", this.onNotify.bind(this));
            this._gatts[handle].on("notification", this.onNotification.bind(this));
            this._gatts[handle].on("descriptorsDiscover", this.onDescriptorsDiscovered.bind(this));
            this._gatts[handle].on("valueRead", this.onValueRead.bind(this));
            this._gatts[handle].on("valueWrite", this.onValueWrite.bind(this));
            this._gatts[handle].on("handleRead", this.onHandleRead.bind(this));
            this._gatts[handle].on("handleWrite", this.onHandleWrite.bind(this));
            this._gatts[handle].on("handleNotify", this.onHandleNotify.bind(this));
            this._signalings[handle].on("connectionParameterUpdateRequest", this.onConnectionParameterUpdateWait.bind(this));
            await this._gatts[handle].exchangeMtuWait(256);
            // public onMtu(address: any, mtu?: any) {}
        }
        else {
            let statusMessage = hci_1.default.STATUS_MAPPER[status] || "HCI Error: Unknown";
            const errorCode = " (0x" + status.toString(16) + ")";
            statusMessage = statusMessage + errorCode;
            throw new Error(statusMessage);
        }
        this.emit("connect", uuid, error);
    }
    onDisconnComplete(handle, reason) {
        const uuid = this._handles[handle];
        if (uuid) {
            this._gatts[handle].removeAllListeners();
            this._signalings[handle].removeAllListeners();
            delete this._gatts[uuid];
            delete this._gatts[handle];
            delete this._signalings[uuid];
            delete this._signalings[handle];
            delete this._aclStreams[handle];
            delete this._handles[uuid];
            delete this._handles[handle];
            this.emit("disconnect", uuid); // TODO: handle reason?
        }
        else {
            // maybe disconnect as peripheral
            // console.warn(
            //   'noble warning: unknown handle ' + handle + ' disconnected!'
            // );
        }
    }
    onEncryptChange(handle, encrypt) {
        const aclStream = this._aclStreams[handle];
        if (aclStream) {
            aclStream.pushEncrypt(encrypt);
        }
    }
    onAclDataPkt(handle, cid, data) {
        const aclStream = this._aclStreams[handle];
        if (aclStream) {
            aclStream.push(cid, data);
        }
    }
    async discoverServicesWait(peripheralUuid, uuids) {
        const gatt = this.getGatt(peripheralUuid);
        const services = await gatt.discoverServicesWait(uuids || []);
        return services;
    }
    onServicesDiscovered(address, serviceUuids) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("servicesDiscover", uuid, serviceUuids);
    }
    async discoverIncludedServicesWait(peripheralUuid, serviceUuid, serviceUuids) {
        const gatt = this.getGatt(peripheralUuid);
        const services = gatt.discoverIncludedServicesWait(serviceUuid, serviceUuids || []);
        return services;
    }
    onIncludedServicesDiscovered(address, serviceUuid, includedServiceUuids) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("includedServicesDiscover", uuid, serviceUuid, includedServiceUuids);
    }
    async discoverCharacteristicsWait(peripheralUuid, serviceUuid, characteristicUuids) {
        const gatt = this.getGatt(peripheralUuid);
        const uuids = await gatt.discoverCharacteristicsWait(serviceUuid, characteristicUuids || []);
        return uuids;
    }
    onCharacteristicsDiscovered(address, serviceUuid, characteristics) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("characteristicsDiscover", uuid, serviceUuid, characteristics);
    }
    async readWait(peripheralUuid, serviceUuid, characteristicUuid) {
        const gatt = this.getGatt(peripheralUuid);
        const data = await gatt.readWait(serviceUuid, characteristicUuid);
        return data;
    }
    onRead(address, serviceUuid, characteristicUuid, data, isSuccess) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("read", uuid, serviceUuid, characteristicUuid, data, false, isSuccess);
    }
    async writeWait(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
        const gatt = this.getGatt(peripheralUuid);
        const resp = await gatt.writeWait(serviceUuid, characteristicUuid, data, withoutResponse);
    }
    onWrite(address, serviceUuid, characteristicUuid, isSuccess) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("write", uuid, serviceUuid, characteristicUuid, isSuccess);
    }
    async broadcastWait(peripheralUuid, serviceUuid, characteristicUuid, broadcast) {
        const gatt = this.getGatt(peripheralUuid);
        await gatt.broadcastWait(serviceUuid, characteristicUuid, broadcast);
    }
    onBroadcast(address, serviceUuid, characteristicUuid, state) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("broadcast", uuid, serviceUuid, characteristicUuid, state);
    }
    async notifyWait(peripheralUuid, serviceUuid, characteristicUuid, notify) {
        const gatt = this.getGatt(peripheralUuid);
        await gatt.notifyWait(serviceUuid, characteristicUuid, notify);
    }
    onNotify(address, serviceUuid, characteristicUuid, state) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("notify", uuid, serviceUuid, characteristicUuid, state);
    }
    onNotification(address, serviceUuid, characteristicUuid, data) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("read", uuid, serviceUuid, characteristicUuid, data, true, true);
    }
    async discoverDescriptorsWait(peripheralUuid, serviceUuid, characteristicUuid) {
        const gatt = this.getGatt(peripheralUuid);
        const uuids = await gatt.discoverDescriptorsWait(serviceUuid, characteristicUuid);
        return uuids;
    }
    onDescriptorsDiscovered(address, serviceUuid, characteristicUuid, descriptorUuids) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("descriptorsDiscover", uuid, serviceUuid, characteristicUuid, descriptorUuids);
    }
    async readValueWait(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid) {
        const gatt = this.getGatt(peripheralUuid);
        const resp = await gatt.readValueWait(serviceUuid, characteristicUuid, descriptorUuid);
        return resp;
    }
    onValueRead(address, serviceUuid, characteristicUuid, descriptorUuid, data, isSuccess) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("valueRead", uuid, serviceUuid, characteristicUuid, descriptorUuid, data, isSuccess);
    }
    async writeValueWait(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
        const gatt = this.getGatt(peripheralUuid);
        await gatt.writeValueWait(serviceUuid, characteristicUuid, descriptorUuid, data);
    }
    onValueWrite(address, serviceUuid, characteristicUuid, descriptorUuid, isSuccess) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("valueWrite", uuid, serviceUuid, characteristicUuid, descriptorUuid, isSuccess);
    }
    readHandle(peripheralUuid, attHandle) {
        const gatt = this.getGatt(peripheralUuid);
        gatt.readHandle(attHandle);
    }
    onHandleRead(address, handle, data) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("handleRead", uuid, handle, data);
    }
    async writeHandle(peripheralUuid, attHandle, data, withoutResponse) {
        const gatt = this.getGatt(peripheralUuid);
        await gatt.writeHandleWait(attHandle, data, withoutResponse);
    }
    onHandleWrite(address, handle) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("handleWrite", uuid, handle);
    }
    onHandleNotify(address, handle, data) {
        const uuid = address
            .split(":")
            .join("")
            .toLowerCase();
        this.emit("handleNotify", uuid, handle, data);
    }
    async onConnectionParameterUpdateWait(handle, minInterval, maxInterval, latency, supervisionTimeout) {
        await this._hci.connUpdateLeWait(handle, minInterval, maxInterval, latency, supervisionTimeout);
        // this.onLeConnUpdateComplete(); is nop
    }
    pairing(peripheralUuid, options, callback) {
        options = options || {};
        const gatt = this.getGatt(peripheralUuid);
        gatt.encrypt(callback, options);
    }
    getGatt(peripheralUuid) {
        const handle = this._handles[peripheralUuid];
        const gatt = this._gatts[handle];
        if (!gatt) {
            throw new ObnizError_1.ObnizBleUnknownPeripheralError(peripheralUuid);
        }
        return gatt;
    }
}
exports.default = NobleBindings;

//# sourceMappingURL=bindings.js.map
