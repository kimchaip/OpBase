var pt = {
  name : "Patients",
  lib : libByName("Patients"),
  setAgeDOB : function(e) {
    if(old.isChange(pt.lib, e, "DOB")) {
      if(e.field("DOB")) {
        let years = Math.floor(e.field("DOB").getTime()/(86400000*365.25))
        e.set("Age", years)
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
        let years = Math.floor(e.field("DOB").getTime()/(86400000*365.25))
        e.set("Age", years)
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
      if(vss.some(v=> my.gdate(my.date(v.field("VisitDate")))<=ntoday && (my.gdate(my.date(v.field("DCDate")))>=today || !v.field("DCDate")) )) {
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
