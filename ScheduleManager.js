const RA = require("./RA");

class ScheduleManager {
    constructor() {
        this.RAs = [];
    }

    addRA(ra) {
        if (ra instanceof RA) {
            this.RAs.push(ra);
        }
    }

    getRAByName(name) {
        return this.RAs.find((r) => r.name === name || r.getName() === name);
    }

    displaySchedule() {
        return "Schedule display is handled through generated schedule JSON.";
    }
}

module.exports = ScheduleManager;