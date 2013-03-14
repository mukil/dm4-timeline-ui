(function(CKEDITOR, MathJax, $, console, dmc) {

    window.dmc = dmc
    var model = AppModel()
    var skroll = undefined

    /** Initializing our interactive page. */

    this.setupView = function() {
        this.setupApplicationModel()
        skroll = skrollr.init({
			forceHeight: false
		})
        this.registerHistoryStates()
        this.setupCKEditor()
        this.setupTagging()
        this.setupMathJaxRenderer()
        this.showResultsetView()
        this.showTagView()
        // setup page-controls
        this.setupPageControls()
    }



    /** Application Model Related Methods */

    this.setupApplicationModel = function() {
        // console.log(this.model) fixme: this _is_ "Window"..
        // load all available tags and resources
        this.loadAllTags()
        this.loadAllResources()
    }

    this.loadAllTags = function(limit) { // lazy, unsorted, possibly limited
        //
        var all_tags = dmc.get_topics("dm4.tags.tag", false, false, limit).items
        if (all_tags.length > 0) {
            model.setAvailableTags(all_tags)
            console.log("loaded " + model.getAvailableTags().length + " tags ")
        } else {
            model.setAvailableTags([])
        }
    }

    this.loadAllResources = function(limit) { // lazy, unsorted, possibly limited
        //
        var all_resources = dmc.get_topics("dm4.resources.resource", true, true, limit).items
        if (all_resources.length > 0) {
            model.setAvailableResources(all_resources)
            console.log("loaded " + model.getAvailableResources().length + " resources ")
        } else {
            model.setAvailableResources([])
        }
    }

    this.loadAllResourcesByTagId = function(tagId) { // lazy, unsorted, possibly limited
        //
        var all_tagged_resources = dmc.request("GET", "/eduzen/fetch/tag/" + tagId).items
        if (all_tagged_resources.length > 0) {
            // overriding previously set resultlist
            model.setAvailableResources(all_tagged_resources)
            console.log("loaded " + model.getAvailableResources().length + " resources ")
        } else {
            model.setAvailableResources([])
        }
    }

    this.setupTagging = function() {
        $("input.tag").bind( "keydown", function( event ) {
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



    /** GUI Related Methods */

    this.setupPageControls = function() {
        // setting up sort-controls and input button
        $("a#submit").click(function(e) {window.scrollTo(0)})

        $("a#most-popular").click(function(e) {
            // just sort all currently existing resources (client-side)
            model.setAvailableResources(getHighestResources())
            showResultsetView()
            $("a#most-popular").addClass("selected")
        })

        /** todo: implement "a#most-popular" as a toggle button.. */
        $("a#reset-sort").click(function(e) {
            model.setTagFilter(undefined)
            model.setAvailableResources(getAlphabeticalResources())
            showResultsetView()
            $("a#most-popular").removeClass("selected")
        })
    }

    this.getHighestResources = function() {
        var results = model.getAvailableResources()
        return results.sort(score_sort_asc)
    }

    this.getAlphabeticalResources = function() {
        var results = model.getAvailableResources()
        return results.sort(alphabetical_sort_asc)
    }

    this.renderMathInContentArea = function () {
        // typeset all elements containing TeX to SVG or HTML in default area #content
        MathJax.Hub.Typeset()
        // MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }

    this.showResultsetView = function() {
        // future needed variations showResultsetView will be:
        // a) load the latest 30 resources b) load the 30 most popular resources
        // c) load all resources with _one_ given tag d) load all resources with _two_ given tags
        // e) load all resources with _three_ given tags

        $('div.results').html('<b class="label">Calculating results</b>')
        if (model.getAvailableResources().length > 0) {
            setupResultList()
        } else {
            $('div.results').html('<b class="label">Aint got no results</b>')
        }
    }

    this.setupResultList = function() {
        var results = model.getAvailableResources()
        var $resultlist = $('<ul class="list">')
        $.each(results, function (e, item) {
            $topic = setupResultListItem(item)
            $resultlist.append($topic)
        })
        $resultlist.append('<p class="empty">&nbsp;</p>')
        $('div.results').html($resultlist)
    }

    this.setupResultListItem = function(item) {
        var score = (item.composite['dm4.ratings.score'] != undefined) ? item.composite['dm4.ratings.score'].value : 0
        // construct list item
        var title = new Date(parseInt(item.value))
        var $topic = $('<li id="' +item.id+ '">').text("Dieser Beitrag wurde eingereicht am  " +
            title.getDate() + "." + title.getMonth() + " " + title.getFullYear() + " um "
            + title.getHours() + ":" +title.getMinutes() + " Uhr und hat " + score + " Votes")
        var $body = $('<div class="item-content">' +item.composite['dm4.resources.content'].value +
            '</div>');
        var $toolbar = $('<div class="toolbar">Vote </div>')
        var $upvote = $('<a id="' +item.id+ '" class="btn vote">+</a>')
            $upvote.click(function(e) {
                var updatedTopic = dmc.request("GET", "/eduzen/up/resource/" + e.target.id)
                model.updateAvailableResource(updatedTopic)
                // todo: cache sort-settings on client-side
                if ($("a#most-popular").hasClass("selected")) {
                    // update our result-set view immedieatly after upvoting
                    model.setAvailableResources(getHighestResources())
                }
                showResultsetView()
            })
        var $downvote = $('<a id="' +item.id+ '" class="btn vote">-</a>')
            $downvote.click(function(e) {
                var updatedTopic = dmc.request("GET", "/eduzen/down/resource/" + e.target.id)
                model.updateAvailableResource(updatedTopic)
                // todo: cache sort-settings on client-side
                if ($("a#most-popular").hasClass("selected")) {
                    // update our result-set view immedieatly after upvoting
                    model.setAvailableResources(getHighestResources())
                }
                showResultsetView()
            })
        // append body and toolbar to list-item
        $toolbar.append($upvote).append($downvote)
        $topic.append($body).append($toolbar)
        return $topic
    }

    this.showTagView = function() {
        //
        var tags = model.getAvailableTags()
        if (tags.length > 0) {
            //
            var tagview = $('<div class="tag-list"><b class="label" style="float: left; padding-top: 0px;">'
                + 'Filter nach Stichw&ouml;rtern</b></div>')
            for (i=0; i < tags.length; i++) {
                var element = tags[i]
                tagview.append('<a id="' +element.id+ '" class="btn tag">' +element.value+ '</a>')
            }
            tagview.click(function(e) {
                // resetting, todo: currently just one tag is supported as a filter for resources
                resetTagfilter()
                var tagId = e.target.id
                // load tag specific timeline
                var clickedTag = model.getTagById(tagId)
                model.setTagFilter(clickedTag)
                // update model
                loadAllResourcesByTagId(tagId)
                // render tag specific filter-info header
                showTagfilterInfo()
                // render tag specific timeline
                showResultsetView()
            })
            // tagview.append('<p class="empty">nbsp;</p>')
            $('div.timeline .info').append(tagview)
        } else {
            $('div.timeline .info div.tag-list').html('<b class="label">Aint got no new tags for you</b>')
        }
    }

    this.resetTagfilter = function () {
        // update gui
        $(".tag-filter-info").empty()
        // update model
        model.setTagFilter(undefined)
        // load tag unspecific timeline
        loadAllResources()
        showResultsetView()
    }

    this.showTagfilterInfo = function() {
        var tag = model.getTagFilter()
        var $filterInfo = $('<b class="meta">unter dem Stichwort</b> <a class="btn tag selected">' +tag.value+ '</a>')
        var $filterReset = $('<a id="all" class="btn tag-filter">Filter zur&uuml;cksetzen</a>')
            $filterReset.click(function(e) {
                resetTagfilter()
            })
        $('.tag-filter-info').append($filterInfo).append($filterReset)
    }

    this.setupCKEditor = function () {
        // setup cK-editor
        CKEDITOR.inline( document.getElementById( 'resource_input' ) );
        // upload-fallback: $(".button.upload").click(this.open_upload_dialog(uploadPath, this.handleUploadResponse))
        // mathjax preview handling
        $input = $('#resource_input')
        $input.keyup(function(e) {
            renderApproachMathPreview($input.val())
            return function(){}
        })

        this.renderMathInContentArea()

        function renderApproachMathPreview (value) {
            $("#math-preview").text(value)
            MathJax.Hub.Queue(["Typeset", MathJax.Hub])
            this.renderMathInContentArea()
            // $("#math-preview").html("<img src=\"http://latex.codecogs.com/gif.latex?"
                // + value +"\" alt=\""+ value +"\">")
        }

    }

    this.setupMathJaxRenderer = function() {
        MathJax.Ajax.config.root = "/de.tu-berlin.eduzen.mathjax-renderer/script/vendor/mathjax"
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
            "elements": ["resource_input, math-live-preview, body"]
        });
        // console.log("testing to get at an iframe.. into mathJax rendering")
        // console.log($(".cke_wysiwyg_frame").context.childNodes[1].childNodes[2])
        MathJax.Hub.Configured() // bootstrap mathjax.js lib now
    }



    /** HTML5 History API utility methods **/

    this.registerHistoryStates = function () {
        if (window.history && history.popState) window.addEventListener('popstate', this.popHistory)
        if (window.history && history.pushState) window.addEventListener('pushstate', this.pushHistory)
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

    /** sorting asc by item.composite['dm4.ratings.score'].value */
    this.score_sort_asc = function (a, b) {
        // console.log(a)
        var scoreA = 0
        if (a.composite.hasOwnProperty('dm4.ratings.score')) {
            scoreA = a.composite['dm4.ratings.score'].value
        }
        var scoreB = 0
        if (b.composite.hasOwnProperty('dm4.ratings.score')) {
            scoreB = b.composite['dm4.ratings.score'].value
        }
        if (scoreA > scoreB) // sort string descending
          return -1
        if (scoreA < scoreB)
          return 1
        return 0 //default return value (no sorting)
    }

    /** sorting asc by item.value */
    this.alphabetical_sort_asc = function (a, b) {
        // console.log(a)
        var scoreA = a.value
        var scoreB = b.value
        if (scoreA > scoreB) // sort string descending
          return -1
        if (scoreA < scoreB)
          return 1
        return 0 //default return value (no sorting)
    }

    /**
    * @param   path        the file repository path (a string) to upload the selected file to. Must begin with "/".
    * @param   callback    the function that is invoked once the file has been uploaded and processed at server-side.
    *                      One argument is passed to that function: the object (deserialzed JSON)
    *                      returned by the (server-side) executeCommandHook. ### FIXDOC
    */
    this.open_upload_dialog = function(new_path, callback) {

        // 1) install upload target
        var upload_target = $("<iframe>", {name: "upload-target"}).hide()
        $("body").append(upload_target)

        // 2) create upload dialog
        var upload_form = $("<form>", {
        method:  "post",
        enctype: "multipart/form-data",
        target:  "upload-target"
        })
        .append($('<input type="file">').attr({name: "file", size: 60}))
        .append($('<input class=\"button\" type="submit">').attr({value: "Upload"}))
        //
        var upload_dialog = this.ui.dialog({title: "Upload File", content: upload_form})

        // 3) create dialog handler
        return function() {
        upload_form.attr("action", "/files/uebungen-uploads-wise12/" + new_path)
        upload_dialog.open()
        // bind handler
        upload_target.unbind("load")    // Note: the previous handler must be removed
        upload_target.load(upload_complete)

            function upload_complete() {
                upload_dialog.close()
                // Note: iframes must be accessed via window.frames
                var response = $("pre", window.frames["upload-target"].document).text()
                try {
                callback(JSON.parse(response))
                } catch (e) {
                alert("Upload failed: \"" + response + "\"\n\nException=" + JSON.stringify(e))
                }
            }
        }
    }

    this.getTagsSubmitted = function () {
        var tagline = $("input.tag").val().split( /,\s*/ )
        if (tagline == undefined) throw new Error("Tagging field got somehow broken.. ")
        var qualifiedTags = []
        for (i=0; i < tagline.length; i++) {
            var tag = tagline[i]
            if (tag != undefined || tag != "") qualifiedTags.push(tag)
        }
        return qualifiedTags
    }

    this.getTagTopicsToReference = function (qualifiedTags) {
        var tagTopics = []
        for (i=0; i < qualifiedTags.length; i++) {
            var tag = qualifiedTags[i]
            for (k=0; k < model.getAvailableTags().length; k++) {
                var tagTopic = model.getAvailableTags()[k]
                // (comparison is case-insensitive)
                if (tagTopic.value.toLowerCase() == tag.toLowerCase()) {
                    tagTopics.push(tagTopic)
                }
            }
        }
        return tagTopics
    }

    this.getTagTopicsToCreate = function (submittedTags, referencedTags) {
        var tagsToCreate = []
        // filter tags about the submittedTags which are not referenced
        for (i=0; i < submittedTags.length; i++) {
            var submittedTag = submittedTags[i]
            //
            var create = true // if submitted tag is not part of tags-to-be-referenced, put in into create-queue
            for (k=0; k < referencedTags.length; k++) {
                var referencedTag = referencedTags[k]
                // if "tag" is already part of the referenced, skip creation (comparison is case-insensitive)
                if (submittedTag.toLowerCase() == referencedTag.value.toLowerCase()) {
                    create = false
                }
            }
            if (create && submittedTag != "") tagsToCreate.push(submittedTag) // fixme: quality check in getSubmitted..
        }
        return tagsToCreate
    }

    this.getTeXAndHTMLSource = function (body) {
        var objects = $('.math-output', body)
        for (i=0; i < objects.length; i++) {
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

    this.submitResource = function() {
        // TODO: clean up this mixed up method.
        // var pageContent = $('#resource_input').val()
        var valueToSubmit = this.getTeXAndHTMLSource(document.getElementById("resource_input"))
        var qualifiedTags = this.getTagsSubmitted()
        var tagsToReference = this.getTagTopicsToReference(qualifiedTags)
        var tagsToCreate = this.getTagTopicsToCreate(qualifiedTags, tagsToReference)
        // rendering notifications
        var saving = $('<b id="message" class="label">Saving...</b>').insertBefore('input.submit')
        saving.fadeOut(4000)
        $('div.header').css("opacity", ".6")
        // creating the resource
        var resource = createResourceTopic(valueToSubmit)
        // an creating/associtating tags with this resource
        for (i=0; i < tagsToCreate.length; i++) {
            var newTag = createTagTopic(tagsToCreate[i])
            if (newTag != undefined) {
                var assoc = createResourceTagAssociation(resource, newTag)
                console.log("created new Assoc successfully .. " + assoc.id)
            }
        }
        for (k=0; k < tagsToReference.length; k++) {
            if (tagsToReference[k] != undefined) {
                var newAssoc = createResourceTagAssociation(resource, tagsToReference[k])
                console.log("created new Assoc successfully .. " + newAssoc.id)
            }
        }
        // rendering notifications
        $('#message').html("Fine. Thanks!")
        saving.fadeIn(4000).fadeOut(3000)
        $('#resource_input').html("")
        $('input.tag').val("")
        $('div.header').css("opacity", "1")
        // unnecessary, just inserBefore the createResourceTopic at the top of our list
        this.loadAllResources()
        this.showResultsetView()
        // TODO: render some "Saved" Notification
    }

    /** RESTful utility methods for the trt-views **/

    function createResourceTopic(value) {
        if (value != undefined) {
            var topicModel = {"type_uri": "dm4.resources.resource", "composite": {
                "dm4.resources.content": value, "dm4.resources.name": new Date().getTime().toString(),
                "dm4.resources.is_published": true
            }}
            // "dm4.resources.content": "ref_uri:tub.eduzen.approach_undecided",
            var resourceTopic = dmc.create_topic(topicModel)
            if (resourceTopic == undefined) throw new Error("Something mad happened.")
            return resourceTopic;
        }
        return undefined
    }

    function createTagTopic(name) {
        if (name != undefined) {
            var topicModel = {"type_uri": "dm4.tags.tag", "composite": {"dm4.tags.label": name}}
            // "dm4.resources.content": "ref_uri:tub.eduzen.approach_undecided",
            var tagTopic = dmc.create_topic(topicModel)
            if (tagTopic == undefined) throw new Error("Something mad happened.")
            return tagTopic;
        }
        return undefined
    }

    function createResourceTagAssociation(resourceTopic, tagTopic) {
        if (resourceTopic != undefined && tagTopic != undefined) {
            var assocModel = {"type_uri": "dm4.core.aggregation",
                "role_1":{"topic_id":resourceTopic.id, "role_type_uri":"dm4.core.parent"},
                "role_2":{"topic_id":tagTopic.id, "role_type_uri":"dm4.core.child"}
            }
            // "dm4.resources.content": "ref_uri:tub.eduzen.approach_undecided",
            var association= dmc.create_association(assocModel)
            if (association== undefined) throw new Error("Something mad happened.")
            return association;
        }
        return undefined
    }

})(CKEDITOR, MathJax, jQuery, console, new RESTClient("/core"))