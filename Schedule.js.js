const ScheduledItem = require("./ScheduledItem");
class Schedule {
    constructor() { this.items = []; }
    addItem(raName, day, start, end) { this.items.push(new ScheduledItem(raName, day, start, end)); }
    display() { return this.items.length?this.items.map(i=>i.toString()).join("\n"):"No shifts."; }
}
module.exports = Schedule;
