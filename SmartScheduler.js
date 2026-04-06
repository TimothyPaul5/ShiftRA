const fs = require("fs");
const path = require("path");

class SmartScheduler {
    constructor(availabilityDB, hallService, scheduleMgr) {
        this.availabilityDB = availabilityDB;
        this.hallService = hallService;
        this.scheduleMgr = scheduleMgr;
        this.results = {};
    }

    generateSchedule(hallNeeds) {
        const halls = this.hallService.getAllResidenceHalls();
        const availability = this.availabilityDB.getAllAvailability();

        this.results = {};

        for (const hall of halls) {
            const hallName = hall.getName();
            const raIDs = hall.getRAIDs();

            const weekdayNeed = hallNeeds[hallName]?.weekday || 1;
            const weekendNeed = hallNeeds[hallName]?.weekend || 1;

            this.results[hallName] = this.buildScheduleForHall(
                hall,
                raIDs,
                weekdayNeed,
                weekendNeed,
                availability
            );
        }

        this.save();
        return this.results;
    }

    buildScheduleForHall(hall, raIDs, weekdayNeed, weekendNeed, availability) {
        const schedule = {};
        const days = Object.keys(availability);

        //RAs assigned to this hall
        const ras = this.scheduleMgr.RAs.filter(r =>
            raIDs.includes(r.getUserID())
        );

        for (const day of days) {
            const isWeekend = ["Saturday", "Sunday"].includes(day);
            const needed = isWeekend ? weekendNeed : weekdayNeed;

            schedule[day] = [];

            //ONLY RAs available on this day
            const availableRAs = ras.filter(ra =>
                availability[day].some(a => a.name === ra.getName())
            );


            const shuffled = [...availableRAs].sort(() => Math.random() - 0.5);

            for (let i = 0; i < needed; i++) {
                let assignedRA = null;

                if (shuffled.length > 0) {
                    assignedRA = shuffled[i % shuffled.length];
                }

                schedule[day].push({
                    hall: hall.getName(),
                    day: day,
                    role: i === 0 ? "Primary" : "Secondary",
                    assignedTo: assignedRA
                        ? assignedRA.getName()
                        : i === 0
                            ? "UNASSIGNED"
                            : "NO SECONDARY AVAILABLE"
                });
            }
        }

        return schedule;
    }

    save(file = path.join(__dirname, "data/generatedSchedule.json")) {
        fs.writeFileSync(file, JSON.stringify(this.results, null, 2));
    }
}

module.exports = SmartScheduler;