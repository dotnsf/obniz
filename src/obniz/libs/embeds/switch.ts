
type ObnizSwitchCallback = (result: boolean) => void;

class ObnizSwitch {
  public Obniz: any;
  public observers!: ObnizSwitchCallback[];
  public onChangeForStateWait: any;
  public state: any;
  public onchange: any;

  constructor(Obniz: any) {
    this.Obniz = Obniz;
    this._reset();
  }

  public _reset() {
    this.observers = [];
    this.onChangeForStateWait = () => {
    };
  }

  public addObserver(callback: ObnizSwitchCallback) {
    if (callback) {
      this.observers.push(callback);
    }
  }

  public getWait() {
    const self: any = this;
    return new Promise((resolve: any, reject: any) => {
      const obj: any = {};
      obj.switch = "get";
      self.Obniz.send(obj);
      self.addObserver(resolve);
    });
  }

  public stateWait(isPressed: boolean) {
    const self: any = this;
    return new Promise((resolve: any, reject: any) => {
      self.onChangeForStateWait = (pressed: any) => {
        if (isPressed === pressed) {
          self.onChangeForStateWait = () => {
          };
          resolve();
        }
      };
    });
  }

  public notified(obj: any) {
    this.state = obj.state;
    if (this.onchange) {
      this.onchange(this.state);
    }
    this.onChangeForStateWait(this.state);

    const callback: any = this.observers.shift();
    if (callback) {
      callback(this.state);
    }
  }
}

export default ObnizSwitch;