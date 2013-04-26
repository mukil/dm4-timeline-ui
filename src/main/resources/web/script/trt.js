(function(CKEDITOR, MathJax, $, console, dmc) {

    var _this = this

    this.dmc = dmc
    this.model = AppModel()
    this.emc = new EMC(dmc, model)

    var dict = new eduzenDictionary("DE")
    var TAG_URI = "dm4.tags.tag" // fixme: doublings
    var REVIEW_SCORE_URI = "org.deepamehta.reviews.score" // fixme: doublings
    var CREATED_AT_URI = "org.deepamehta.resources.created_at" // fixme: doublings
    var NOTES_URI = "org.deepamehta.resources.resource" // fixme: doublings
    var NOTE_CONTENT_URI = "org.deepamehta.resources.content" // fixme: doublings
    var OK = 200
    var UNDER_THE_TOP = "message-top"
    var TIMELINE = "message-timeline"

    /**
     *  Fixmes: adding Tag to resource which has none (no display update), adding tag to resource which has one adds
     *  new tag twice to tag-filter-view
     **/

    /** Main router to all views */

    this.initializePageView = function() {
        // parse requested location
        var pathname = window.location.pathname;
        var attributes = pathname.split('/')
        var noteId = attributes[2]
        // route to distinct views
        if (noteId === undefined || noteId === "") {

            // load all available tags
            loadAllTags()
            // and resources
            loadAllResources()
            // route to main/ timeline view
            setupView()

        } else if (noteId === "tagged") {

            // route to filtered timeline view
            var tags = attributes[3]
                tags = tags.split("1%2B")
            // load all available tags into client-side first
            loadAllTags()
            // get tag id/s on client-side first
            var selectedTag = undefined
            for (var i=0; i < tags.length; i++) {
                selectedTag = model.getTagByName(tags[i])
                if (selectedTag != undefined) model.addTagToFilter(selectedTag)
            }
            // finally request resources (by tagIds) for a tag-specific timeline
            if (model.getTagFilter().length > 1) {
                // for more than 1 tag
                var parameter = {tags: model.getTagFilter()}
                loadAllResourcesByTags(parameter)
            } else if (selectedTag != undefined) {
                // for exactly 1 tag
                loadAllResourcesByTagId(selectedTag.id)
            } else {
                // load all resources, could not identify any tag given
                loadAllResources()
            }
            setupView()

        } else {

            // initialize page-view model
            loadResourceById(noteId)
            // route to detail view
            setupDetailView()
            // fixme: historyApi // _this.pushHistory("detailView", "Note Info: " + noteId, "/notes/" + noteId)

        }
    }

    /** Initializing our interactive page. */

    this.setupView = function() {
        skrollr.init({forceHeight: false})
        registerHistoryStates()
        setupCKEditor()
        setupTagFieldControls('input.tag')
        setupMathJaxRenderer()
        setupWriteAuthentication()
        // render loaded resources in timeline
        showResultsetView()
        // render tag specific filter-info header
        showTagfilterInfo()
        // render avaialble tag-filter buttons
        showTagView()
        // setup page-controls
        setupPageControls()
    }

    this.setupDetailView = function() {
        // set page-data
        // setupCKEditor()
        // initalize add tags field
        // setupTagFieldControls('input.tag')
        setupMathJaxRenderer()
        setupWriteAuthentication()
        showDetailsView()
        $('input.submit.btn').click(setupEditDetailView) // edit button handler
    }

    this.setupEditDetailView = function() {
        setupCKEditor()
        showEditDetailsView()
        // todo: add "cancel" button
        var $save = $('input.submit.btn') // save button handler
            $save.unbind('click')
            $save.val("Änderungen speichern")
            $save.click(_this.doSaveResource)
    }

    this.setupWriteAuthentication = function() {
        var password = ""
        var username = "admin"
        var loggedIn = emc.getCurrentUser()
        if (loggedIn) return undefined
        try {
            // fixme: if user already is in a session
            var authorization = authorization()
            if (authorization == undefined) return null
            // throws 401 if login fails
            dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": authorization})
            _this.renderNotification("Session started, have fun & be nice.", OK, UNDER_THE_TOP)
        } catch (e) {
            _this.renderNotification("The application could not initiate a working session for you.", 403, TIMELINE)
            throw new Exception("403 - Sorry, the application ccould not establish a user session.")
        }

        /** Returns value for the "Authorization" header. */
        function authorization() {
            return "Basic " + btoa(username + ":" + password)   // ### FIXME: btoa() might not work in IE
        }

    }

    this.setupTagFieldControls = function(identifier) {
        $(identifier).bind( "keydown", function( event ) {
            if ( event.keyCode === $.ui.keyCode.TAB && $( this ).data( "ui-autocomplete" ).menu.active ) {
                event.preventDefault();
            }
        }).autocomplete({minLength: 0,
            source: function( request, response ) {
                // delegate back to autocomplete, but extract the last term
                response( $.ui.autocomplete.filter( model.getAvailableTags(), extractLast( request.term ) ) );
            },
            focus: function() {
                // prevent value inserted on focus
                return false;
            },
            select: function( event, ui ) {
                var terms = split( this.value );
                // remove the current input
                terms.pop();
                // add the selected item
                terms.push( ui.item.value );
                // add placeholder to get the comma-and-space at the end
                terms.push( "" );
                this.value = terms.join( ", " );
                return false;
            }
        });

        function split( val ) {return val.split( /,\s*/ );}

        function extractLast( term ) {return split( term ).pop();}

    }

    this.setupPageControls = function() {
        // setting up sort-controls and input button
        $("a#new").click(function(e) {window.scrollTo(0)})
        $(".onoffswitch-label").click(function(e) {

            if (model.isSortedByScore) { // turn toggle-off
                // $("a#most-popular").removeClass("selected")
                model.setAvailableResources(getAlphabeticalResources())
                // model.setTagFilter([]) // fixme: allow during filtering
                model.isSortedByScore = false // set resultset sorting flag
            } else { // turn toggle-on
                // $("a#most-popular").addClass("selected")  //
                // just sort all currently existing resources (client-side)
                model.setAvailableResources(getHighestResources())
                // model.setTagFilter([]) // fixme: allow during filtering
                model.isSortedByScore = true // set resultset sorting flag
            }
            // update gui
            showResultsetView()
        })
    }

    this.showEditDetailsView = function() {

        // set content of resource
        $('#resource_input').attr("contenteditable", true)
        _this.ck.setData(model.getCurrentResource().composite[NOTE_CONTENT_URI].value)
        // tags are already setup for this resource
        renderMathInArea("resource_input")
        quickfixPDFImageRendering() // hacketi hack
    }

    this.showDetailsView = function() {

        // set content of resource
        // fixme: catch notes without content
        $('#resource_input').html(model.getCurrentResource().composite[NOTE_CONTENT_URI].value)
        var created_at = new Date(model.getCurrentResource().composite[CREATED_AT_URI].value)
        if (created_at) {
            $('b.header-title').text(
                created_at.getDate() + "." + dict.monthNames[created_at.getMonth()] +" "+ created_at.getFullYear()
            )
        }
        // show tags for resource
        var currentTags = model.getCurrentResource().composite[TAG_URI]
        if (currentTags != undefined) {
            for (var i=0; i < currentTags.length; i++) {
                var tag = currentTags[i]
                $('#tags').append('<a class="tag"><img src="/de.deepamehta.tags/images/tag_32.png" width="20"'
                    + 'alt="Tag: '+tag.value+'">' +tag.value+ '</a>')
            }
        }
        renderMathInArea("resource_input")
        quickfixPDFImageRendering() // hacketi hack
    }

    this.showResultsetView = function() {
        // future needed variations showResultsetView will be:
        // a) load the latest 30 resources b) load the 30 most popular resources
        // c) load all resources with _one_ given tag d) load all resources with _two_ given tags
        // e) load all resources with _three_ given tags

        $('div.results').html('<br/><br/><b class="label">Calculating results</b>')
        if (model.getAvailableResources().length > 0) {
            setupResultList()
        } else {
            $('div.results').html('<br/><br/><b class="label">Aint no content found. Please insert coin.</b>')
            $('.result-text').text('')
        }
    }

    this.setupResultList = function() {
        var results = undefined
        if (model.isSortedByScore) {
            results = getHighestResources()
            // $(".result-sort").text("nach Wertung")
        } else {
            results = getAlphabeticalResources()
            // $(".result-sort").text("zeitlich")
        }
        /** $(".result-count").text(results.length + " Ergebnis/se ")
        $('.result-text').text('sortiert') **/
        //
        var $resultlist = $('<ul class="list">')
        $.each(results, function (e, item) {
            $topic = setupResultListItem(item)
            $resultlist.append($topic)
        })
        $('div.results').html($resultlist)
        // render math in the whole page
        renderMathInArea("resources")
        quickfixPDFImageRendering() // hacketi hack

    }

    this.quickfixPDFImageRendering = function() {
        $.each($('img'), function(e, item) {
            if(item.src.toLowerCase().indexOf(".pdf") != -1 ) {
                // console.log("remove img, render PDF-object instead.. ")
                $('<object data="'+item.src+'" width="760" height="640" type="application/pdf">').insertAfter(item)
                item.remove()
            }
        })
    }

    this.setupResultListItem = function(item) {
        var score = (item.composite[REVIEW_SCORE_URI] != undefined) ? item.composite[REVIEW_SCORE_URI].value : 0
        var tags = (item.composite[TAG_URI] != undefined) ? item.composite[TAG_URI] : []
        var content = (item.composite[NOTE_CONTENT_URI] != undefined) ? item.composite[NOTE_CONTENT_URI].value : ""
        // construct list item, header and content-area first
        var title = new Date(parseInt(item.composite[CREATED_AT_URI].value))
        var $topic = $('<li id="' +item.id+ '">').html('Dieser Beitrag wurde eingereicht am  ' +
            title.getDate() + '.' + dict.monthNames[title.getMonth()] + ' ' + title.getFullYear() + ' um '
            + title.getHours() + ':' +title.getMinutes() + ' Uhr, hat eine Bewertung von '
            + '<span class="score-info">' + score + '</span> ')
        var $body = $('<div class="item-content">' + content + '</div>');
        // bottom area, tag and score info area
        var $toolbar = $('<div class="toolbar"></div>')
        // tag info area
        var $tagInfo = $('<span>und folgende Tags: </span>')
            renderTagInfo($tagInfo, tags)
        // create edit and add buttons per result-list item
        var $addDialog = $('<div class="add-tag-dialog"></div>')
        var $addTag = $('<a class="add-tag btn">Tags hinzu</a>')
            $addTag.click(function(e) {
                var clickedListItem = parseInt(e.target.parentNode.parentNode.id)
                // check if there is already one add-tag dialog for this list-item
                if ($addTag.hasClass('selected')) {
                    // remove dialog on click again
                    $addDialog.remove()
                    $addTag.removeClass("selected")
                    return undefined
                }
                // manipulat gui and dialog
                $addTag.addClass("selected")
                $addDialog.empty()
                // construct new dialog
                var $newField = $('<input type="text" placeholder="..." '
                    + 'class="new-tag ui-autocomplete"></input>')
                var $saveBtn = $('<a class="btn save-tag">Speichern</a>')
                    $saveBtn.click(function() {
                        // save tags, if not yet associated to this resource
                        var tagFieldId = 'li#' +clickedListItem+ ' .toolbar div.add-tag-dialog input.new-tag'
                        var qualifiedTags = getTagsSubmitted(tagFieldId)
                        var existingTags = item.composite[TAG_URI]
                        var tagsToAssociate = getTagTopicsToReference(qualifiedTags)
                        var tagsToPossiblyCreate = getTagTopicsToCreate(qualifiedTags, tagsToAssociate)
                        var tagsToCreateAndAssociate = getTagTopicsToCreate(tagsToPossiblyCreate, existingTags)
                        emc.createResourceTagAssociations(item, tagsToAssociate)
                        emc.createNewTagsForResource(item, tagsToCreateAndAssociate)
                        // track "added tag"-goal
                        // piwikTracker.trackGoal(4)
                        // re-render both views
                        showTagView()
                        showResultsetView()
                        // update gui, remove dialog
                        $addDialog.remove()
                        $addTag.removeClass("selected")
                    })
                var $cancelBtn = $('<a class="btn close-tag">Abbrechen</a>')
                    $cancelBtn.click(function() {
                        $addDialog.remove()
                        $addTag.removeClass("selected")
                    })
                $addDialog.append($newField).append($saveBtn).append($cancelBtn)
                // place dialog in the dom
                $addDialog.hide()
                $addDialog.insertAfter('li#' +clickedListItem+ ' .toolbar a.add-tag.btn')
                setupTagFieldControls('li#' +clickedListItem+ ' .toolbar div.add-tag-dialog input.new-tag')
                $addDialog.show("slow")
            })
        var $edit = $('<a class="edit-item btn">zur Detailansicht dieses Beitrags.</a>')
            $edit.click(function(){
                window.location.href = '/notes/'+item.id
                console.log("should render and add some editing dialog..")
            })
        // score info area
        var $votes = $('<div class="votes">Bewerte diesen Inhalt </div>')
        var $upvote = $('<a id="' +item.id+ '" class="btn vote">+</a>')
            $upvote.click(function(e) {
                var updatedTopic = dmc.request("GET", "/notes/up/resource/" + e.target.id)
                model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                // piwikTracker.trackGoal(3)
                // todo: cache sort-settings on client-side
                if ($("a#most-popular").hasClass("selected")) {
                    // update our result-set view immedieatly after upvoting
                    model.setAvailableResources(getHighestResources())
                }
                showResultsetView()
            })
        var $downvote = $('oder <a id="' +item.id+ '" class="btn vote">-</a>')
            $downvote.click(function(e) {
                var updatedTopic = dmc.request("GET", "/notes/down/resource/" + e.target.id)
                model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                // piwikTracker.trackGoal(3)
                // todo: cache sort-settings on client-side
                if ($("a#most-popular").hasClass("selected")) {
                    // update our result-set view immedieatly after upvoting
                    model.setAvailableResources(getHighestResources())
                }
                showResultsetView()
            })

        // finally append votebar, tagbar and body to list-item
        $votes.append($upvote).append($downvote)
        $toolbar.append(' f&uuml;ge').append($addTag).append(" oder gehe ")
        $toolbar.append($edit)
        // $toolbar.append($tagInfo)

        $topic.append($body).append($votes).append($toolbar)
        // out tag listing before body
        if (tags.length > 0) $tagInfo.insertBefore($body)
        return $topic

        function renderTagInfo($tagInfoArea, givenTags) {
            var commaCounter = 0
            for (var ri=0; ri < givenTags.length; ri++) {
                // use tag icon..
                $tagInfoArea.append('<i class="tag">' +givenTags[ri].value+ '</i>')
                commaCounter++
                if (commaCounter < givenTags.length) $tagInfoArea.append(', ')
            }
        }
    }

    this.showTagButtons = function($parent, tags) {
        //
        if (tags == undefined) return undefined
        for (var i=0; i < tags.length; i++) {
            var element = tags[i]
            var $tag = $('<a id="' +element.id+ '" class="btn tag">' +element.value+ '</a>')
            // the event handler, if a filter-request is made
            $tag.click(function(e) {
                var tagId = e.target.id
                // we remove the clicked button from the filter dialog
                $("a#" + tagId).remove()
                // add topic for clicked tag-button to our client side filter model
                var selectedTag = model.getTagById(tagId)
                model.addTagToFilter(selectedTag)
                // load a tag-filter specific timeline
                if (model.getTagFilter().length > 1) {
                    // for more than 1 tag
                    var parameter = {tags: model.getTagFilter()}
                    loadAllResourcesByTags(parameter)
                } else {
                    // for exactly 1 tag
                    loadAllResourcesByTagId(tagId)
                }
                // render tag specific filter-info header
                showTagfilterInfo()
                // render filter specific tag-view
                showTagView()
                // render tag specific timeline
                showResultsetView()
                _this.pushHistory("filteredTimeline", "Tagged Timeline", "/notes/tagged/" + model.getTagFilterURI())
            })
            $parent.append($tag)
        }
    }

    this.showTagView = function() {

        // setup components model
        var tagsToShow = undefined
        if (model.getTagFilter().length == 0) {
            // filter not set, list all available tags as filter-options
            tagsToShow = model.getAvailableTags()
        } else {
            // filter set, render all tags in current results
            tagsToShow = getAllTagsInCurrentResults()
            tagsToShow = sliceAboutFilteredTags(tagsToShow)
        }

        // render ui/dialog
        if (tagsToShow.length > 0) {

            var $tagview = undefined
            if ($('div.timeline .info div.tag-list').length == 0) {
                // create ui/dialog
                $tagview = $('<div class="tag-list"><span class="label">Filter nach</span></div>')
                // place ui/dialog in info area of our timeline-view
                $('div.timeline .info').append($tagview)
            } else {
                // clean up ui/dialog
                $('div.timeline .info div.tag-list a').remove()
                $tagview = $('div.timeline .info div.tag-list')
            }
            $('div.timeline .info div.tag-list span.label').html("Filter nach")
            $('div.timeline .info div.tag-list').show()
            // render all tags as buttons into our ui/dialog
            showTagButtons($tagview, tagsToShow)
        } else {
            // clean up ui/dialog
            $('div.timeline .info div.tag-list span.label').text("")
            $('div.timeline .info div.tag-list a').remove()
            $('div.timeline .info div.tag-list').hide()
        }

    }

    this.showTagfilterInfo = function() {
        var tags = model.getTagFilter()
        if (tags.length == 0) return undefined
        var $filterMeta = $('<span class="meta">Alle Beitr&auml;ge unter dem/n Stichwort/en</span>')
        var $filterButtons = $('<span class="buttons"></span>')
        for (var i=0; i < tags.length; i++) {
            var $tagButton = $('<a class="btn tag selected">' +tags[i].value+ '</a>')
            $filterButtons.append($tagButton)
        }
        var $filterReset = $('<a id="all" class="btn tag-filter">Filter zur&uuml;cksetzen</a>')
            $filterReset.click(function(e) {
                resetPageFilter()
            })
        $('.tag-filter-info').html($filterMeta).append($filterButtons).append($filterReset)

        /** Inner reset filter controler */

        function resetPageFilter () {
            // update model
            model.setTagFilter([])
            loadAllTags()
            loadAllResources()
            // fixme: update routing..
            // update gui
            $(".tag-filter-info").empty()
            _this.pushHistory("timelineView", "Notes Timeline", "/notes")
            showTagView()
            // show general timeline
            showResultsetView()
        }
    }

    this.renderNotification = function(message, errorCode, area, css_class, callback) {

        // construct dialog
        var $closeButton = $('<a class="btn hide-message">x</a>')
            $closeButton.click(function (e) {$("#"+area).hide()})
        // set message
        if (errorCode == OK) {
            $("#"+area).html(message).append($closeButton)
        } else {
            $("#"+area).html(message + "("+errorCode+")").append($closeButton)
        }
        // animation
        $("#"+area).fadeIn('slow', function() {
            if (errorCode === OK) {
                // render a nice message
                $(this).removeClass().addClass(css_class).delay(2000).fadeOut('slow', callback)
            } else {
                // render a nasty message
                $(this).removeClass().addClass(css_class).delay(2000).fadeOut('slow', callback)
                console.log(message + "("+errorCode+")")
            }
        })
    }

    this.getHighestResources = function() {
        var results = model.getAvailableResources()
        return results.sort(score_sort_asc)
    }

    this.getAlphabeticalResources = function() {
        var results = model.getAvailableResources()
        return results.sort(created_at_sort_asc)
    }

    this.getAllTagsInCurrentResults = function() {
        var availableFilterTags = []
        var availableResources = model.getAvailableResources()
        // check through all current (filtered) resources of the result-set
        for (var i=0; i < availableResources.length; i++) {
            var resource = availableResources[i]
            // through all their tags and add each tag once to our new set of possible filters
            if (resource.composite.hasOwnProperty(TAG_URI)
                && resource.composite[TAG_URI] != undefined) {
                var tags = resource.composite[TAG_URI]
                for (var k=0; k < tags.length; k++) { // i > k > m (clojure attention!)
                    var tag = tags[k]
                    addUniqueTagToTagFilter(tag, availableFilterTags)
                }
            }

        }
        return availableFilterTags
    }

    this.addUniqueTagToTagFilter = function (tagTopic, filteredTags) {
        var isUnique = true
        for (var m=0; m < filteredTags.length; m++) {
            if (filteredTags[m].id == tagTopic.id) {
                isUnique = false
            }
        }
        if (isUnique) {
            filteredTags.push(tagTopic)
        }
    }

    this.sliceAboutFilteredTags = function(tags) {
        var filteredTags = model.getTagFilter()
        var restOfTags = []
        for (var k=0; k < tags.length; k++) {
            var take = true
            // if tag is already part of our filter, exclude it from our result set
            for (var i=0; i < filteredTags.length; i++) {
                var filteredTag = filteredTags[i]
                if (tags[k].id == filteredTag.id) take = false
            }
            if (take) restOfTags.push(tags[k])
        }
        return restOfTags
    }

    this.setupCKEditor = function () {
        // setup cK-editor
        CKEDITOR.inline( document.getElementById( 'resource_input' ) )
        // TODO: onclick enter show/hide virtual placeholder text
        _this.ck = CKEDITOR.instances['resource_input']
        // upload-fallback: $(".button.upload").click(this.open_upload_dialog(uploadPath, this.handleUploadResponse))
        // mathjax preview handling
        $input = $('#resource_input')
        $input.keyup(function(e) {
            renderMathInArea(resource_input)
            return function(){}
        })
    }

    this.setupMathJaxRenderer = function() {
        MathJax.Ajax.config.root = "http://localhost:8080/de.tu-berlin.eduzen.mathjax-renderer/script/vendor/mathjax"
        MathJax.Hub.Config({
            "extensions": ["tex2jax.js", "mml2jax.js", "MathEvents.js", "MathZoom.js", "MathMenu.js", "toMathML.js",
            "TeX/noErrors.js","TeX/noUndefined.js","TeX/AMSmath.js","TeX/AMSsymbols.js", "FontWarnings.js"],
            "jax": ["input/TeX", "output/SVG"], // "input/MathML", "output/HTML-CSS", "output/NativeMML"
            "tex2jax": {"inlineMath": [["$","$"],["\\(","\\)"]]},
            "menuSettings": {
                "mpContext": true, "mpMouse": true, "zscale": "200%", "texHints": true
            },
            "errorSettings": {
                "message": ["[Math Error]"]
            },
            "displayAlign": "left",
            "HTML-CSS": {"scale": 120},
            "SVG": {"blacker": 8, "scale": 110},
            "v1.0-compatible": false,
            "skipStartupTypeset": false,
            "elements": ["resource_input, math-live-preview, resources"]
        });
        // console.log("testing to get at an iframe.. into mathJax rendering")
        // console.log($(".cke_wysiwyg_frame").context.childNodes[1].childNodes[2])
        MathJax.Hub.Configured() // bootstrap mathjax.js lib now
        MathJax.Hub.Typeset()
    }

    this.renderMathInArea = function (identifier) {
        // typeset all elements containing TeX to SVG or HTML in designated area
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, identifier]);
    }



    /** HTML5 History API utility methods **/

    this.registerHistoryStates = function () {
        if (window.history && history.popState) window.addEventListener('popstate', _this.popHistory)
        if (window.history && history.pushState) window.addEventListener('pushstate', _this.pushHistory)
    }

    this.popHistory = function (state) {
        if (!window.history) return
        // do handle pop events
        console.log(state)
    }

    this.pushHistory = function (state, name, link) {
        if (!window.history) return
        var history_entry = {state: state, name: name, url: link}
        window.history.pushState(history_entry.state, name, history_entry.url)
    }



    /** GUIToolkit Helper Methods copied among others from dm4-webclient module **/

    /** sorting asc by item.composite[model.REVIEW_SCORE_TYPE_URI].value */
    this.score_sort_asc = function (a, b) {
        // console.log(a)
        var scoreA = a.composite[REVIEW_SCORE_URI].value
        var scoreB = b.composite[REVIEW_SCORE_URI].value
        if (scoreA > scoreB) // sort string descending
          return -1
        if (scoreA < scoreB)
          return 1
        return 0 //default return value (no sorting)
    }

    /** sorting asc by item.value */
    this.created_at_sort_asc = function (a, b) {
        // console.log(a)
        var scoreA = a.composite[CREATED_AT_URI].value
        var scoreB = b.composite[CREATED_AT_URI].value
        if (scoreA > scoreB) // sort string descending
          return -1
        if (scoreA < scoreB)
          return 1
        return 0 //default return value (no sorting)
    }

    this.getTagsSubmitted = function (fieldIdentifier) {
        if ($(fieldIdentifier).val() == undefined) return undefined
        var tagline = $(fieldIdentifier).val().split( /,\s*/ )
        if (tagline == undefined) throw new Error("Tagging field got somehow broken.. ")
        var qualifiedTags = []
        for (var i=0; i < tagline.length; i++) {
            var tag = tagline[i]
            // credits for the regexp go to user Bracketworks in:
            // http://stackoverflow.com/questions/154059/how-do-you-check-for-an-empty-string-in-javascript#154068
            if (tag.match(/\S/) != null) { // remove empty strings
                // remove possibly entered duplicates from submitted tags
                var qualified = true
                for (var k=0; k < qualifiedTags.length; k++) {
                    var validatedTag = qualifiedTags[k]
                    if (validatedTag.toLowerCase() === tag.toLowerCase()) qualified = false
                }
                if (qualified) qualifiedTags.push(tag)
            }
        }
        return qualifiedTags
    }

    this.getTagTopicsToReference = function (qualifiedTags) {
        var tagTopics = []
        for (var i=0; i < qualifiedTags.length; i++) {
            var tag = qualifiedTags[i]
            for (var k=0; k < model.getAvailableTags().length; k++) {
                var tagTopic = model.getAvailableTags()[k]
                if (tagTopic.value.toLowerCase() === tag.toLowerCase()) {
                    tagTopics.push(tagTopic)
                }
            }
        }
        return tagTopics
    }

    this.getTagTopicsToCreate = function (submittedTags, availableTags) {
        var tagsToCreate = []
        if (availableTags == undefined) return submittedTags // return all submittedTags for creation
        // filter tags about the submittedTags which are not referenced
        for (var i=0; i < submittedTags.length; i++) {
            var submittedTag = submittedTags[i]
            //
            var create = true
            for (var k=0; k < availableTags.length; k++) {
                var referencedTag = availableTags[k]
                // if "tag" is already part of the referenced, skip creation (comparison is case-insensitive)
                if (submittedTag.toLowerCase() === referencedTag.value.toLowerCase()) {
                    create = false
                }
            }
            if (create) tagsToCreate.push(submittedTag)
        }
        return tagsToCreate
    }

    this.getTeXAndHTMLSource = function (body) {
        var objects = $('.math-output', body)
        for (var i=0; i < objects.length; i++) {
            var div = objects[i]
            var containerId = div.id
            var mathjaxId = $('script', div).attr('id')
            // console.log("containerId: " + containerId + " mathjaxId: " + mathjaxId)
            // var math = getInputSourceById(MathJax.Hub.getAllJax("MathDiv"), mathjaxId)
            var math = $("#" + mathjaxId, body).text()
            if ( math ) {
                // put latexSource into div-preview container before saving this data
                $('#'+ containerId, body).html('<span class=\"math-preview\">$$ '+ math + ' $$</span>')
            } else {
                console.log("Not found.. ")
                // ### prevent dialog from opening up
            }
        }
        // var data = CKEDITOR.instances.resource_input.getData();
        // var data = $("" + body.innerHTML + "") // copy raw-data of ck-editor
        // console.log(data)
        MathJax.Hub.Typeset() // typeset ck-editor again
        return body.innerHTML

            // duplicate helperfunction in mathjax/dialogs/mathjax.js
            function getInputSourceById(id, body) {
                return $("#" + id, body).value
                /** for (obj in elements) {
                    var element = elements[obj]
                    console.log("element.inputID: " + element.inputID + " == " + id)
                    if (element.inputID === id) return element
                }**/
                // return undefined
            }

    }

    this.doSubmitResource = function() {
        // TODO: clean up this mixed up method.
        // var pageContent = $('#resource_input').val()
        var valueToSubmit = getTeXAndHTMLSource(document.getElementById("resource_input"))
        var qualifiedTags = getTagsSubmitted("input.tag")
        // differentiate in tags to create and existing tags in db (which need to be associated)
        var tagsToReference = getTagTopicsToReference(qualifiedTags)
        var tagsToCreate = getTagTopicsToCreate(qualifiedTags, tagsToReference)
        // rendering notifications
        _this.renderNotification("Saving...", OK, UNDER_THE_TOP)
        $('div.header').css("opacity", ".6")
        // creating the new resource, with aggregated new tags
        var resource = emc.createResourceTopic(valueToSubmit, tagsToCreate)
        // an creating/associtating tags with this resource
        /* createNewTagsForResource(resource, tagsToCreate) **/
        for (var k=0; k < tagsToReference.length; k++) {
            if (tagsToReference[k] != undefined) {
                var newAssoc = emc.createResourceTagAssociation(resource, tagsToReference[k])
            }
        }
        // track "added resource" goal
        // piwikTracker.trackGoal(5)
        $('#resource_input').html("")
        $('input.tag').val("")
        $('div.header').css("opacity", "1")
        // rendering notifications
        _this.renderNotification("Note submitted.", OK, UNDER_THE_TOP)
        // unnecessary, just inserBefore the createResourceTopic at the top of our list
        // or better implement observables, a model the ui can "bind" to
        loadAllResources()
        loadAllTags()
        showResultsetView()
        showTagView()
    }

    this.doSaveResource = function() {
        var valueToSubmit = getTeXAndHTMLSource(document.getElementById("resource_input"))
        // var qualifiedTags = getTagsSubmitted("input.tag")
        // load all tags before..
        // console.log("should update resource contents with " + valueToSubmit)
        var resource = model.getCurrentResource()
            resource.composite[NOTE_CONTENT_URI].value = valueToSubmit
        var updated = dmc.update_topic(resource)
        if (updated != undefined) {
            // rendering notifications
            _this.renderNotification("Note updated.", OK, UNDER_THE_TOP, "", function() {
                // track "edited resource" goal
                // piwikTracker.trackGoal(1)
                // _this.pushHistory("timelineView", "Notes Timeline", "/notes")
                history.back()
            })
        } else {
            console.log(updated)
            _this.renderNotification("Sorry. Note could not be updated.", 500, UNDER_THE_TOP)
        }
    }

    this.loadAllTags = function(limit) { // lazy, unsorted, possibly limited
        //
        var all_tags = dmc.get_topics(TAG_URI, false, false, limit).items
        if (all_tags.length > 0) {
            model.setAvailableTags(all_tags)
        } else {
            model.setAvailableTags([])
        }
    }

    /** Some methods to load resources from the server-side. */

    this.loadAllResources = function(limit) { // lazy, unsorted, possibly limited
        //
        var all_resources = dmc.get_topics(NOTES_URI, true, true, limit).items
        if (all_resources.length > 0) {
            model.setAvailableResources(all_resources)
        } else {
            model.setAvailableResources([])
        }
    }

    this.loadResourceById = function(id) { // lazy, unsorted, possibly limited
        //
        var resource = dmc.get_topic_by_id(id, true)
        if (resource != undefined) {
            model.setCurrentResource(resource)
        } else {
            throw new Error("Something mad happend while loading resource.")
        }
    }

    this.loadAllResourcesByTagId = function(tagId) { // lazy, unsorted, possibly limited
        //
        var all_tagged_resources = dmc.request("GET", "/notes/fetch/tag/" + tagId).items
        if (all_tagged_resources.length > 0) {
            // overriding previously set resultlist
            model.setAvailableResources(all_tagged_resources)
            console.log("loaded " + model.getAvailableResources().length + " resources from server-side")
        } else {
            model.setAvailableResources([])
        }
    }

    this.loadAllResourcesByTags = function(tagList) { // lazy, unsorted, possibly limited
        //
        var all_tagged_resources = dmc.request("POST", "/notes/fetch/tags/", tagList).items
        if (all_tagged_resources != undefined) {
            if (all_tagged_resources.length > 0) {
                // overriding previously set resultlist
                model.setAvailableResources(all_tagged_resources)
                console.log("loaded " + model.getAvailableResources().length + " resources from server-side")
            } else {
                model.setAvailableResources([])
            }
        } else {
            console.log(all_tagged_resources)
        }
    }

})(CKEDITOR, MathJax, jQuery, console, new RESTClient("/core"))
