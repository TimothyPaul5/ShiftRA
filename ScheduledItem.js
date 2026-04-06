class ScheduledItem {
    constructor(raName, day, start, end) {
        this.raName = raName;
        this.day = day;
        this.startTime = start;
        this.endTime = end;
    }
    toString() { return `${this.day}: ${this.raName} ${this.startTime}-${this.endTime}`; }
}
module.exports = ScheduledItem;
