"use strict";

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var _obniz_js_version = "0.1.25";
/* global showObnizDebugError */

var isNode = typeof window === 'undefined' ? true : false;

class Obniz {

  constructor(id, options) {
    this.isNode = isNode;
    if (this.isNode === false) {
      showOffLine();
    }
    this.apiversion = 1;
    this.id = id;
    this.socket = null;
    this.debugprint = false;
    this.debugs = [];

    this.bufferdAmoundWarnBytes = 100 * 1000; // 100k bytes

    this.init();

    if (!options) {
      options = {};
    }
    this.server_obnizio = options.obniz_server || "wss://obniz.io";
    this._access_token = options.access_token;

    if (!this.isValidObnizId(this.id)) {
      if (isNode) {
        this.error("invalid obniz id");
      } else {
        var filled = _ReadCookie("obniz-last-used") || "";
        this.prompt(filled, function (obnizid) {
          this.id = obnizid;
          this.wsconnect();
        }.bind(this));
      }
      return;
    }
    this.wsconnect();
  }

  isValidObnizId(str) {
    if (typeof str != "string" || str.length < 8) {
      return null;
    }
    str = str.replace("-", "");
    var id = parseInt(str);
    if (isNaN(id)) id = null;
    return id != null;
  }

  prompt(filled, callback) {
    var obnizid = prompt("Please enter obniz id", filled);
    if (!obnizid) {} else {
      callback(obnizid);
    }
  }

  wsOnOpen() {
    this.print_debug("ws connected");
    // wait for {ws:{ready:true}} object
  }

  wsOnMessage(data) {
    this.print_debug(data);
    var obj = {};
    if (typeof data === "string") {
      obj = JSON.parse(data);
    } else {
      return;
    }

    // notify messaging
    if (typeof obj.message === "object" && this.onmessage) {
      this.onmessage(obj.message.data, obj.message.from);
    }
    // debug
    if (typeof obj.debug === "object") {
      if (obj.debug.warning) {
        var msg = "Warning: " + obj.debug.warning;
        this.error(msg);
      }
      if (obj.debug.error) {
        var msg = "Error: " + obj.debug.error;
        this.error(msg);
      }
      if (this.ondebug) {
        this.ondebug(obj.debug);
      }
    }
    // ws command
    if (obj["ws"]) {
      this.handleWSCommand(obj["ws"]);
      return;
    }

    // notify
    var notifyHandlers = ["io", "uart", "spi", "i2c", "ad"];
    for (var handerIndex = 0; handerIndex < notifyHandlers.length; handerIndex++) {
      var i = -1;
      var peripheral = notifyHandlers[handerIndex];
      while (true) {
        i++;
        if (this[peripheral + "" + i] === undefined) {
          break;
        }
        var module_value = obj[peripheral + "" + i];
        if (module_value === undefined) continue;
        this[peripheral + "" + i].notified(module_value);
      }
    }
    var names = ["switch", "ble", "measure"];
    for (var i = 0; i < names.length; i++) {
      if (obj[names[i]]) {
        this[names[i]].notified(obj[names[i]]);
      }
    }
    if (obj.logic_analyzer) {
      this.logicAnalyzer.notified(obj.logic_analyzer);
    }
  }

  wsOnClose(event) {
    this.print_debug("closed");
    if (this.isNode === false) {
      showOffLine();
    }
    if (this.looper) {
      this.looper = null;
    }

    this.clearSocket(this.socket);
    setTimeout(function () {
      // always connect to mainserver if ws lost
      this.wsconnect();
    }.bind(this), 1000);
  }

  wsOnError(err) {
    console.log(err);
  }

  wsOnUnexpectedResponse(req, res) {
    let reconnectTime = 1000;
    if (res && res.statusCode == 404) {
      // obniz not online
      this.print_debug("obniz not online");
    } else {
      // servder error or someting
      reconnectTime = 5000;
      this.print_debug("invalid server response " + res ? res.statusCode : '');
    }
    this.clearSocket(this.socket);
    setTimeout(function () {
      // always connect to mainserver if ws lost
      this.wsconnect();
    }.bind(this), reconnectTime);
  }

  wsconnect(desired_server) {
    var server = this.server_obnizio;
    if (desired_server) {
      server = "" + desired_server;
    }
    if (this.socket) {
      this.socket.close();
      this.clearSocket(this.socket);
    }
    var url = server + "/obniz/" + this.id + "/ws/" + this.apiversion;
    if (_obniz_js_version) {
      url += "?obnizjs=" + _obniz_js_version;
    }
    if (this._access_token) {
      url += "&access_token=" + this._access_token;
    }
    this.print_debug("connecting to " + url);

    if (this.isNode) {
      const wsClient = require('ws');
      this.socket = new wsClient(url);
      this.socket.on('open', this.wsOnOpen.bind(this));
      this.socket.on('message', this.wsOnMessage.bind(this));
      this.socket.on('close', this.wsOnClose.bind(this));
      this.socket.on('error', this.wsOnError.bind(this));
      this.socket.on('unexpected-response', this.wsOnUnexpectedResponse.bind(this));
    } else {
      this.socket = new WebSocket(url);
      this.socket.onopen = this.wsOnOpen.bind(this);
      this.socket.onmessage = function (event) {
        this.wsOnMessage(event.data);
      }.bind(this);
      this.socket.onclose = this.wsOnClose.bind(this);
      this.socket.onerror = this.wsOnError.bind(this);
    }
  }

  clearSocket(socket) {
    if (this.isNode) {
      var shouldRemoveObservers = ['open', 'message', 'close', 'error'];
      for (var i = 0; i < shouldRemoveObservers.length; i++) {
        socket.removeAllListeners(shouldRemoveObservers[i]);
      }
    } else {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
    }
    this.socket = null;
  }

  close() {
    if (this.socket) {
      this.socket.close(1000, 'close');
      this.clearSocket(this.socket);
    }
  }

  wired(partsname) {
    var parts = new _parts[partsname]();
    if (!parts) {
      throw new Error("No such a parts [" + partsname + "] found");
      return;
    }
    var args = Array.from(arguments);
    args.shift();
    args.unshift(this);
    if (parts.keys) {
      if (parts.requiredKeys) {
        var err = ObnizUtil._requiredKeys(args[1], parts.requiredKeys);
        if (err) {
          throw new Error(partsname + " wired param '" + err + "' required, but not found ");
          return;
        }
      }
      parts.params = ObnizUtil._keyFilter(args[1], parts.keys);
    }
    parts.obniz = this;
    parts.wired.apply(parts, args);
    if (parts.keys || parts.ioKeys) {
      var keys = parts.ioKeys || parts.keys;
      var displayPartsName = parts.displayName || partsname;
      var ioNames = {};
      for (var index in keys) {
        var pinName = keys[index];
        var io = args[1][pinName];
        if (parts.displayIoNames && parts.displayIoNames[pinName]) {
          pinName = parts.displayIoNames[pinName];
        }
        ioNames[io] = pinName;
      }
      this.display.setPinNames(displayPartsName, ioNames);
    }
    return parts;
  }

  print_debug(str) {
    if (this.debugprint) {
      console.log("Obniz: " + str);
    }
  }

  send(value) {
    if (this.sendPool) {
      this.sendPool.push(value);
      return;
    }
    if (typeof value === "object") {
      value = JSON.stringify(value);
    }
    this.print_debug("send: " + value);
    this.socket.send(value);

    if (this.socket.bufferedAmount > this.bufferdAmoundWarnBytes) {
      this.error('Warning: over ' + this.socket.bufferedAmount + ' bytes queued');
    }
  }

  init() {
    this.io = new PeripheralIO_(this);
    for (var i = 0; i < 12; i++) {
      this["io" + i] = new PeripheralIO(this, i);
    }
    for (var i = 0; i < 12; i++) {
      this["ad" + i] = new PeripheralAD(this, i);
    }
    for (var i = 0; i < 2; i++) {
      this["uart" + i] = new PeripheralUART(this, i);
    }
    for (var i = 0; i < 1; i++) {
      this["spi" + i] = new PeripheralSPI(this, i);
    }
    for (var i = 0; i < 1; i++) {
      this["i2c" + i] = new PeripheralI2C(this, i);
    }
    for (var i = 0; i < 6; i++) {
      this["pwm" + i] = new PeripheralPWM(this, i);
    }

    this.display = new Display(this);
    this.switch = new ObnizSwitch(this);
    this.logicAnalyzer = new LogicAnalyzer(this);
    this.ble = new ObnizBLE(this);
    this.measure = new ObnizMeasure(this);

    this.util = new ObnizUtil(this);
  }

  isValidIO(io) {
    return typeof io === "number" && io >= 0 && io < 12;
  }

  setVccGnd(vcc, gnd, drive) {
    if (this.isValidIO(vcc)) {
      if (drive) {
        this.getIO(vcc).drive(drive);
      }
      this.getIO(vcc).output(true);
    };

    if (this.isValidIO(gnd)) {
      if (drive) {
        this.getIO(gnd).drive(drive);
      }
      this.getIO(gnd).output(false);
    };
  }

  getIO(id) {
    return this["io" + id];
  }

  getAD(id) {
    return this["ad" + id];
  }

  getFreePwm() {
    var i = 0;
    while (true) {
      var pwm = this["pwm" + i];
      if (!pwm) {
        break;
      }
      if (!pwm.isUsed()) {
        pwm.used = true;
        return pwm;
      }
      i++;
    }
    throw new Error("No More PWM Available. max = " + i);
  }

  getFreeI2C() {
    var i = 0;
    while (true) {
      var i2c = this["i2c" + i];
      if (!i2c) {
        break;
      }
      if (!i2c.isUsed()) {
        i2c.used = true;
        return i2c;
      }
      i++;
    }
    throw new Error("No More I2C Available. max = " + i);
  }

  getI2CWithConfig(config) {
    if (typeof config !== "object") {
      throw new Error("getI2CWithConfig need config arg");
    }
    if (config.i2c) {
      return config.i2c;
    }
    var i2c = this.getFreeI2C();
    i2c.start(config);
    return i2c;
  }

  getFreeSpi() {
    var i = 0;
    while (true) {
      var spi = this["spi" + i];
      if (!spi) {
        break;
      }
      if (!spi.isUsed()) {
        spi.used = true;
        return spi;
      }
      i++;
    }
    throw new Error("No More SPI Available. max = " + i);
  }

  getSpiWithConfig(config) {
    if (typeof config !== "object") {
      throw new Error("getSpiWithConfig need config arg");
    }
    if (config.spi) {
      return config.spi;
    }
    var spi = this.getFreeSpi();
    spi.start(config);
    return spi;
  }

  getFreeUart() {
    var i = 0;
    while (true) {
      var uart = this["uart" + i];
      if (!uart) {
        break;
      }
      if (!uart.isUsed()) {
        uart.used = true;
        return uart;
      }
      i++;
    }
    throw new Error("No More uart Available. max = " + i);
  }

  handleWSCommand(wsObj) {
    // ready
    if (wsObj.ready) {

      this.resetOnDisconnect(true);
      if (this.isNode === false) {
        showOnLine();
      }
      if (this.onconnect) {
        this.onconnect(this);
      }
    }
    if (wsObj.redirect) {
      var server = wsObj.redirect;
      this.print_debug("WS connection changed to " + server);
      this.close();
      this.wsconnect(server);
    }
  }

  message(target, message) {
    var targets = [];
    if (typeof target === "string") {
      targets.push(target);
    } else {
      targets = target;
    }
    this.send({
      message: {
        to: targets,
        data: message
      }
    });
  }

  // --- System ---


  repeat(callback, interval) {
    let loop = (() => {
      var _ref = _asyncToGenerator(function* () {
        if (typeof self.looper === "function") {
          yield self.looper();
          setTimeout(loop, interval);
        }
      });

      return function loop() {
        return _ref.apply(this, arguments);
      };
    })();

    if (this.looper) {
      this.looper = callback;
      return;
    }
    this.looper = callback;
    var self = this;
    if (!interval) interval = 100;

    loop();
  }

  wait(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
  }

  reset() {
    this.send({ system: { reset: true } });this.init();
  }
  selfCheck() {
    this.send({ system: { self_check: true } });
  }
  freeze(msec) {
    this.send({ system: { wait: msec } });
  }
  keepWorkingAtOffline(working) {
    this.send({ system: { keep_working_at_offline: working } });
  }
  resetOnDisconnect(reset) {
    this.send({ ws: { reset_obniz_on_ws_disconnection: reset } });
  }

  warning(msg) {
    if (this.isNode) {
      console.error(msg);
    } else {
      if (msg && typeof msg === "object" && msg.alert) {
        this.showAlertUI(msg);
        console.log(msg.message);
        return;
      }
      if (typeof showObnizDebugError === "function") {
        showObnizDebugError(new Error(msg));
      } else {
        throw new Error(msg);
      }
    }
  }

  error(msg) {
    if (this.isNode) {
      console.error(msg);
    } else {
      if (msg && typeof msg === "object" && msg.alert) {
        this.showAlertUI(msg);
        msg = msg.message;
      }
      if (typeof showObnizDebugError === "function") {
        showObnizDebugError(new Error(msg));
      } else {
        throw new Error(msg);
      }
    }
  }

  showAlertUI(obj) {
    if (this.isNode || !document.getElementById('obniz-debug')) {
      return;
    }
    const alerts = {
      warning: 'alert-warning alert-dismissible',
      error: 'alert-danger'
    };
    const timeLabel = Math.random().toString(36).slice(-8);
    let dismissButton = `
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>`;
    let dom = `
    <div class="alert ${alerts[obj.alert]} fade show" role="alert">
      ${obj.message}
      ${obj.alert == "warning" ? dismissButton : ""}
    </div>`;
    document.getElementById('obniz-debug').insertAdjacentHTML('beforeend', dom);
  }
}

/*===================*/
/* Parts */
/*===================*/
var _parts = {};

var PartsRegistrate = function (name, obj) {
  _parts[name] = obj;
};

var Parts = function (name) {
  return new _parts[name]();
};

/*===================*/
/* Utils */
/*===================*/
function _ReadCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}

if (!isNode) {

  if (window && window.parent && window.parent.userAppLoaded) {
    window.parent.userAppLoaded(window);
  }

  function showOnLine() {
    if (typeof jQuery !== 'undefined') {
      $('#loader').hide();
      if ($('#obniz-debug #online-status').length == 0) {
        $('#obniz-debug').prepend('<div id="online-status"></div>');
      }
      $('#online-status').text('online');
      $('#online-status').css({ "background-color": "#449d44", "color": "#FFF", "padding": "5px", "text-align": "center" });
    }
  }
  function showOffLine() {
    if (typeof jQuery !== 'undefined') {
      $('#loader').show();
      if ($('#obniz-debug #online-status').length == 0) {
        $('#obniz-debug').prepend('<div id="online-status"></div>');
      }
      $('#online-status').text('offline');
      $('#online-status').css({ "background-color": "#d9534f", "color": "#FFF", "padding": "5px", "text-align": "center" });
    }
  }
  function showObnizDebugError(err) {
    if (window.parent && window.parent.logger) {
      window.parent.logger.addErrorObject(err);
    } else {
      throw err;
    };
  }
}

/*===================*/
/* Export */
/*===================*/
if (isNode) {
  module.exports = Obniz;
}

class ObnizBLE {
  constructor(Obniz) {
    this.Obniz = Obniz;
    this.remotePeripherals = [];
    this.adv_data = [];
    this.scan_resp = [];

    this.service = BleService;
    this.characteristic = BleCharacteristic;
    this.descriptor = BleDescriptor;
    this.peripheral = new BlePeripheral(Obniz);
  }

  startAdvertisement() {
    var obj = {};
    obj["ble"] = {};
    obj["ble"]["advertisement"] = {
      adv_data: this.adv_data
    };

    if (this.scan_resp.length > 0) {
      obj["ble"]["advertisement"]["scan_resp"] = this.scan_resp;
    }

    this.Obniz.send(obj);
    return;
  }

