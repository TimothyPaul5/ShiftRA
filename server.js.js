const express=require("express");
const fs=require("fs");
const path=require("path");
const AuthService=require("./AuthService");
const SmartScheduler=require("./SmartScheduler");
const AvailabilityDB=require("./AvailabilityDB");
const ResidenceHallService=require("./ResidenceHallService");
const ScheduleManager=require("./ScheduleManager");
const RA=require("./RA");

const app=express();
app.use(express.json());
app.use(express.static(path.join(__dirname,"web")));
app.use("/data",express.static(path.join(__dirname,"data")));

const auth=new AuthService();
const avail=new AvailabilityDB();
const halls=new ResidenceHallService();
const mgr=new ScheduleManager();
auth.loadUsers().forEach(u=>{if(u instanceof RA)mgr.addRA(u);});

// login
app.post("/login",(req,res)=>{res.json(auth.login(req.body.email,req.body.password));});

// availability
app.post("/availability",(req,res)=>{
    const {day,startTime,endTime,name,timeZone,type}=req.body;
    if(!avail.addAvailability(day,startTime,endTime,name,timeZone,type)) 
        return res.status(400).json({success:false});
    fs.writeFileSync(path.join(__dirname,"data/availability.json"),
        JSON.stringify(avail.getAllAvailability(),null,2));
    res.json({success:true});
});

// schedule
app.post("/generate-schedule",(req,res)=>{
    const sch=new SmartScheduler(avail,halls,mgr);
    const out=sch.generateSchedule(req.body);
    res.json({success:true,schedule:out});
});

app.get("/schedule",(req,res)=>{
    const f=path.join(__dirname,"data/generatedSchedule.json");
    res.sendFile(f);
});

app.listen(4000,()=>console.log("Server [localhost](http://localhost:4000)"));
//computer will respond to web requests 