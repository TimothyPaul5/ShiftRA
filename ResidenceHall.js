class ResidenceHall {
    constructor(
        hallID,
        name,
        capacity,
        raIDs = [],
        weekdayStaffNeeded = 1,
        weekendStaffNeeded = 1
    ) {
        this.hallID = hallID;
        this.name = name;
        this.capacity = capacity;
        this.raIDs = raIDs;
        this.weekdayStaffNeeded = weekdayStaffNeeded;
        this.weekendStaffNeeded = weekendStaffNeeded;
    }

    getHallID() {
        return this.hallID;
    }

    getName() {
        return this.name;
    }

    getCapacity() {
        return this.capacity;
    }

    getRAIDs() {
        return this.raIDs;
    }

    getWeekdayStaffNeeded() {
        return this.weekdayStaffNeeded;
    }

    getWeekendStaffNeeded() {
        return this.weekendStaffNeeded;
    }

    setName(name) {
        this.name = name;
    }

    setCapacity(capacity) {
        this.capacity = capacity;
    }

    setWeekdayStaffNeeded(count) {
        this.weekdayStaffNeeded = count;
    }

    setWeekendStaffNeeded(count) {
        this.weekendStaffNeeded = count;
    }

    addRA(raID) {
        if (this.raIDs.includes(raID)) {
            return { success: false, message: "RA already assigned to this hall." };
        }

        if (this.raIDs.length >= this.capacity) {
            return { success: false, message: "Residence hall is already at capacity." };
        }

        this.raIDs.push(raID);
        return { success: true };
    }

    removeRA(raID) {
        const index = this.raIDs.indexOf(raID);

        if (index === -1) {
            return { success: false, message: "RA not found in this hall." };
        }

        this.raIDs.splice(index, 1);
        return { success: true };
    }

    toJSON() {
        return {
            hallID: this.hallID,
            name: this.name,
            capacity: this.capacity,
            raIDs: this.raIDs,
            weekdayStaffNeeded: this.weekdayStaffNeeded,
            weekendStaffNeeded: this.weekendStaffNeeded
        };
    }
}

module.exports = ResidenceHall;