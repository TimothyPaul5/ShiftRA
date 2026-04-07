const fs = require("fs");
const path = require("path");
const readline = require("readline");

const AuthService = require("./AuthService");
const AvailabilityDB = require("./AvailabilityDB");
const ResidenceHallService = require("./ResidenceHallService");
const ScheduleManager = require("./ScheduleManager");
const SmartScheduler = require("./SmartScheduler");
const RA = require("./RA");

const USERS_FILE = path.join(__dirname, "datausers.json");
const HALLS_FILE = path.join(__dirname, "dataresidenceHalls.json");
const AVAILABILITY_FILE = path.join(__dirname, "dataavailability.json");
const SCHEDULE_FILE = path.join(__dirname, "datageneratedSchedule.json");
const SWAPS_FILE = path.join(__dirname, "dataswapRequests.json");

const authService = new AuthService(USERS_FILE);
const hallService = new ResidenceHallService(HALLS_FILE);
const availDB = new AvailabilityDB(AVAILABILITY_FILE);
let scheduleManager = new ScheduleManager();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

function ensureJSONFile(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    }
}

function loadJSON(filePath, fallback) {
    try {
        ensureJSONFile(filePath, fallback);
        const raw = fs.readFileSync(filePath, "utf-8").trim();
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function initializeSwapRequests() {
    ensureJSONFile(SWAPS_FILE, []);
}

function getSwapRequests() {
    return loadJSON(SWAPS_FILE, []);
}

function saveSwapRequests(requests) {
    saveJSON(SWAPS_FILE, requests);
}

function refreshScheduleManager() {
    scheduleManager = new ScheduleManager();

    authService.getAllUsers().forEach((user) => {
        if (user instanceof RA && user.isActive()) {
            scheduleManager.addRA(user);
        }
    });
}

function getAllHalls() {
    return hallService.getAllResidenceHalls();
}

function getHallByName(name) {
    return getAllHalls().find(
        (hall) => hall.getName().toLowerCase() === name.toLowerCase()
    );
}

function syncRAIntoResidenceHall(raUserID, residenceHallName) {
    const halls = getAllHalls();
    const hall = halls.find(
        (h) => h.getName().toLowerCase() === residenceHallName.toLowerCase()
    );

    if (!hall) {
        return { success: false, message: "Residence hall not found." };
    }

    if (!hall.getRAIDs().includes(raUserID)) {
        const result = hall.addRA(raUserID);

        if (!result.success) {
            return {
                success: false,
                message: result.message || "Could not add RA to residence hall."
            };
        }

        hallService.save(halls);
    }

    return { success: true, hallName: hall.getName() };
}

function readGeneratedSchedule() {
    return loadJSON(SCHEDULE_FILE, {});
}

function writeGeneratedSchedule(schedule) {
    saveJSON(SCHEDULE_FILE, schedule);
}

function formatDateForDisplay(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;

    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    return `${dateString} (${weekday})`;
}

function formatSchedule(schedule) {
    const lines = [];

    if (!schedule || Object.keys(schedule).length === 0) {
        return "No generated schedule found.";
    }

    for (const [hallName, dates] of Object.entries(schedule)) {
        lines.push(`\n${hallName}`);
        lines.push("-".repeat(hallName.length));

        const sortedDates = Object.keys(dates).sort();

        for (const date of sortedDates) {
            const shifts = dates[date];

            if (!Array.isArray(shifts) || shifts.length === 0) {
                lines.push(`  ${formatDateForDisplay(date)}: No shifts`);
                continue;
            }

            for (const shift of shifts) {
                lines.push(
                    `  ${formatDateForDisplay(date).padEnd(26)} ${String(shift.role || "Shift").padEnd(10)} -> ${shift.assignedTo || "UNASSIGNED"}`
                );
            }
        }
    }

    return lines.join("\n");
}

function buildAdminAssignmentSummary(schedule) {
    const summary = {};

    for (const [hallName, dates] of Object.entries(schedule || {})) {
        if (!summary[hallName]) {
            summary[hallName] = {};
        }

        for (const [date, shifts] of Object.entries(dates || {})) {
            for (const shift of shifts || []) {
                const name = shift.assignedTo;

                if (!name || name === "UNASSIGNED" || name === "NO SECONDARY AVAILABLE") {
                    continue;
                }

                if (!summary[hallName][name]) {
                    summary[hallName][name] = {
                        primary: 0,
                        secondary: 0,
                        total: 0
                    };
                }

                summary[hallName][name].total += 1;

                if (shift.role === "Primary") {
                    summary[hallName][name].primary += 1;
                } else if (shift.role === "Secondary") {
                    summary[hallName][name].secondary += 1;
                }
            }
        }
    }

    return summary;
}

function formatAdminAssignmentSummary(schedule) {
    const summary = buildAdminAssignmentSummary(schedule);
    const lines = [];

    if (Object.keys(summary).length === 0) {
        return "No assignment summary available.";
    }

    for (const [hallName, people] of Object.entries(summary)) {
        lines.push(`\n${hallName} Assignment Summary`);
        lines.push("-".repeat(`${hallName} Assignment Summary`.length));

        const sortedPeople = Object.entries(people).sort((a, b) =>
            a[0].localeCompare(b[0])
        );

        if (sortedPeople.length === 0) {
            lines.push("  No assigned RAs.");
            continue;
        }

        for (const [name, counts] of sortedPeople) {
            lines.push(
                `  ${name} — Primary: ${counts.primary}, Secondary: ${counts.secondary}, Total: ${counts.total}`
            );
        }
    }

    return lines.join("\n");
}

function normalizeDay(dayInput) {
    const trimmed = (dayInput || "").trim().toLowerCase();

    const map = {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday"
    };

    return map[trimmed] || null;
}

function isValidISODate(dateString) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

function hasAvailabilityForRA(raName) {
    const all = availDB.getAllAvailability();
    return Object.values(all).some((entries) =>
        entries.some((entry) => entry.name === raName)
    );
}

function getActiveRAUsers() {
    return authService
        .getAllUsers()
        .filter((u) => u instanceof RA && u.isActive());
}

function getRAByName(name) {
    return getActiveRAUsers().find(
        (u) => u.getName().toLowerCase() === String(name).toLowerCase()
    );
}

function collectAllAssignedShifts() {
    const schedule = readGeneratedSchedule();
    const shifts = [];

    for (const [hallName, dates] of Object.entries(schedule)) {
        const sortedDates = Object.keys(dates).sort();

        for (const date of sortedDates) {
            const dayShifts = dates[date];

            for (let i = 0; i < dayShifts.length; i++) {
                const shift = dayShifts[i];

                shifts.push({
                    hallName,
                    date,
                    dayOfWeek: shift.dayOfWeek,
                    role: shift.role,
                    assignedTo: shift.assignedTo,
                    indexInDate: i
                });
            }
        }
    }

    return shifts;
}

function findShiftObject(schedule, target) {
    const shifts = schedule?.[target.hallName]?.[target.date];
    if (!Array.isArray(shifts)) return null;

    const shift = shifts[target.indexInDate];
    if (!shift) return null;

    if (
        shift.role !== target.role ||
        shift.assignedTo !== target.assignedTo
    ) {
        return null;
    }

    return shift;
}

async function promptForHallName() {
    const halls = getAllHalls();

    if (halls.length === 0) {
        console.log("No residence halls found.");
        return null;
    }

    console.log("Available halls:");
    halls.forEach((hall, index) => {
        console.log(
            `  ${index + 1}. ${hall.getName()} (capacity ${hall.getCapacity()}, assigned ${hall.getRAIDs().length})`
        );
    });

    const answer = await ask("Select a hall by number or exact name: ");
    const numericChoice = Number.parseInt(answer, 10);

    if (!Number.isNaN(numericChoice) && numericChoice >= 1 && numericChoice <= halls.length) {
        return halls[numericChoice - 1].getName();
    }

    const hall = getHallByName(answer);
    return hall ? hall.getName() : null;
}

async function promptForDateRange() {
    const startDate = await ask("Start date (YYYY-MM-DD): ");
    const endDate = await ask("End date (YYYY-MM-DD): ");

    if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
        console.log("Invalid date format. Use YYYY-MM-DD.");
        return null;
    }

    if (startDate > endDate) {
        console.log("Start date must be on or before end date.");
        return null;
    }

    return { startDate, endDate };
}

async function loginFlow() {
    console.log("\n--- Login ---");
    const email = await ask("Email: ");
    const password = await ask("Password: ");
    const result = authService.login(email, password);

    if (!result.success) {
        console.log(`\nLogin failed: ${result.message}`);
        return null;
    }

    console.log(`\nWelcome, ${result.user.name}! (${String(result.user.role).toUpperCase()})`);
    return result.user;
}

async function adminCreateUser() {
    console.log("\n--- Create New User ---");

    const role = (await ask("Role (admin/ra): ")).toLowerCase();
    if (!["admin", "ra"].includes(role)) {
        console.log("Invalid role. Must be admin or ra.");
        return;
    }

    const userID = await ask("User ID: ");
    const name = await ask("Full name: ");
    const email = await ask("Email: ");
    const password = await ask("Password: ");

    const userData = {
        userID,
        name,
        email,
        passwordHash: password,
        role
    };

    if (role === "ra") {
        const hallName = await promptForHallName();
        if (!hallName) {
            console.log("Could not find that residence hall.");
            return;
        }
        userData.residenceHall = hallName;
    }

    const result = authService.addUser(userData);

    if (!result.success) {
        console.log(`\nError: ${result.message}`);
        return;
    }

    if (role === "ra") {
        const syncResult = syncRAIntoResidenceHall(userID, userData.residenceHall);
        if (!syncResult.success) {
            console.log(`\nUser created, but hall assignment failed: ${syncResult.message}`);
        }
    }

    refreshScheduleManager();
    console.log("\nUser created successfully.");
}

async function adminDeactivateUser() {
    console.log("\n--- Deactivate User ---");
    const userID = await ask("User ID to deactivate: ");
    const result = authService.deactivateUser(userID);

    if (result.success) refreshScheduleManager();

    console.log(
        result.success
            ? "\nUser deactivated successfully."
            : `\nError: ${result.message}`
    );
}

async function adminResetPassword() {
    console.log("\n--- Reset Password ---");
    const userID = await ask("User ID: ");
    const newPassword = await ask("New password: ");
    const result = authService.resetPassword(userID, newPassword);

    console.log(
        result.success
            ? "\nPassword reset successfully."
            : `\nError: ${result.message}`
    );
}

async function adminViewUsers() {
    console.log("\n--- All Users ---");
    const users = authService.getAllUsers();

    if (users.length === 0) {
        console.log("No users found.");
        return;
    }

    users.forEach((user) => {
        const status = user.isActive() ? "Active" : "Inactive";
        const extra =
            user.getRole() === "ra"
                ? ` | Hall: ${user.getResidenceHall()}`
                : "";

        console.log(
            `  [${user.getRole().toUpperCase()}] ${user.getName()} (${user.getUserID()}) — ${user.getEmail()} — ${status}${extra}`
        );
    });
}

async function adminViewResidenceHalls() {
    console.log("\n--- Residence Halls ---");
    const halls = getAllHalls();

    if (halls.length === 0) {
        console.log("No residence halls found.");
        return;
    }

    halls.forEach((hall) => {
        console.log(`\n${hall.getName()}`);
        console.log(`  ID: ${hall.getHallID()}`);
        console.log(`  Capacity: ${hall.getCapacity()}`);
        console.log(
            `  Assigned RAs: ${hall.getRAIDs().length ? hall.getRAIDs().join(", ") : "None"}`
        );
    });
}

async function adminGenerateSchedule() {
    console.log("\n--- Generate Schedule ---");
    const halls = getAllHalls();

    if (halls.length === 0) {
        console.log("No residence halls found.");
        return;
    }

    refreshScheduleManager();
    const activeRAs = scheduleManager.RAs;

    if (activeRAs.length === 0) {
        console.log("No active RAs available for scheduling.");
        return;
    }

    const missingAvailability = activeRAs.filter(
        (ra) => !hasAvailabilityForRA(ra.getName())
    );

    if (missingAvailability.length > 0) {
        console.log("Cannot generate schedule. These active RAs have no availability saved:");
        missingAvailability.forEach((ra) => {
            console.log(`  - ${ra.getName()} (${ra.getUserID()})`);
        });
        return;
    }

    const dateRange = await promptForDateRange();
    if (!dateRange) return;

    console.log("\n1. Generate for all residence halls");
    console.log("2. Generate for one residence hall only");
    const mode = await ask("Choose an option: ");

    const scheduler = new SmartScheduler(availDB, hallService, scheduleManager);
    scheduler.save = () => {
        saveJSON(SCHEDULE_FILE, scheduler.results);
    };

    if (mode === "1") {
        const needs = {};

        for (const hall of halls) {
            console.log(`\nHall: ${hall.getName()}`);
            const weekday = Number.parseInt(await ask("  Weekday staff needed: "), 10) || 1;
            const weekend = Number.parseInt(await ask("  Weekend staff needed: "), 10) || 1;
            needs[hall.getName()] = { weekday, weekend };
        }

        const schedule = scheduler.generateSchedule(
            needs,
            dateRange.startDate,
            dateRange.endDate
        );
        writeGeneratedSchedule(schedule);

        console.log("\n--- Generated Schedule ---");
        console.log(formatSchedule(schedule));
        return;
    }

    if (mode === "2") {
        const hallName = await promptForHallName();

        if (!hallName) {
            console.log("Could not find that residence hall.");
            return;
        }

        console.log(`\nHall: ${hallName}`);
        const weekday = Number.parseInt(await ask("  Weekday staff needed: "), 10) || 1;
        const weekend = Number.parseInt(await ask("  Weekend staff needed: "), 10) || 1;

        const singleHallNeeds = {
            [hallName]: { weekday, weekend }
        };

        const existingSchedule = readGeneratedSchedule();
        const newPartialSchedule = scheduler.generateSchedule(
            singleHallNeeds,
            dateRange.startDate,
            dateRange.endDate
        );

        existingSchedule[hallName] = newPartialSchedule[hallName];
        writeGeneratedSchedule(existingSchedule);

        console.log("\n--- Updated Schedule For One Hall ---");
        console.log(formatSchedule({ [hallName]: existingSchedule[hallName] }));
        return;
    }

    console.log("Invalid option.");
}

async function adminViewGeneratedSchedule() {
    console.log("\n--- Generated Schedule ---");

    const schedule = readGeneratedSchedule();

    console.log(formatSchedule(schedule));
    console.log("\n--- Assignment Counts ---");
    console.log(formatAdminAssignmentSummary(schedule));
}

async function adminMenu(user) {
    while (true) {
        console.log(`\n=== Admin Menu (${user.name}) ===`);
        console.log("1. View All Users");
        console.log("2. Create New User");
        console.log("3. Deactivate User");
        console.log("4. Reset User Password");
        console.log("5. View Residence Halls");
        console.log("6. Generate Schedule");
        console.log("7. View Generated Schedule");
        console.log("8. Logout");

        const choice = await ask("Choose an option: ");

        switch (choice) {
            case "1":
                await adminViewUsers();
                break;
            case "2":
                await adminCreateUser();
                break;
            case "3":
                await adminDeactivateUser();
                break;
            case "4":
                await adminResetPassword();
                break;
            case "5":
                await adminViewResidenceHalls();
                break;
            case "6":
                await adminGenerateSchedule();
                break;
            case "7":
                await adminViewGeneratedSchedule();
                break;
            case "8":
                console.log("\nLogged out.");
                return;
            default:
                console.log("\nInvalid option. Choose 1–8.");
        }
    }
}

async function raSubmitAvailability(raUser) {
    console.log("\n--- Submit Availability ---");
    console.log("Choose one or more days:");
    console.log("  1. Monday");
    console.log("  2. Tuesday");
    console.log("  3. Wednesday");
    console.log("  4. Thursday");
    console.log("  5. Friday");
    console.log("  6. Saturday");
    console.log("  7. Sunday");
    console.log("Example: 1,3,5");

    const dayMap = {
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday",
        7: "Sunday"
    };

    const input = await ask("Enter day numbers: ");
    const selections = input
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);

    if (selections.length === 0) {
        console.log("\nNo days entered.");
        return;
    }

    const uniqueSelections = [...new Set(selections)];
    const chosenDays = [];
    const invalidSelections = [];

    for (const selection of uniqueSelections) {
        const num = Number.parseInt(selection, 10);
        if (!dayMap[num]) {
            invalidSelections.push(selection);
        } else {
            chosenDays.push(dayMap[num]);
        }
    }

    if (chosenDays.length === 0) {
        console.log("\nNo valid days entered.");
        return;
    }

    let addedCount = 0;
    let duplicateCount = 0;

    for (const day of chosenDays) {
        const type = ["Friday", "Saturday"].includes(day) ? "weekend" : "weekday";
        const ok = availDB.addAvailability(day, raUser.name, "CST", type);

        if (ok) {
            addedCount++;
        } else {
            duplicateCount++;
        }
    }

    console.log("");
    if (addedCount > 0) {
        console.log(`Added availability for ${addedCount} day(s).`);
    }
    if (duplicateCount > 0) {
        console.log(`${duplicateCount} day(s) were already saved and were skipped.`);
    }
    if (invalidSelections.length > 0) {
        console.log(`Ignored invalid entries: ${invalidSelections.join(", ")}`);
    }
}

