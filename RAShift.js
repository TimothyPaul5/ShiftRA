const RA = require("./RA");
const ScheduleManager = require("./ScheduleManager");
const { ask } = require("./CLIUtils"); // Shared readline utils

class RAShift {
    constructor(scheduleManager) {
        this.scheduleManager = scheduleManager;
    }

    async submitAvailabilityFlow() {
        console.log("\n--- Submit RA Availability ---");
        const raName = await ask("Enter RA name: ");
        const ra = this.scheduleManager.getRAByName(raName);

        if (!ra) {
            console.log(`RA '${raName}' not found.`);
            return;
        }

        const timeBlock = await ask("Enter time block (e.g., Mon 8-10am): ");
        ra.submitAvailability(timeBlock);

        console.log(`Availability submitted for ${ra.name}: ${timeBlock}`);
    }
}

module.exports = RAShift;