  stopAdvertisement() {
    var obj = {};
    obj["ble"] = {};
    obj["ble"]["advertisement"] = null;
    this.Obniz.send(obj);
    return;
  }

  setAdvDataRaw(adv_data) {
    var obj = {};
    this.adv_data = adv_data;
    return;
  }

  setAdvData(json) {
    var builder = this.advDataBulider(json);
    this.setAdvDataRaw(builder.build());
    return;
  }

  dataBuliderPrototype() {

    var builder = function (Obniz, json) {
      this.Obniz = Obniz;
      this.rows = {};

      if (json) {
        if (json.localName) {
          this.setCompleteLocalName(json.localName);
        }
        if (json.manufacturerData && json.manufacturerData.campanyCode && json.manufacturerData.data) {
          this.setManufacturerSpecificData(json.manufacturerData.campanyCode, json.manufacturerData.data);
        }
        if (json.serviceUuids) {
          for (var key in json.serviceUuids) {
            this.setUuid(json.serviceUuids[key]);
          }
        }
      }
      if (typeof this.extendEvalJson === "function") {
        this.extendEvalJson(json);
      }
    };
    builder.prototype.setRow = function (type, data) {
      this.rows[type] = data;
    };
    builder.prototype.getRow = function (type) {
      return this.rows[type] || [];
    };

    builder.prototype.check = function () {
      return true;
    };

    builder.prototype.build = function () {
      if (!this.check) {
        return;
      }
      var data = [];
      for (var key in this.rows) {
        if (this.rows[key].length === 0) continue;

        data.push(this.rows[key].length + 1);
        data.push(parseInt(key));
        Array.prototype.push.apply(data, this.rows[key]);
      }
      if (data.length > 31) {
        this.Obniz.error("Too more data. Advertise/ScanResponse data are must be less than 32 byte.");
      }

      return data;
    };

    builder.prototype.setStringData = function (type, string) {
      var data = [];

      for (var i = 0; i < string.length; i++) {
        data.push(string.charCodeAt(i));
      }

      this.setRow(type, data);
    };

    builder.prototype.setShortenedLocalName = function (name) {
      this.setStringData(0x08, name);
    };
    builder.prototype.setCompleteLocalName = function (name) {
      this.setStringData(0x09, name);
    };

    builder.prototype.setManufacturerSpecificData = function (campanyCode, data) {
      var row = [];
      row.push(campanyCode & 0xFF);
      row.push(campanyCode >> 8 & 0xFF);
      Array.prototype.push.apply(row, data);
      this.setRow(0xFF, row);
    };

    builder.prototype.setUuid = function (uuid) {
      var uuidData = this.convertUuid(uuid);
      var type = { 16: 0x06, 4: 0x04, 2: 0x02 }[uuidData.length];
      this.setRow(type, uuidData);
    };

    builder.prototype.convertUuid = function (uuid) {
      var uuidNumeric = uuid.toLowerCase().replace(/[^0-9abcdef]/g, '');
      if (uuidNumeric.length !== 32 && uuidNumeric.length !== 8 && uuidNumeric.length !== 4) {
        this.Obniz.error("BLE uuid must be 16/32/128 bit . (example: c28f0ad5-a7fd-48be-9fd0-eae9ffd3a8bb for 128bit)");
      }

      var data = [];
      for (var i = uuidNumeric.length; i > 1; i -= 2) {
        data.push(parseInt(uuidNumeric[i - 2] + uuidNumeric[i - 1], 16));
      }
      return data;
    };

    builder.prototype.setIbeaconData = function (uuid, major, minor, txPower) {
      var data = [];
      data.push(0x02, 0x15); // fixed data

      var uuidData = this.convertUuid(uuid);
      Array.prototype.push.apply(data, uuidData);

      data.push(major >> 8 & 0xFF);
      data.push(major >> 0 & 0xFF);
      data.push(minor >> 8 & 0xFF);
      data.push(minor >> 0 & 0xFF);
      data.push(txPower >> 0 & 0xFF);

      this.setManufacturerSpecificData(0x004c, data);
      return;
    };

    return builder;
  }

  advDataBulider(jsonVal) {
    var builder = this.dataBuliderPrototype();

    builder.prototype.check = function () {

      return true;
    };

    builder.prototype.extendEvalJson = function (json) {
      if (json) {
        if (json.flags) {
          if (json.flags.includes("limited_discoverable_mode")) this.setLeLimitedDiscoverableModeFlag();
          if (json.flags.includes("general_discoverable_mode")) this.setLeGeneralDiscoverableModeFlag();
          if (json.flags.includes("br_edr_not_supported")) this.setBrEdrNotSupportedFlag();
          if (json.flags.includes("le_br_edr_controller")) this.setLeBrEdrControllerFlag();
          if (json.flags.includes("le_br_edr_host")) this.setLeBrEdrHostFlag();
        }
      }
    };

    builder.prototype.setFlags = function (flag) {
      var data = this.getRow(0x01);
      data[0] = (data[0] || 0) | flag;
      this.setRow(0x01, data);
    };
    builder.prototype.setLeLimitedDiscoverableModeFlag = function () {
      this.setFlags(0x01);
    };
    builder.prototype.setLeGeneralDiscoverableModeFlag = function () {
      this.setFlags(0x02);
    };
    builder.prototype.setBrEdrNotSupportedFlag = function () {
      this.setFlags(0x04);
    };
    builder.prototype.setLeBrEdrControllerFlag = function () {
      this.setFlags(0x08);
    };
    builder.prototype.setLeBrEdrHostFlag = function () {
      this.setFlags(0x10);
    };

    return new builder(this.Obniz, jsonVal);
  }

  scanRespDataBuilder(json) {
    var builder = this.dataBuliderPrototype();
    return new builder(this.Obniz, json);
  }

  setScanRespDataRaw(scan_resp) {
    this.scan_resp = scan_resp;
  }

  setScanRespData(json) {
    this.setScanRespDataRaw(this.scanRespDataBuilder(json).build());
  }

  startScan(settings) {
    var obj = {};
    obj["ble"] = {};
    obj["ble"]["scan"] = {
      //    "targetUuid" : settings && settings.targetUuid ? settings.targetUuid : null,
      //    "interval" : settings && settings.interval ? settings.interval : 30,
      "duration": settings && settings.duration ? settings.duration : 30

    };

    this.remotePeripherals = [];

    this.Obniz.send(obj);
    return;
  }

  stopScan() {
    var obj = {};
    obj["ble"] = {};
    obj["ble"]["scan"] = null;
    this.Obniz.send(obj);
  }

  findPeripheral(address) {
    for (var key in this.remotePeripherals) {
      if (this.remotePeripherals[key].address === address) {
        return this.remotePeripherals[key];
      }
    }
    return null;
  }

  notified(obj) {
    if (obj.scan_results) {
      var isFinished = false;
      for (var id in obj.scan_results) {

        if (obj.scan_results[id].event_type === "inquiry_complete") {
          isFinished = true;
        } else if (obj.scan_results[id].event_type === "inquiry_result") {
          var val = new BleRemotePeripheral(this.Obniz, obj.scan_results[id].address);
          val.setParams(obj.scan_results[id]);
          this.remotePeripherals.push(val);
          if (this.onscan) {
            this.onscan(val);
          }
        }
      }
      if (isFinished && this.onscanfinish) {
        this.onscanfinish(this.remotePeripherals);
      }
    }

    if (obj.status_updates) {
      obj.status_updates.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          if (params.status === "connected") {
            p.notify("onconnect");
          }
          if (params.status === "disconnected") {
            p.notify("ondisconnect");
          }
        }
      }, this);
    }

    if (obj.get_service_results) {
      obj.get_service_results.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("ondiscoverservice", params.service_uuid);
        }
      }, this);
    }
    if (obj.get_characteristic_results) {
      obj.get_characteristic_results.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("ondiscovercharacteristic", params.service_uuid, params.characteristic_uuid);
        }
      }, this);
    }
    if (obj.write_characteristic_results) {
      obj.write_characteristic_results.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("onwritecharacteristic", params.service_uuid, params.characteristic_uuid, null, params.result);
        }
      }, this);
    }

    if (obj.read_characteristic_results) {
      obj.read_characteristic_results.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("onreadcharacteristic", params.service_uuid, params.characteristic_uuid, null, params.data);
        }
      }, this);
    }
    if (obj.get_descriptors_results) {
      obj.get_descriptors_results.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("ondiscoverdescriptor", params.service_uuid, params.characteristic_uuid, params.descriptor_uuid);
        }
      }, this);
    }
    if (obj.read_descriptor_results) {
      obj.read_descriptor_results.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("onreaddescriptor", params.service_uuid, params.characteristic_uuid, params.descriptor_uuid, params.data);
        }
      }, this);
    }
    if (obj.write_descriptor_results) {
      obj.write_descriptor_results.map(function (params) {
        if (!params.address) return;
        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("onwritedescriptor", params.service_uuid, params.characteristic_uuid, params.descriptor_uuid, params.data);
        }
      }, this);
    }

    var callbackFunc = function (valueArray, func, type) {
      var obj = null;
      if (!valueArray) {
        return;
      }

      valueArray.map(function (val) {
        if (type === "service") {
          obj = this.peripheral.getService(val);
        } else if (type === "characteristic") {
          obj = this.peripheral.findCharacteristic(val);
        } else if (type === "descriptor") {
          obj = this.peripheral.findDescriptor(val);
        }
        func(val, obj);
      }, this);
    }.bind(this);

    if (obj.peripheral) {
      callbackFunc(obj.peripheral.connection_status, function (val) {
        this.peripheral.onconnectionupdates(val);
      }.bind(this));

      var paramList = {
        read_characteristic_results: { method: "onread", obj: "characteristic" },
        write_characteristic_results: { method: "onwrite", obj: "characteristic" },
        notify_read_characteristics: { method: "onreadfromremote", obj: "characteristic" },
        notify_write_characteristics: { method: "onwritefromremote", obj: "characteristic" },
        read_descriptor_results: { method: "onread", obj: "descriptor" },
        write_descriptor_results: { method: "onwrite", obj: "descriptor" },
        notify_read_descriptors: { method: "onreadfromremote", obj: "descriptor" },
        notify_write_descriptors: { method: "onwritefromremote", obj: "descriptor" }
      };

      for (var key in paramList) {
        callbackFunc(obj.peripheral[key], function (val, bleobj) {
          bleobj[paramList[key].method](val);
        }.bind(this), paramList[key].obj);
      }
    }

    if (obj.errors) {
      obj.errors.map(function (params) {
        if (!params.address) {
          if (typeof this.onerror === "function") {
            this.onerror(params);
          }
        }

        var p = this.findPeripheral(params.address);
        if (p) {
          p.notify("onerror", null, null, null, params);
        }
      }, this);
    }
  }
}

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * 
 * @param {type} rawData
 * @return {BlePeripheral}
 */

class BlePeripheral {

  constructor(Obniz) {
    this.Obniz = Obniz;
    this.services = [];
  }

  addService(obj) {
    if (!(obj instanceof BleService)) {
      obj = new BleService(obj);
    }
    this.services.push(obj);
    obj.peripheral = this;
    this.Obniz.send({ ble: { peripheral: { services: [obj] } } });
  }

  setJson(json) {
    if (json["services"]) {
      for (var key in json["services"]) {
        this.addService(json["services"][key]);
      }
    }
  }

  getService(uuid) {
    return this.services.filter(function (element) {
      return element.uuid === uuid;
    }).shift();
  }

  toJSON() {
    return {
      services: this.services
    };
  }

  onconnectionupdates() {}

  findCharacteristic(param) {
    var serviceUuid = param.service_uuid.toLowerCase();
    var characteristicUuid = param.characteristic_uuid.toLowerCase();
    var s = this.getService(serviceUuid);
    if (s) {
      var c = s.getCharacteristic(characteristicUuid);
      return c;
    }
    return null;
  }

  findDescriptor(param) {
    var descriptorUuid = param.descriptor_uuid.toLowerCase();
    var c = this.findCharacteristic(param);
    if (c) {
      var d = c.getDescriptor(descriptorUuid);
      return d;
    }
    return null;
  }

  end() {
    this.Obniz.send({ ble: { peripheral: null } });
  }
}

/**
 * 
 * @param {type} rawData
 * @return {BleServiuce}
 */
class BleService {

  constructor(obj) {
    this.characteristics = [];
    this.uuid = obj.uuid.toLowerCase();

    if (obj["characteristics"]) {
      for (var key in obj["characteristics"]) {
        this.addCharacteristic(obj["characteristics"][key]);
      }
    }
  }

  addCharacteristic(obj) {
    if (!(obj instanceof BleCharacteristic)) {
      obj = new BleCharacteristic(obj);
    }
    this.characteristics.push(obj);
    obj.service = this;
  }

  getCharacteristic(uuid) {
    return this.characteristics.filter(function (element) {
      return element.uuid.toLowerCase() === uuid.toLowerCase();
    }).shift();
  }

  toJSON() {
    return {
      uuid: this.uuid.toLowerCase(),
      characteristics: this.characteristics
    };
  }
}

/**
 * 
 * @param {type} rawData
 * @return {BleServiuce}
 */

class BleCharacteristic {

  constructor(obj) {
    this.descriptors = [];
    this.uuid = obj.uuid.toLowerCase();
    this.data = obj.data || null;
    if (!this.data && obj.text) {
      this.data = ObnizUtil.string2dataArray(obj.text);
    }
    if (!this.data && obj.value) {
      this.data = obj.value;
    }

    this.property = obj.property || [];
    if (!Array.isArray(this.property)) {
      this.property = [this.property];
    }

    if (obj["descriptors"]) {
      for (var key in obj["descriptors"]) {
        this.addDescriptor(obj["descriptors"][key]);
      }
    }
  }

  addDescriptor(obj) {
    if (!(obj instanceof BleDescriptor)) {
      obj = new BleDescriptor(obj);
    }
    this.descriptors.push(obj);
    obj.characteristic = this;
  }

  getDescriptor(uuid) {
    return this.descriptors.filter(function (element) {
      return element.uuid.toLowerCase() === uuid.toLowerCase();
    }).shift();
  }

  write(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    this.service.peripheral.Obniz.send({
      ble: {
        peripheral: {
          write_characteristic: {
            service_uuid: this.service.uuid.toLowerCase(),
            characteristic_uuid: this.uuid.toLowerCase(),
            data: data
          }
        }
      }
    });
  }

  read() {
    this.service.peripheral.Obniz.send({
      ble: {
        peripheral: {
          read_characteristic: {
            service_uuid: this.service.uuid.toLowerCase(),
            characteristic_uuid: this.uuid.toLowerCase()
          }
        }
      }
    });
  }
  onwrite() {}
  onread() {}
  onwritefromremote() {}
  onreadfromremote() {}

  toJSON() {
    var obj = {
      uuid: this.uuid.toLowerCase(),
      data: this.data,
      descriptors: this.descriptors
    };
    if (this.property.length > 0) {
      obj.property = this.property;
    }
    return obj;
  }
}

/**
 * 
 * @param {type} rawData
 * @return {BleServiuce}
 */
class BleDescriptor {

  constructor(obj) {
    this.descriptors = [];
    this.uuid = obj.uuid.toLowerCase();

    this.data = obj.data || null;
    if (!this.data && obj.text) {
      this.data = ObnizUtil.string2dataArray(obj.text);
    }
    if (!this.data && obj.value) {
      this.data = obj.value;
    }

    this.property = obj.property || [];
    if (!Array.isArray(this.property)) {
      this.property = [this.property];
    }
  }

