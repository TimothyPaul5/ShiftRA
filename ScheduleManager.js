const RA = require("./RA");
const Schedule = require("./Schedule");

class ScheduleManager {
    constructor() { this.RAs = []; this.schedule = new Schedule(); }
    addRA(ra) { if (ra instanceof RA) this.RAs.push(ra); }
    getRAByName(name) { return this.RAs.find(r => r.name === name); }
    displaySchedule() { return this.schedule.display(); }
}
module.exports = ScheduleManager;
