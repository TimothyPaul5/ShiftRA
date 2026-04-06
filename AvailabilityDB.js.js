class AvailabilityDB {
    constructor() { this.data = this.reset(); }

    reset(){
        return {Monday:[],Tuesday:[],Wednesday:[],Thursday:[],Friday:[],Saturday:[],Sunday:[]};
    }

    addAvailability(day,start,end,name,timeZone,type){
        if (!this.data[day]) return false;
        this.data[day].push({startTime:start,endTime:end,name,timeZone,type});
        return true;
    }

    getAllAvailability(){ return this.data; }
}
module.exports = AvailabilityDB;
