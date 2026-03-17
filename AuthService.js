const fs = require("fs");
const path = require("path");
const User = require("./User");
const Admin = require("./Admin");
const RA = require("./RA");

class AuthService {
    constructor(filePath = path.join(__dirname, "users.json")) {
        this.filePath = filePath;
    }

    loadUsers() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, "[]", "utf-8");
        }

        const data = fs.readFileSync(this.filePath, "utf-8").trim();

        if (!data) {
            return [];
        }

        const users = JSON.parse(data);

        return users.map((user) => {
            if (user.role === "admin") {
                return new Admin(
                    user.userID,
                    user.name,
                    user.email,
                    user.passwordHash,
                    user.active
                );
            }

            if (user.role === "ra") {
                return new RA(
                    user.userID,
                    user.name,
                    user.email,
                    user.passwordHash,
                    user.residenceHall,
                    user.active
                );
            }

            return new User(
                user.userID,
                user.name,
                user.email,
                user.passwordHash,
                user.role,
                user.active
            );
        });
    }

    saveUsers(users) {
        const plainUsers = users.map((user) => user.toJSON());
        fs.writeFileSync(this.filePath, JSON.stringify(plainUsers, null, 2), "utf-8");
    }

    login(email, password) {
        const users = this.loadUsers();

        const user = users.find(
            (u) => u.getEmail() === email && u.getPasswordHash() === password
        );

        if (!user) {
            return { success: false, message: "Invalid email or password." };
        }

        if (!user.isActive()) {
            return { success: false, message: "Account is deactivated." };
        }

        return {
            success: true,
            message: "Login successful.",
            user: {
                userID: user.getUserID(),
                name: user.getName(),
                email: user.getEmail(),
                role: user.getRole()
            }
        };
    }

    addUser(userData) {
        const users = this.loadUsers();

        const existingEmail = users.find((u) => u.getEmail() === userData.email);
        if (existingEmail) {
            return { success: false, message: "User with this email already exists." };
        }

        const existingID = users.find((u) => u.getUserID() === userData.userID);
        if (existingID) {
            return { success: false, message: "User with this ID already exists." };
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
        } else if (userData.role === "ra") {
            newUser = new RA(
                userData.userID,
                userData.name,
                userData.email,
                userData.passwordHash,
                userData.residenceHall,
                true
            );
        } else {
            return { success: false, message: "Invalid role." };
        }

        users.push(newUser);
        this.saveUsers(users);

        return { success: true, message: "User added successfully." };
    }

    deactivateUser(userID) {
        const users = this.loadUsers();
        const user = users.find((u) => u.getUserID() === userID);

        if (!user) {
            return { success: false, message: "User not found." };
        }

        user.setActive(false);
        this.saveUsers(users);

        return { success: true, message: "User deactivated successfully." };
    }

    resetPassword(userID, newPassword) {
        const users = this.loadUsers();
        const user = users.find((u) => u.getUserID() === userID);

        if (!user) {
            return { success: false, message: "User not found." };
        }

        user.setPasswordHash(newPassword);
        this.saveUsers(users);

        return { success: true, message: "Password reset successfully." };
    }
}

module.exports = AuthService;