async function raRemoveAvailability(raUser) {
    console.log("\n--- Remove Availability ---");
    console.log("Choose one or more days to remove:");
    console.log("  1. Monday");
    console.log("  2. Tuesday");
    console.log("  3. Wednesday");
    console.log("  4. Thursday");
    console.log("  5. Friday");
    console.log("  6. Saturday");
    console.log("  7. Sunday");
    console.log("Example: 2,4,6");

    const dayMap = {
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday",
        7: "Sunday"
    };

    const input = await ask("Enter day numbers to remove: ");
    const selections = input
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);

    if (selections.length === 0) {
        console.log("\nNo days entered.");
        return;
    }

    const uniqueSelections = [...new Set(selections)];
    const chosenDays = [];
    const invalidSelections = [];

    for (const selection of uniqueSelections) {
        const num = Number.parseInt(selection, 10);
        if (!dayMap[num]) {
            invalidSelections.push(selection);
        } else {
            chosenDays.push(dayMap[num]);
        }
    }

    if (chosenDays.length === 0) {
        console.log("\nNo valid days entered.");
        return;
    }

    let removedCount = 0;
    let notFoundCount = 0;

    for (const day of chosenDays) {
        const removed = availDB.removeAvailability(day, raUser.name);
        if (removed) {
            removedCount++;
        } else {
            notFoundCount++;
        }
    }

    console.log("");
    if (removedCount > 0) {
        console.log(`Removed availability for ${removedCount} day(s).`);
    }
    if (notFoundCount > 0) {
        console.log(`${notFoundCount} day(s) were not saved, so nothing changed.`);
    }
    if (invalidSelections.length > 0) {
        console.log(`Ignored invalid entries: ${invalidSelections.join(", ")}`);
    }
}

