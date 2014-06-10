
define(
    ['jquery', 'd3', 'modules/notes_rest_client'], function($, d3, restc) {

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

            render_details_in_list: function (item) {

                /** var $container = $('#' + item.id)
                    $container.click(function (e) {
                        return undefined
                    })
                    $container.attr('data-bind', 'click: javascript:void();') **/
                // ### destroy ko-click binding

                var $body = $('#' + item.id + ' div.body')
                var item_html = ""

                // populate dom element

                if (item.type_uri === 'dm4.files.file') {

                    var filepath = '/filerepo/' + item.composite['dm4.files.path'].value

                    if (item.value.indexOf('.pdf') != -1) {

                        item_html = '<p><object data="'+filepath+'" width="760" height="640" type="application/pdf">'
                            + '</p>'
                            + '<a href="' +filepath+ '" class="command" title="Download PDF">Download</a>'
                            + '</p>'

                    } else if (item.value.indexOf('.jpg') != -1
                        || item.value.indexOf('.jpeg') != -1
                        || item.value.indexOf('.png') != -1
                        || item.value.indexOf('.svg') != -1) {

                        item_html = '<p><img src="'+filepath+'"></p>'
                    }
                } else if (item.type_uri === 'org.deepamehta.resources.resource') {

                    var notes_html = item.composite['org.deepamehta.resources.content'].value
                    // var tags = item.composite['dm4.tags.tag']
                    item_html = '<p>' + notes_html + '</p>'
                    /** if (selected_item().type_uri === "org.deepamehta.resources.resource") {
                    // Navigating to resource-detail view
                    window.document.location = '/notes/' + selected_item().id
                    */
                } else if (item.type_uri === 'org.deepamehta.moodle.item') {

                    // ### $.ajax('GET', '/accesscontrol/user')
                    var item_description = item.composite['org.deepamehta.moodle.item_description'].value
                    var item_icon = item.composite['org.deepamehta.moodle.item_icon'].value
                    var item_href = item.composite['org.deepamehta.moodle.item_href'].value
                    var item_url = ""
                    //
                    item_html += '<p>'
                        + '<img src="' + item_icon + '" title="Moodle Type Icon">' +  item_description

                    if (item.composite.hasOwnProperty('org.deepamehta.moodle.item_url')) {
                        item_url = item.composite['org.deepamehta.moodle.item_url'].value
                        // provision of smart url-command
                        if (item_url.indexOf("youtu") != -1) {
                            console.log("### Youtube Video!!")
                            item_html += '<a href="http://' +item_url+ '" target="_blank" '
                                + 'class="command">Watch on Youtube</a>'
                                // + '<a href="' +item_href+ '" class="command">View in ISIS 2</a>'
                            + '</p>'
                        } else if (item_href.indexOf("/mod/resource/") != -1) {
                            item_html += '<a href="' +item_url+ '" class="command">Download</a>'
                                + '<a href="' +item_href+ '" class="command">View in ISIS 2</a>'
                            + '</p>'
                        } else if (item_href.indexOf("/mod/url/") != -1) {
                            item_html +=  '<a href="' +item_url+ '" class="command">Visit Link</a>'
                            + '</p>'
                        }
                    } else {
                        item_html += '<a href="' +item_href+ '" class="command">View in ISIS 2</a>'
                        + '</p>'
                    }

                } else {
                    console.log("WARNING:Renderer NOT YET IMPLEMENTED" + item.type_uri)
                }

                // build up tags
                if (item.composite.hasOwnProperty('dm4.tags.tag')) {
                    var list_of_tags = item.composite['dm4.tags.tag']
                    item_html += '<p><span class="label">Tagged:</span>'
                    for (var tag_idx in list_of_tags) {
                        var tag_item = list_of_tags[tag_idx]
                        // if (tag_idx < list_of_tags.length) item_
                        item_html +=  '<span class="tag">'
                            + '<img src="/de.deepamehta.tags/images/tag_32.png" height="16"'
                                + ' alt="Tag Icon" class="type-icon" title="Tag ' +tag_item.value+ '"/>'
                                + tag_item.value+ '</span>'
                    }
                    item_html += '</p>'
               }

                // populate and display element
                $body.html(item_html)
                $body.show()

            },

            render_timerange_slider:  function () {

                var topics = restc.get_clientside_model().get_timerange()
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
