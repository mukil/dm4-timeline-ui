(function(CKEDITOR, MathJax, $, console, dmc) {

    this.dmc = dmc
    this.model = AppModel()
    this.emc = new EMC(dmc, model)

    var skroll = undefined
    var dict = new eduzenDictionary("DE")
    var _this = this

    var TAG_URI = "dm4.tags.tag" // fixme: doublings
    var REVIEW_SCORE_URI = "org.deepamehta.reviews.score" // fixme: doublings
    var CREATED_AT_URI = "org.deepamehta.resources.created_at" // fixme: doublings
    var NOTES_URI = "org.deepamehta.resources.resource" // fixme: doublings
    var NOTE_CONTENT_URI = "org.deepamehta.resources.content" // fixme: doublings

    /**
     *  Fixmes: adding Tag to resource which has none (no display update), adding tag to resource which has one adds
     *  new tag twice to tag-filter-view
     **/

    /** Initializing our interactive page. */

    this.setupView = function() {
        setupApplicationModel()
        skroll = skrollr.init({
			forceHeight: false
		})
        registerHistoryStates()
        setupCKEditor()
        setupTagFieldControls('input.tag')
        setupMathJaxRenderer()
        setupWriteAuthentication()
        showResultsetView()
        showTagView()
        // setup page-controls
        setupPageControls()
    }

    this.setupDetailView = function(resourceId) {
        // set page-data
        // setupCKEditor()
        // initalize add tags field
        // setupTagFieldControls('input.tag')
        setupMathJaxRenderer()
        setupWriteAuthentication()
        // initialize page-model
        loadResourceById(resourceId)
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
            $save.click(doSaveResource)
    }

    this.setupWriteAuthentication = function() {
        var username = "admin"
        var password = ""
        try {
            var authorization = authorization()
            if (authorization == undefined) return null
            // throws 401 if login fails
            dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": authorization})
            // show_message("Login OK", "ok")
        } catch (e) {
            // show_message("Nutzername oder Passwort ist falsch.", "failed")
            throw new Exception("403 - Sorry, the application ccould not establish a user session.")
        }

        /** Returns value for the "Authorization" header. */
        function authorization() {
            return "Basic " + btoa(username + ":" + password)   // ### FIXME: btoa() might not work in IE
        }

        function show_message(message, css_class, callback) {
            // $("#message").fadeOut(200, function() {
              // $(this).text(message).removeClass().addClass(css_class).fadeIn(600, callback)
            // })
            console.log(message)
        }
    }

    /** Application Model Related Methods */

    this.setupApplicationModel = function() {
        // console.log(this.model) fixme: this _is_ "Window"..
        // load all available tags and resources
        loadAllTags()
        loadAllResources()
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
        $("a#submit").click(function(e) {window.scrollTo(0)})

        $("a#most-popular").click(function(e) {

            if ($("a#most-popular").hasClass("selected")) { // toggle-off
                $("a#most-popular").removeClass("selected")
                model.setAvailableResources(getAlphabeticalResources())
                // model.setTagFilter([]) // fixme: allow during filtering
                model.isSortedByScore = false // set resultset sorting flag
            } else { // toggle-on
                $("a#most-popular").addClass("selected")  //
                // just sort all currently existing resources (client-side)
                model.setAvailableResources(getHighestResources())
                // model.setTagFilter([]) // fixme: allow during filtering
                model.isSortedByScore = true // set resultset sorting flag
            }
            // update gui
            showResultsetView()
        })

        $("a#test").click(loadAllResourcesByTags)
    }

    this.showEditDetailsView = function() {

        // set content of resource
        $('#resource_input').attr("contenteditable", true)
        _this.ck.setData(model.getCurrentResource().composite[NOTE_CONTENT_URI].value)
        // tags are already setup for this resource
        renderMathInArea("resource_input")
    }

    this.showDetailsView = function() {

        // set content of resource
        // fixme: catch notes without content
        $('#resource_input').html(model.getCurrentResource().composite[NOTE_CONTENT_URI].value)
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
            $(".result-sort").text("nach Wertung")
        } else {
            results = getAlphabeticalResources()
            $(".result-sort").text("zeitlich")
        }
        $(".result-count").text(results.length + " Ergebnis/se ")
        $('.result-text').text('sortiert')
        //
        var $resultlist = $('<ul class="list">')
        $.each(results, function (e, item) {
            $topic = setupResultListItem(item)
            $resultlist.append($topic)
        })
        $('div.results').html($resultlist)
        // render math in the whole page
        renderMathInArea("resources")
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
                var $newField = $('<input type="text" placeholder="Name" '
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
            })
            $parent.append($tag)
        }
    }

    this.showTagView = function() {
        //
        if ($('div.timeline .info div.tag-list').length == 0) {
            // handling initial rendering of this component
            var tags = model.getAvailableTags()
            if (tags.length > 0) {
                //
                var $tagview = $('<div class="tag-list"><span class="label">Filter Inhalte nach</span></div>')
                // render all tags as buttons
                showTagButtons($tagview, tags)
                // append the tag-view to our improvised info-area (above the timeline)
                $('div.timeline .info').append($tagview)
            } else {
                $('div.timeline .info div.tag-list').html('<b class="label">Aint got no tags to show you.</b>')
            }
        } else {
            if (model.getTagFilter().length > 0) {
                var currentTags = getAllTagsInCurrentResults()
                    currentTags = sliceAboutFilteredTags(currentTags)
                $('div.timeline .info div.tag-list a').remove()
                showTagButtons($('div.timeline .info div.tag-list'), currentTags)
            } else {
                $('div.timeline .info div.tag-list a').remove()
                showTagButtons($('div.timeline .info div.tag-list'), model.getAvailableTags())
            }
        }
    }

    this.resetPageFilter = function () {
        // update model
        model.setTagFilter([])
        loadAllTags()
        loadAllResources()
        // update gui
        $(".tag-filter-info").empty()
        showTagView()
        // show general timeline
        showResultsetView()
    }

    this.showTagfilterInfo = function() {
        var $filterMeta = $('<span class="meta">unter dem/n Stichwort/en</span>')
        var $filterButtons = $('<span class="buttons"></span>')
        var tags = model.getTagFilter()
        for (var i=0; i < tags.length; i++) {
            var $tagButton = $('<a class="btn tag selected">' +tags[i].value+ '</a>')
            $filterButtons.append($tagButton)
        }
        var $filterReset = $('<a id="all" class="btn tag-filter">Filter zur&uuml;cksetzen</a>')
            $filterReset.click(function(e) {
                resetPageFilter()
            })
        $('.tag-filter-info').html($filterMeta).append($filterButtons).append($filterReset)
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
        CKEDITOR.inline( document.getElementById( 'resource_input' ) );
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
        if (window.history && history.popState) window.addEventListener('popstate', popHistory)
        if (window.history && history.pushState) window.addEventListener('pushstate', pushHistory)
    }

    this.popHistory = function (state) {
        if (!window.history) return
        // do handle pop events
        console.log("popping state.. ")
    }

    this.pushHistory = function (state, name, link) {
        if (!window.history) return
        var history_entry = {state: state, url: link}
        console.log("pushing state.. to " + link)
        // window.history.pushState(history_entry.state, name, history_entry.url)
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
        var saving = $('<b id="message" class="label">Saving...</b>').insertBefore('input.submit')
            saving.fadeOut(4000)
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
        // rendering notifications
        $('#message').html("Fine. Thanks!")
        saving.fadeIn(4000).fadeOut(3000)
        $('#resource_input').html("")
        $('input.tag').val("")
        $('div.header').css("opacity", "1")
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
        // track "edited resource" goal
        // piwikTracker.trackGoal(1)
        window.location.href = "/notes" // hacketi hack hack
    }

    this.doDeleteResource = function() {
        //
        var resource = model.getCurrentResource()
        var deleted = dmc.delete_topic(resource.id)
        // track "edited resource" goal
        // piwikTracker.trackGoal(2)
        window.location.href = "/notes" // hacketi hack hack
    }



    this.loadAllTags = function(limit) { // lazy, unsorted, possibly limited
        //
        var all_tags = dmc.get_topics(TAG_URI, false, false, limit).items
        if (all_tags.length > 0) {
            model.setAvailableTags(all_tags)
            console.log("loaded " + model.getAvailableTags().length + " tags from server-side")
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
            console.log("loaded " + model.getAvailableResources().length + " resources from server-side")
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