async function raViewAvailability(raUser) {
    console.log("\n--- My Availability ---");
    const all = availDB.getAllAvailability();
    let found = false;

    for (const [day, entries] of Object.entries(all)) {
        const mine = entries.filter((entry) => entry.name === raUser.name);

        if (mine.length > 0) {
            console.log(`  ${day}`);
            found = true;
        }
    }

    if (!found) {
        console.log("No availability submitted yet.");
    }
}

async function raViewSchedule(raUser) {
    console.log("\n--- My Schedule ---");
    const data = readGeneratedSchedule();
    let found = false;

    for (const [hallName, dates] of Object.entries(data)) {
        const sortedDates = Object.keys(dates).sort();

        for (const date of sortedDates) {
            const shifts = dates[date];

            shifts.forEach((shift) => {
                if (shift.assignedTo === raUser.name) {
                    console.log(
                        `  ${formatDateForDisplay(date).padEnd(26)} ${String(shift.role).padEnd(10)} @ ${hallName}`
                    );
                    found = true;
                }
            });
        }
    }

    if (!found) {
        console.log("You have no assigned shifts yet.");
    }
}

async function raViewHallInfo(raUser) {
    console.log("\n--- My Residence Hall ---");
    const hall = getHallByName(raUser.residenceHall || "");

    if (!hall) {
        console.log("No residence hall assigned.");
        return;
    }

    console.log(`  Hall:     ${hall.getName()}`);
    console.log(`  ID:       ${hall.getHallID()}`);
    console.log(`  Capacity: ${hall.getCapacity()}`);
    console.log(
        `  RA IDs:   ${hall.getRAIDs().length ? hall.getRAIDs().join(", ") : "None"}`
    );
}

