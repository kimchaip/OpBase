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
      log("DOB>Age : "+e.field("Age"))
    }
    else if(old.isChange(pt.lib, e, "Age")) {
      if(e.field("Age")) {
        e.set("DOB", dt.calBirthday(e.field("Age")))
      }
      else {
        e.set("DOB", null)
      }
      log("Age>DOB : "+e.field("DOB"))
    }
    else {
      if(e.field("DOB")) {
        e.set("Age", dt.calAge(e.field("DOB")))
      }
      log("!DOB>!Age : "+e.field("Age"))
    }
  }
}

var vs = {
  name : "Visit",
  lib : libByName("Visit"),
  setPtActive : function(e) {
    let pts = e.field(pt.name)

    if(pts.length>0) {
      let p = pts[0]
      let vss = lib().linksTo(p)
      if(vss.some(v=> dt.toDateISO(v.field("VisitDate"))<=dt.toDateISO(today) && (dt.toDateISO(v.field("DCDate"))>=dt.toDateISO(today) || !v.field("DCDate")) )) {
        p.set("Status", "Active")
      }
      else {
        p.set("Status", "Still")
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

    if(f.includes("Date")) {
      ov = dt.toDateISO(ov)
      ev = dt.toDateISO(ev)
    }

    log(f+" "+ov)
    log(f+" "+ev)

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
  },
  vsCreateAfter : function(e) {
    vs.setPtActive(e)
  },
  vsUpdateBefore : function(e) {
  },
  vsUpdateAfter : function(e) {
    vs.setPtActive(e)
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
