
define(
    ['jquery', 'modules/notes_app_model', 'knockout'], function($, model, ko) {

        return {

            page_route: function(hello) {
                console.log("notes_route_module::page_route")
                // parse requested location
                var pathname = window.location.pathname
                var attributes = pathname.split('/')
                var notes_view_id = attributes[3]
                var noteId = attributes[4]

                // _this.registerHistoryStates()
                // _this.setupMathJaxRenderer()
                // _this.setDefaultWorkspaceCookie()

                // in any case
                // _this.emc.loadAllTags()
                // _this.sort_current_tags()

                if (notes_view_id === "timeline") {

                    require(['modules/main_timeline_view'], function (main_timeline) {
                        main_timeline.init()
                    })

                } else if (noteId === undefined || noteId === "") {

                    // _this.prepare_index_page(true, false) // load timeline with no filter set
                    // $(window).on('load', function(event) {_this.hide_progress_bar()});
                    console.log("=> notes_main_timeline_view")

                } else if (noteId === "tagged") {

                    // 2) setup filtered timeline-view
                    var tags = attributes[3]
                        tags = (tags.indexOf('+') != -1) ? tags.split("+") : tags.split("%2B")
                    var selectedTag = undefined
                    for (var i=0; i < tags.length; i++) {
                        var label = decodeURIComponent(tags[i])
                        selectedTag = _this.model.getTagByName(label)
                        if (selectedTag != undefined) _this.model.addTagToFilter(selectedTag)
                    }
                    // _this.prepare_index_page(true, false) // call timeline after filter was set.
                    // $(window).on('load', function(event) {_this.hide_progress_bar()});
                    console.log("=> notes_filtered_timeline_view")

                } else if (noteId === "user") {

                    // 3) setup personal timeline view
                    var userId = attributes[3]
                    var user = dmc.get_topic_by_id(userId, true)
                    // _this.prepare_profile_page(user, true, false)
                    // $(window).on('load', function(event) {_this.hide_progress_bar()});
                    console.log("=> notes_profile_view")

                } else {

                    // 4) setup detail view
                    // _this.prepare_detail_page(noteId)
                    // fixme: historyApi // _this.pushHistory("detailView", "Note Info: " + noteId, "/notes/" + noteId)
                    console.log("=> notes_detail_view")

                }
            },

            show_item_content: function (item) {

                console.log("notes_route::show_item_content " + item.id)

                var $body = $('#' + item.id + ' div.body')
                var filepath = '/filerepo/' + item.composite['dm4.files.path'].value

                if (item.value.indexOf('.pdf') != -1) {

                    $body.html('<p><object data="'+filepath+'" width="760" height="640" type="application/pdf"></p>')
                    $body.show()

                } else if (item.value.indexOf('.jpg') != -1
                    || item.value.indexOf('.jpeg') != -1
                    || item.value.indexOf('.png') != -1
                    || item.value.indexOf('.svg') != -1) {

                    $body.html('<p><img src="'+filepath+'"></p>')
                    $body.show()
                }
            }

        }
    }
)
