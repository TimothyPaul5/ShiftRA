const fs = require("fs");
const path = require("path");
const ResidenceHall = require("./ResidenceHall");

class ResidenceHallService {
    constructor(filePath = path.join(__dirname, "dataresidenceHalls.json")) {
        this.filePath = filePath;
    }

    load() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, "[]");
        }

        const raw = fs.readFileSync(this.filePath, "utf-8").trim();
        const parsed = raw ? JSON.parse(raw) : [];

        return parsed.map(
            (hall) =>
                new ResidenceHall(
                    hall.hallID,
                    hall.name,
                    hall.capacity,
                    hall.raIDs || [],
                    hall.weekdayStaffNeeded ?? 1,
                    hall.weekendStaffNeeded ?? 1
                )
        );
    }

    save(halls) {
        fs.writeFileSync(
            this.filePath,
            JSON.stringify(halls.map((hall) => hall.toJSON()), null, 2)
        );
    }

    getAllResidenceHalls() {
        return this.load();
    }

    getResidenceHallByID(hallID) {
        return this.load().find((hall) => hall.getHallID() === hallID) || null;
    }

    getResidenceHallByName(name) {
        return (
            this.load().find(
                (hall) => hall.getName().toLowerCase() === String(name).toLowerCase()
            ) || null
        );
    }

    createResidenceHall({
        hallID,
        name,
        capacity,
        weekdayStaffNeeded = 1,
        weekendStaffNeeded = 1
    }) {
        const halls = this.load();

        if (halls.find((hall) => hall.getHallID() === hallID)) {
            return { success: false, message: "Hall ID already exists." };
        }

        if (
            halls.find(
                (hall) => hall.getName().toLowerCase() === String(name).toLowerCase()
            )
        ) {
            return { success: false, message: "Residence hall name already exists." };
        }

        const hall = new ResidenceHall(
            hallID,
            name,
            capacity,
            [],
            weekdayStaffNeeded,
            weekendStaffNeeded
        );

        halls.push(hall);
        this.save(halls);

        return { success: true, hall };
    }

    updateResidenceHall(hallID, updates = {}) {
        const halls = this.load();
        const hall = halls.find((item) => item.getHallID() === hallID);

        if (!hall) {
            return { success: false, message: "Residence hall not found." };
        }

        if (updates.name) {
            const duplicate = halls.find(
                (item) =>
                    item.getHallID() !== hallID &&
                    item.getName().toLowerCase() === String(updates.name).toLowerCase()
            );

            if (duplicate) {
                return { success: false, message: "Another hall already uses that name." };
            }

            hall.setName(updates.name);
        }

        if (typeof updates.capacity === "number") {
            if (updates.capacity < hall.getRAIDs().length) {
                return {
                    success: false,
                    message: "Capacity cannot be less than the number of assigned RAs."
                };
            }

            hall.setCapacity(updates.capacity);
        }

        if (typeof updates.weekdayStaffNeeded === "number") {
            hall.setWeekdayStaffNeeded(updates.weekdayStaffNeeded);
        }

        if (typeof updates.weekendStaffNeeded === "number") {
            hall.setWeekendStaffNeeded(updates.weekendStaffNeeded);
        }

        this.save(halls);
        return { success: true, hall };
    }

    deleteResidenceHall(hallID) {
        const halls = this.load();
        const hall = halls.find((item) => item.getHallID() === hallID);

        if (!hall) {
            return { success: false, message: "Residence hall not found." };
        }

        if (hall.getRAIDs().length > 0) {
            return {
                success: false,
                message: "Cannot delete a residence hall while RAs are still assigned to it."
            };
        }

        const filtered = halls.filter((item) => item.getHallID() !== hallID);
        this.save(filtered);

        return { success: true };
    }

    assignRAToHall(raID, hallID) {
        const halls = this.load();
        const hall = halls.find((item) => item.getHallID() === hallID);

        if (!hall) {
            return { success: false, message: "Residence hall not found." };
        }

        const result = hall.addRA(raID);

        if (!result.success) {
            return result;
        }

        this.save(halls);
        return { success: true, hall };
    }

    removeRAFromHall(raID, hallID) {
        const halls = this.load();
        const hall = halls.find((item) => item.getHallID() === hallID);

        if (!hall) {
            return { success: false, message: "Residence hall not found." };
        }

        const result = hall.removeRA(raID);

        if (!result.success) {
            return result;
        }

        this.save(halls);
        return { success: true, hall };
    }

    moveRAToHall(raID, fromHallID, toHallID) {
        if (fromHallID === toHallID) {
            return { success: false, message: "RA is already assigned to that hall." };
        }

        const halls = this.load();
        const fromHall = halls.find((item) => item.getHallID() === fromHallID);
        const toHall = halls.find((item) => item.getHallID() === toHallID);

        if (!fromHall) {
            return { success: false, message: "Current hall not found." };
        }

        if (!toHall) {
            return { success: false, message: "Target hall not found." };
        }

        const removeResult = fromHall.removeRA(raID);
        if (!removeResult.success) {
            return removeResult;
        }

        const addResult = toHall.addRA(raID);
        if (!addResult.success) {
            fromHall.addRA(raID);
            return addResult;
        }

        this.save(halls);
        return { success: true, fromHall, toHall };
    }
}

module.exports = ResidenceHallService;