async function raRequestSwap(raUser) {
    console.log("\n--- Request Shift Swap ---");

    const userHall = raUser.residenceHall;
    if (!userHall) {
        console.log("You do not have a residence hall assigned.");
        return;
    }

    const allAssigned = collectAllAssignedShifts();

    const sameHallShifts = allAssigned.filter(
        (shift) => shift.hallName === userHall
    );

    const myShifts = sameHallShifts.filter(
        (shift) => shift.assignedTo === raUser.name
    );

    const otherShifts = sameHallShifts.filter(
        (shift) =>
            shift.assignedTo !== raUser.name &&
            shift.assignedTo !== "UNASSIGNED" &&
            shift.assignedTo !== "NO SECONDARY AVAILABLE"
    );

    if (myShifts.length === 0) {
        console.log("You do not have any assigned shifts in your residence hall to swap.");
        return;
    }

    if (otherShifts.length === 0) {
        console.log("No eligible shifts from other RAs in your residence hall were found.");
        return;
    }

    console.log(`\nResidence Hall: ${userHall}`);

    console.log("\nYour shifts:");
    myShifts.forEach((shift, index) => {
        console.log(
            `  ${index + 1}. ${formatDateForDisplay(shift.date)} | ${shift.role}`
        );
    });

    const myChoice = Number.parseInt(await ask("Select your shift number: "), 10);
    if (Number.isNaN(myChoice) || myChoice < 1 || myChoice > myShifts.length) {
        console.log("Invalid choice.");
        return;
    }

    console.log("\nOther RAs' shifts in your hall:");
    otherShifts.forEach((shift, index) => {
        console.log(
            `  ${index + 1}. ${formatDateForDisplay(shift.date)} | ${shift.role} | ${shift.assignedTo}`
        );
    });

    const otherChoice = Number.parseInt(await ask("Select the shift you want to swap with: "), 10);
    if (Number.isNaN(otherChoice) || otherChoice < 1 || otherChoice > otherShifts.length) {
        console.log("Invalid choice.");
        return;
    }

    const myShift = myShifts[myChoice - 1];
    const targetShift = otherShifts[otherChoice - 1];

    if (myShift.hallName !== targetShift.hallName) {
        console.log("Shift swaps are only allowed within the same residence hall.");
        return;
    }

    const targetRA = getRAByName(targetShift.assignedTo);

    if (!targetRA) {
        console.log("Target RA not found.");
        return;
    }

    if (targetRA.residenceHall !== userHall) {
        console.log("That RA is not in your residence hall.");
        return;
    }

    const requests = getSwapRequests();

    const duplicate = requests.find(
        (req) =>
            req.status === "pending" &&
            req.fromRA === raUser.name &&
            req.toRA === targetRA.getName() &&
            req.myShift.date === myShift.date &&
            req.myShift.hallName === myShift.hallName &&
            req.targetShift.date === targetShift.date &&
            req.targetShift.hallName === targetShift.hallName
    );

    if (duplicate) {
        console.log("A matching pending request already exists.");
        return;
    }

    const request = {
        id: `SWAP-${Date.now()}`,
        status: "pending",
        fromRA: raUser.name,
        toRA: targetRA.getName(),
        residenceHall: userHall,
        createdAt: new Date().toISOString(),
        myShift,
        targetShift
    };

    requests.push(request);
    saveSwapRequests(requests);

    console.log(`\nSwap request sent to ${targetRA.getName()} for ${userHall}.`);
}

