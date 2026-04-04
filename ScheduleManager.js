const Schedule = require("./Schedule");
const RA = require("./RA");

class ScheduleManager {
    constructor() {
        this.RAs = []; // Array of RA objects
        this.schedule = new Schedule();
    }

    addRA(ra) {
        if (ra instanceof RA) this.RAs.push(ra);
        else console.log("Invalid RA object.");
    }

    getRAByName(name) {
        return this.RAs.find(r => r.name === name);
    }

    autoAssignShifts() {
        if (this.RAs.length === 0) {
            console.log("No RAs available for scheduling.");
            return;
        }

        // Example auto-assign: each RA gets one shift per day from availability
        for (const ra of this.RAs) {
            ra.getAvailability().forEach(block => {
                const [day, time] = block.split(" ");
                const [start, end] = time.split("-");
                this.schedule.addItem(ra.name, day, start, end);
            });
        }

        console.log("Shifts auto-assigned based on availability.");
    }

    displaySchedule() {
        return this.schedule.display();
    }

    displayRAStats() {
        if (this.RAs.length === 0) return "No RA stats available.";
        return this.RAs.map(ra => `${ra.name} (${ra.residenceHall}): ${ra.getAvailability().length} availability blocks`).join("\n");
    }
}

module.exports = ScheduleManager;