  toJSON() {
    var obj = {
      uuid: this.uuid.toLowerCase(),
      data: this.data
    };
    if (this.property.length > 0) {
      obj.property = this.property;
    }
    return obj;
  }

  write(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    this.characteristic.service.peripheral.Obniz.send({
      ble: {
        peripheral: {
          write_descriptor: {
            service_uuid: this.characteristic.service.uuid.toLowerCase(),
            characteristic_uuid: this.characteristic.uuid.toLowerCase(),
            descriptor_uuid: this.uuid,
            data: data
          }
        }
      }
    });
  }

  read() {

    this.characteristic.service.peripheral.Obniz.send({
      ble: {
        peripheral: {
          read_descriptor: {
            service_uuid: this.characteristic.service.uuid.toLowerCase(),
            characteristic_uuid: this.characteristic.uuid.toLowerCase(),
            descriptor_uuid: this.uuid
          }
        }
      }
    });
  }

  onwrite() {}
  onread() {}
  onwritefromremote() {}
  onreadfromremote() {}
}
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * 
 * @param {type} rawData
 * @return {BleRemotePeripheral}
 */
class BleRemotePeripheral {

  constructor(Obniz, address) {
    this.Obniz = Obniz;
    this.address = address;

    this.keys = ["device_type", "address_type", "ble_event_type", "rssi", "adv_data", "scan_resp"];

    this.services = [];
  }

  /**
   * 
   * @return {String} json value
   */
  toString() {
    return JSON.stringify({
      id: this.id,
      address: this.address,
      addressType: this.addressType,
      connectable: this.connectable,
      advertisement: this.advertisement,
      rssi: this.rssi,
      state: this.state
    });
  }

  setParams(dic) {
    for (var key in dic) {
      if (this.keys.includes(key)) {
        this[key] = dic[key];
      }
    }
  }

  analyseAdvertisement() {
    if (!this.advertise_data_rows) {
      this.advertise_data_rows = [];
      if (this.adv_data) {
        for (var i = 0; i < this.adv_data.length; i++) {
          var length = this.adv_data[i];
          var arr = new Array(length);
          for (var j = 0; j < length; j++) {
            arr[j] = this.adv_data[i + j + 1];
          }
          this.advertise_data_rows.push(arr);
          i = i + length;
        }
      }
      if (this.scan_resp) {

        for (var i = 0; i < this.scan_resp.length; i++) {
          var length = this.scan_resp[i];
          var arr = new Array(length);
          for (var j = 0; j < length; j++) {
            arr[j] = this.scan_resp[i + j + 1];
          }
          this.advertise_data_rows.push(arr);
          i = i + length;
        }
      }
    }
  }

  serarchTypeVal(type) {
    this.analyseAdvertisement();
    for (var i = 0; i < this.advertise_data_rows.length; i++) {
      if (this.advertise_data_rows[i][0] === type) {
        var results = [].concat(this.advertise_data_rows[i]);
        results.shift();
        return results;
      }
    }
    return undefined;
  }

  localName() {
    var data = this.serarchTypeVal(0x09);
    if (!data) {
      data = this.serarchTypeVal(0x08);
    }
    if (!data) return null;
    return String.fromCharCode.apply(null, data);
  }

  iBeacon() {
    var data = this.serarchTypeVal(0xFF);
    if (!data || data[0] !== 0x4c || data[1] !== 0x00 || data[2] !== 0x02 || data[3] !== 0x15 || data.length !== 25) return null;

    var uuidData = data.slice(4, 20);
    var uuid = "";
    for (var i = 0; i < uuidData.length; i++) {
      uuid = uuid + ('00' + uuidData[i].toString(16)).slice(-2);
      if (i === 4 - 1 || i === 4 + 2 - 1 || i === 4 + 2 * 2 - 1 || i === 4 + 2 * 3 - 1) {
        uuid += "-";
      }
    }

    var major = (data[20] << 8) + data[21];
    var minor = (data[22] << 8) + data[23];
    var power = data[24];

    return {
      uuid: uuid,
      major: major,
      minor: minor,
      power: power,
      rssi: this.rssi
    };
  }

  connect(callbacks) {
    var keys = ["onconnect", "ondisconnect"];
    this.setParams(keys, callbacks);

    var obj = {
      "ble": {
        "connect": {
          "address": this.address
        }
      }
    };
    this.Obniz.send(obj);
  }

  disconnect() {
    var obj = {
      "ble": {
        "disconnect": {
          "address": this.address
        }
      }
    };
    this.Obniz.send(obj);
  }

  updateRssi() {
    throw new Error("todo");
  }

  getService(uuid) {
    for (var key in this.services) {
      if (this.services[key].uuid === uuid) {
        return this.services[key];
      }
    }
    var newService = new BleRemoteService(this.Obniz, this, uuid);
    this.services.push(newService);
    return newService;
  }

  discoverAllServices() {
    var obj = {
      "ble": {
        "get_services": {
          "address": this.address
        }
      }
    };
    this.Obniz.send(obj);
  }

  onconnect() {}
  ondisconnect() {}
  ondiscoverservice(service) {}
  ondiscovercharacteristic(service, characteristic) {}
  onwritecharacteristic(service, characteristic, status) {}
  onreadcharacteristic(service, characteristic, value) {}
  ondiscoverdescriptor(service, characteristic, descriptor) {}
  onreaddescriptor(service, characteristic, descriptor, value) {}
  onwritedescriptor(service, characteristic, descriptor, value) {}
  onerror(err) {}

  notify(funcName, serviceUuid, characteristicUuid, descriptorUuid, param) {
    if (typeof this[funcName] === "function") {
      if (!serviceUuid) {
        this[funcName](param);
      } else {
        var service = this.getService(serviceUuid);
        if (!characteristicUuid) {
          this[funcName](service, param);
        } else {
          var characteristic = service.getCharacteristic(characteristicUuid);
          if (!descriptorUuid) {
            this[funcName](service, characteristic, param);
          } else {
            var descriptor = characteristic.getDescriptor(descriptorUuid);
            this[funcName](service, characteristic, descriptor, param);
          }
        }
      }
    }
  }
}

/**
 * 
 * @param {type} Obniz
 * @param {type} peripheral
 * @param {type} uuid
 * @return {BleRemoteService}
 */

class BleRemoteService {

  constructor(Obniz, peripheral, uuid) {
    this.Obniz = Obniz;
    this.uuid = uuid;
    this.peripheral = peripheral;

    this.characteristics = [];
  }

  toString() {
    return JSON.stringify({
      "address": this.peripheral.address,
      "service_uuid": this.uuid
    });
  }

  discoverAllCharacteristics() {
    var obj = {
      "ble": {
        "get_characteristics": {
          "address": this.peripheral.address,
          "service_uuid": this.uuid
        }
      }
    };
    this.Obniz.send(obj);
  }

  getCharacteristic(uuid) {

    for (var key in this.characteristics) {
      if (this.characteristics[key].uuid === uuid) {
        return this.characteristics[key];
      }
    }
    var newCharacteristic = new BleRemoteCharacteristic(this.Obniz, this, uuid);
    this.characteristics.push(newCharacteristic);
    return newCharacteristic;
  }
}

/**
 * 
 * @param {type} Obniz
 * @param {type} service
 * @param {type} uuid
 * @return {BleRemoteCharacteristic}
 */

class BleRemoteCharacteristic {

  constructor(Obniz, service, uuid) {
    this.Obniz = Obniz;
    this.service = service;
    this.uuid = uuid;
    this.descriptors = [];
  }

  toString() {
    return JSON.stringify({
      "address": this.service.peripheral.address,
      "service_uuid": this.service.uuid,
      "characteristic_uuid": this.uuid
    });
  }

  read() {
    var obj = {
      "ble": {
        "read_characteristic": {
          "address": this.service.peripheral.address,
          "service_uuid": this.service.uuid,
          "characteristic_uuid": this.uuid
        }
      }
    };
    this.Obniz.send(obj);
  }

  readWait() {
    return _asyncToGenerator(function* () {
      throw new Error("TODO");
    })();
  }

  write(array) {
    var obj = {
      "ble": {
        "write_characteristic": {
          "address": this.service.peripheral.address,
          "service_uuid": this.service.uuid,
          "characteristic_uuid": this.uuid,
          "data": array
        }
      }
    };
    this.Obniz.send(obj);
  }

  writeNumber(val) {
    var obj = {
      "ble": {
        "write_characteristic": {
          "address": this.service.peripheral.address,
          "service_uuid": this.service.uuid,
          "characteristic_uuid": this.uuid,
          "value": val
        }
      }
    };
    this.Obniz.send(obj);
  }

  writeText(str) {
    var obj = {
      "ble": {
        "write_characteristic": {
          "address": this.service.peripheral.address,
          "service_uuid": this.service.uuid,
          "characteristic_uuid": this.uuid,
          "text": str
        }
      }
    };
    this.Obniz.send(obj);
  }

  discoverAllDescriptors(str) {
    var obj = {
      "ble": {
        "get_descriptors": {
          "address": this.service.peripheral.address,
          "service_uuid": this.service.uuid,
          "characteristic_uuid": this.uuid
        }
      }
    };
    this.Obniz.send(obj);
  }

  getDescriptor(uuid) {
    for (var key in this.descriptors) {
      if (this.descriptors[key].uuid === uuid) {
        return this.descriptors[key];
      }
    }
    var newDescriptors = new BleRemoteDescriptor(this.Obniz, this, uuid);
    this.descriptors.push(newDescriptors);
    return newDescriptors;
  }
}

/**
 * 
 * @param {type} Obniz
 * @param {type} characteristic
 * @param {type} uuid
 * @return {BleRemoteCharacteristic}
 */

class BleRemoteDescriptor {
  constructor(Obniz, characteristic, uuid) {
    this.Obniz = Obniz;
    this.characteristic = characteristic;
    this.uuid = uuid;
  }

  toString() {
    return JSON.stringify({
      "address": this.characteristic.service.peripheral.address,
      "service_uuid": this.characteristic.service.uuid,
      "characteristic_uuid": this.characteristic.uuid,
      "descriptor_uuid": this.uuid
    });
  }

  read() {
    var obj = {
      "ble": {
        "read_descriptor": {
          "address": this.characteristic.service.peripheral.address,
          "service_uuid": this.characteristic.service.uuid,
          "characteristic_uuid": this.characteristic.uuid,
          "descriptor_uuid": this.uuid
        }
      }
    };
    this.Obniz.send(obj);
  }

  readWait() {
    return _asyncToGenerator(function* () {
      throw new Error("TODO");
    })();
  }

  write(array) {
    var obj = {
      "ble": {
        "write_descriptor": {
          "address": this.characteristic.service.peripheral.address,
          "service_uuid": this.characteristic.service.uuid,
          "characteristic_uuid": this.characteristic.uuid,
          "descriptor_uuid": this.uuid,
          "data": array
        }
      }
    };
    this.Obniz.send(obj);
  }
}

class Display {

  constructor(Obniz) {
    this.Obniz = Obniz;
    this.width = 128;
    this.height = 64;
  }

  clear() {
    var obj = {};
    obj["display"] = {
      clear: true
    };
    this.Obniz.send(obj);
  }

  print(text) {
    var obj = {};
    obj["display"] = {
      text: "" + text
    };
    this.Obniz.send(obj);
  }

  qr(text, correction) {
    var obj = {};
    obj["display"] = {
      qr: {
        text
      }
    };
    if (correction) {
      obj["display"].qr.correction = correction;
    }
    this.Obniz.send(obj);
  }

  raw(data) {
    var obj = {};
    obj["display"] = {
      raw: data
    };
    this.Obniz.send(obj);
  }

  setPinName(io, moduleName, funcName) {
    var obj = {};
    obj["display"] = {};
    obj["display"]["pin_assign"] = {};
    obj["display"]["pin_assign"][io] = { module_name: moduleName, pin_name: funcName };

    this.Obniz.send(obj);
  }

  setPinNames(moduleName, data) {
    var obj = {};
    obj["display"] = {};
    obj["display"]["pin_assign"] = {};
    for (var key in data) {
      obj["display"]["pin_assign"][key] = { module_name: moduleName, pin_name: data[key] };
    }

    this.Obniz.send(obj);
  }

  drawCanvasContext(ctx) {
    if (isNode) {
      // TODO:
      throw new Error("node js mode is under working.");
    } else {
      const stride = this.width / 8;
      let vram = new Array(stride * 64);
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        var brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        var index = parseInt(i / 4);
        var line = parseInt(index / this.width);
        var col = parseInt((index - line * this.width) / 8);
        var bits = parseInt(index - line * this.width) % 8;
        if (bits == 0) vram[line * stride + col] = 0x00;
        if (brightness > 0x7F) vram[line * stride + col] |= 0x80 >> bits;
      }
      this.raw(vram);
    }
  }
}

class ObnizSwitch {

  constructor(Obniz) {
    this.Obniz = Obniz;
    this.observers = [];
  }

  addObserver(callback) {
    if (callback) {
      this.observers.push(callback);
    }
  }

  getWait() {
    var self = this;
    return new Promise(function (resolve, reject) {
      var obj = {};
      obj["switch"] = "get";
      self.Obniz.send(obj);
      self.addObserver(resolve);
    });
  }

  notified(obj) {
    this.state = obj.state;
    if (this.onchange) {
      this.onchange(this.state);
    }
    var callback = this.observers.shift();
    if (callback) {
      callback(this.state);
    }
  }
}

class PeripheralAD {
  constructor(Obniz, id) {
    this.Obniz = Obniz;
    this.id = id;
    this.value = 0.0;
    this.observers = [];
  }

  addObserver(callback) {
    if (callback) {
      this.observers.push(callback);
    }
  }

  start(callback) {
    this.onchange = callback;
    var obj = {};
    obj["ad" + this.id] = {
      stream: true
    };
    this.Obniz.send(obj);
    return this.value;
  }

  getWait() {
    var self = this;
    return new Promise(function (resolve, reject) {
      var obj = {};
      obj["ad" + self.id] = {
        stream: false
      };
      self.Obniz.send(obj);
      self.addObserver(resolve);
    });
  }

  end() {
    this.onchange = null;
    var obj = {};
    obj["ad" + this.id] = null;
    this.Obniz.send(obj);
    return;
  }

  notified(obj) {
    this.value = obj;
    if (this.onchange) {
      this.onchange(obj);
    }
    var callback = this.observers.shift();
    if (callback) {
      callback(obj);
    }
  }
}

class PeripheralI2C {

  constructor(Obniz, id) {
    this.Obniz = Obniz;
    this.id = id;
    this.observers = [];
    this.state = {};
    this.used = false;

    this.onwritten = undefined;
  }

  addObserver(callback) {
    if (callback) {
      this.observers.push(callback);
    }
  }

