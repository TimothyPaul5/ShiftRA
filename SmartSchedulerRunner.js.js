const SmartScheduler=require("./SmartScheduler");
const AvailabilityDB=require("./AvailabilityDB");
const ResidenceHallService=require("./ResidenceHallService");
const ScheduleManager=require("./ScheduleManager");
const AuthService=require("./AuthService");
const RA=require("./RA");

const auth=new AuthService();
const availability=new AvailabilityDB();
const halls=new ResidenceHallService();
const manager=new ScheduleManager();

auth.loadUsers().forEach(u=>{if(u instanceof RA)manager.addRA(u);});
manager.RAs.forEach(r=>r.submitAvailability("Monday 09:00-12:00"));

const needs={"New Res Hall 3":{weekday:2,weekend:1},"Chanute":{weekday:1,weekend:1}};
const scheduler=new SmartScheduler(availability,halls,manager);
console.log("Generated:",scheduler.generateSchedule(needs));
