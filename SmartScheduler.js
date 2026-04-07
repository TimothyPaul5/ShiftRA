const fs = require("fs");
const path = require("path");

class SmartScheduler {
    constructor(availabilityDB, hallService, scheduleMgr) {
        this.availabilityDB = availabilityDB;
        this.hallService = hallService;
        this.scheduleMgr = scheduleMgr;
        this.results = {};
        this.assignmentStats = {};
    }

    generateSchedule(hallNeeds, startDate, endDate) {
        const halls = this.hallService.getAllResidenceHalls();
        const availability = this.availabilityDB.getAllAvailability();

        this.results = {};
        this.assignmentStats = {};
        this.initializeStats();

        const datesInRange = this.getDatesInRange(startDate, endDate);

        for (const hall of halls) {
            const hallName = hall.getName();

            if (!hallNeeds[hallName]) {
                continue;
            }

            const raIDs = hall.getRAIDs();
            const weekdayNeed = hallNeeds[hallName]?.weekday || 1;
            const weekendNeed = hallNeeds[hallName]?.weekend || 1;

            this.results[hallName] = this.buildScheduleForHall(
                hall,
                raIDs,
                weekdayNeed,
                weekendNeed,
                availability,
                datesInRange
            );
        }

        this.save();
        return this.results;
    }

    initializeStats() {
        for (const ra of this.scheduleMgr.RAs) {
            this.assignmentStats[ra.getName()] = {
                total: 0,
                primary: 0,
                secondary: 0
            };
        }
    }

    getDatesInRange(startDate, endDate) {
        const dates = [];
        const current = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);

        while (current <= end) {
            dates.push(this.toISODate(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    toISODate(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    getDayNameFromISO(dateString) {
        const date = new Date(`${dateString}T00:00:00`);
        const names = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ];
        return names[date.getDay()];
    }

    buildScheduleForHall(hall, raIDs, weekdayNeed, weekendNeed, availability, datesInRange) {
        const schedule = {};

        const ras = this.scheduleMgr.RAs.filter((ra) =>
            raIDs.includes(ra.getUserID())
        );

        for (const date of datesInRange) {
            const dayName = this.getDayNameFromISO(date);
            const isWeekend = ["Friday", "Saturday"].includes(dayName);
            const needed = isWeekend ? weekendNeed : weekdayNeed;

            schedule[date] = [];

            const availableRAs = ras.filter((ra) =>
                Array.isArray(availability[dayName]) &&
                availability[dayName].some((a) => a.name === ra.getName())
            );

            if (availableRAs.length === 0) {
                for (let i = 0; i < needed; i++) {
                    schedule[date].push({
                        hall: hall.getName(),
                        date,
                        dayOfWeek: dayName,
                        role: i === 0 ? "Primary" : "Secondary",
                        assignedTo: i === 0 ? "UNASSIGNED" : "NO SECONDARY AVAILABLE"
                    });
                }
                continue;
            }

            const chosenRAs = this.selectBestRAsForDate(availableRAs, needed);

            for (let i = 0; i < needed; i++) {
                const assignedRA = chosenRAs[i] || null;
                const role = i === 0 ? "Primary" : "Secondary";

                schedule[date].push({
                    hall: hall.getName(),
                    date,
                    dayOfWeek: dayName,
                    role,
                    assignedTo: assignedRA
                        ? assignedRA.getName()
                        : i === 0
                            ? "UNASSIGNED"
                            : "NO SECONDARY AVAILABLE"
                });

                if (assignedRA) {
                    this.recordAssignment(assignedRA.getName(), role);
                }
            }
        }

        return schedule;
    }

    selectBestRAsForDate(availableRAs, needed) {
        const remaining = [...availableRAs];
        const chosen = [];

        for (let slot = 0; slot < needed; slot++) {
            if (remaining.length === 0) break;

            const role = slot === 0 ? "Primary" : "Secondary";
            const best = this.pickBestRAForRole(remaining, role);

            chosen.push(best);

            const index = remaining.findIndex((ra) => ra.getName() === best.getName());
            if (index !== -1) {
                remaining.splice(index, 1);
            }
        }

        return chosen;
    }

    pickBestRAForRole(candidates, role) {
        const sorted = [...candidates].sort((a, b) => {
            const aStats = this.assignmentStats[a.getName()] || { total: 0, primary: 0, secondary: 0 };
            const bStats = this.assignmentStats[b.getName()] || { total: 0, primary: 0, secondary: 0 };

            if (role === "Primary") {
                if (aStats.primary !== bStats.primary) {
                    return aStats.primary - bStats.primary;
                }
            } else {
                if (aStats.secondary !== bStats.secondary) {
                    return aStats.secondary - bStats.secondary;
                }
            }

            if (aStats.total !== bStats.total) {
                return aStats.total - bStats.total;
            }

            return a.getName().localeCompare(b.getName());
        });

        return sorted[0];
    }

    recordAssignment(raName, role) {
        if (!this.assignmentStats[raName]) {
            this.assignmentStats[raName] = {
                total: 0,
                primary: 0,
                secondary: 0
            };
        }

        this.assignmentStats[raName].total += 1;

        if (role === "Primary") {
            this.assignmentStats[raName].primary += 1;
        } else {
            this.assignmentStats[raName].secondary += 1;
        }
    }

    save(file = path.join(__dirname, "data/generatedSchedule.json")) {
        fs.writeFileSync(file, JSON.stringify(this.results, null, 2));
    }
}

module.exports = SmartScheduler;