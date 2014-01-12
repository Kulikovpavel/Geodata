GeoTables = new Meteor.Collection('geotables');

if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to geoDataMO.";
  };

  Template.geotables_list.geotables = function() {
    return GeoTables.find();
  };

  Template.hello.events({
    'click button' : function () {
      
      GeoTables.insert({name: "some name", json: document.getElementById("jsonText").value});
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });

  Template.geotables_list.events({
    'click' : function () {
      console.log(this);
      Session.set('session_geotable', this);
      showSvg(this);
    }
  });

  Template.geotable.geotable = function () {
    return Session.get("session_geotable");
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}



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
  json = JSON.parse(geotable.json);
  sortableData = json;
  json.forEach(function(e) {
    var name = e[0].trim();
    var value = e[1];

    dataValues.push(value);
    dataDict[name] = value;  // json have list of [name, date] lists
  });

  sortableData.sort(function(a, b) {return a[1] - b[1]}).reverse();

  var width  = window.innerWidth*0.7;
  var height = window.innerHeight;

  d3.json("mosobl.geojson", function(json) {

    var color = d3.scale.quantize() // set color range function
    .domain([Array.min(dataValues), Array.max(dataValues)])
    .range(colorbrewer.Purples[9].reverse());

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
    var tooltip = d3.select("#tooltip");

    // add a rectangle to see the bound of the svg
    svg.append("rect").attr('width', width).attr('height', height)
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