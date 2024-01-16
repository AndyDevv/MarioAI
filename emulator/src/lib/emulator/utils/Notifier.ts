class Notifier {
  observers: any[];
  constructor() {
    this.observers = [];
  }

  addObserver(obs: any) {
    this.observers.push(obs);
  }

  removeObserver(obs: any) {
    this.observers = this.observers.filter(i => i !== obs);
  }

  notifyObservers(t: any, e: any) {
    this.observers.forEach(obs => obs.notify(t, e));
  }
}

export default Notifier;
