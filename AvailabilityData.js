class AvailabilityDB {
    constructor() {
        this.data = this.createEmptySchedule();
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

    isValidTime(startTime, endTime) {
        return startTime < endTime;
    }

    isOverlapping(day, startTime, endTime) {
        let slots = this.data[day];

        for (let i = 0; i < slots.length; i++) {
            let s = slots[i].startTime;
            let e = slots[i].endTime;

            if (startTime < e && endTime > s) {
                return true;
            }
        }

        return false;
    }

    addAvailability(day, startTime, endTime, name, timeZone, type) {
        if (!this.data[day]) return false;

        if (!this.isValidTime(startTime, endTime)) return false;

        if (!name || !timeZone || !type) return false;

        if (this.isOverlapping(day, startTime, endTime)) return false;

        let slots = this.data[day];

        for (let i = 0; i < slots.length; i++) {
            if (
                slots[i].startTime === startTime &&
                slots[i].endTime === endTime &&
                slots[i].name === name
            ) {
                return false;
            }
        }

        slots.push({
            startTime: startTime,
            endTime: endTime,
            name: name,
            timeZone: timeZone,
            type: type
        });

        return true;
    }

    removeAvailability(day, startTime, endTime, name) {
        if (!this.data[day]) return;

        let slots = this.data[day];
        let newSlots = [];

        for (let i = 0; i < slots.length; i++) {
            let slot = slots[i];

            if (
                !(slot.startTime === startTime &&
                  slot.endTime === endTime &&
                  slot.name === name)
            ) {
                newSlots.push(slot);
            }
        }

        this.data[day] = newSlots;
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
    }
}