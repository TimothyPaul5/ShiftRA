class ScheduledItem {
    constructor(raName, day, startTime, endTime) {
        this.raName = raName;
        this.day = day;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    toString() {
        return `${this.day}: ${this.raName} from ${this.startTime} to ${this.endTime}`;
    }
}

module.exports = ScheduledItem;