  start(arg) {
    var err = ObnizUtil._requiredKeys(arg, ["mode", "sda", "scl"]);
    if (err) {
      throw new Error("I2C start param '" + err + "' required, but not found ");return;
    }
    this.state = ObnizUtil._keyFilter(arg, ["mode", "sda", "scl", "pull"]);

    var mode = this.state.mode;
    var clock = typeof arg.clock === "number" ? parseInt(arg.clock) : null;
    var slave_address = typeof arg.slave_address === "number" ? parseInt(arg.slave_address) : null;
    var slave_address_length = typeof arg.slave_address_length === "number" ? parseInt(arg.slave_address_length) : null;

    if (mode !== "master" && mode !== "slave") {
      throw new Error("i2c: invalid mode " + mode);
    }
    if (mode === "master") {
      if (clock === null) {
        throw new Error("i2c: please specify clock when master mode");
      }
      if (clock <= 0 || clock > 1 * 1000 * 1000) {
        throw new Error("i2c: invalid clock " + clock);
      }
      if (typeof arg.pull === "5v" && clock > 400 * 1000) {
        throw new Error("i2c: please use under 400khz when internal 5v internal pull-up");
      }
      if (typeof arg.pull === "3v" && clock > 100 * 1000) {
        throw new Error("i2c: please use under 100khz when internal 3v internal pull-up");
      }
    } else {
      if (slave_address === null) {
        throw new Error("i2c: please specify slave_address");
      }
      if (slave_address < 0 || slave_address > 0x3FFF) {
        throw new Error("i2c: invalid slave_address");
      }
      if (slave_address < 0 || slave_address > 0x3FFF) {
        throw new Error("i2c: invalid slave_address");
      }
      if (slave_address_length !== null && slave_address_length !== 7 && slave_address_length !== 10) {
        throw new Error("i2c: invalid slave_address_length. please specify 7 or 10");
      }
    }

    this.Obniz.getIO(this.state.sda).drive("open-drain");
    this.Obniz.getIO(this.state.scl).drive("open-drain");

    if (this.state.pull) {
      this.Obniz.getIO(this.state.sda).pull(this.state.pull);
      this.Obniz.getIO(this.state.scl).pull(this.state.pull);
    } else {
      this.Obniz.getIO(this.state.sda).pull(null);
      this.Obniz.getIO(this.state.scl).pull(null);
    }

    var startObj = ObnizUtil._keyFilter(this.state, ["mode", "sda", "scl"]);
    if (mode === "master") {
      startObj.clock = clock;
    } else {
      startObj.slave_address = slave_address;
      if (slave_address_length) {
        startObj.slave_address_length = slave_address_length;
      }
    }

    var obj = {};
    obj["i2c" + this.id] = startObj;
    this.used = true;
    this.Obniz.send(obj);
  }

  write(address, data) {
    address = parseInt(address);
    if (isNaN(address)) {
      throw new Error("i2c: please specify address");
    }
    if (address < 0 || address > 0x3FFF) {
      throw new Error("i2c: invalid address");
    }
    if (address > 0x7F) {
      address = address | 0x8000; // mark 10bit mode
    }
    if (!data) {
      throw new Error("i2c: please provide data");
    }
    if (data.length > 1024) {
      throw new Error("i2c: data should be under 1024 bytes");
    }
    var obj = {};
    obj["i2c" + this.id] = {
      address,
      data
    };
    this.Obniz.send(obj);
  }

  write10bit(address, data) {
    return this.write(address | 0x8000, data);
  }

  readWait(address, length) {
    address = parseInt(address);
    if (isNaN(address)) {
      throw new Error("i2c: please specify address");
    }
    if (address < 0 || address > 0x3FFF) {
      throw new Error("i2c: invalid address");
    }
    if (address > 0x7F) {
      address = address | 0x8000; // mark 10bit mode
    }
    length = parseInt(length);
    if (isNaN(length) || length < 0) {
      throw new Error("i2c: invalid length to read");
    }
    if (length > 1024) {
      throw new Error("i2c: data length should be under 1024 bytes");
    }
    var self = this;
    return new Promise(function (resolve, reject) {
      var obj = {};
      obj["i2c" + self.id] = {
        address,
        read: length
      };
      self.Obniz.send(obj);
      self.addObserver(resolve);
    });
  }

  read10bitWait(address, length) {
    return this.readWait(address | 0x8000, length);
  }

  notified(obj) {
    if (obj.mode === "slave" && typeof this.onwritten === "function") {
      this.onwritten(obj.data);
    } else {
      // TODO: we should compare byte length from sent
      var callback = this.observers.shift();
      if (callback) {
        callback(obj.data);
      }
    }
  }

  isUsed() {
    return this.used;
  }

  end() {
    this.state = {};
    var obj = {};
    obj["i2c" + this.id] = null;
    this.Obniz.send(obj);
    this.used = false;
  }
}

class PeripheralIO {

  constructor(Obniz, id) {
    this.Obniz = Obniz;
    this.id = id;
    this.value = 0;
    this.observers = [];
  }

  addObserver(callback) {
    if (callback) {
      this.observers.push(callback);
    }
  }

  output(value) {
    var obj = {};
    obj["io" + this.id] = value;
    this.value = value;
    this.Obniz.send(obj);
  }

  drive(drive) {
    if (typeof drive !== "string") {
      throw new Error("please specify drive methods in string");
      return;
    }
    let output_type = "";
    switch (drive) {
      case "5v":
        output_type = "push-pull5v";
        break;
      case "3v":
        output_type = "push-pull3v";
        break;
      case "open-drain":
        output_type = "open-drain";
        break;
      default:
        throw new Error("unknown drive method");
        break;
    }

    var obj = {};
    obj["io" + this.id] = {
      output_type: output_type
    };
    this.Obniz.send(obj);
  }

  pull(updown) {

    if (typeof updown !== "string" && updown !== null) {
      throw new Error("please specify pull methods in string");
      return;
    }
    let pull_type = "";
    switch (updown) {
      case "5v":
      case "pull-up5v":
        pull_type = "pull-up5v";
        break;
      case "3v":
      case "pull-up3v":
        pull_type = "pull-up3v";
        break;
      case "0v":
      case "pull-down":
        pull_type = "pull-down";
        break;
      case null:
      case "float":
        pull_type = "float";
        break;
      default:
        throw new Error("unknown pull_type method");
        break;
    }

    var obj = {};
    obj["io" + this.id] = {
      pull_type: pull_type
    };
    this.Obniz.send(obj);
  }

  input(callback) {
    this.onchange = callback;
    var obj = {};
    obj["io" + this.id] = {
      direction: "input",
      stream: true
    };
    this.Obniz.send(obj);
    return this.value;
  }

  inputWait() {
    var self = this;
    return new Promise(function (resolve, reject) {
      var obj = {};
      obj["io" + self.id] = {
        direction: "input",
        stream: false
      };
      self.Obniz.send(obj);
      self.addObserver(resolve);
    });
  }

  notified(obj) {
    if (typeof obj === "boolean") {
      this.value = obj;
      var callback = this.observers.shift();
      if (callback) {
        callback(obj);
      }
      if (typeof this.onchange === "function") {
        this.onchange(obj);
      }
    } else if (obj && typeof obj === "object") {
      if (obj.warnings) {
        for (let i = 0; i < obj.warnings.length; i++) {
          this.Obniz.warning({ alert: 'warning', message: `io${this.id}: ${obj.warnings[i].message}` });
        }
      }
      if (obj.errors) {
        for (let i = 0; i < obj.errors.length; i++) {
          this.Obniz.error({ alert: 'error', message: `io${this.id}: ${obj.errors[i].message}` });
        }
      }
    }
  }
}
class PeripheralIO_ {
  constructor(Obniz, id) {
    this.Obniz = Obniz;
  }

  animation(name, status, array) {
    var obj = {};
    obj.io = {
      animation: {
        name: name,
        status: status
      }
    };
    if (!array) array = [];

    let states = [];
    for (var i = 0; i < array.length; i++) {
      let state = array[i];
      let duration = state.duration;
      let func = state.state;

      // dry run. and get json commands
      this.Obniz.sendPool = [];
      func(i);
      let pooledJsonArray = this.Obniz.sendPool;
      this.Obniz.sendPool = null;

      // simply merge objects
      let merged = {};
      for (var index = 0; index < pooledJsonArray.length; index++) {
        for (let key in pooledJsonArray[index]) {
          merged[key] = pooledJsonArray[index][key];
        }
      }
      states.push({
        duration: duration,
        state: merged
      });
    }
    if (states.length > 0) {
      obj.io.animation.states = states;
    }
    //  console.log(obj.io.animation);
    this.Obniz.send(obj);
  }
}

class PeripheralPWM {
  constructor(Obniz, id) {
    this.Obniz = Obniz;
    this.id = id;
    this.state = {};
    this.used = false;
  }

  sendWS(obj) {
    var wsObj = {};
    wsObj["pwm" + this.id] = obj;
    this.Obniz.send(wsObj);
  }

  start(io) {
    var obj = {};
    this.state.io = io;
    this.sendWS({
      io: io
    });
    this.used = true;
  }

  freq(freq) {
    var obj = {};
    this.state.freq = freq;
    this.sendWS({
      freq: freq
    });
  }

  pulse(pulse_width) {
    var obj = {};
    this.state.pulse = pulse_width;
    this.sendWS({
      pulse: pulse_width
    });
  }

  duty(duty) {
    var obj = {};
    this.state.duty = duty;
    this.sendWS({
      duty: duty
    });
  }

  forceWorking(working) {
    var obj = {};
    this.state.forceWorking = working;
    this.sendWS({
      force_working: working
    });
  }

  isUsed() {
    return this.used;
  }

  end() {
    var obj = {};
    this.state = {};
    this.sendWS(null);
    this.used = false;
  }

  modulate(type, symbol_sec, data) {
    var obj = {};
    this.sendWS({
      modulate: {
        type: type,
        symbol_sec: symbol_sec,
        data: data
      }
    });
  }
}

class PeripheralSPI {
  constructor(Obniz, id) {
    this.Obniz = Obniz;
    this.id = id;
    this.observers = [];
    this.used = false;
  }

  addObserver(callback) {
    if (callback) {
      this.observers.push(callback);
    }
  }

  start(params) {

    var err = ObnizUtil._requiredKeys(params, ["mode", "frequency"]);
    if (err) {
      throw new Error("spi start param '" + err + "' required, but not found ");return;
    }
    this.params = ObnizUtil._keyFilter(params, ["mode", "clk", "mosi", "miso", "frequency", "drive", "pull"]);
    var obj = {};

    obj["spi" + this.id] = {
      mode: this.params.mode,
      clock: this.params.frequency //name different
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
      if (this.params.clk !== undefined) this.Obniz.getIO(this.params.clk).drive(this.params.drive);
      if (this.params.mosi !== undefined) this.Obniz.getIO(this.params.mosi).drive(this.params.drive);
      if (this.params.miso !== undefined) this.Obniz.getIO(this.params.miso).drive(this.params.drive);
    } else {
      if (this.params.clk !== undefined) this.Obniz.getIO(this.params.clk).drive("5v");
      if (this.params.mosi !== undefined) this.Obniz.getIO(this.params.mosi).drive("5v");
      if (this.params.miso !== undefined) this.Obniz.getIO(this.params.miso).drive("5v");
    }

    if (this.params.pull) {
      if (this.params.clk !== undefined) this.Obniz.getIO(this.params.clk).pull(this.params.pull);
      if (this.params.mosi !== undefined) this.Obniz.getIO(this.params.mosi).pull(this.params.pull);
      if (this.params.miso !== undefined) this.Obniz.getIO(this.params.miso).pull(this.params.pull);
    } else {
      if (this.params.clk !== undefined) this.Obniz.getIO(this.params.clk).pull(null);
      if (this.params.mosi !== undefined) this.Obniz.getIO(this.params.mosi).pull(null);
      if (this.params.miso !== undefined) this.Obniz.getIO(this.params.miso).pull(null);
    }

    this.used = true;
    this.Obniz.send(obj);
  }

  writeWait(data) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var obj = {};
      obj["spi" + self.id] = {
        data: data,
        read: true
      };
      self.Obniz.send(obj);
      self.addObserver(resolve);
    });
  }

  write(data) {
    var self = this;
    var obj = {};
    obj["spi" + self.id] = {
      data: data
    };
    self.Obniz.send(obj);
  }

  notified(obj) {
    // TODO: we should compare byte length from sent
    var callback = this.observers.shift();
    if (callback) {
      callback(obj.data);
    }
  }

  isUsed() {
    return this.used;
  }

  end(data) {
    var self = this;
    var obj = {};
    obj["spi" + self.id] = null;
    this.params = null;
    self.Obniz.send(obj);
    this.used = false;
  }
}

class PeripheralUART {
  constructor(Obniz, id) {
    this.Obniz = Obniz;
    this.id = id;
    this.received = new Uint8Array([]);
    this.used = false;
  }

  start(params) {

    var err = ObnizUtil._requiredKeys(params, ["tx", "rx"]);
    if (err) {
      throw new Error("uart start param '" + err + "' required, but not found ");return;
    }
    this.params = ObnizUtil._keyFilter(params, ["tx", "rx", "baud", "stop", "bits", "parity", "flowcontrol", "rts", "cts", "drive", "pull"]);

    if (this.params.hasOwnProperty("drive")) {
      this.Obniz.getIO(this.params.rx).drive(this.params.drive);
      this.Obniz.getIO(this.params.tx).drive(this.params.drive);
    } else {
      this.Obniz.getIO(this.params.rx).drive("5v");
      this.Obniz.getIO(this.params.tx).drive("5v");
    }

    if (this.params.hasOwnProperty("pull")) {
      this.Obniz.getIO(this.params.rx).pull(this.params.pull);
      this.Obniz.getIO(this.params.tx).pull(this.params.pull);
    } else {
      this.Obniz.getIO(this.params.rx).pull(null);
      this.Obniz.getIO(this.params.tx).pull(null);
    }

    var obj = {};
    obj["uart" + this.id] = this.params;
    this.Obniz.send(obj);
    this.received = [];
    this.used = true;
  }

  send(data) {
    var send_data = null;
    if (data === undefined) {
      return;
    }
    if (typeof data === "number") {
      data = [data];
    }
    if (isNode && data instanceof Buffer) {
      var arr = new Array(data.byteLength);
      for (var i = 0; i < arr.length; i++) {
        arr[i] = data[i];
      }
      send_data = arr;
    } else if (data.constructor === Array) {
      send_data = data;
    } else if (typeof data === "string") {
      if (isNode) {
        const buf = Buffer(data);
        var arr = new Array(buf.byteLength);
        for (var i = 0; i < arr.length; i++) {
          arr[i] = buf[i];
        }
        send_data = arr;
      } else if (TextEncoder) {
        const typedArray = new TextEncoder("utf-8").encode(data);
        send_data = new Array(typedArray.length);
        for (var i = 0; i < typedArray.length; i++) {
          send_data[i] = typedArray[i];
        }
      }
    }
    var obj = {};
    obj["uart" + this.id] = {};
    obj["uart" + this.id].data = send_data;
    //  console.log(obj);
    this.Obniz.send(obj);
  }

  isDataExists() {
    return this.received && this.received.length > 0;
  }

  readBytes() {
    var results = [];
    if (this.isDataExists()) {
      for (var i = 0; i < this.received.length; i++) {
        results.push(this.received[i]);
      }
    }
    this.received = [];
    return results;
  }

  readText() {
    var string = null;
    if (this.isDataExists()) {
      var data = this.readBytes();
      string = this.tryConvertString(data);
    }
    this.received = [];
    return string;
  }

  tryConvertString(data) {
    return ObnizUtil.dataArray2string(data);
  }

  notified(obj) {
    if (this.onreceive) {
      var string = this.tryConvertString(obj.data);
      this.onreceive(obj.data, string);
    } else {
      if (!this.received) {
        this.received = [];
      }

      this.received.push.apply(this.received, obj.data);
    }
  }

  isUsed() {
    return this.used;
  }

  end() {
    var obj = {};
    obj["uart" + this.id] = null;
    this.params = null;
    this.Obniz.send(obj);
    this.used = false;
  }
}

class LogicAnalyzer {

  constructor(obniz) {
    this.obniz = obniz;
  }

  start(params) {

    var err = ObnizUtil._requiredKeys(params, ["io", "interval", "duration"]);
    if (err) {
      throw new Error("LogicAnalyzer start param '" + err + "' required, but not found ");return;
    }
    this.params = ObnizUtil._keyFilter(params, ["io", "interval", "duration", "trigerValue", "trigerValueSamples"]);

    var obj = {};
    obj.logic_analyzer = {
      io: [this.params.io],
      interval: this.params.interval,
      duration: this.params.duration
    };
    if (this.params.trigerValueSamples > 0) {
      obj.logic_analyzer.triger = {
        value: !!this.params.trigerValue,
        samples: this.params.trigerValueSamples
      };
    }

    this.obniz.send(obj);
    return;
  }

