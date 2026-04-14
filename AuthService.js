const fs = require("fs");
const path = require("path");
const User = require("./User");
const Admin = require("./Admin");
const RA = require("./RA");

class AuthService {
    constructor(filePath = path.join(__dirname, "datausers.json")) {
        this.filePath = filePath;
    }

    loadUsers() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, "[]");
        }

        const raw = fs.readFileSync(this.filePath, "utf-8").trim();
        const parsed = raw ? JSON.parse(raw) : [];

        return parsed.map((u) => {
            if (u.role === "admin") {
                return new Admin(u.userID, u.name, u.email, u.passwordHash, u.active);
            }

            if (u.role === "ra") {
                return new RA(
                    u.userID,
                    u.name,
                    u.email,
                    u.passwordHash,
                    u.residenceHall,
                    u.active
                );
            }

            return new User(
                u.userID,
                u.name,
                u.email,
                u.passwordHash,
                u.role,
                u.active
            );
        });
    }

    saveUsers(users) {
        fs.writeFileSync(
            this.filePath,
            JSON.stringify(users.map((u) => u.toJSON()), null, 2)
        );
    }

    login(email, pass) {
        const users = this.loadUsers();
        const user = users.find(
            (u) => u.getEmail() === email && u.getPasswordHash() === pass
        );

        if (!user) {
            return { success: false, message: "Invalid credentials." };
        }

        if (!user.isActive()) {
            return { success: false, message: "Account deactivated." };
        }

        return { success: true, user: user.toJSON() };
    }

    addUser(userData) {
        const users = this.loadUsers();

        if (users.find((u) => u.getEmail() === userData.email)) {
            return { success: false, message: "Email already exists." };
        }

        if (users.find((u) => u.getUserID() === userData.userID)) {
            return { success: false, message: "User ID already exists." };
        }

        let newUser;

        if (userData.role === "admin") {
            newUser = new Admin(
                userData.userID,
                userData.name,
                userData.email,
                userData.passwordHash,
                true
            );
        } else {
            newUser = new RA(
                userData.userID,
                userData.name,
                userData.email,
                userData.passwordHash,
                userData.residenceHall || "",
                true
            );
        }

        users.push(newUser);
        this.saveUsers(users);

        return { success: true, user: newUser };
    }

    deactivateUser(userID) {
        const users = this.loadUsers();
        const user = users.find((u) => u.getUserID() === userID);

        if (!user) {
            return { success: false, message: "User not found." };
        }

        user.setActive(false);
        this.saveUsers(users);

        return { success: true };
    }

    resetPassword(userID, newPassword) {
        const users = this.loadUsers();
        const user = users.find((u) => u.getUserID() === userID);

        if (!user) {
            return { success: false, message: "User not found." };
        }

        user.setPasswordHash(newPassword);
        this.saveUsers(users);

        return { success: true };
    }

    updateRAResidenceHall(userID, newResidenceHallName) {
        const users = this.loadUsers();
        const user = users.find((u) => u.getUserID() === userID);

        if (!user) {
            return { success: false, message: "User not found." };
        }

        if (user.getRole() !== "ra") {
            return { success: false, message: "Only RA users can be assigned to residence halls." };
        }

        user.setResidenceHall(newResidenceHallName);
        this.saveUsers(users);

        return { success: true, user };
    }

    getUserByID(userID) {
        return this.loadUsers().find((u) => u.getUserID() === userID) || null;
    }

    getAllUsers() {
        return this.loadUsers();
    }
}

module.exports = AuthService;