async function raRespondToSwapRequests(raUser) {
    console.log("\n--- Respond To Swap Requests ---");

    const requests = getSwapRequests().filter(
        (req) => req.status === "pending" && req.toRA === raUser.name
    );

    if (requests.length === 0) {
        console.log("No pending swap requests.");
        return;
    }

    requests.forEach((req, index) => {
        console.log(`\n${index + 1}. Request ID: ${req.id}`);
        console.log(`   From: ${req.fromRA}`);
        console.log(`   They offer: ${formatDateForDisplay(req.myShift.date)} | ${req.myShift.role} | ${req.myShift.hallName}`);
        console.log(`   Your shift: ${formatDateForDisplay(req.targetShift.date)} | ${req.targetShift.role} | ${req.targetShift.hallName}`);
    });

    const choice = Number.parseInt(await ask("\nSelect request number: "), 10);
    if (Number.isNaN(choice) || choice < 1 || choice > requests.length) {
        console.log("Invalid choice.");
        return;
    }

    const decision = (await ask("Approve or reject? (a/r): ")).toLowerCase();
    const allRequests = getSwapRequests();
    const selected = requests[choice - 1];
    const storedRequest = allRequests.find((req) => req.id === selected.id);

    if (!storedRequest) {
        console.log("Request no longer exists.");
        return;
    }

    if (decision === "r") {
        storedRequest.status = "rejected";
        storedRequest.respondedAt = new Date().toISOString();
        saveSwapRequests(allRequests);
        console.log("Swap request rejected.");
        return;
    }

    if (decision !== "a") {
        console.log("Invalid response.");
        return;
    }

    const schedule = readGeneratedSchedule();
    const myShiftObj = findShiftObject(schedule, storedRequest.myShift);
    const targetShiftObj = findShiftObject(schedule, storedRequest.targetShift);

    if (!myShiftObj || !targetShiftObj) {
        console.log("Could not complete swap because one or both shifts changed.");
        storedRequest.status = "failed";
        storedRequest.respondedAt = new Date().toISOString();
        saveSwapRequests(allRequests);
        return;
    }

    const requesterName = storedRequest.fromRA;
    const responderName = storedRequest.toRA;

    myShiftObj.assignedTo = responderName;
    targetShiftObj.assignedTo = requesterName;

    writeGeneratedSchedule(schedule);

    storedRequest.status = "approved";
    storedRequest.respondedAt = new Date().toISOString();
    saveSwapRequests(allRequests);

    console.log("Swap approved and schedule updated.");
}