  end() {
    var obj = {};
    obj.logic_analyzer = null;
    this.obniz.send(obj);
    return;
  }

  notified(obj) {
    if (this.onmeasured) {
      this.onmeasured(obj.data);
    } else {
      if (!this.measured) {
        this.measured = [];
      }
      this.measured.push(obj.data);
    }
    return;
  }
}

class ObnizMeasure {

  constructor(obniz) {
    this.obniz = obniz;
    this.observers = [];
  }

  echo(params) {
    var err = ObnizUtil._requiredKeys(params, ["io_pulse", "pulse", "pulse_width", "io_echo", "measure_edges"]);
    if (err) {
      throw new Error("Measure start param '" + err + "' required, but not found ");return;
    }
    this.params = ObnizUtil._keyFilter(params, ["io_pulse", "pulse", "pulse_width", "io_echo", "measure_edges", "timeout", "callback"]);

    var echo = {};
    echo.io_pulse = this.params.io_pulse;
    echo.pulse = this.params.pulse;
    echo.pulse_width = this.params.pulse_width;
    echo.io_echo = this.params.io_echo;
    echo.measure_edges = this.params.measure_edges;
    if (typeof this.params.timeout === "number") {
      echo.timeout = this.params.timeout;
    }

    this.obniz.send({
      measure: {
        echo: echo
      }
    });

    if (this.params.callback) {
      this.observers.push(this.params.callback);
    }
  }

  notified(obj) {
    var callback = this.observers.shift();
    if (callback) {
      callback(obj.echo);
    }
  }
}
class ObnizUtil {

  constructor(obniz) {
    this.obniz = obniz;
  }

  createCanvasContext(width, height) {
    if (this.obniz.isNode) {
      // TODO:
      throw new Error("node js mode is under working.");
    } else {
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.style["-webkit-font-smoothing"] = "none";
      var body = document.getElementsByTagName("body")[0];
      body.appendChild(canvas);

      var ctx = canvas.getContext("2d");
      return ctx;
    }
  }

  static _keyFilter(params, keys) {
    var filterdParams = {};
    if (typeof params !== "object") {
      return filterdParams;
    }
    filterdParams = Object.keys(params).filter(key => keys.includes(key)).reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {});

    return filterdParams;
  }

  /**
   *
   * @return {String} key name of not found. 
   */
  static _requiredKeys(params, keys) {
    if (typeof params !== "object") {
      return keys[0];
    }

    for (var index in keys) {
      if (!(keys[index] in params)) {
        return keys[index];
      }
    }
    return null;
  }

  static dataArray2string(data) {
    var string = null;
    try {
      if (isNode) {
        const StringDecoder = require('string_decoder').StringDecoder;
        if (StringDecoder) {
          string = new StringDecoder('utf8').write(Buffer.from(data));
        }
      } else if (TextDecoder) {
        string = new TextDecoder("utf-8").decode(new Uint8Array(data));
      }
    } catch (e) {
      //this.obniz.error(e);
    }
    return string;
  }

  static string2dataArray(str) {
    if (isNode) {
      const buf = Buffer(str);
      var arr = new Array(buf.byteLength);
      for (var i = 0; i < arr.length; i++) {
        arr[i] = buf[i];
      }
      return arr;
    } else if (TextEncoder) {
      const typedArray = new TextEncoder("utf-8").encode(str);
      var arr = new Array(typedArray.length);
      for (var i = 0; i < typedArray.length; i++) {
        arr[i] = typedArray[i];
      }
      return arr;
    }
    return null;
  }
}
class WSCommand {

  constructor() {}

  static framed(module, func, payload) {
    var payload_length = 0;
    if (payload) {
      payload_length = payload.length;
    }
    var length_type;
    if (payload_length <= 0x3F) {
      length_type = 0;
    } else if (payload_length <= 0x3FFF) {
      length_type = 1;
    } else if (payload_length <= 0x3FFFFFFF) {
      length_type = 2;
    } else {
      logger.error("cant convert to binary. too big payload");
      return null;
    }
    var length_extra_bytse = length_type == 0 ? 0 : length_type == 1 ? 1 : 3;
    var header_length = 3 + length_extra_bytse;
    var result = new Uint8Array(header_length + payload_length);
    var index = 0;
    result[index++] = module & 0x7F;
    result[index++] = func;
    result[index++] = length_type << 6 | payload_length >> length_extra_bytse * 8;
    while (length_extra_bytse > 0) {
      length_extra_bytse--;
      result[index++] = payload_length >> length_extra_bytse * 8;
    }
    if (payload_length == 0) {
      return result;
    } else {
      result.set(payload, header_length);
      return result;
    }
  }
}
var USB = function () {
  this.keys = ["vcc", "gnd"];
  this.requiredKeys = ["vcc", "gnd"];
};

USB.prototype.wired = function (obniz) {
  this.obniz = obniz;
  this.io_vdd = obniz.getIO(this.params.vcc);
  this.io_gnd = obniz.getIO(this.params.gnd);

  this.io_gnd.output(false);
};

USB.prototype.on = function () {
  this.io_vdd.output(true);
};

USB.prototype.off = function () {
  this.io_vdd.output(false);
};

if (PartsRegistrate) {
  PartsRegistrate("USB", USB);
}
var AE_MICAMP = function () {
  this.keys = ["vcc", "gnd", "out"];
  this.requiredKeys = ["out"];
};

AE_MICAMP.prototype.wired = (() => {
  var _ref2 = _asyncToGenerator(function* (obniz) {
    this.obniz = obniz;

    this.ad = obniz.getAD(this.params.out);

    obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");

    var self = this;
    this.ad.start(function (value) {
      self.voltage = value;
      if (self.onchange) {
        self.onchange(self.voltage);
      }
    });

    /*
      var self = this;
      var analogin = [];
      var cnt = 0;
      while(true){
        var sum = 0;
        if (cnt == 10) {
          cnt = 0;
        }
        analogin[cnt] = this.ad.value;
        cnt++;
        for (var i = 0; i < 10; i++) {
          if (typeof(analogin[i])=="number") {sum += analogin[i];}
        }
        var average = sum / 10;
        //console.log('average='+average);
        await obniz.wait(1);
      }
      self.voltage_ave = average;
      if (self.average) {
        self.average(self.voltage_ave);
      }
      */
  });

  return function (_x) {
    return _ref2.apply(this, arguments);
  };
})();

/*
//移動平均を返す
AE_MICAMP.prototype.Average = function(callback) {
  this.average = callback;
};
*/

if (PartsRegistrate) {
  PartsRegistrate("AE_MICAMP", AE_MICAMP);
}

var RN42 = function () {
  this.keys = ["tx", "rx", "gnd"];
  this.requiredKeys = ["tx", "rx"];
};

RN42.prototype.wired = function (obniz) {
  if (obniz.isValidIO(this.params.gnd)) {
    obniz.getIO(this.params.gnd).output(false);
  }

  this.uart = obniz.getFreeUart();

  this.uart.start({ tx: this.params.tx, rx: this.params.rx, baud: 115200, drive: "3v" });
  var self = this;
  this.uart.onreceive = function (data, text) {
    // this is not perfect. separation is possible.
    if (text.indexOf("CONNECT") >= 0) {
      console.log("connected");
    } else if (text.indexOf("DISCONNECT") >= 0) {
      console.log("disconnected");
    }
    if (typeof self.onreceive === "function") {
      self.onreceive(data, text);
    }
  };
};

RN42.prototype.send = function (data) {
  this.uart.send(data);
};

RN42.prototype.sendCommand = function (data) {
  this.uart.send(data + '\n');
  this.obniz.freeze(100);
};

RN42.prototype.enterCommandMode = function () {
  this.send('$$$');
  this.obniz.freeze(100);
};

RN42.prototype.config = function (json) {
  this.enterCommandMode();
  if (typeof json !== "object") {
    // TODO: warning
    return;
  }
  // remove noize data
  this.sendCommand("");

  if (json.master_slave) {
    this.config_masterslave(json.master_slave);
  }
  if (json.auth) {
    this.config_auth(json.auth);
  }
  if (json.hid_flag) {
    this.config_HIDflag(json.hid_flag);
  }
  if (json.profile) {
    this.config_profile(json.profile);
  }
  if (json.power) {
    this.config_power(json.power);
  }
  if (json.display_name) {
    this.config_displayName(json.display_name);
  }
  this.config_reboot();
};

RN42.prototype.config_reboot = function () {
  this.sendCommand('R,1');
};

RN42.prototype.config_masterslave = function (mode) {
  var val = -1;
  if (typeof mode === "number") {
    val = mode;
  } else if (typeof mode === "string") {
    var modes = ["slave", "master", "trigger", "auto-connect-master", "auto-connect-dtr", "auto-connect-any", "pairing"];
    for (var i = 0; i < modes.length; i++) {
      if (modes[i] === mode) {
        val = i;
        break;
      }
    }
  }
  if (val === -1) {
    // TODO: warning
    return;
  }
  this.sendCommand('SM,' + val);
};

RN42.prototype.config_displayName = function (name) {
  this.sendCommand('SN,' + name);
};

// // SH,0200 HID Flag register. Descriptor=keyboard
RN42.prototype.config_HIDflag = function (flag) {
  this.sendCommand('SH,' + flag);
};

RN42.prototype.config_profile = function (mode) {
  var val = -1;
  if (typeof mode === "number") {
    val = mode;
  } else if (typeof mode === "string") {
    var modes = ["SPP", "DUN-DCE", "DUN-DTE", "MDM-SPP", "SPP-DUN-DCE", "APL", "HID"];
    for (var i = 0; i < modes.length; i++) {
      if (modes[i] === mode) {
        val = i;
        break;
      }
    }
  }
  if (val === -1) {
    // TODO: warning
    return;
  }
  this.sendCommand('S~,' + val);
};

RN42.prototype.config_revert_localecho = function () {
  this.sendCommand('+');
};

RN42.prototype.config_auth = function (mode) {
  var val = -1;
  if (typeof mode === "number") {
    val = mode;
  } else if (typeof mode === "string") {
    var modes = ["open", "ssp-keyboard", "just-work", "pincode"];
    for (var i = 0; i < modes.length; i++) {
      if (modes[i] === mode) {
        val = i;
        break;
      }
    }
  }
  if (val === -1) {
    // TODO: warning
    return;
  }
  this.sendCommand('SA,' + val);
};

RN42.prototype.config_power = function (dbm) {

  var val = "0010";
  if (16 > dbm && dbm >= 12) {
    val = "000C";
  } else if (12 > dbm && dbm >= 8) {
    val = "0008";
  } else if (8 > dbm && dbm >= 4) {
    val = "0004";
  } else if (4 > dbm && dbm >= 0) {
    val = "0000";
  } else if (0 > dbm && dbm >= -4) {
    val = "FFFC";
  } else if (-4 > dbm && dbm >= -8) {
    val = "FFF8";
  } else if (-8 > dbm) {
    val = "FFF4";
  }

  this.sendCommand('SY,' + val);
};

RN42.prototype.config_get_setting = function () {
  this.sendCommand('D');
};

RN42.prototype.config_get_extendSetting = function () {
  this.sendCommand('E');
};

// Module functions

if (PartsRegistrate) {
  PartsRegistrate("RN42", RN42);
}
/* global PartsRegistrate */

class XBee {

  constructor() {
    this.keys = ["tx", "rx", "gnd"];
    this.requiredKeys = ["tx", "rx"];

    this.displayIoNames = { "tx": "<tx", "rx": ">rx" };
  }

  wired(obniz) {

    this.uart = obniz.getFreeUart();
    this.currentCommand = null;
    this.commands = [];
    this.isAtMode = false;
    this.onFinishAtModeCallback = null;

    if (typeof this.params.gnd === "number") {
      obniz.getIO(this.params.gnd).output(false);
    }

    this.uart.start({ tx: this.params.tx, rx: this.params.rx, baud: 9600, drive: "3v" });

    this.uart.onreceive = function (data, text) {
      if (this.isAtMode) {
        this.onAtResultsRecieve(data, text);
      } else {
        if (typeof this.onreceive === "function") {
          this.onreceive(data, text);
        }
      }
    }.bind(this);
  }

  send(text) {
    if (this.isAtMode === false) {
      this.uart.send(text);
    } else {
      this.obniz.error("XBee is AT Command mode now. Wait for finish config.");
    }
  }

  onAtResultsRecieve(data, text) {
    if (!this.isAtMode) {
      return;
    }

    var next = function () {
      this.currentCommand = null;
      this.sendCommand();
    }.bind(this);

    if (text === "OK\r") {
      if (this.currentCommand === "ATCN") {
        this.isAtMode = false;
        this.currentCommand = null;
        if (typeof this.onFinishAtModeCallback === "function") {
          this.onFinishAtModeCallback();
          this.onFinishAtModeCallback = null;
        }
        return;
      }
      next();
    } else if (text === "ERROR\r") {
      this.obniz.error("XBee config error : " + this.currentCommand);
    } else {
      //response of at command.
      console.log("XBEE : no catch message", data);
      next();
    }
  }

  addCommand(command, value) {
    var str = command + (value ? " " + value : "");
    this.commands.push(str);
    if (this.isAtMode === true && this.currentCommand === null) {
      this.sendCommand();
    }
  }

  sendCommand() {
    if (this.isAtMode === true && this.currentCommand === null && this.commands.length > 0) {
      this.currentCommand = "AT" + this.commands.shift();
      this.uart.send(this.currentCommand + "\r");
    }
  }

  enterAtMode() {
    if (this.currentCommand !== null) return;
    this.isAtMode = true;
    this.obniz.freeze(1000);
    var command = "+++";
    this.currentCommand = command;
    this.uart.send(this.currentCommand);
    this.obniz.freeze(1000);
  }

  exitAtMode() {
    this.addCommand("CN");
  }

  configWait(config) {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (_this.isAtMode) {
        throw new Error("Xbee : duplicate config setting");
      };
      return new Promise(function (resolve, reject) {
        var standaloneKeys = {
          "destination_address_high": "DH",
          "destination_address_low": "DL",
          "source_address": "MY"
        };
        var highLowKeys = ["destination_address"];
        this.enterAtMode();
        for (var key in config) {
          if (key.length === 2) {
            this.addCommand(key, config[key]);
          } else if (standaloneKeys[key]) {
            this.addCommand(standaloneKeys[key], config[key]);
          } else if (highLowKeys.includes(key)) {
            var high = config[key].slice(0, -8);
            if (!high) {
              high = "0";
            }
            var low = config[key].slice(-8);

            this.addCommand(standaloneKeys[key + "_high"], high);
            this.addCommand(standaloneKeys[key + "_low"], low);
          }
        }
        this.exitAtMode();
        this.onFinishAtModeCallback = function () {
          resolve();
        };
      }.bind(_this));
    })();
  }
}

if (PartsRegistrate) {
  PartsRegistrate("XBee", XBee);
}
class JpegSerialCam {

  constructor() {
    this.keys = ["vcc", "cam_tx", "cam_rx", "gnd"];
    this.requiredKeys = ["cam_tx", "cam_rx"];

    this.ioKeys = this.keys;
    this.displayName = "Jcam";
    this.displayIoNames = { "cam_tx": "camTx", "cam_rx": "camRx" };
  }

  wired() {
    this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
    this.my_tx = this.params.cam_rx;
    this.my_rx = this.params.cam_tx;

    this.obniz.getIO(this.my_tx).drive("3v");

    this.uart = this.obniz.getFreeUart();
  }

