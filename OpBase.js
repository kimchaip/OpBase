var pt = {
  name : "Patient",
  lib : libByName(this.name)
}

var vs = {
  name : "Visit",
  lib : libByName(this.name),
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
  lib : libByName(this.name)
}

var tg = {
  ptCreateBefore : function(e) {
  },
  ptCreateAfter : function(e) {
  },
  ptUpdateBefore : function(e) {
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
