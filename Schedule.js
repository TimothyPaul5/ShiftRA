const ScheduledItem = require("./ScheduledItem");

class Schedule {
    constructor() {
        this.items = [];
    }

    addItem(raName, day, startTime, endTime) {
        const item = new ScheduledItem(raName, day, startTime, endTime);
        this.items.push(item);
    }

    display() {
        if (this.items.length === 0) return "No shifts scheduled.";
        return this.items.map((i) => i.toString()).join("\n");
    }
}

module.exports = Schedule;