var dt = {
  isDate : function(value) {
    return value instanceof Date && !isNaN(value)
  },
  diffDays : function(date1, date2) {
    if(this.isDate(date1) && this.isDate(date2)) {
      let diffTime = Math.abs(date2 - date1);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    else {
      return null
    }
  },
  calAge : function(birthday) {
    let ageDifMs = Date.now() - birthday.getTime();
    let ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  },
  calBirthday : function(age) {
    return new Date(today.getFullYear()-age, today.getMonth(), today.getDate(), 7)
  },
  toDateISO : function(date) {
    if(this.isDate(date)) {
      return date.getFullYear()+"-"+("0"+(date.getMonth()+1)).slice(-2)+"-"+("0"+date.getDate()).slice(-2)
    }
    else {
      return ""
    }
  },
  toDateShort : function(date) {
    if(this.isDate(date)) {
      return ("0"+date.getDate()).slice(-2)+"."+("0"+(date.getMonth()+1)).slice(-2)+"."+date.getFullYear().toString()+" : "
    }
    else {
      return ""
    }
  }
}
var today = new Date()

var pt = {
  name : "Patients",
  lib : libByName("Patients"),
  setAgeDOB : function(e) {
    if(old.isChange.call(pt, e, "DOB")) {
      if(e.field("DOB")) {
        e.set("Age", dt.calAge(e.field("DOB")))
      }
      else {
        e.set("Age", null)
      }
    }
    else if(old.isChange.call(pt, e, "Age")) {
      if(e.field("Age")) {
        e.set("DOB", dt.calBirthday(e.field("Age")))
      }
      else {
        e.set("DOB", null)
      }
    }
    else {
      if(e.field("DOB")) {
        e.set("Age", dt.calAge(e.field("DOB")))
      }
    }
  },
  getChild : function(e) {
    this[e.name] = vs.lib.linksTo(e)
  },
  setStatus : function(e) {
    if(!([e.name] in this)) {
      this.getChild(e)
    }
    
    if(this[e.name].length>0) {
      let v = this[e.name].find(v=> v.field("Status")=="Active")
      if(v) {
        e.set("Status", "Active")
        e.set("Ward", v.field("Ward"))
      }
      else {
        e.set("Status", "Still")
      }
    }
  },
  setDJstent : function(e) {
    if(!([e.name] in this)) {
      this.getChild(e)
    }

    if(this[e.name].length > 0) {
      let obs = []
      this[e.name].forEach(v => {
        let child = ob.lib.linksTo(v)
        if(child.length>0) {
          obs = obs.concat(child.filter(o=>dt.toDateISO(o.field("OpDate"))<=dt.toDateISO((today)) && o.field("DJstent")))
        }
      })
      obs.sort((a,b)=>dt.toDateISO(a.field("OpDate"))>dt.toDateISO(b.field("OpDate")))
      
      if(obs.length>0 && obs[obs.length-1].field("DJstent")!="off DJ") {
        e.set("DJstent", "on DJ")
        e.set("DJDate", obs[obs.length-1].field("OpDate"))
      }
      else {
        e.set("DJstent", null)
        e.set("DJDate", null)
      }
    }
  },
  getPastHx : function(e, date) {
    if(!([e.name] in this)) {
      this.getChild(e)
    }
    if(this[e.name].length > 0) {
      let obs = []
      let datestr = dt.toDateISO((date))
      this[e.name].forEach(v => {
        let child = ob.lib.linksTo(v)
        if(child.length>0) {
          obs = obs.concat(child.filter(o=>dt.toDateISO(o.field("OpDate"))<=datestr && o.field("Status")!="Not"))
        }
      })
      obs.sort((a,b)=>dt.toDateISO(a.field("OpDate"))>dt.toDateISO(b.field("OpDate")))
      return obs.length>0 ? obs.reduce((t,o)=>t += o.field("Dx") + " > " + o.field("Dx") + " [" + dt.toDateShort(o.field("OpDate")) + "]\n","").slice(0,-1) : ""
    }
  }
}

var vs = {
  name : "Visit",
  lib : libByName("Visit"),
  setDCDate : function(e) {
    if(e.field("VisitType")=="OPD" ) {
      e.set("DCDate", e.field("VisitDate"))
    }
    else if(dt.toDateISO(e.field("VisitDate")) > dt.toDateISO(today)) {
      e.set("DCDate", "")
    }
    else if(e.field("DCDate") && dt.toDateISO(e.field("DCDate")) < dt.toDateISO(e.field("VisitDate"))) {
      cancel()
      message("Discharge Date cannot be before Visit Date")
    }
  },
  setStatus : function(e) {
    if(e.field("Status") != "Not") {
      if(dt.toDateISO(e.field("VisitDate"))>dt.toDateISO(today)) {
        e.set("Status", "Plan")
      }
      else if(dt.toDateISO(e.field("VisitDate"))<=dt.toDateISO(today)) {
        if((e.field("VisitType")=="OPD" && dt.toDateISO(e.field("DCDate"))==dt.toDateISO(today)) 
          || (e.field("VisitType")=="Admit" && (!e.field("DCDate") || dt.toDateISO(e.field("DCDate"))>dt.toDateISO(today)))) {
          e.set("Status", "Active")
        }
        else  {
          e.set("Status", "Done")
        }
      }
    }
  },
  setWard : function(e) {
    if(e.field("VisitType")=="OPD") {
      e.set("Ward","OPD")
    }
    else if(old.isChange.call(vs, e, "VisitType") && !old.isChange.call(vs, e, "Ward")) {
      e.set("Ward","Uro")
    }
  },
  setPtField : function(e) {
    let p = e.field("Patient").length>0 ? e.field("Patient")[0] : null
    if(p) {
      pt.setStatus(p)
    }
  },
  buildDefault : function() {
    log("buildDefault")
    if(buildDefaultEntry().created) {
      let vss = this.lib.entries()
      log("vss:"+vss.length)
      if(vss.length>0) {
        log(vss[vss.length-1].lastModifiedTime)
        log(vss[vss.length-1].lastModifiedTime.getTime())
        log(new Date(vss[vss.length-1].lastModifiedTime))
        let vstoday = vss.filter(v=>dt.toDateISO(v.lastModifiedTime)==dt.toDateISO((today)))
        vstoday.sort((a,b)=>a.lastModifiedTime>b.lastModifiedTime)
        log("vstoday:"+vstoday.length)
        let e = vstoday.length>0 ? vstoday[vstoday.length-1] : null
        if(e) {
          let p = e.field("Patient")[0]
          log("p : "+e.name)
          if(e.field("VisitDate")) {
            log("visitdate : "+e.field("VisitDate"))
            let pasthx = pt.getPastHx(p,e.field("VisitDate"))
            message("visitdate : " + pasthx)
            buildDefaultEntry().set("Px", pasthx)
          }
          else {
            let pasthx = pt.getPastHx(p,today)
            message("today : " + pasthx)
            buildDefaultEntry().set("Px", pasthx)
          }
        }
      }
    }
  } 
}

var ob = {
  name : "OpBase",
  lib : libByName("OpBase"),
  validOpDate : function(e) {
    let v = e.field("Visit") && e.field("Visit").length>0 ? e.field("Visit")[0] : null
    if(v && dt.toDateISO(e.field("OpDate")) < dt.toDateISO(v.field("VisitDate"))) {
      cancel()
      message("Operation Date cannot be Before the Visit Date")
    }
  },
  validDxOp : function(e) {
    let dxt = e.field("Dx")
    dxt = dxt.replace(/[-#]/g,"").replace(/\s+/g," ").trim()  // clean up diagnosis
    if(!dxt) {
      cancel()
      message("Diagnosis cannot be empty")
      return
    }
    e.set("Dx", dxt)

    let opt = e.field("Op")
    opt = opt.replace(/[-#]/g,"").replace(/\s+/g," ").trim()  // clean up operation
    if(!opt) {
      cancel()
      message("Operation cannot be empty")
      return
    }
    e.set("Op", opt)
  },
  setOpExtra : function(e) {
    let holiday = hd.isHoliday(e.field("OpDate")) || e.field("OpDate").getDay() == 0 || e.field("OpDate").getDay() == 6
    let timeout = e.field("TimeIn")!=null && e.field("TimeIn").getHours() < 8 || e.field("TimeOut")!=null && e.field("TimeOut").getHours() > 16
    
    if(holiday || timeout) {
      e.set("OpExtra", true)
    }
    else {
      e.set("OpExtra", false)
    }
  },
  setX15 : function(e) {
    if(e.field("Dx").search(/\b(rc|uc|vc|stone|calculi)\b/i)>-1 || e.field("Op").search(/(\b(rirs|cl|ursl|pcnl|spl|pccl|stone)\b|litho)/i)>-1) {
      e.set("X1.5", true)
    }
    else {
      e.set("X1.5", false)
    }
  },
  setOpTime : function(e) {
    if(e.field("TimeIn")!=null && e.field("TimeOut")!=null) {
      if(e.field("TimeOut") >= e.field("TimeIn")) {
        e.set("OpTime", e.field("TimeOut") - e.field("TimeIn"))
      }
      else if(e.field("TimeIn") > e.field("TimeOut")) {
        e.set("OpTime", 86400000-(e.field("TimeIn") - e.field("TimeOut")))
      }
    }
    else {
      e.set("OpTime", null)
    }
  },
  setDxOpLink : function(e) {
    let dxt = e.field("Dx")
    let opt = e.field("Op")
    let dxf = dx.lib.findByKey(dxt+" -> "+opt)
    let opf = op.lib.findByKey(opt)

    if(dxf) {  // valid diagnosis
      if(e.field("DxOpList").length==0) {  // no DxOpList field
        e.set("DxOpList", dxf.name)   // set new diagnosis
        dx.effect(dxf)    // update count of new diagnosis
      }
      else if(e.field("DxOpList")[0].name != dxf.name) {  // DxOpList field exists but different
        let dxo = e.field("DxOpList")[0]  // get old diagnosis
        e.set("DxOpList", dxf.name)   // set new diagnosis
        dx.effect(dxf)    // update count of new diagnosis
        dx.effect(dxo)    // update count of old diagnosis
      }
    }
    else {    // invalid diagnosis
      dxf = dx.create(dxt, opt)   // create new diagnosis
      if(dxf) {
        let dxo = e.field("DxOpList").length>0 ? e.field("DxOpList")[0] : null    // get old diagnosis
        e.set("DxOpList", dxf.name)   // set new diagnosis
        dx.effect(dxf)    // update count of new diagnosis
        if(dxo) {  //  DxOpList field exists
          dx.effect(dxo)  // update count of old diagnosis
        }
      }
    }
    if(opf) {  // valid operation
      if(e.field("OperationList").length==0) {  // no OperationList field
        e.set("OperationList", opf.name)    // set new operation
        op.effect(opf)    // update count of new operation
      }
      else if(e.field("OperationList")[0].name != opf.name) {  // OperationList field exists but different
        let oldOp = e.field("OperationList")[0]  // get old operation
        e.set("OperationList", opf.name)    // set new operation
        op.effect(opf)    // update count of new operation
        op.effect(oldOp)    // update count of old operation
      }
    }
    else {  // invalid operation
      opf = op.create(opt,e.field("OpTime"))  // create new operation
      if(opf) {
        let oldOp = e.field("OperationList").length>0 ? e.field("OperationList")[0] : null  // get old operation
        e.set("OperationList", opf.name)    // set new operation
        op.effect(opf)    //
        if(oldOp) {  // OperationList field exists
          op.effect(oldOp)  // update count of old operation
        }
      }
    }
    this.setBonus(e)
    if(e.field("OpTime") == null) {
      e.set("OpTime", opf.field("OpTimeX"))
    }
  },
  setBonus : function(e) {
    let opf = e.field("OperationList") && e.field("OperationList").length>0 ? e.field("OperationList")[0] : null
    if(opf) {
      if(e.field("OpExtra")) {
        if(e.field("X1.5")) {
          e.set("Bonus", opf.field("PriceExtra"))
        }
        else {
          e.set("Bonus", opf.field("Price"))
        }
      }
      else {
        e.set("Bonus", 0)
      }
    }
  },
  setStatus : function(e) {
    let oldStatus = e.field("Status")
    if(e.field("OpNote").search(/^ *ไม่ทำ/)>-1) {
      e.set("Status", "Not")
      // If operation is Not, set visit status to Not
      let v = e.field("Visit").length>0 ? e.field("Visit")[0] : null
      if(v) {
        v.set("Status", "Not")
        if(v.field("Rx") && v.field("Rx").search(/\n*.*ไม่ทำ.*/)==-1) {
          v.set("Rx", v.field("Rx")+(v.field("Rx")?"\n":"")+dt.toDateShort(today)+e.field("OpNote"))  // set visit Rx to OpNote
        }
        v.set("DCDate", null)           // clear discharge date
        let p = v.field("Patient").length>0 ? v.field("Patient")[0] : null
        if(p) {                         // if this is the last visit
          pt.setStatus(p)               // set patient status
        }
      }
    }
    else if(e.field("OpNote").search(/^ *งด/)>-1) {
      e.set("Status", "Not")
    }
    else if(e.field("OpDate") && dt.toDateISO(e.field("OpDate")) > dt.toDateISO(today)) {
      e.set("Status", "Plan")
    }
    else if(e.field("OpDate") && dt.toDateISO(e.field("OpDate")) <= dt.toDateISO(today)) {
      if(e.field("OpNote")) {
        e.set("Status", "Done")
      }
    }
    // If status changed from Not, clear visit Rx and set visit status to null
    if(oldStatus!=e.field("Status") && oldStatus == "Not") {    // if status changed from Not
      let v = e.field("Visit").length>0 ? e.field("Visit")[0] : null
      if(v) {
        v.set("Status", null)       // set visit status to null
        v.set("Rx", v.field("Rx").replace(/\n*.*ไม่ทำ.*/,""))  // clear visit Rx
        vs.setStatus(v)             // set visit status
      }
    }
  },
  setOpType : function(e) {
    let opf = e.field("OperationList").length>0 ? e.field("OperationList")[0] : null
    if(opf && opf.name in op && !old.isChange.call(ob, e, "OpType")) {   // if Op changed but OpType not
      let optype = op.getOptypeByOp(opf)
      if(optype) {
        e.set("OpType", optype)
      }
      else {
        e.set("OpType", "GA")  // default to GA if no operation type found
      }
    }
  },
  setVsVisitType : function(e) {
    let dxf = e.field("DxOpList").length>0 ? e.field("DxOpList")[0] : null
    if(dxf && dxf.name in dx) {
      let vstype = dx.getVStypeByDx(dxf)
      let v = e.field("Visit").length>0 ? e.field("Visit")[0] : null
      if(v && dt.toDateISO(v.field("VisitDate")) > dt.toDateISO(today)) {
        let oldvstype = v.field("VisitType")
        if(vstype) {
          v.set("VisitType", vstype)  // set visit type based on diagnosis
        }
        else if(e.field("OpType")=="LA") {
          v.set("VisitType", "OPD")
        }
        else if(e.field("OpType")=="GA") {
          v.set("VisitType", "Admit")
        }
        if(oldvstype != v.field("VisitType")) {
          vs.setDCDate(v)
          vs.setStatus(v)
          vs.setWard(v)
        }
      }
    }
  },
  setDJstent : function(e) {
    let opnote = e.field("OpNote")
    let oldDJstent = e.field("DJstent")
    if(e.field("Status") != "Not") {
      if(opnote) {
        let notdj = opnote.search(/(not|no|ไม่) *(|on|ใส่) *(|rt|lt|right|left|bilat|bilateral)\.* *dj/i) > -1
        let ondj = opnote.search(/(on|ใส่) *(|rt|lt|right|left|bilat|bilateral)\.* *dj/i) > -1
        let offdj = opnote.search(/(off|ถอด) *(|rt|lt|right|left|bilat|bilateral)\.* *dj/i) > -1
        let changedj = opnote.search(/(change|เปลี่ยน) *(|rt|lt|right|left|bilat|bilateral)\.* *dj/i) > -1

        if(notdj) {
          e.set("DJstent", null)
        }
        else if(changedj) {
          e.set("DJstent", "change DJ")
        }
        else if(offdj) {
          e.set("DJstent", "off DJ")
        }
        else if(ondj) {
          e.set("DJstent", "on DJ")
        }
        else {
          e.set("DJstent", null)
        }
      }
      else {
        e.set("DJstent", null)
      }
    }
    else {
      e.set("DJstent", null)  // if status is Not, clear DJstent
    }

    if(oldDJstent!=e.field("DJstent")) {    // change ObDJstent -> change PtDJstent
      let v = e.field("Visit").length > 0 ? e.field("Visit")[0] : null
      if(v) {
        let p = v.field("Patient").length > 0 ? v.field("Patient")[0] : null
        if(p) {
          pt.setDJstent(p)
        }
      }
    }
  },
  setQue : function(e) {
    if(old.isChange.call(ob, e, "OpDate") || old.isChange.call(ob, e, "Status") || old.isChange.call(ob, e, "OpType") || old.isChange.call(ob, e, "Que") || old.isChange.call(ob, e, "TimeIn")) {
      let oldopdate = old.getField.call(ob, e, "OpDate")
      let oldoptype = old.getField.call(ob, e, "OpType")
      let oldstatus = old.getField.call(ob, e, "Status")
      let obs = this.lib.entries()

      // load OpBase entries by OpDate, Status != "Not", OpType 
      let oldqs = que.load(obs, oldopdate, oldoptype)
      let newqs = que.load(obs, dt.toDateISO(e.field("OpDate")), e.field("OpType"))
      
      // sort filtrated entries with TimeIn and Que
      que.sort(oldqs)
      que.sort(newqs)
      
      // if OpDate or OpType was changed -> remove e from oldqs and save oldqs, reset Que = "00"
      if(old.isChange.call(ob, e, "OpDate") || old.isChange.call(ob, e, "OpType")) {
        que.remove(oldqs, e)
        que.save(oldqs)
        e.set("Que", "00")
      }

      // if Status was changed -> remove e from newqs +/- insert e to newqs at this Que
      if(e.field("Status") == "Not") {
        que.remove(newqs, e)
        e.set("Que", "00")
      }
      else {
        que.remove(newqs, e)
        que.insert(newqs, Number(e.field("Que")), e)
      }
        
      // reassign new Que by sequence
      que.save(newqs)
    }
  }
}

var dx = {
  name : "DxOpList",
  lib : libByName("DxOpList"),
  create : function(dx, op) {
    let o = new Object()
    o["Dx"] = dx
    o["Op"] = op
    return this.lib.create(o)
  },
  getChild : function(e) {
    this[e.name] = ob.lib.linksTo(e)
  },
  effect : function(e) {
    this.getChild(e)
    if(this[e.name].length > 0) {
      e.set("Count", this[e.name].length)
    }
    else {
      e.set("Count", 0)
    }
    // If count is zero, delete the diagnosis
    if(e.field("Count") == 0) {
      e.trash()  // delete diagnosis if count is zero
      message("Deleted Diagnosis :"+ e.name)
    }
  },
  getVStypeByDx : function(e) {
    if(this[e.name].length > 0) {
      let group = {}
      this[e.name].forEach(o => {
        let vstype = o.field("Visit").length>0?o.field("Visit")[0].field("VisitType"):""
        group[vstype] = (group[vstype] || 0) + 1
      })
      return group["OPD"]>group["Admit"] ? "OPD" : "Admit"
    }
    else {
      return null
    }
  }
}

var op = {
  name : "OperationList",
  lib : libByName("OpList"),
  create : function(op,optime) {
    let o = new Object()
    o["OpFill"] = op
    return this.lib.create(o)
  },
  getChild : function(e) {
    this[e.name] = ob.lib.linksTo(e)   // get child operations for this operation
  },
  effect : function(e) {
    this.getChild(e)  // get child operations
    if(this[e.name].length > 0) {
      e.set("Count", this[e.name].length)
      // Calculate average operation time
      let n = 0
      let totalTime = this[e.name].reduce((sum, op) => {
        if(op.field("TimeIn") != null && op.field("TimeOut") != null && op.field("OpTime")) {
          n += 1
          return sum + op.field("OpTime")
        }
        else {
          return sum
        }
      }, 0)
      if(n > 0) {
        totalTime = Math.round(totalTime / n)  // average time
      }
      else {
        totalTime = 0
      }
      e.set("OpTimeX", totalTime)  // set average operation time
    }
    else {
      e.set("Count", 0)
    }
    // If count is zero, delete the operation
    if(e.field("Count") == 0) {
      e.trash()  // delete operation if count is zero
      message("Deleted Operation :"+ e.name)
    }
  },
  getOptypeByOp : function(e) {
    if(this[e.name].length > 0) {
      let group = {}
      this[e.name].forEach(o => group[o.field("OpType")] = (group[o.field("OpType")] || 0) + 1)
      return group["LA"]>group["GA"] ? "LA" : "GA"
    }
    else {
      return null
    }
  }
}

var hd = {
  name : "Holidays",
  lib : libByName("Holidays"),
  isHoliday : function(date) {
    if(dt.isDate(date)) {
      let hds = this.lib.entries()
      return hds.some(h => {
        return dt.toDateISO(h.field("Date")) == dt.toDateISO(date) && h.field("Holiday")
      })
    }
    else {
      return false
    }
  },
  getEntries : function(date) {
    if(dt.isDate(date)) {
      let hds = this.lib.entries()
      return hds.filter(h => {
        return dt.toDateISO(h.field("Date")) == dt.toDateISO(date)
      })
    }
    else {
      return []
    }
  }
}

var old = {
  save : function(e) {
    let fields = this.lib.fields()
    let oe = this.lib.findById(e.id)
    let o = {}
    for(let f of fields) {
      if(f=="Patient" || f=="Visit" || f=="DxOpList" || f=="OperationList") {
        o[f] = oe.field(f).length>0 ? oe.field(f)[0].name : null
      }
      else if(dt.isDate(oe.field(f))) {
        if(f.includes("Time")) {
          o[f] = oe.field(f)
        }
        else {
          o[f] = dt.toDateISO(oe.field(f))
        }
      }
      else if(Array.isArray(oe.field(f))) {
        o[f] = oe.field(f).map(v => v.name).sort().join(",")
      }
      else if(typeof oe.field(f) == "object" && oe.field(f) != null) {
        o[f] = JSON.stringify(oe.field(f))
      }
      else {
        o[f] = oe.field(f)
      }
    }
    old[this.name] = o
  },
  isChange : function(e, f) {
    if(!(this.name in old) || !(f in old[this.name])) {
      log("error : "+this.name+" or "+f+" is not found in old -> exit()")
      message("error : "+this.name+" or "+f+" is not found in old -> exit()")
      exit()
    }

    let ov = old[this.name][f]
    let ev = e.field(f)
    
    // Handle special cases for data fields
    if(f=="Patient" || f=="Visit" || f=="DxOpList" || f=="OperationList") {
      ev = e.field(f).length>0 ? e.field(f)[0].name : null
    }
    else if(dt.isDate(ev)) {
      if(f.includes("Time")) {
        ev = ev
      }
      else {
        ev = dt.toDateISO(ev)
      }
    }
    else if(Array.isArray(ev)) {
      ev = ev.map(v => v.name).sort().join(",")
    }
    else if(typeof ev == "object" && ev != null) {
      ev = JSON.stringify(ev)
    }

    if(ev && ov) {
      return ev != ov
    }
    else {
      return ev || ov
    }
  },
  getField : function(e, f) {
    if(this.name in old && f in old[this.name]) {
      return old[this.name][f]
    }
    else {
      return undefined
    }
  }
}

var que = {
  load : function(arr, opdate, optype) {
    return arr.filter(o=> dt.toDateISO(o.field("OpDate")) == opdate && o.field("Status") != "Not" && o.field("OpType") == optype)
  },
  sort : function(arr) {
    arr.sort((a,b)=>{
      let A = a.field("TimeIn")!=null ? a.field("TimeIn") : 86400000
      let B = b.field("TimeIn")!=null ? b.field("TimeIn") : 86400000
      if(A-B!=0) {
        return A-B
      }
      else {
        return a.field("Que")-b.field("Que")
      }
    })
  },
  findInx : function(arr, e) {
    return arr.length>0 ? arr.findIndex(o=> o.id==e.id) : -1
  },
  remove : function(arr, e) {
    let inx = this.findInx(arr,e)
    if(inx>-1) {
      arr.splice(inx, 1)
    }
  },
  insert : function(arr, q, e) {
    if(q>0) {
      arr.splice(q-1, 0, e)
    }
    else {
      arr.push(e)
    }
  },
  save : function(arr) {
    arr.forEach((o,i)=>{
      o.set("Que",("0"+(i+1)).slice(-2))
    })
  },
  log : function(arr, title, opdate, optype) {
    log(title+" :"+opdate+", "+optype+", ["+arr.map(o=>o.field("Visit")[0].name+"; "+o.field("Que")).join(", ")+"]")
  }
}

var tg = {
  ptCreateBefore : function(e) {
    old.save.call(pt, e)
    pt.setAgeDOB(e)
    e.recalc()
  },
  ptCreateAfter : function(e) {
  },
  ptUpdateBefore : function(e) {
    old.save.call(pt, e)
    pt.setAgeDOB(e)
    e.recalc()
  },
  ptUpdateAfter : function(e) {
  },
  vsCreateOpenEdit : function() {
    vs.buildDefault()
  },
  vsCreateBefore : function(e) {
    old.save.call(vs, e)
    vs.setDCDate(e)
    vs.setStatus(e)
    vs.setWard(e)
  },
  vsCreateAfter : function(e) {
    vs.setPtField(e)
  },
  vsUpdateBefore : function(e) {
    old.save.call(vs, e)
    vs.setDCDate(e)
    vs.setStatus(e)
    vs.setWard(e)
  },
  vsUpdateAfter : function(e) {
    vs.setPtField(e)
  },
  obCreateBefore : function(e) {
    old.save.call(ob, e)  // save ofd field value to old
    ob.validOpDate(e)     // validate OpDate field
    ob.validDxOp(e)       // validate Dx and Op fields
    ob.setStatus(e)       // set Status field based on OpNote and OpDate if change -> set Status field in Visit/Patient
    ob.setDJstent(e)      // set DJstent field based on OpNote if change -> set DJstent/DJDate field in Patient
    ob.setQue(e)          // set Que field based on OpDate, Status, OpType, Que, TimeIn changes
    ob.setOpExtra(e)      // set OpExtra field based on OpDate
    ob.setX15(e)          // set X1.5 field based on Dx and Op
    ob.setOpTime(e)       // set OpTime field based on TimeIn and TimeOut
    ob.setDxOpLink(e)     // set DxOpList and OperationList fields based on Dx and Op if change -> update count/opTimeX field
    ob.setOpType(e)       // set OpType field based on OperationList
    ob.setVsVisitType(e)  // set VisitType field in Visit based on DxOpList
  },
  obCreateAfter : function(e) {
  },
  obUpdateBefore : function(e) {
    old.save.call(ob, e)  // save ofd field value to old
    ob.validOpDate(e)     // validate OpDate field
    ob.validDxOp(e)       // validate Dx and Op fields
    ob.setStatus(e)       // set Status field based on OpNote and OpDate if change -> set Status field in Visit/Patient
    ob.setDJstent(e)      // set DJstent field based on OpNote if change -> set DJstent/DJDate field in Patient
    ob.setQue(e)          // set Que field based on OpDate, Status, OpType, Que, TimeIn changes
    ob.setOpExtra(e)      // set OpExtra field based on OpDate
    ob.setX15(e)          // set X1.5 field based on Dx and Op
    ob.setOpTime(e)       // set OpTime field based on TimeIn and TimeOut
    ob.setDxOpLink(e)     // set DxOpList and OperationList fields based on Dx and Op if change -> update count/opTimeX field
    ob.setOpType(e)       // set OpType field based on OperationList
    ob.setVsVisitType(e)  // set VisitType field in Visit based on DxOpList
  },
  obUpdateAfter : function(e) {
  },
  dxCreateBefore : function(e) {
    dx.effect(e)  // update count of diagnosis
  },
  dxCreateAfter : function(e) {
  },
  dxUpdateBefore : function(e) {
    dx.effect(e)  // update count of diagnosis
  },
  dxUpdateAfter : function(e) {
  },
  opCreateBefore : function(e) {
    op.effect(e)  // update count of operation and average operation time
  },
  opCreateAfter : function(e) {
  },
  opUpdateBefore : function(e) {
    op.effect(e)  // update count of operation and average operation time
  },
  opUpdateAfter : function(e) {
  }
}
