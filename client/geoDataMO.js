Template.geotables_list.geotables = function() {
  var searchString = Session.get("sessionSearchString");
  var queryName = new RegExp( searchString, 'i' );
  return Geotables.find({"title": queryName});
};

Template.geotables_list.helpers({
  maybeSelected: function () {
    return Session.equals("geotableShowID", this._id) ? "active" : "";
  }
});

Template.geotables_list.events({
  'click a.list-group-item' : function () {
    var table_id = this._id;
    Router.setPath(table_id);
    Session.set("geotableEditID", undefined);
  },
  'search' : function (e) {
    Session.set('sessionSearchString', e.srcElement.value);
  },
  'click button' : function () {
    Session.set("geotableEditID", -1);  // new data
  }
});

Template.mainpage.geotableConcrete = function() {
    var table;
    if (Session.equals('geotableEditID', -1)) {
      table = {};
    } else {
      table = Geotables.findOne(Session.get('geotableShowID'));
    }
    return table   
};

Template.geotable.rendered = function() {
  showSvg(this.data);  
}

Template.mainpage.isEdit = function() {    
  var id = Session.get('geotableEditID');
  return id
};

Template.geotable.events({
 'click .edit-button' : function () {
    console.log(Session.get("geotableShowID"));
    Session.set('geotableEditID', Session.get("geotableShowID"));
  }
});

Template.table_edit.events = {
  'click button[type=submit]': function(e) {
    e.preventDefault();

    var editedGeotableId = Session.get('geotableEditID');

    var properties = {
      title:         $('#title').val(),
      url:           $('#url').val(),
      json:          $('#json').val(),
      owner:         Meteor.userId()
    };

    if (editedGeotableId == -1) {
      var result = Geotables.insert(properties, function(error, id) {
        if (error) {
           alert(error.reason);
        }
        else {
          Session.set('geotableEditID', undefined);
          Router.setPath(id); 
        }
      });
      //Router.setPath(result); 
    } else {
        Geotables.update(editedGeotableId, {$set: properties}, function(error, id) {
          if (error) {
            alert(error.reason);
          } else {
            Session.set('geotableEditID', undefined);
          }
        });
    };

    
  },
  'click .delete-link': function(e) {
    e.preventDefault();
    if(confirm("Вы уверены, что хотите удалить запись?")) {
      var editedGeotableId = Session.get('geotableEditID');
      Geotables.remove(editedGeotableId);
      Session.set('geotableEditID', undefined);
      Router.setPath('');
    }
  }
};


var GeotablesRouter = Backbone.Router.extend({
routes: {
  ":table_id": "main"
},
main: function (table_id) {
  var oldTable = Session.get("geotableShowID");
  if (oldTable !== table_id) {
    Session.set("geotableShowID", table_id); 
  }
},
setPath: function (table_id) {
  this.navigate(table_id, true);
}
});

Router = new GeotablesRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});



function showSvg(geotable) {
  Array.max = function( array ){
    return Math.max.apply( Math, array );
  };
  Array.min = function( array ){
    return Math.min.apply( Math, array );
  };

  var dataDict = {};
  var dataValues = [];
  var sortableData = [];
  try {
    json = JSON.parse(geotable.json);
  } catch(err) {
    alert(err);
    return;
  }
  sortableData = json;
  json.forEach(function(e) {
    var name = e[0].trim();
    var value = e[1];

    dataValues.push(value);
    dataDict[name] = value;  // json have list of [name, date] lists
  });

  sortableData.sort(function(a, b) {return a[1] - b[1]}).reverse();

  svgElem = document.getElementById('svg');
  var width  = svgElem.getBoundingClientRect().width;
  var height = svgElem.getBoundingClientRect().height;

  d3.json("mosobl.json", function(json) {

    var colorsArray = colorbrewer.Purples[9].slice(0).reverse();  // slice - copy of array, because reverse - mutable

    var color = d3.scale.quantize() // set color range function
    .domain([Array.min(dataValues), Array.max(dataValues)])
    .range(colorsArray);

    var projection = d3.geo.mercator()
    .scale(1)
    .translate([0, 0]);

    // Create a path generator.
    var path = d3.geo.path()
    .projection(projection);

    // Compute the bounds of a feature of interest, then derive scale & translate.
    var b = path.bounds(json),
    s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
    t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

    // Update the projection to use computed scale & translate.
    projection
    .scale(s)
    .translate(t);

    // getting document elements for show
    var svg = d3.select("#svg");

    //svg.style('width', width).style('height', height);
    var tooltip = d3.select("#tooltip");

    // add a rectangle to see the bound of the svg
    svg.append("rect").attr('width', width-15).attr('height', height)
    .style('stroke', 'black').style('fill', 'none');

    svg.selectAll("path").data(json.features).enter().append("path")
    .attr("d", path)
    .style("fill", function(d) {
      return color(dataDict[d.properties.NAME]); 
    })
    .style("stroke-width", "1")
    .style("stroke", "black")
    .style("opacity", 0.8)

    //Adding mouseevents
    .on("mouseover", function(d) {
      d3.select(this).style("opacity", 1);
      var name = d.properties.NAME;
      if(!(name in dataDict)){
        console.log(name + " не найден в данных");
      }
      tooltip.style("opacity", 1)
      .text(name + " " + dataDict[name])
      .style("left", (d3.event.pageX) + "px")
      .style("top", (d3.event.pageY -30) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).style("opacity", 0.8);
      tooltip.style("opacity", 0);
    });

    //Prepare the outputed string
    var theTable = "";
    for(var j=0;j<sortableData.length;j++){
      theTable += '<tr>';
      for(var k=0;k<2;k++){             
        theTable += '<td>'+sortableData[j][k]+'</td>';
      }
      theTable += '</tr>';
    }

    document.getElementById('geotableTable').innerHTML = theTable;
  });
};