  _drainUntil(uart, search, recv) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (!recv) recv = [];
      while (true) {
        var readed = uart.readBytes();
        recv = recv.concat(readed);
        var tail = _this2._seekTail(search, recv);
        if (tail >= 0) {
          recv.splice(0, tail);
          return recv;
        }
        yield _this2.obniz.wait(10);
      }
    })();
  }

  _seekTail(search, src) {
    var f = 0;
    for (var i = 0; i < src.length; i++) {
      if (src[i] === search[f]) {
        f++;
        if (f === search.length) {
          return i + 1;
        }
      } else {
        f = 0;
      }
    }
    return -1;
  }

  arrayToBase64(buf) {
    if (typeof btoa === "function") {
      var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
      }).join('');
      return btoa(binstr);
    }
    // TODO: 
  }

  startwait(obj) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      if (!obj) obj = {};
      _this3.uart.start({ tx: _this3.my_tx, rx: _this3.my_rx, baud: obj.baud || 38400 });
      _this3.obniz.display.setPinName(_this3.my_tx, "JpegSerialCam", "camRx");
      _this3.obniz.display.setPinName(_this3.my_rx, "JpegSerialCam", "camTx");
      yield _this3.obniz.wait(2500);
    })();
  }

  resetwait() {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      _this4.uart.send([0x56, 0x00, 0x26, 0x00]);
      yield _this4._drainUntil(_this4.uart, [0x76, 0x00, 0x26, 0x00]);
      yield _this4.obniz.wait(2500);
    })();
  }

  setResolusionWait(resolution) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      let val;
      if (resolution === "640*480") {
        val = 0x00;
      } else if (resolution === "320*240") {
        val = 0x11;
      } else if (resolution === "160*120") {
        val = 0x22;
      } else {
        throw new Error("invalid resolution");
      }
      _this5.uart.send([0x56, 0x00, 0x31, 0x05, 0x04, 0x01, 0x00, 0x19, val]);
      yield _this5._drainUntil(_this5.uart, [0x76, 0x00, 0x31, 0x00]);
      yield _this5.resetwait();
    })();
  }

  setCompressibilityWait(compress) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      let val = Math.floor(compress / 100 * 0xFF);
      _this6.uart.send([0x56, 0x00, 0x31, 0x05, 0x01, 0x01, 0x12, 0x04, val]);
      yield _this6._drainUntil(_this6.uart, [0x76, 0x00, 0x31, 0x00]);
      yield _this6.resetwait();
    })();
  }

  setBaudWait(baud) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      let val;
      switch (baud) {
        case 9600:
          val = [0xAE, 0xC8];
          break;
        case 19200:
          val = [0x56, 0xE4];
          break;
        case 38400:
          val = [0x2A, 0xF2];
          break;
        case 57600:
          val = [0x1C, 0x4C];
          break;
        case 115200:
          val = [0x0D, 0xA6];
          break;
        default:
          throw new Error("invalid baud rate");
      }
      _this7.uart.send([0x56, 0x00, 0x31, 0x06, 0x04, 0x02, 0x00, 0x08, val[0], val[1]]);
      yield _this7._drainUntil(_this7.uart, [0x76, 0x00, 0x31, 0x00]);
      //await this.obniz.wait(1000);
      yield _this7.startwait({
        baud
      });
    })();
  }

  takewait() {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      const uart = _this8.uart;
      //console.log("stop a photo")
      uart.send([0x56, 0x00, 0x36, 0x01, 0x02]);
      yield _this8._drainUntil(uart, [0x76, 0x00, 0x36, 0x00, 0x00]);

      //console.log("take a photo")
      uart.send([0x56, 0x00, 0x36, 0x01, 0x00]);
      yield _this8._drainUntil(uart, [0x76, 0x00, 0x36, 0x00, 0x00]);

      //console.log("read length")
      uart.send([0x56, 0x00, 0x34, 0x01, 0x00]); // read length of image data
      var recv = yield _this8._drainUntil(uart, [0x76, 0x00, 0x34, 0x00, 0x04, 0x00, 0x00]); // ack
      var XX;
      var YY;
      while (true) {
        var readed = uart.readBytes();
        //console.log(recv);
        recv = recv.concat(readed);
        if (recv.length >= 2) {
          XX = recv[0];
          YY = recv[1];
          break;
        }
        yield _this8.obniz.wait(1000);
      }
      let databytes = XX * 256 + YY;
      //console.log("image: " + databytes + " Bytes");
      const high = databytes >> 8 & 0xFF;
      const low = databytes & 0xFF;

      //console.log("start reading image")
      uart.send([0x56, 0x00, 0x32, 0x0C, 0x00, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, XX, YY, 0x00, 0xFF]);
      var recv = yield _this8._drainUntil(uart, [0x76, 0x00, 0x32, 0x00, 0x00]);
      //console.log("reading...");
      while (true) {
        var readed = uart.readBytes();
        recv = recv.concat(readed);
        //console.log(readed.length);
        if (recv.length >= databytes) {
          break;
        }
        yield _this8.obniz.wait(10);
      }
      //console.log("done");
      recv = recv.splice(0, databytes); // remove tail
      recv = recv.concat([0xFF, 0xD9]);
      return recv;
    })();
  }

}

if (PartsRegistrate) {
  PartsRegistrate("JpegSerialCam", JpegSerialCam);
}
var _7SegmentLED = function () {
  this.requiredKeys = ["a", "b", "c", "d", "e", "f", "g", "dp", "common", "commonType"];
  this.keys = ["a", "b", "c", "d", "e", "f", "g", "dp", "common", "commonType"];

  this.digits = [0x3F, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x6f];
};

_7SegmentLED.prototype.wired = function (obniz) {
  this.obniz = obniz;
  this.ios = [];
  this.ios.push(obniz.getIO(this.params.a));
  this.ios.push(obniz.getIO(this.params.b));
  this.ios.push(obniz.getIO(this.params.c));
  this.ios.push(obniz.getIO(this.params.d));
  this.ios.push(obniz.getIO(this.params.e));
  this.ios.push(obniz.getIO(this.params.f));
  this.ios.push(obniz.getIO(this.params.g));

  this.dp = obniz.getIO(this.params.dp);
  this.common = obniz.getIO(this.params.common);
  this.isCathodeCommon = this.params.commonType === "anode" ? false : true;
};

_7SegmentLED.prototype.print = function (data) {
  if (typeof data === "number") {
    data = parseInt(data);
    data = data % 10;

    for (let i = 0; i < 7; i++) {
      if (this.ios[i]) {
        var val = this.digits[data] & 1 << i ? true : false;
        if (!this.isCathodeCommon) {
          val = ~val;
        }
        this.ios[i].output(val);
      }
    }
    this.on();
  }
};

_7SegmentLED.prototype.printRaw = function (data) {
  if (typeof data === "number") {
    for (let i = 0; i < 7; i++) {
      if (this.ios[i]) {
        var val = data & 1 << i ? true : false;
        if (!this.isCathodeCommon) {
          val = !val;
        }
        this.ios[i].output(val);
      }
    }
    this.on();
  }
};

_7SegmentLED.prototype.dpShow = function (show) {
  if (this.dp) {
    this.dp.output(this.isCathodeCommon ? show : !show);
  }
};

_7SegmentLED.prototype.on = function () {
  this.common.output(this.isCathodeCommon ? false : true);
};

_7SegmentLED.prototype.off = function () {
  this.common.output(this.isCathodeCommon ? true : false);
};

if (PartsRegistrate) {
  PartsRegistrate("7SegmentLED", _7SegmentLED);
}

var _7SegmentLEDArray = function () {
  this.identifier = "" + new Date().getTime();

  this.keys = ["seg0", "seg1", "seg2", "seg3"];
  this.requiredKeys = ["seg0"];
};

_7SegmentLEDArray.prototype.wired = function (obniz) {
  this.obniz = obniz;

  this.segments = [];
  if (this.params.seg0) {
    this.segments.unshift(this.params.seg0);
  }
  if (this.params.seg1) {
    this.segments.unshift(this.params.seg1);
  }
  if (this.params.seg2) {
    this.segments.unshift(this.params.seg2);
  }
  if (this.params.seg3) {
    this.segments.unshift(this.params.seg3);
  }
};

_7SegmentLEDArray.prototype.print = function (data) {
  if (typeof data === "number") {
    data = parseInt(data);

    var segments = this.segments;
    var print = function (index) {
      let val = data;

      for (let i = 0; i < segments.length; i++) {
        console.log(val);
        if (index === i) {
          segments[i].print(val % 10);
        } else {
          segments[i].off();
        }
        val = val / 10;
      }
    };

    var animations = [];
    for (let i = 0; i < segments.length; i++) {
      animations.push({
        duration: 3,
        state: print
      });
    }

    var segments = this.segments;
    this.obniz.io.animation(this.identifier, "loop", animations);
  };
};

_7SegmentLEDArray.prototype.on = function () {
  this.obniz.io.animation(this.identifier, "resume");
};

_7SegmentLEDArray.prototype.off = function () {
  this.obniz.io.animation(this.identifier, "pause");
  for (let i = 0; i < this.segments.length; i++) {
    this.segments[i].off();
  }
};

if (PartsRegistrate) {
  PartsRegistrate("7SegmentLEDArray", _7SegmentLEDArray);
}

var isNode = typeof window === 'undefined' ? true : false;

class MatrixLED_MAX7219 {

  constructor() {
    this.keys = ["vcc", "gnd", "din", "cs", "clk"];
    this.requiredKeys = ["din", "cs", "clk"];
  }

  wired(obniz) {
    this.cs = obniz.getIO(this.params.cs);
    // logich high must 3.5v <=
    if (obniz.isValidIO(this.params.vcc)) {
      obniz.getIO(this.params.vcc).output(true);
    }
    if (obniz.isValidIO(this.params.gnd)) {
      obniz.getIO(this.params.gnd).output(false);
    }

    // reset a onece
    this.cs.output(true);
    obniz.freeze(10);
    this.cs.output(false);
    this.cs.output(true);

    // max 10Mhz but motor driver can't
    this.params.frequency = this.params.frequency || 10 * 1000 * 1000;
    this.params.mode = "master";
    this.params.mosi = this.params.din;
    this.params.drive = "3v";
    this.spi = this.obniz.getSpiWithConfig(this.params);
  }

  init(width, height) {
    this.width = width;
    this.height = height;
    this.preparevram(width, height);
    this.initModule();
  }

  initModule() {
    this.write([0x09, 0x00]); // Code B decode for digits 3–0 No decode for digits 7–4
    this.write([0x0a, 0x05]); // brightness 9/32 0 to f
    this.write([0x0b, 0x07]); // Display digits 0 1 2 3 4 567
    this.write([0x0c, 0x01]); // Shutdown to normal operation
    this.passingCommands();
  }

  test() {
    this.write([0x0f, 0x00]); // test command
    this.passingCommands();
  }

  passingCommands() {
    for (var i = 0; i < this.width; i += 8) {
      // this needed for number of unit
      this.write([0x00, 0x00]);
      this.write([0x00, 0x00]);
      this.write([0x00, 0x00]);
    }
  }

  brightness(val) {
    this.write([0x0a, val]); // 0 to 15;
    this.passingCommands();
  }

  preparevram(width, height) {
    this.vram = [];
    for (var i = 0; i < height; i++) {
      var dots = new Array(width / 8);
      for (var ii = 0; ii < dots.length; ii++) {
        dots[ii] = 0x00;
      }
      this.vram.push(dots);
    }
  }

  write(data) {
    this.cs.output(false);
    this.spi.write(data);
    this.cs.output(true);
  }

  writeVram() {
    for (var line_num = 0; line_num < this.height; line_num++) {
      let addr = line_num + 1;
      let line = this.vram[line_num];
      let data = [];
      for (let col = 0; col < line.length; col++) {
        data.push(addr);
        data.push(line[col]);
      }
      this.write(data);
    }
  }

  clear() {
    for (var line_num = 0; line_num < this.height; line_num++) {
      let line = this.vram[line_num];
      for (let col = 0; col < line.length; col++) {
        this.vram[line_num][col] = 0x00;
      }
      this.writeVram();
    }
  }

  drawCanvasContext(ctx) {
    if (isNode) {
      // TODO:
      throw new Error("node js mode is under working.");
    } else {
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        var brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        var index = parseInt(i / 4);
        var line = parseInt(index / this.width);
        var col = parseInt((index - line * this.width) / 8);
        var bits = parseInt(index - line * this.width) % 8;
        if (bits == 0) this.vram[line][col] = 0x00;
        if (brightness > 0x7F) this.vram[line][col] |= 0x80 >> bits;
      }
    }
    this.writeVram();
  }
}

if (PartsRegistrate) {
  PartsRegistrate("MatrixLED_MAX7219", MatrixLED_MAX7219);
}

var HCSR04 = function () {
  this.keys = ["vcc", "triger", "echo", "gnd"];
  this.requiredKeys = ["vcc", "triger", "echo"];

  this._unit = "mm";
};

HCSR04.prototype.wired = function (obniz) {
  this.obniz = obniz;

  obniz.setVccGnd(null, this.params.gnd, "5v");

  this.vccIO = obniz.getIO(this.params.vcc);
  this.triger = this.params.triger;
  this.echo = this.params.echo;
};

HCSR04.prototype.measure = (() => {
  var _ref3 = _asyncToGenerator(function* (callback) {

    this.vccIO.drive("5v");
    this.vccIO.output(true);
    yield this.obniz.wait(10);

    var self = this;
    this.obniz.measure.echo({
      io_pulse: this.triger,
      io_echo: this.echo,
      pulse: "positive",
      pulse_width: 0.011,
      measure_edges: 3,
      timeout: 10 / 340 * 1000,
      callback: function (edges) {
        self.vccIO.output(false);
        var distance = null;
        for (var i = 0; i < edges.length - 1; i++) {
          // HCSR04's output of io_echo is initially high when triger is finshed
          if (edges[i].edge === true) {
            distance = (edges[i + 1].timing - edges[i].timing) * 1000;
            if (self._unit === "mm") {
              distance = distance / 5.8;
            } else if (self._unit === "inch") {
              distance = distance / 148.0;
            }
          }
        }
        if (typeof callback === "function") {
          callback(distance);
        }
      }
    });
  });

  return function (_x2) {
    return _ref3.apply(this, arguments);
  };
})();

HCSR04.prototype.unit = function (unit) {
  if (unit === "mm") {
    this._unit = "mm";
  } else if (unit === "inch") {
    this._unit = "inch";
  } else {
    throw new Error("HCSR04: unknown unit " + unit);
  }
};

// Module functions

if (PartsRegistrate) {
  PartsRegistrate("HC-SR04", HCSR04);
}
var ENC03R_Module = function () {

  this.keys = ["vcc", "out1", "out2", "gnd"];
  this.required = ["out1", "out2"];
  this.Sens = 0.00067; //Sensitivity, 0.67mV / deg/sec
};

ENC03R_Module.prototype.wired = function (obniz) {
  this.obniz = obniz;
  obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad0 = obniz.getAD(this.params.out1);
  this.ad1 = obniz.getAD(this.params.out2);

  this.io_pwr.output(true);

  var self = this;
  this.ad0.start(function (value) {
    self.sens1 = (value - 1.45) / this.Sens; //[Angular velocity(deg/sec)] = ( [AD Voltage]-1.35V ) / 0.67mV
    //console.log('raw='+value);
    if (self.onchange1) {
      self.onchange1(self.sens1);
    }
  });

  this.ad1.start(function (value) {
    self.sens2 = (value - 1.35) / this.Sens; //[Angular velocity(deg/sec)] = ( [AD Voltage]-1.35V ) / 0.67mV
    if (self.onchange2) {
      self.onchange2(self.sens2);
    }
  });
};

ENC03R_Module.prototype.onChangeSens1 = function (callback) {
  this.onchange1 = callback;
};
ENC03R_Module.prototype.onChangeSens2 = function (callback) {
  this.onchange2 = callback;
};

ENC03R_Module.prototype.getValueSens1 = _asyncToGenerator(function* () {
  return (this.ad0.value - 1.47) / Sens;
});

