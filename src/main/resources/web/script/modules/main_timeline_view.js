
define(
    ['jquery', 'modules/notes_app_model', 'modules/notes_rest_client', 'd3'], function($, model, restc, d3) {

        return {

            init: function() {

                // logging view
                console.log("notes_main_timeline_view::init")
                // load some notes from the server
                var now = new Date()
                restc.load_topics_in_range(now.getTime() - (3*604800000), now.getTime()) // from, to
                console.log("notes_main_timeline_view::init::loaded_notes")
                // rendering latest notes
                restc.load_timerange_index(this.render_timerange_slider) // callback renderer
                console.log("notes_main_timeline_view::init::loaded_timerange")

            },

            render_timerange_slider:  function () {

                var topics = model.get_timerange()
                //
                var dates = []
                for (var i = 0; i < topics.length; i++) {
                    var topic = topics[i]
                    dates.push(new Date(topic.composite['dm4.time.modified'].value))
                }
                dates = dates.sort(d3.descending)
                //
                // console.log(dates[dates.length-1])
                var timescale = d3.time.scale()
                    .domain([dates[dates.length-1], new Date()])
                    .range([1150, 0])
                //
                var yAxis = d3.svg.axis()
                    .scale(timescale)
                    .orient("right")
                    .ticks(d3.time.week)
                //
                var area = d3.select(".time-axis")
                    .append("svg")
                        .attr("class", "axis")
                        .attr("width", 175)
                        .attr("height", 1200)
                    .append("g")
                        .attr("transform", "translate(100, 10)")
                        .call(yAxis)

                // setup brush control
                var sliderarea = area.append("g").attr("class", "slider-area")
                // ### use timeline_default-timerange to initiate our slider
                var now = new Date()
                var mindate = now.getTime() - (3*604800000) // ~21days
                var maxdate = now.getTime()
                var brush = d3.svg.brush().y(timescale)
                    // brush.x(50)
                    brush.extent([mindate,maxdate])
                    brush.on("brushend", onbrushmove_end)

                    sliderarea.append("g").attr("class", "brush").call(brush)
                        .selectAll("rect")
                        .attr("x", -75)
                        .attr("y", 0)
                        .attr("width", "75")
                        .attr("fill", "#f1f1f1")
                        .attr("stroke", "#0782C1")
                        .attr("stroke-width", "1")
                        .attr("opacity", ".7")

                    function onbrushmove_end (e) {
                        var s = brush.extent();
                        // xScale.domain( s);
                        console.log('on brush move', brush.empty(), s[0],s[1]);
                        // document.getElementById('abc').innerHTML = s[0]+ "     "+s[1];
                        var from = new Date(s[0]).getTime()
                        var to = new Date(s[1]).getTime()
                        restc.load_topics_in_range(from, to)
                        //
                        // render spinning wheel..
                        //
                    }
                    // ### show x-axis labeles (type-row)
                    // render dotted-item
                    var dot = area.selectAll("circle")
                        .data(topics, function (d) {
                            return d.composite['dm4.time.modified'].value
                        })
                        .enter()
                        .append("circle") // append g and
                        .attr("class", "dot")
                        .attr("r", function (d) {
                            if (d.type_uri === "org.deepamehta.resources.resource") {
                                return 3
                            } else if (d.type_uri === "dm4.tags.tag") {
                                return 2
                            } else if (d.type_uri === "dm4.files.file") {
                                return 2
                            } else if (d.type_uri === "org.deepamehta.moodle.item") {
                                return 3
                            } else if (d.type_uri === "org.deepamehta.moodle.course") {
                                return 4
                            } else {
                                return 2
                            }
                        })
                        .attr("cx", function (d) {
                            if (d.type_uri === "org.deepamehta.resources.resource") {
                                return -10
                            } else if (d.type_uri === "dm4.tags.tag") {
                                return -20
                            } else if (d.type_uri === "dm4.files.file") {
                                return -30
                            } else if (d.type_uri === "org.deepamehta.moodle.item") {
                                return -40
                            } else if (d.type_uri === "org.deepamehta.moodle.course") {
                                return -50
                            } else {
                                return -60
                            }
                        })
                        .attr("cy", function (d) {
                            return timescale(d.composite['dm4.time.created'].value)
                        })
                        .attr("fill", function (d) {
                            if (d.type_uri === "org.deepamehta.resources.resource") {
                                return "#a9a9a9"
                            } else if (d.type_uri === "dm4.tags.tag") {
                                return "#0782c1"
                            } else if (d.type_uri === "dm4.files.file") {
                                return "#91b6e2"
                            } else if (d.type_uri === "org.deepamehta.moodle.item") {
                                return "#C50E1F"
                            } else if (d.type_uri === "org.deepamehta.moodle.course") {
                                return "orange"
                            } else {
                                return "black"
                            }
                        })
                        // ### maybe use http://bl.ocks.org/biovisualize/1016860 or make use of
                        // d3-tip https://github.com/caged/d3-tip like http://bl.ocks.org/Caged/6476579
                        .append("svg:title")
                        .text(function(d) {
                            if (d.type_uri === "org.deepamehta.resources.resource") {
                                return "Notizen Beitrag"
                            } else if (d.type_uri === "dm4.tags.tag") {
                                return "Tag"
                            } else if (d.type_uri === "dm4.files.file") {
                                return "Dateiupload"
                            } else if (d.type_uri === "org.deepamehta.moodle.item") {
                                return "ISIS 2 Arbeitsmaterial"
                            } else if (d.type_uri === "org.deepamehta.moodle.course") {
                                return "ISIS 2 Kurs"
                            }
                        })

            }

        }
    }
)