async function raViewMySwapRequests(raUser) {
    console.log("\n--- My Swap Requests ---");

    const requests = getSwapRequests().filter(
        (req) => req.fromRA === raUser.name || req.toRA === raUser.name
    );

    if (requests.length === 0) {
        console.log("No swap requests found.");
        return;
    }

    requests.forEach((req) => {
        console.log(`\nID: ${req.id}`);
        console.log(`  Status: ${req.status}`);
        console.log(`  From: ${req.fromRA}`);
        console.log(`  To: ${req.toRA}`);
        console.log(`  Offered: ${formatDateForDisplay(req.myShift.date)} | ${req.myShift.role} | ${req.myShift.hallName}`);
        console.log(`  Requested: ${formatDateForDisplay(req.targetShift.date)} | ${req.targetShift.role} | ${req.targetShift.hallName}`);
    });
}

async function raMenu(user) {
    while (true) {
        console.log(`\n=== RA Menu (${user.name} — ${user.residenceHall || "No Hall"}) ===`);
        console.log("1. Submit Availability");
        console.log("2. Remove Availability");
        console.log("3. View My Availability");
        console.log("4. View My Schedule");
        console.log("5. View My Hall Info");
        console.log("6. Request Shift Swap");
        console.log("7. Respond To Swap Requests");
        console.log("8. View My Swap Requests");
        console.log("9. Logout");

        const choice = await ask("Choose an option: ");

        switch (choice) {
            case "1":
                await raSubmitAvailability(user);
                break;
            case "2":
                await raRemoveAvailability(user);
                break;
            case "3":
                await raViewAvailability(user);
                break;
            case "4":
                await raViewSchedule(user);
                break;
            case "5":
                await raViewHallInfo(user);
                break;
            case "6":
                await raRequestSwap(user);
                break;
            case "7":
                await raRespondToSwapRequests(user);
                break;
            case "8":
                await raViewMySwapRequests(user);
                break;
            case "9":
                console.log("\nLogged out.");
                return;
            default:
                console.log("\nInvalid option. Choose 1–9.");
        }
    }
}

async function main() {
    initializeSwapRequests();
    refreshScheduleManager();

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

main().catch((error) => {
    console.error("\nUnexpected error:", error.message);
    rl.close();
});