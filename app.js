const readline = require("readline");
const AuthService = require("./AuthService");
const AvailabilityDB = require("./AvailabilityDB");
const ResidenceHallService = require("./ResidenceHallService");
const ScheduleManager = require("./ScheduleManager");
const SmartScheduler = require("./SmartScheduler");
const RA = require("./RA");

const authService = new AuthService();
const availDB = new AvailabilityDB();
const hallService = new ResidenceHallService();
const scheduleManager = new ScheduleManager();

authService.getAllUsers().forEach(u => {
    if (u instanceof RA) scheduleManager.addRA(u);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// login

async function loginFlow() {
    console.log("\n--- Login ---");
    const email = await ask("Email: ");
    const password = await ask("Password: ");
    const result = authService.login(email, password);

    if (!result.success) {
        console.log(`\nLogin failed: ${result.message}`);
        return null;
    }

    console.log(`\nWelcome, ${result.user.name}! (${result.user.role.toUpperCase()})`);
    return result.user;
}

// admin menu

async function adminCreateUser() {
    console.log("\n--- Create New User ---");
    const role = (await ask("Role (admin/ra): ")).toLowerCase();
    if (role !== "admin" && role !== "ra") {
        console.log("Invalid role. Must be admin or ra.");
        return;
    }
    const userID = await ask("User ID: ");
    const name = await ask("Full name: ");
    const email = await ask("Email: ");
    const password = await ask("Password: ");
    const userData = { userID, name, email, passwordHash: password, role };
    if (role === "ra") {
        userData.residenceHall = await ask("Residence Hall: ");
    }
    const result = authService.addUser(userData);
    console.log(result.success ? "\nUser created successfully." : `\nError: ${result.message}`);
}

async function adminDeactivateUser() {
    console.log("\n--- Deactivate User ---");
    const userID = await ask("User ID to deactivate: ");
    const result = authService.deactivateUser(userID);
    console.log(result.success ? "\nUser deactivated successfully." : `\nError: ${result.message}`);
}

async function adminResetPassword() {
    console.log("\n--- Reset Password ---");
    const userID = await ask("User ID: ");
    const newPassword = await ask("New password: ");
    const result = authService.resetPassword(userID, newPassword);
    console.log(result.success ? "\nPassword reset successfully." : `\nError: ${result.message}`);
}

async function adminViewUsers() {
    console.log("\n--- All Users ---");
    const users = authService.getAllUsers();
    if (users.length === 0) {
        console.log("No users found.");
        return;
    }
    users.forEach(u => {
        const status = u.isActive() ? "Active" : "Inactive";
        const extra = u.getRole() === "ra" ? ` | Hall: ${u.getResidenceHall()}` : "";
        console.log(`  [${u.getRole().toUpperCase()}] ${u.getName()} (${u.getUserID()}) — ${u.getEmail()} — ${status}${extra}`);
    });
}

async function adminGenerateSchedule() {
    console.log("\n--- Generate Schedule ---");
    const halls = hallService.getAllResidenceHalls();
    if (halls.length === 0) {
        console.log("No residence halls found.");
        return;
    }

    const needs = {};
    for (const hall of halls) {
        console.log(`\nHall: ${hall.getName()}`);
        const weekday = parseInt(await ask("  Weekday staff needed: "), 10) || 1;
        const weekend = parseInt(await ask("  Weekend staff needed: "), 10) || 1;
        needs[hall.getName()] = { weekday, weekend };
    }

    const scheduler = new SmartScheduler(availDB, hallService, scheduleManager);
    const schedule = scheduler.generateSchedule(needs);

    console.log("\n--- Generated Schedule ---");
    for (const [hallName, days] of Object.entries(schedule)) {
        console.log(`\n  ${hallName}:`);
        for (const [day, shifts] of Object.entries(days)) {
            shifts.forEach(s => {
                console.log(`    ${day.padEnd(10)} ${s.role.padEnd(10)} → ${s.assignedTo}`);
            });
        }
    }
}

async function adminMenu(user) {
    while (true) {
        console.log(`\n=== Admin Menu (${user.name}) ===`);
        console.log("1. View All Users");
        console.log("2. Create New User");
        console.log("3. Deactivate User");
        console.log("4. Reset User Password");
        console.log("5. Generate Schedule");
        console.log("6. Logout");

        const choice = await ask("Choose an option: ");

        switch (choice) {
            case "1": await adminViewUsers();        break;
            case "2": await adminCreateUser();       break;
            case "3": await adminDeactivateUser();   break;
            case "4": await adminResetPassword();    break;
            case "5": await adminGenerateSchedule(); break;
            case "6":
                console.log("\nLogged out.");
                return;
            default:
                console.log("\nInvalid option. Choose 1–6.");
        }
    }
}

// ra menu

async function raSubmitAvailability(raUser) {
    console.log("\n--- Submit Availability ---");
    console.log("Days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday");
    const day = await ask("Day: ");
    const start = await ask("Start time (e.g. 09:00): ");
    const end = await ask("End time (e.g. 17:00): ");
    const type = ["Saturday", "Sunday"].includes(day) ? "weekend" : "weekday";
    const ok = availDB.addAvailability(day, start, end, raUser.name, "CST", type);
    console.log(ok ? "\nAvailability submitted successfully." : "\nInvalid day entered.");
}

async function raViewAvailability(raUser) {
    console.log("\n--- My Availability ---");
    const all = availDB.getAllAvailability();
    let found = false;
    for (const [day, entries] of Object.entries(all)) {
        const mine = entries.filter(e => e.name === raUser.name);
        if (mine.length > 0) {
            mine.forEach(e => {
                console.log(`  ${day.padEnd(12)} ${e.startTime} – ${e.endTime}`);
            });
            found = true;
        }
    }
    if (!found) console.log("No availability submitted yet.");
}

async function raViewSchedule(raUser) {
    console.log("\n--- My Schedule ---");
    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "data/generatedSchedule.json");

    if (!fs.existsSync(file)) {
        console.log("No schedule has been generated yet.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    let found = false;

    for (const [hallName, days] of Object.entries(data)) {
        for (const [day, shifts] of Object.entries(days)) {
            shifts.forEach(s => {
                if (s.assignedTo === raUser.name) {
                    console.log(`  ${day.padEnd(12)} ${s.role.padEnd(10)} @ ${hallName}`);
                    found = true;
                }
            });
        }
    }
    if (!found) console.log("You have no assigned shifts yet.");
}

async function raViewHallInfo(raUser) {
    console.log("\n--- My Residence Hall ---");
    const halls = hallService.getAllResidenceHalls();
    const hall = halls.find(h => h.getName() === raUser.residenceHall);
    if (!hall) {
        console.log("No residence hall assigned.");
        return;
    }
    console.log(`  Hall:     ${hall.getName()}`);
    console.log(`  ID:       ${hall.getHallID()}`);
    console.log(`  Capacity: ${hall.getCapacity()}`);
    console.log(`  RA IDs:   ${hall.getRAIDs().join(", ")}`);
}

async function raMenu(user) {
    while (true) {
        console.log(`\n=== RA Menu (${user.name} — ${user.residenceHall}) ===`);
        console.log("1. Submit Availability");
        console.log("2. View My Availability");
        console.log("3. View My Schedule");
        console.log("4. View My Hall Info");
        console.log("5. Logout");

        const choice = await ask("Choose an option: ");

        switch (choice) {
            case "1": await raSubmitAvailability(user); break;
            case "2": await raViewAvailability(user);   break;
            case "3": await raViewSchedule(user);       break;
            case "4": await raViewHallInfo(user);       break;
            case "5":
                console.log("\nLogged out.");
                return;
            default:
                console.log("\nInvalid option. Choose 1–5.");
        }
    }
}

// main

async function main() {
    while (true) {
        console.log("\n=============================");
        console.log("   Smart Shift Scheduler");
        console.log("=============================");
        console.log("1. Login");
        console.log("2. Exit");

        const choice = await ask("Choose an option: ");

        if (choice === "2") {
            console.log("\nGoodbye.");
            rl.close();
            return;
        }

        if (choice === "1") {
            const user = await loginFlow();
            if (!user) continue;

            if (user.role === "admin") {
                await adminMenu(user);
            } else if (user.role === "ra") {
                await raMenu(user);
            } else {
                console.log("Unknown role. Access denied.");
            }
        } else {
            console.log("\nInvalid option. Choose 1 or 2.");
        }
    }
}

main();