var dt = {
  isDate : function(value) {
    return value instanceof Date && !isNaN(value)
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
    if(old.isChange(vs.lib, e, "VisitType")) {
      if(e.field("VisitType")=="OPD") {
        e.set("DCDate", e.field("VisitDate"))
      }
      else {
        e.set("DCDate", "")
      }
    }
  },
  setPtField : function(e) {
    let pts = e.field("Patient")

    if(pts.length>0) {
      let p = pts[0]
      let vss = lib().linksTo(p)
      if(vss.some(v=> {
        return (v.field("VisitType")=="OPD" && dt.toDateISO(v.field("VisitDate"))==dt.toDateISO(today) && (!v.field("DCDate") || dt.toDateISO(v.field("DCDate"))==dt.toDateISO(today)))
                || (v.field("VisitType")=="Admit" && dt.toDateISO(v.field("VisitDate"))<=dt.toDateISO(today) && (!v.field("DCDate") || dt.toDateISO(v.field("DCDate"))>dt.toDateISO(today)))
      })) {
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
  lib : libByName("OpBase")
}

var old = {
  isChange : function(lib, e, f) {
    let o = lib.findById(e.id)
    let ov = o?o.field(f):null
    let ev = e.field(f)

    if(f.includes("Date") || f.includes("DOB")) {
      ov = dt.toDateISO(ov)
      ev = dt.toDateISO(ev)
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
  },
  vsCreateAfter : function(e) {
    vs.setPtField(e)
  },
  vsUpdateBefore : function(e) {
    vs.setDCDate(e)
  },
  vsUpdateAfter : function(e) {
    vs.setPtField(e)
  },
  obCreateBefore : function(e) {
  },
  obCreateAfter : function(e) {
  },
  obUpdateBefore : function(e) {
  },
  obUpdateAfter : function(e) {
  },
}