ENC03R_Module.prototype.getValueSens2 = _asyncToGenerator(function* () {
  return (this.ad1.value - 1.35) / Sens;
});

if (PartsRegistrate) {
  PartsRegistrate("ENC03R_Module", ENC03R_Module);
}

class FullColorLed {
  constructor() {

    this.COMMON_TYPE_ANODE = 1;
    this.COMMON_TYPE_CATHODE = 0;

    this.anode_keys = ['anode', 'anode_common', 'anodeCommon', 'vcc'];
    this.cathode_keys = ['cathode', 'cathode_common', 'cathodeCommon', 'gnd'];
    this.animationName = "FullColorLed-" + Math.round(Math.random() * 1000);

    this.keys = ["r", "g", "b", "common", "commonType"];
    this.requiredKeys = ["r", "g", "b", "common", "commonType"];
  }

  wired(obniz) {
    var r = this.params.r;
    var g = this.params.g;
    var b = this.params.b;
    var common = this.params.common;
    var commontype = this.params.commonType;

    this.obniz = obniz;
    if (this.anode_keys.includes(commontype)) {
      this.commontype = this.COMMON_TYPE_ANODE;
    } else if (this.cathode_keys.includes(commontype)) {
      this.commontype = this.COMMON_TYPE_CATHODE;
    } else {
      this.obniz.error("FullColorLed param need common type [  anode_common or cathode_common ] ");
    }

    this.common = this.obniz.getIO(common);
    this.common.drive("3v");
    this.common.output(this.commontype);

    this.obniz.getIO(r).drive("3v");
    this.obniz.getIO(r).output(this.commontype);
    this.obniz.getIO(g).drive("3v");
    this.obniz.getIO(g).output(this.commontype);
    this.obniz.getIO(b).drive("3v");
    this.obniz.getIO(b).output(this.commontype);
    this.pwmR = this.obniz.getFreePwm();this.pwmR.start(r);this.pwmR.freq(1000);
    this.pwmG = this.obniz.getFreePwm();this.pwmG.start(g);this.pwmG.freq(1000);
    this.pwmB = this.obniz.getFreePwm();this.pwmB.start(b);this.pwmB.freq(1000);
    this.rgb(0, 0, 0);
  }

  rgb(r, g, b) {
    r = Math.min(Math.max(parseInt(r), 0), 255);
    g = Math.min(Math.max(parseInt(g), 0), 255);
    b = Math.min(Math.max(parseInt(b), 0), 255);

    if (this.commontype === this.COMMON_TYPE_ANODE) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    this.pwmR.duty(r / 255 * 100);
    this.pwmG.duty(g / 255 * 100);
    this.pwmB.duty(b / 255 * 100);
  }

  hsv(h, s, v) {
    var C = v * s;
    var Hp = h / 60;
    var X = C * (1 - Math.abs(Hp % 2 - 1));

    var R, G, B;
    if (0 <= Hp && Hp < 1) {
      [R, G, B] = [C, X, 0];
    };
    if (1 <= Hp && Hp < 2) {
      [R, G, B] = [X, C, 0];
    };
    if (2 <= Hp && Hp < 3) {
      [R, G, B] = [0, C, X];
    };
    if (3 <= Hp && Hp < 4) {
      [R, G, B] = [0, X, C];
    };
    if (4 <= Hp && Hp < 5) {
      [R, G, B] = [X, 0, C];
    };
    if (5 <= Hp && Hp < 6) {
      [R, G, B] = [C, 0, X];
    };

    var m = v - C;
    [R, G, B] = [R + m, G + m, B + m];

    R = Math.floor(R * 255);
    G = Math.floor(G * 255);
    B = Math.floor(B * 255);

    this.rgb(R, G, B);
  }

  gradation(cycletime_ms) {

    var frames = [];
    var max = 36 / 2;
    var duration = Math.round(cycletime_ms / max);
    for (var i = 0; i < max; i++) {
      var oneFrame = {
        duration: duration,
        state: function (index) {
          // index = 0
          this.hsv(index * 10 * 2, 1, 1);
        }.bind(this)
      };
      frames.push(oneFrame);
    }
    this.obniz.io.animation(this.animationName, "loop", frames);
  }
  stopgradation() {
    this.obniz.io.animation(this.animationName, "pause");
  }
}

if (PartsRegistrate) {
  PartsRegistrate("FullColorLed", FullColorLed);
}
var LED = function () {
  this.keys = ["anode", "cathode"];
  this.requiredKeys = ["anode"];

  this.animationName = "Led-" + Math.round(Math.random() * 1000);
};

LED.prototype.wired = function (obniz) {
  this.obniz = obniz;
  this.io_anode = obniz.getIO(this.params.anode);
  if (this.params.cathode) {
    this.io_cathode = obniz.getIO(this.params.cathode);
    this.io_cathode.output(false);
  }
};

// Module functions

LED.prototype.on = function () {
  this.endBlink();
  this.io_anode.output(true);
};

LED.prototype.off = function () {
  this.endBlink();
  this.io_anode.output(false);
};

LED.prototype.endBlink = function () {
  this.obniz.io.animation(this.animationName, "pause");
};

LED.prototype.blink = function (interval) {
  if (!interval) {
    interval = 100;
  }
  var frames = [{
    duration: interval,
    state: function (index) {
      // index = 0
      this.io_anode.output(true); // on
    }.bind(this)
  }, {
    duration: interval,
    state: function (index) {
      // index = 0
      this.io_anode.output(false); //off
    }.bind(this)
  }];

  this.obniz.io.animation(this.animationName, "loop", frames);
};

if (PartsRegistrate) {
  PartsRegistrate("LED", LED);
}

class WS2811 {

  constructor() {
    this.key = ["din", "vcc", "gnd"];
    this.requiredKey = ["din"];
  }

  wired(obniz) {

    this.obniz = obniz;

    this.params.mode = "master";
    this.params.frequency = 2 * 1000 * 1000;
    this.params.mosi = this.params.din;
    this.params.drive = "3v";
    this.spi = this.obniz.getSpiWithConfig(this.params);
  }

  static _generateFromByte(val) {

    val = parseInt(val);
    const zero = 0x8;
    const one = 0xE;
    let ret = [];
    for (var i = 0; i < 8; i += 2) {
      let byte = 0;
      if (val & 0x80 >> i) {
        byte = one << 4;
      } else {
        byte = zero << 4;
      }
      if (val & 0x80 >> i + 1) {
        byte |= one;
      } else {
        byte |= zero;
      }
      ret.push(byte);
    }
    return ret;
  }

  static _generateColor(r, g, b) {

    let array = WS2811._generateFromByte(r);
    array = array.concat(WS2811._generateFromByte(g));
    array = array.concat(WS2811._generateFromByte(b));
    return array;
  }

  static _generateHsvColor(h, s, v) {
    var C = v * s;
    var Hp = h / 60;
    var X = C * (1 - Math.abs(Hp % 2 - 1));

    var R, G, B;
    if (0 <= Hp && Hp < 1) {
      [R, G, B] = [C, X, 0];
    };
    if (1 <= Hp && Hp < 2) {
      [R, G, B] = [X, C, 0];
    };
    if (2 <= Hp && Hp < 3) {
      [R, G, B] = [0, C, X];
    };
    if (3 <= Hp && Hp < 4) {
      [R, G, B] = [0, X, C];
    };
    if (4 <= Hp && Hp < 5) {
      [R, G, B] = [X, 0, C];
    };
    if (5 <= Hp && Hp < 6) {
      [R, G, B] = [C, 0, X];
    };

    var m = v - C;
    [R, G, B] = [R + m, G + m, B + m];

    R = Math.floor(R * 255);
    G = Math.floor(G * 255);
    B = Math.floor(B * 255);

    let array = WS2811._generateFromByte(R);
    array = array.concat(WS2811._generateFromByte(G));
    array = array.concat(WS2811._generateFromByte(B));
    return array;
  }

  rgb(r, g, b) {
    this.spi.write(WS2811._generateColor(r, g, b));
  }

  hsv(h, s, v) {
    this.spi.write(WS2811._generateHsvColor(h, s, v));
  }

  rgbs(array) {
    let bytes = [];
    for (var i = 0; i < array.length; i++) {
      const oneArray = array[i];
      bytes = bytes.concat(WS2811._generateColor(oneArray[0], oneArray[1], oneArray[2]));
    }
    this.spi.write(bytes);
  }

  hsvs(array) {
    let bytes = [];
    for (var i = 0; i < array.length; i++) {
      const oneArray = array[i];
      bytes = bytes.concat(WS2811._generateHsvColor(oneArray[0], oneArray[1], oneArray[2]));
    }
    this.spi.write(bytes);
  }

}

if (PartsRegistrate) {
  PartsRegistrate("WS2811", WS2811);
}
var _24LC256 = function () {
  this.requiredKeys = ["address"];
  this.keys = ["sda", "scl", "clock", "pullType", "i2c", "address"];
};

_24LC256.prototype.wired = function (obniz) {
  this.params.mode = this.params.mode || "master"; //for i2c
  this.params.clock = this.params.clock || 400 * 1000; //for i2c
  this.i2c = obniz.getI2CWithConfig(this.params);
};

// Module functions

_24LC256.prototype.set = function (address, data) {
  var array = [];
  array.push(address >> 8 & 0xFF);
  array.push(address & 0xFF);
  array.push.apply(array, data);
  this.i2c.write(0x50, array);
  this.obniz.freeze(4 + 1); // write cycle time = 4ms for 24XX00, 1.5ms for 24C01C, 24C02C
};

_24LC256.prototype.getWait = (() => {
  var _ref6 = _asyncToGenerator(function* (address, length) {
    var array = [];
    array.push(address >> 8 & 0xFF);
    array.push(address & 0xFF);
    this.i2c.write(0x50, array);
    return yield this.i2c.readWait(0x50, length);
  });

  return function (_x3, _x4) {
    return _ref6.apply(this, arguments);
  };
})();

if (PartsRegistrate) {
  PartsRegistrate("24LC256", _24LC256);
};
var Button = function () {
  this.keys = ["signal", "gnd"];
  this.required = ["signal"];
};

Button.prototype.wired = function (obniz) {
  this.io_signal = obniz.getIO(this.params.signal);

  if (obniz.isValidIO(this.params.gnd)) {
    this.io_supply = obniz.getIO(this.params.gnd);
    this.io_supply.output(false);
  }

  // start input
  this.io_signal.pull("5v");

  var self = this;
  this.io_signal.input(function (value) {
    self.isPressed = value === false;
    if (self.onchange) {
      self.onchange(value === false);
    }
  });
};

Button.prototype.isPressedWait = _asyncToGenerator(function* () {
  var ret = yield this.io_signal.inputWait();
  return ret === false;
});

if (PartsRegistrate) {
  PartsRegistrate("Button", Button);
}
var JoyStick = function () {
  this.keys = ["sw", "y", "x", "vcc", "gnd", "i2c"];
  this.requiredKeys = ["sw", "y", "x"];
  this.pins = this.keys || ["sw", "y", "x", "vcc", "gnd"];
  this.pinname = { "sw": "sw12" };
  this.shortName = "joyS";
};

JoyStick.prototype.wired = function (obniz) {
  this.obniz = obniz;

  obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");

  this.io_sig_sw = obniz.getIO(this.params.sw);
  this.ad_x = obniz.getAD(this.params.x);
  this.ad_y = obniz.getAD(this.params.y);

  this.io_sig_sw.pull("5v");

  var self = this;
  this.ad_x.start(function (value) {
    self.positionX = value / 5.0;
    if (self.onchangex) {
      self.onchangex(self.positionX * 2 - 1);
    }
  });

  this.ad_y.start(function (value) {
    self.positionY = value / 5.0;
    if (self.onchangey) {
      self.onchangey(self.positionY * 2 - 1);
    }
  });

  this.io_sig_sw.input(function (value) {
    self.isPressed = value === false;
    if (self.onchangesw) {
      self.onchangesw(value === false);
    }
  });
};

JoyStick.prototype.isPressedWait = _asyncToGenerator(function* () {
  var ret = yield this.io_sig_sw.inputWait();
  return ret === false;
});

if (PartsRegistrate) {
  PartsRegistrate("JoyStick", JoyStick);
}
var KXSC7_2050 = function () {
  this.keys = ["x", "y", "z", "vcc", "gnd"];
  this.requiredKeys = ["x", "y", "z"];
};

KXSC7_2050.prototype.wired = (() => {
  var _ref9 = _asyncToGenerator(function* (obniz) {
    this.obniz = obniz;

    obniz.setVccGnd(this.params.vcc, this.params.gnd, "3v");
    this.ad_x = obniz.getAD(this.params.x);
    this.ad_y = obniz.getAD(this.params.y);
    this.ad_z = obniz.getAD(this.params.z);

    yield obniz.wait(500);
    var ad = obniz.getAD(this.params.vcc);
    var pwrVoltage = yield ad.getWait();
    var horizontalZ = yield this.ad_z.getWait();
    var sensitivity = pwrVoltage / 5; //Set sensitivity (unit:V)
    var offsetVoltage = horizontalZ - sensitivity; //Set offset voltage (Output voltage at 0g, unit:V)

    var self = this;
    this.ad_x.start(function (value) {
      self.gravity = (value - offsetVoltage) / sensitivity;
      if (self.onchangex) {
        self.onchangex(self.gravity);
      }
    });

    this.ad_y.start(function (value) {
      self.gravity = (value - offsetVoltage) / sensitivity;
      if (self.onchangey) {
        self.onchangey(self.gravity);
      }
    });

    this.ad_z.start(function (value) {
      self.gravity = (value - offsetVoltage) / sensitivity;
      if (self.onchangez) {
        self.onchangez(self.gravity);
      }
    });
  });

  return function (_x5) {
    return _ref9.apply(this, arguments);
  };
})();

if (PartsRegistrate) {
  PartsRegistrate("KXSC7_2050", KXSC7_2050);
}
var Potentiometer = function () {
  this.keys = ["pin0", "pin1", "pin2"];
  this.reuiredKeys = ["pin0", "pin1", "pin2"];

  this.vcc_voltage = 5.0;
};

