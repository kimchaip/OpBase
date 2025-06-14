var dt = {
  isDate : function(value) {
    return value instanceof Date && !isNaN(value)
  },
  calAge : function(birthdate) {
    let ageDifMs = Date.now() - birthday.getTime();
    let ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
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
        let days = Math.floor(e.field("Age")*365.25)
        e.set("DOB", new Date(today.getFullYear(), today.getMonth(), today.getDate()-days, 7))
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
    if(e.field(f) && o && e.field(f) != o.field(f)) {
      return true
    }
    else if(!o && e.field(f)) {
      return true
    }
    else {
      return false
    }
  }
}

var tg = {
  ptCreateBefore : function(e) {
    pt.setAgeDOB(e)
  },
  ptCreateAfter : function(e) {
  },
  ptUpdateBefore : function(e) {
    pt.setAgeDOB(e)
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
