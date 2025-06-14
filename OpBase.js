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
      if(vss.some(v=> my.gdate(my.date(v.field("VisitDate")))<=today && (my.gdate(my.date(v.field("DCDate")))>=today || !v.field("DCDate")) )) {
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
  ptCreateBefore : function() {
  },
  ptCreateAfter : function() {
  },
  ptUpdateBefore : function() {
  },
  ptUpdateAfter : function() {
  },
  vsCreateBefore : function() {
  },
  vsCreateAfter : function(e) {
    vs.setPtActive(e)
  },
  vsUpdateBefore : function() {
  },
  vsUpdateAfter : function() {
    vs.setPtActive(e)
  },
  obCreateBefore : function() {
  },
  obCreateAfter : function() {
  },
  obUpdateBefore : function() {
  },
  obUpdateAfter : function() {
  },
}
