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
        return this.RAs.find(
            (ra) => ra.getName() === name || ra.name === name
        );
    }

    getRAByID(userID) {
        return this.RAs.find((ra) => ra.getUserID() === userID);
    }

    getRAsByHallName(hallName) {
        return this.RAs.filter((ra) => ra.getResidenceHall() === hallName);
    }

    displaySchedule() {
        return "Schedule display is handled through generated schedule JSON.";
    }
}

module.exports = ScheduleManager;