Potentiometer.prototype.wired = function (obniz) {
  this.obniz.setVccGnd(this.params.pin0, this.params.pin2, "5v");
  this.ad = obniz.getAD(this.params.pin1);

  var self = this;

  obniz.getAD(this.params.pin0).start(function (value) {
    self.vcc_voltage = value;
  });

  this.ad.start(function (value) {
    self.position = value / self.vcc_voltage;
    if (self.onchange) {
      self.onchange(self.position);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("Potentiometer", Potentiometer);
}
var DCMotor = function () {
  this.keys = ["forward", "back"];
  this.requiredKeys = ["forward", "back"];
};

DCMotor.prototype.wired = function (obniz) {
  this.status = {
    direction: null,
    power: null
  };

  this.pwm1_io_num = this.params.forward;
  this.pwm2_io_num = this.params.back;

  this.pwm1 = obniz.getFreePwm();
  this.pwm1.start(this.pwm1_io_num);
  this.pwm1.freq(100000);
  this.pwm2 = obniz.getFreePwm();
  this.pwm2.start(this.pwm2_io_num);
  this.pwm2.freq(100000);
  this.power(30);
  this.pwm1.forceWorking(true);
  this.pwm2.forceWorking(true);
};

// Module functions

DCMotor.prototype.forward = function () {
  this.move(true);
};

DCMotor.prototype.reverse = function () {
  this.move(false);
};

DCMotor.prototype.stop = function () {
  if (this.status.direction === null) {
    return;
  }
  this.status.direction = null;
  this.pwm1.duty(0);
  this.pwm2.duty(0);
};

DCMotor.prototype.move = function (forward) {
  if (forward) {
    if (this.status.direction === true) {
      return;
    }
    this.status.direction = true;
  } else {
    if (this.status.direction === false) {
      return;
    }
    this.status.direction = false;
  }
  var power = this.power();
  this.power(0);
  this.power(power);
};

DCMotor.prototype.power = function (power) {
  if (power === undefined) {
    return this.status.power;
  }
  this.status.power = power;
  if (this.status.direction === null) {
    this.pwm1.duty(0);
    this.pwm2.duty(0);
    return;
  }
  if (this.status.direction) {
    this.pwm1.duty(power);
    this.pwm2.duty(0);
  } else {
    this.pwm1.duty(0);
    this.pwm2.duty(power);
  }
};

if (PartsRegistrate) {
  PartsRegistrate("DCMotor", DCMotor);
}
var ServoMotor = function () {
  this.keys = ["gnd", "vcc", "signal"];
  this.requiredKeys = ["signal"];
};

ServoMotor.prototype.wired = function (obniz) {
  this.obniz = obniz;

  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");

  this.pwm = obniz.getFreePwm();
  this.pwm_io_num = this.params.signal;

  this.pwm.start(this.pwm_io_num);
  this.pwm.freq(50);
};

// Module functions

ServoMotor.prototype.angle = function (ratio) {
  var max = 2.4;
  var min = 0.5;
  var val = (max - min) * ratio / 180.0 + min;
  this.pwm.pulse(val);
};

ServoMotor.prototype.on = function () {
  if (this.io_power) {
    this.io_power.output(true);
  }
};

ServoMotor.prototype.off = function () {
  if (this.io_power) {
    this.io_power.output(false);
  }
};

if (PartsRegistrate) {
  PartsRegistrate("ServoMotor", ServoMotor);
}
var PIR_ekmc = function () {
  this.keys = ["vcc", "gnd", "signal"];
  this.requiredKeys = ["signal"];
};

PIR_ekmc.prototype.wired = function (obniz) {
  this.obniz = obniz;
  this.io_signal = obniz.getIO(this.params.signal);
  this.io_signal.pull("0v");

  obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");

  var self = this;
  this.io_signal.input(function (value) {
    self.isPressed = value === false;
    if (self.onchange) {
      self.onchange(value === false);
    }
  });
};

PIR_ekmc.prototype.isPressedWait = _asyncToGenerator(function* () {
  var self = this;
  var ret = yield this.io_signal.inputWait();
  return ret == false;
});

if (PartsRegistrate) {
  PartsRegistrate("PIR_ekmc", PIR_ekmc);
}
//Todo:抵抗を追加して圧力(kg)を求められるように改造する
var FSR40X = function () {
  this.keys = ["pin0", "pin1"];
  this.requiredKeys = ["pin0", "pin1"];
};

FSR40X.prototype.wired = function (obniz) {
  this.obniz = obniz;

  this.io_pwr = obniz.getIO(this.params.pin0);
  this.ad = obniz.getAD(this.params.pin1);

  this.io_pwr.drive("5v");
  this.io_pwr.output(true);

  var self = this;
  this.ad.start(function (value) {
    pressure = value * 100;
    if (pressure >= 49) {
      pressure = 49;
    }
    self.press = pressure;
    if (self.onchange) {
      self.onchange(self.press);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("FSR40X", FSR40X);
}

var SEN0114 = function () {
  this.keys = ["vcc", "output", "gnd"];
  this.requiredKeys = ["output"];
};

SEN0114.prototype.wired = function (obniz) {
  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad = obniz.getAD(this.params.output);

  var self = this;
  this.ad.start(function (value) {
    self.temp = value; //Temp(Celsius) = [AD Voltage] * 100
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

SEN0114.prototype.getHumidityWait = _asyncToGenerator(function* () {
  return yield this.ad.getWait;
});

if (PartsRegistrate) {
  PartsRegistrate("SEN0114", SEN0114);
}

class Speaker {

  constructor(obniz) {
    this.keys = ["signal", "gnd"];
    this.requiredKeys = ["gnd"];
  }

  wired(obniz) {
    this.obniz = obniz;
    this.obniz.setVccGnd(null, this.params.gnd, "5v");
    this.pwm = obniz.getFreePwm();
    this.pwm.start(this.params.signal);
  }

  play(freq) {
    if (freq > 0) {
      this.pwm.freq(freq);
      this.pwm.pulse(1 / freq / 2 * 1000);
    } else {
      this.pwm.pulse(0);
    }
  }

  stop() {
    this.play(0);
  }
}

if (PartsRegistrate) {
  PartsRegistrate("Speaker", Speaker);
}
var ADT7310 = function () {
  this.keys = ["vcc", "gnd", "frequency", "din", "dout", "clk", "spi"];
  this.requiredKeys = [];
};

ADT7310.prototype.wired = (() => {
  var _ref12 = _asyncToGenerator(function* (obniz) {
    this.obniz = obniz;

    obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");

    this.params.mode = this.params.mode || "master";
    this.params.frequency = this.params.frequency || 500000;
    this.params.frequency = this.params.frequency || 500000;
    this.params.mosi = this.params.din;
    this.params.miso = this.params.dout;
    this.spi = this.obniz.getSpiWithConfig(this.params);
  });

  return function (_x6) {
    return _ref12.apply(this, arguments);
  };
})();

ADT7310.prototype.getTempWait = _asyncToGenerator(function* () {
  yield this.spi.writeWait([0x54]); //毎回コマンドを送らないと安定しない
  yield this.obniz.wait(200); //適度な値でないと安定しない
  var ret = yield this.spi.writeWait([0x00, 0x00]);
  var tempBin = ret[0] << 8;
  tempBin |= ret[1];
  tempBin = tempBin >> 3;

  if (tempBin & 0x1000) {
    //0度以下の時の処理
    tempBin = tempBin - 8192;
  }

  return tempBin / 16;
});

if (PartsRegistrate) {
  PartsRegistrate("ADT7310", ADT7310);
}

var ADT7410 = function () {
  this.keys = ["vcc", "gnd", "sda", "scl", "addressMode"];
  this.requiredKey = ["addressMode"];
};

ADT7410.prototype.wired = function (obniz) {
  this.obniz = obniz;
  obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");

  if (this.params.addressMode === 8) {
    this.address = 0x48;
  } else if (this.params.addressMode === 9) {
    this.address = 0x49;
  }

  this.params.clock = 400000;
  this.params.pull = "5v";
  this.params.mode = "master";

  this.i2c = obniz.getI2CWithConfig(this.params);
};

ADT7410.prototype.getTempWait = _asyncToGenerator(function* () {
  var ret = yield this.i2c.readWait(this.address, 2);
  var tempBin = ret[0] << 8;
  tempBin |= ret[1];
  tempBin = tempBin >> 3;

  if (tempBin & 0x1000) {
    //0度以下の時の処理
    tempBin = tempBin - 8192;
  }

  return tempBin / 16;
});

if (PartsRegistrate) {
  PartsRegistrate("ADT7410", ADT7410);
}

var LM35DZ = function () {
  this.keys = ["vcc", "gnd", "output"];
  this.requiredKeys = ["output"];
};

LM35DZ.prototype.wired = function (obniz) {
  this.obniz = obniz;
  obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad = obniz.getAD(this.params.output);

  var self = this;
  this.ad.start(function (value) {
    self.temp = value * 100; //Temp(Celsius) = [AD Voltage] * 100
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("LM35DZ", LM35DZ);
}

var LM60 = function () {
  this.keys = ["vcc", "gnd", "output"];
  this.requiredKeys = ["output"];
};

LM60.prototype.wired = function (obniz) {
  this.obniz = obniz;
  this.ad = obniz.getAD(this.params.output);

  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  var self = this;
  this.ad.start(function (value) {
    self.temp = Math.round((value - 0.424) / 0.00625 * 10) / 10; //Temp(Celsius) = ([AD Voltage]-[Voltage at 0 deg(Offset voltage)])/[Temp coefficient]
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("LM60", LM60);
}

var LM61 = function () {
  this.keys = ["vcc", "output", "gnd"];
  this.requiredKeys = ["output"];
};

LM61.prototype.wired = function (obniz) {

  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad = obniz.getAD(this.params.output);

  var self = this;
  this.ad.start(function (value) {
    self.temp = Math.round((value - 0.6) / 0.01); //Temp(Celsius) = ([AD Voltage]-[Voltage at 0 deg(Offset voltage)])/[Temp coefficient]
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("LM61", LM61);
}

var MCP9700 = function () {

  this.keys = ["vcc", "output", "gnd"];
  this.requiredKeys = ["output"];
};

MCP9700.prototype.wired = function (obniz) {
  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad = obniz.getAD(this.params.output);

  var self = this;
  this.ad.start(function (value) {
    self.temp = (value - 0.5) / 0.01; //Temp(Celsius) = ([AD Voltage]-[Voltage at 0 deg])/[Temp coefficient]
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("MCP9700", MCP9700);
}

var MCP9701 = function () {

  this.keys = ["vcc", "output", "gnd"];
  this.requiredKeys = ["output"];
};

MCP9701.prototype.wired = function (obniz) {
  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad = obniz.getAD(this.params.output);

  var self = this;
  this.ad.start(function (value) {
    self.temp = (value - 0.4) / 0.0195; //Temp(Celsius) = ([AD Voltage]-[Voltage at 0 deg])/[Temp coefficient]
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("MCP9701", MCP9701);
}

//センサからの反応なし
var S5851A = function () {
  this.requiredKeys = ["vcc", "gnd", "adr0", "adr1", "adr_select"];
  this.keys = ["sda", "scl", "adr0", "adr1", "adr_select", "i2c"];
};

S5851A.prototype.wired = function (obniz) {
  //params: pwr, gnd, sda, scl, adr0, adr1, adr_select
  this.io_adr0 = obniz.getIO(this.params.adr0);
  this.io_adr1 = obniz.getIO(this.params.adr1);

  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");

  switch (this.params.adr_select) {
    case 8:
      this.io_adr0.output(false);
      this.io_adr1.output(false);
      this.address = 0x48;
      break;
    case 9:
      this.io_adr0.pull(null);
      this.io_adr1.output(false);
      this.address = 0x49;
      break;
    case 'A':
      this.io_adr0.output(true);
      this.io_adr1.output(false);
      this.address = 0x4A;
      break;
    case 'B':
      this.io_adr0.output(false);
      this.io_adr1.output(true);
      this.address = 0x4B;
      break;
    case 'C':
      this.io_adr0.pull(null);
      this.io_adr1.output(true);
      this.address = 0x4C;
      break;
    case 'D':
      this.io_adr0.output(true);
      this.io_adr1.output(true);
      this.address = 0x4D;
      break;
    case 'E':
      this.io_adr0.output(false);
      this.io_adr1.pull(null);
      this.address = 0x4E;
      break;
    case 'F':
      this.io_adr0.output(true);
      this.io_adr1.pull(null);
      this.address = 0x4F;
      break;
    default:
      this.io_adr0.output(false);
      this.io_adr1.output(false);
      this.address = 0x48;
      break;
  }
  console.log('i2c address=' + this.address);

  this.params.clock = this.params.clock || 400 * 1000; //for i2c
  this.params.mode = this.params.mode || "master"; //for i2c
  this.params.pull = this.params.pull || "5v"; //for i2c
  this.i2c = obniz.getI2CWithConfig(this.params);
  //obniz.i2c0.write(address, [0x20, 0x24]);
};

S5851A.prototype.getTempWait = _asyncToGenerator(function* () {
  //console.log("gettempwait");
  //obniz.i2c0.write(address, [0x20, 0x24]);
  //obniz.i2c0.write(address, [0xE0, 0x00]);
  var ret = yield this.i2c0.readWait(address, 2);
  //console.log('ret:' + ret);
  var tempBin = ret[0].toString(2) + ('00000000' + ret[1].toString(2)).slice(-8);
  var temperature = -45 + 175 * (parseInt(tempBin, 2) / (65536 - 1));
  return temperature;
});

S5851A.prototype.getHumdWait = _asyncToGenerator(function* () {
  this.i2c.write(address, [0x20, 0x24]);
  this.i2c.write(address, [0xE0, 0x00]);
  var ret = yield this.i2c.readWait(address, 4);
  var humdBin = ret[2].toString(2) + ('00000000' + ret[3].toString(2)).slice(-8);
  var humidity = 100 * (parseInt(humdBin, 2) / (65536 - 1));
  return humidity;
});

if (PartsRegistrate) {
  PartsRegistrate("S5851A", S5851A);
}

//センサから出力が無い(出力インピーダンス高すぎ？)
var S8100B = function () {
  this.keys = ["vcc", "output", "gnd"];
  this.requiredKeys = ["output"];
};

S8100B.prototype.wired = function (obniz) {
  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad = obniz.getAD(this.params.output);

  var self = this;
  this.ad.start(function (value) {
    self.temp = 30 + (1.508 - value) / -0.08; //Temp(Celsius) =
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("S8100B", S8100B);
}

//不調, 正しく測れるときもある...
//原因1:obnizの入力インピーダンスが低すぎる?
//原因2:センサーが発振してる？（データシート通り抵抗を追加したが改善しない）
var S8120C = function () {
  this.keys = ["vcc", "output", "gnd"];
  this.requiredKeys = ["output"];
};

S8120C.prototype.wired = function (obniz) {
  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.ad = obniz.getAD(this.params.output);

  var self = this;
  this.ad.start(function (value) {
    self.temp = (value - 1.474) / -0.0082 + 30; //Temp(Celsius) = (([AD Voltage] - [Output Voltage at 30deg])/[V/deg]) + 30
    console.log('value:' + value);
    if (self.onchange) {
      self.onchange(self.temp);
    }
  });
};

if (PartsRegistrate) {
  PartsRegistrate("S8120C", S8120C);
}

var SHT31 = function () {
  this.requiredKeys = ["adr", "addressmode", "i2c"];
  this.keys = ["vcc", "sda", "scl", "gnd", "adr", "addressmode", "i2c"];
};

SHT31.prototype.wired = function (obniz) {
  this.obniz = obniz;
  this.obniz.setVccGnd(this.params.vcc, this.params.gnd, "5v");
  this.io_adr = obniz.getIO(this.params.adr);

  if (this.params.addressmode === 4) {
    this.io_adr.output(false);
    this.address = 0x44;
  } else if (this.params.addressmode === 5) {
    this.io_adr.pull(null);
    this.address = 0x45;
  }

  this.params.clock = this.params.clock || 400 * 1000; //for i2c
  this.params.mode = this.params.mode || "master"; //for i2c
  this.params.pullType = this.params.pullType || "float"; //for i2c
  this.i2c = obniz.getI2CWithConfig(this.params);
  //obniz.i2c0.write(address, [0x20, 0x24]);
};

SHT31.prototype.getTempWait = _asyncToGenerator(function* () {
  this.i2c.write(this.address, [0x20, 0x24]);
  this.i2c.write(this.address, [0xE0, 0x00]);
  var ret = yield this.i2c0.readWait(this.address, 4);
  var tempBin = ret[0].toString(2) + ('00000000' + ret[1].toString(2)).slice(-8);
  var temperature = -45 + 175 * (parseInt(tempBin, 2) / (65536 - 1));
  return temperature;
});

SHT31.prototype.getHumdWait = _asyncToGenerator(function* () {
  this.i2c.i2c0.write(this.address, [0x20, 0x24]);
  this.i2c.i2c0.write(this.address, [0xE0, 0x00]);
  var ret = yield this.i2c.i2c0.readWait(this.address, 4);
  var humdBin = ret[2].toString(2) + ('00000000' + ret[3].toString(2)).slice(-8);
  var humidity = 100 * (parseInt(humdBin, 2) / (65536 - 1));
  return humidity;
});

if (PartsRegistrate) {
  PartsRegistrate("SHT31", SHT31);
}