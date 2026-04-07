const fs = require("fs");

class AvailabilityDB {
    constructor(filePath = null) {
        this.filePath = filePath;
        this.data = this.createEmptySchedule();

        if (this.filePath) {
            this.loadFromFile();
        }
    }

    createEmptySchedule() {
        return {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
        };
    }

    normalizeDataShape(raw) {
        const clean = this.createEmptySchedule();

        if (!raw || typeof raw !== "object") {
            return clean;
        }

        for (const day of Object.keys(clean)) {
            if (Array.isArray(raw[day])) {
                clean[day] = raw[day];
            }
        }

        return clean;
    }

    loadFromFile() {
        if (!this.filePath) return;

        try {
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
                return;
            }

            const raw = fs.readFileSync(this.filePath, "utf-8").trim();
            if (!raw) {
                this.data = this.createEmptySchedule();
                this.saveToFile();
                return;
            }

            const parsed = JSON.parse(raw);
            this.data = this.normalizeDataShape(parsed);
        } catch {
            this.data = this.createEmptySchedule();
            this.saveToFile();
        }
    }

    saveToFile() {
        if (!this.filePath) return;
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    addAvailability(day, name, timeZone = "CST", type = "weekday") {
        if (!this.data[day]) return false;
        if (!name) return false;

        const exists = this.data[day].some((entry) => entry.name === name);
        if (exists) return false;

        this.data[day].push({
            name,
            timeZone,
            type
        });

        this.saveToFile();
        return true;
    }

    removeAvailability(day, name) {
        if (!this.data[day]) return false;

        const before = this.data[day].length;
        this.data[day] = this.data[day].filter((entry) => entry.name !== name);

        const changed = this.data[day].length !== before;
        if (changed) this.saveToFile();

        return changed;
    }

    getAvailability(day) {
        if (!this.data[day]) return [];
        return this.data[day];
    }

    getAllAvailability() {
        return this.data;
    }

    clearAll() {
        this.data = this.createEmptySchedule();
        this.saveToFile();
    }
}

module.exports = AvailabilityDB;