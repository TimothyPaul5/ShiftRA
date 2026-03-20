const fs = require("fs");
const path = require("path");
const ResidenceHall = require("./ResidenceHall");

class ResidenceHallService {
    constructor(filePath = path.join(__dirname, "residenceHalls.json")) {
        this.filePath = filePath;
    }

    loadResidenceHalls() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, "[]", "utf-8");
        }

        const data = fs.readFileSync(this.filePath, "utf-8").trim();

        if (!data) {
            return [];
        }

        const halls = JSON.parse(data);

        return halls.map(
            (hall) =>
                new ResidenceHall(
                    hall.hallID,
                    hall.name,
                    hall.capacity,
                    hall.raIDs || []
                )
        );
    }

    saveResidenceHalls(halls) {
        const plainHalls = halls.map((hall) => hall.toJSON());
        fs.writeFileSync(this.filePath, JSON.stringify(plainHalls, null, 2), "utf-8");
    }

    addResidenceHall(hallData) {
        const halls = this.loadResidenceHalls();

        const existingHallID = halls.find((h) => h.getHallID() === hallData.hallID);
        if (existingHallID) {
            return { success: false, message: "Residence hall with this ID already exists." };
        }

        const existingName = halls.find((h) => h.getName() === hallData.name);
        if (existingName) {
            return { success: false, message: "Residence hall with this name already exists." };
        }

        const newHall = new ResidenceHall(
            hallData.hallID,
            hallData.name,
            hallData.capacity,
            hallData.raIDs || []
        );

        halls.push(newHall);
        this.saveResidenceHalls(halls);

        return { success: true, message: "Residence hall added successfully." };
    }

    getResidenceHallByID(hallID) {
        const halls = this.loadResidenceHalls();
        return halls.find((h) => h.getHallID() === hallID) || null;
    }

    getResidenceHallByName(name) {
        const halls = this.loadResidenceHalls();
        return halls.find((h) => h.getName() === name) || null;
    }

    assignRAToHall(hallID, raID) {
        const halls = this.loadResidenceHalls();
        const hall = halls.find((h) => h.getHallID() === hallID);

        if (!hall) {
            return { success: false, message: "Residence hall not found." };
        }

        const result = hall.addRA(raID);

        if (result.success) {
            this.saveResidenceHalls(halls);
        }

        return result;
    }

    removeRAFromHall(hallID, raID) {
        const halls = this.loadResidenceHalls();
        const hall = halls.find((h) => h.getHallID() === hallID);

        if (!hall) {
            return { success: false, message: "Residence hall not found." };
        }

        const result = hall.removeRA(raID);

        if (result.success) {
            this.saveResidenceHalls(halls);
        }

        return result;
    }

    getAllResidenceHalls() {
        return this.loadResidenceHalls();
    }

    updateResidenceHall(hallID, updatedData) {
        const halls = this.loadResidenceHalls();
        const hall = halls.find((h) => h.getHallID() === hallID);

        if (!hall) {
            return { success: false, message: "Residence hall not found." };
        }

        if (updatedData.name) {
            hall.setName(updatedData.name);
        }

        if (updatedData.capacity !== undefined) {
            if (updatedData.capacity < hall.getRAIDs().length) {
                return {
                    success: false,
                    message: "Capacity cannot be less than the number of currently assigned RAs."
                };
            }
            hall.setCapacity(updatedData.capacity);
        }

        this.saveResidenceHalls(halls);

        return { success: true, message: "Residence hall updated successfully." };
    }

    deleteResidenceHall(hallID) {
        const halls = this.loadResidenceHalls();
        const hallIndex = halls.findIndex((h) => h.getHallID() === hallID);

        if (hallIndex === -1) {
            return { success: false, message: "Residence hall not found." };
        }

        halls.splice(hallIndex, 1);
        this.saveResidenceHalls(halls);

        return { success: true, message: "Residence hall deleted successfully." };
    }
}

module.exports = ResidenceHallService;
