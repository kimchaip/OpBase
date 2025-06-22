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
      return ("0"+date.getDate()).slice(-2)+"."+("0"+(date.getMonth()+1)).slice(-2)+" : "
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
    if(old.isChange(pt.lib, e, "DOB")) {
      if(e.field("DOB")) {
        e.set("Age", dt.calAge(e.field("DOB")))
      }
      else {
        e.set("Age", null)
      }
    }
    else if(old.isChange(pt.lib, e, "Age")) {
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
    this["child"] = vs.lib.linksTo(e)
  },
  setStatus : function(e) {
    if(this.child.length>0) {
      let v = this.child.find(v=> v.field("Status")=="Active")
      if(v) {
        e.set("Status", "Active")
        e.set("Ward", v.field("Ward"))
      }
      else {
        e.set("Status", "Still")
      }
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
    else if(e.field("Ward")=="OPD" || !e.field("Ward")) {
      e.set("Ward","Uro")
    }
  },
  setPtField : function(e) {
    let p = e.field("Patient").length>0 ? e.field("Patient")[0] : null
    if(p) {
      pt.getChild(p)
      pt.setStatus(p)
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
          pt.getChild(p)                // get child visits
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
    if(opf) {
      let optype = op.getOptypeByOp(opf)
      log(optype)
      if(optype) {
        e.set("OpType", optype)
      }
      else {
        e.set("OpType", "GA")  // default to GA if no operation type found
      }
    }
    else {
      e.set("OpType", "GA")  // default to GA if no operation found
    }
  }
}

var dx = {
  name : "DxOpList",
  lib : libByName("DxOpList"),
  child : [],
  create : function(dx, op) {
    let o = new Object()
    o["Dx"] = dx
    o["Op"] = op
    return this.lib.create(o)
  },
  getChild : function(e) {
    this.child = ob.lib.linksTo(e)
  },
  effect : function(e) {
    this.getChild(e)
    if(child.length > 0) {
      e.set("Count", child.length)
    }
    else {
      e.set("Count", 0)
    }
    // If count is zero, delete the diagnosis
    if(e.field("Count") == 0) {
      e.trash()  // delete diagnosis if count is zero
      message("Deleted Diagnosis :"+ e.field("Dx")+" -> "+e.field("Op"))
    }
  }
}

var op = {
  name : "OperationList",
  lib : libByName("OpList"),
  child : [],
  create : function(op,optime) {
    let o = new Object()
    o["OpFill"] = op
    return this.lib.create(o)
  },
  getChild : function(e) {
    this.child = ob.lib.linksTo(e)
  },
  effect : function(e) {
    op.getChild(opf)  // get child operations
    if(this.child.length > 0) {
      e.set("Count", this.child.length)
      // Calculate average operation time
      let n = 0
      let totalTime = this.child.reduce((sum, op) => {
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
      message("Deleted Operation :"+ e.field("OpFill"))
    }
  },
  getOptypeByOp : function(e) {
    if(this.child.length > 0) {
      let group = {}
      this.child.forEach(o => group[o.field("OpType")] = (group[o.field("OpType")] || 0) + 1)
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
  isChange : function(lib, e, f) {
    let o = lib.findById(e.id)
    let ov = o?o.field(f):null
    old[f] = ov
    let ev = e.field(f)

    // Handle special cases for date fields
    if(dt.isDate(ov)) {
      ov = dt.toDateISO(ov)
    }
    else if(Array.isArray(ov)) {
      ov = ov.map(v => v.name).sort().join(",")
    }
    else if(typeof ov == "object" && ov != null) {
      ov = JSON.stringify(ov)
    }

    if(dt.isDate(ev)) {
      ev = dt.toDateISO(ev)
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
  }
}

var tg = {
  ptCreateBefore : function(e) {
    pt.setAgeDOB(e)
    e.recalc()
  },
  ptCreateAfter : function(e) {
  },
  ptUpdateBefore : function(e) {
    pt.setAgeDOB(e)
    e.recalc()
  },
  ptUpdateAfter : function(e) {
  },
  vsCreateBefore : function(e) {
    vs.setDCDate(e)
    vs.setStatus(e)
    vs.setWard(e)
  },
  vsCreateAfter : function(e) {
    vs.setPtField(e)
  },
  vsUpdateBefore : function(e) {
    vs.setDCDate(e)
    vs.setStatus(e)
    vs.setWard(e)
  },
  vsUpdateAfter : function(e) {
    vs.setPtField(e)
  },
  obCreateBefore : function(e) {
    ob.validOpDate(e) // validate OpDate field
    ob.validDxOp(e)  // validate Dx and Op fields
    ob.setStatus(e)  // set Status field based on OpNote and OpDate
    ob.setOpExtra(e)  // set OpExtra field based on OpDate
    ob.setX15(e)  // set X1.5 field based on Dx and Op
    ob.setOpTime(e)  // set OpTime field based on TimeIn and TimeOut
    ob.setDxOpLink(e) // set DxOpList and OperationList fields based on Dx and Op
    ob.setOpType(e)  // set OpType field based on OperationList
  },
  obCreateAfter : function(e) {
  },
  obUpdateBefore : function(e) {
    ob.validOpDate(e) // validate OpDate field
    ob.validDxOp(e)  // validate Dx and Op fields
    ob.setStatus(e)  // set Status field based on OpNote and OpDate
    ob.setOpExtra(e)  // set OpExtra field based on OpDate
    ob.setX15(e)  // set X1.5 field based on Dx and Op
    ob.setOpTime(e)  // set OpTime field based on TimeIn and TimeOut
    ob.setDxOpLink(e)  // set DxOpList and OperationList fields based on Dx and Op
    ob.setOpType(e)  // set OpType field based on OperationList
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
