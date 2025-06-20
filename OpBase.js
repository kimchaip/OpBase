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
      return date.toISOString().slice(0,10)
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
    let pts = e.field("Patient")

    if(pts.length>0) {
      let p = pts[0]
      let vss = lib().linksTo(p)
      if(vss.some(v=> v.field("Status")=="Active")) {
        p.set("Status", "Active")
        p.set("Ward", e.field("Ward"))
      }
      else {
        p.set("Status", "Still")
        p.set("Ward", "")
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
      if(!e.field("DxOpList") || !e.field("DxOpList").length) {  // no DxOpList field
        e.set("DxOpList", dxf.name)
        dx.setCount(dxf)  // update count
        message("Update Diagnosis Count :"+ dxt+" -> "+opt)
      }
      else if(e.field("DxOpList")[0].name != dxf.name) {  // DxOpList field exists but different
        let oldDx = e.field("DxOpList")[0].name.split(" -> ")  // get old diagnosis
        if(dx.delete(oldDx[0], oldDx[1])) {  // delete old diagnosis
          message("Deleted Old Diagnosis :"+ oldDx[0]+" -> "+oldDx[1])
        }
        e.set("DxOpList", dxf.name)
        dx.setCount(dxf)  // update count
        message("Update Diagnosis Count :"+ dxt+" -> "+opt)
      }
    }
    else {    // invalid diagnosis
      dxf = dx.create(dxt, opt)   // create new diagnosis
      if(dxf) {
        if(!e.field("DxOpList") || !e.field("DxOpList").length) {  // no DxOpList field
          e.set("DxOpList", dxf.name)
          message("Created New Diagnosis :"+ dxt+" -> "+opt)
        }
        else {  // DxOpList field exists but different
          let oldDx = e.field("DxOpList")[0].name.split(" -> ")  // get old diagnosis
          if(dx.delete(oldDx[0], oldDx[1])) {  // delete old diagnosis
            message("Deleted Old Diagnosis :"+ oldDx[0]+" -> "+oldDx[1])
          }
          e.set("DxOpList", dxf.name)
          message("Created New Diagnosis :"+ dxt+" -> "+opt)
        }
      }
    }
    if(opf) {  // valid operation
      if(!e.field("OperationList") || !e.field("OperationList").length) {  // no OperationList field
        e.set("OperationList", opf.name)
        op.setCount(opf)  // update count
        message("Update Operation Count :"+ opf.name)
      }
      else if(e.field("OperationList")[0].name != opf.name) {  // OperationList field exists but different
        let oldOp = e.field("OperationList")[0].name  // get old operation
        if(op.delete(oldOp)) {  // delete old operation
          message("Deleted Old Operation :"+ oldOp)
        }
        e.set("OperationList", opf.name)
        op.setCount(opf)  // update count
        message("Update Operation Count :"+ opf.name)
      }
    }
    else {  // invalid operation
      opf = op.create(opt,e.field("OpTime"))  // create new operation
      if(opf) {
        if(!e.field("OperationList") || !e.field("OperationList").length) {  // no OperationList field
          e.set("OperationList", opf.name)
          message("Created New Operation :"+ opt)
        }
        else {  // OperationList field exists but different
          let oldOp = e.field("OperationList")[0].name  // get old operation
          if(op.delete(oldOp)) {  // delete old operation
            message("Deleted Old Operation :"+ oldOp)
          }
          e.set("OperationList", opf.name)
          message("Created New Operation :"+ opt)
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
  }
}

var dx = {
  name : "DxOpList",
  lib : libByName("DxOpList"),
  create : function(dx, op) {
    let o = new Object()
    o["Dx"] = dx
    o["Op"] = op
    o["Count"] = 1
    return this.lib.create(o)
  },
  delete : function(dx, op) {
    let dxf = this.lib.findByKey(dx+" -> "+op)
    this.setCount(dxf)  // update count before deleting
    if(dxf) {
      if(dxf.field("Count")>1) {
        dxf.set("Count", dxf.field("Count")-1)
      }
      else {
        dxf.trash()
      }
      return true
    }
    else {
      return false
    }
  },
  setCount : function(e) {
    let child = ob.lib.linksTo(e)
    if(child) {
      e.set("Count", child.length)
    }
    else {
      e.set("Count", 0)
    }
  }
}

var op = {
  name : "OperationList",
  lib : libByName("OpList"),
  create : function(op,optime) {
    let o = new Object()
    o["OpFill"] = op
    o["Price"] = 0
    o["PriceExtra"] = 0
    o["Count"] = 1
    o["OpTimeX"] = optime
    return this.lib.create(o)
  },
  delete : function(op) {
    let opf = this.lib.findByKey(op)
    this.setCount(opf)  // update count before deleting
    if(opf) {
      if(opf.field("Count")>1) {
        opf.set("Count", opf.field("Count")-1)
      }
      else {
        opf.trash()
      }
      return true
    }
    else {
      return false
    }
  },
  setCount : function(e) {
    let child = ob.lib.linksTo(e)
    if(child) {
      e.set("Count", child.length)
    }
    else {
      e.set("Count", 0)
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
    ob.setOpExtra(e)  // set OpExtra field based on OpDate
    ob.setX15(e)  // set X1.5 field based on Dx and Op
    ob.setOpTime(e)  // set OpTime field based on TimeIn and TimeOut
    ob.setDxOpLink(e) // set DxOpList and OperationList fields
  },
  obCreateAfter : function(e) {
  },
  obUpdateBefore : function(e) {
    ob.validOpDate(e) // validate OpDate field
    ob.validDxOp(e)  // validate Dx and Op fields
    ob.setOpExtra(e)  // set OpExtra field based on OpDate
    ob.setX15(e)  // set X1.5 field based on Dx and Op
    ob.setOpTime(e)  // set OpTime field based on TimeIn and TimeOut
    ob.setDxOpLink(e)  // set DxOpList and OperationList fields
  },
  obUpdateAfter : function(e) {
  },
}
