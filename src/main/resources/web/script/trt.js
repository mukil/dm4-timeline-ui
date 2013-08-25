(function (CKEDITOR, MathJax, $, console, dmc) {

    var _this = this

    _this.model = AppModel()
    _this.emc = new EMC(dmc, _this.model)
    _this.skroller = undefined

    var dict = new eduzenDictionary("DE")
    var current_view = "" // fixme: remove this helper
    var TAG_URI = "dm4.tags.tag" // fixme: doublings
    var REVIEW_SCORE_URI = "org.deepamehta.reviews.score" // fixme: doublings
    var CREATED_AT_URI = "org.deepamehta.resources.created_at" // fixme: doublings
    var LAST_MODIFIED_URI = "org.deepamehta.resources.last_modified_at" // fixme: doublings
    var NOTES_URI = "org.deepamehta.resources.resource" // fixme: doublings
    var NOTE_CONTENT_URI = "org.deepamehta.resources.content" // fixme: doublings
    var NOTES_LIMIT = 15
    var OK = 200
    // Notification Areas
    var UNDER_THE_TOP = "message-top"
    var TIMELINE_AREA = "message-timeline"
    // Timeline Views Identifier
    var PERSONAL_TIMELINE = "personal-timeline"
    var FILTERED_TIMELINE = "filtered-timeline"
    var FULL_TIMELINE = "timeline"

    /**
     *  Fixmes: adding Tag to resource which has none (no display update), adding tag to resource which has one adds
     *  new tag twice to tag-filter-view
     **/

    /** Main router to all views */

    this.initializePageView = function () {

        // parse requested location
        var pathname = window.location.pathname
        var attributes = pathname.split('/')
        var noteId = attributes[2]

        // initiate load-more-timeline
        _this.skroller = skrollr.init( {forceHeight: false, render: function (info) {
            if (current_view == FULL_TIMELINE) {
                if (info.maxTop == 0) return
                if (info.curTop > (info.maxTop - 100)) _this.renderLoadMoreButton()
            }
        }})

        // setup page-controls (once!)
        registerHistoryStates()
        setupMathJaxRenderer()
        setDefaultWorkspaceCookie()
        setupPageControls()

        // in any case
        emc.loadAllTags()
        // route to distinct views
        if (noteId === undefined || noteId === "") {

            _this.go_to_timeline() // load timeline with no filter set

        } else if (noteId === "tagged") {

            var tags = attributes[3]
                tags = (tags.indexOf('+') != -1) ? tags.split("+") : tags.split("%2B")
            var selectedTag = undefined
            for (var i=0; i < tags.length; i++) {
                var label = decodeURIComponent(tags[i])
                selectedTag = _this.model.getTagByName(label)
                if (selectedTag != undefined) _this.model.addTagToFilter(selectedTag)
            }
            _this.go_to_timeline() // call timeline after filter was set.

        } else if (noteId === "user") {

            var userId = attributes[3]
            var user = dmc.get_topic_by_id(userId, true)
            _this.go_to_personal_timeline(user)

        } else {

            emc.loadResourceById(noteId) // initialize page-view detail model
            setupDetailView() // route to detail view
            // fixme: historyApi // _this.pushHistory("detailView", "Note Info: " + noteId, "/notes/" + noteId)

        }

    }

    this.go_to_timeline = function () {

        // prepare page model (according to filter)
        _this.loadResources() // optimize: maybe we dont need to load it again
        // render timeline view
        renderView()

    }

    this.go_to_personal_timeline = function (creator) {

        // prepare page model
        _this.model.setTagFilter([])
        // render update before we load all the stuff
        renderTagView()
        // load all the stuff according to user
        emc.loadAllContributions(creator.id)
        // render page view
        renderView(creator) // fixme: setup without tag-filter-dialog
        current_view = PERSONAL_TIMELINE

    }

    /**
     * Rendering our interactive page. Either "personal" or "ordinary" and either for "guests" or "authenticated users".
     */

    this.renderView = function (user) {

        // fixme: render upper menu for either personal or ordinary timeline
        if (user) {
            // console.log("we should render the personal timeline of ... " + user.value)
            setupFrontpageButton()
            showTagfilterInfo() // this to clear tag-filter-info view (if this is called after from a filtered-timeline)
            $('.eduzen .options .tag-filter-info').html('<span class="meta">Alle Beitr&auml;ge von <b>' + user.value + '</b></span>')
            $('.eduzen .rendered #nav.info').hide()
            $('.eduzen.notes').addClass('personal')
            hideTagView()
        } else {
            removeFrontpageButton()
            $('.eduzen.notes').removeClass('personal')
            // $('.eduzen .rendered #nav.info').show()
            // render tag specific filter-info header
            showTagfilterInfo()
            // render avaialble tag-filter buttons
            renderTagView()
        }

        // auth-check (potential doublette if setupPageControls was already called)
        var status = checkLoggedInUser()
        renderUserInfo()
        //
        if (status !== null) {
            setupUserPage()
            showResultsetView(false)
            setupCKEditor() // needs to get called after result-set is initialized because ckeditor is now part of that
            setupTagFieldControls('input.tag')
            $('.eduzen #input a.submit.btn').bind('click', _this.doSubmitResource)
        } else {
            setupGuestPage()
            showResultsetView(true)
        }
        //
        _this.skroller.refresh()
    }

    this.renderLoadMoreButton = function () {
        var $load_more = undefined
        if ($('.list .load-more').length == 0) {
            // create new one
            $load_more = $('<a class="load-more btn">Load more ...</a><p>&nbsp;</p><p>&nbsp;</p><br/>')
            $load_more.click(function(e) {
                _this.model.page_nr = _this.model.page_nr + 1
                var offset = _this.model.page_nr * NOTES_LIMIT
                var resources = emc.loadSomeResources(NOTES_LIMIT, offset, true)
                $load_more.remove()
                _this.addToResultList(resources)
            })
            //
            $('#resources .list').append($load_more)
        }
    }

    this.setupFrontpageButton = function () {
        var $homeButton = $('<a class="home-menu-button btn" title="Go to shared main timeline">Timeline</a>')
            $homeButton.click(function (e) {
                // fixme: doing some internal gui foo here
                removeFrontpageButton()
                $('.eduzen.notes').removeClass('personal')
                // prepare model
                _this.model.setTagFilter([])
                // go to
                _this.go_to_timeline()
                _this.pushTaggedViewState()
            })
            $('#menu').append($homeButton)
    }

    this.removeFrontpageButton = function () {
        $('#menu .home-menu-button').remove()
    }

    this.setupUserPage = function() {
        $('.eduzen.notes').removeClass('guest')
        $('.log-in-message').hide()
        $('li#input div.header').show()
        $('div.login-menu').hide()
        $('a.login-menu-button').hide()
    }

    this.setupGuestPage = function() {
        // hide input area
        $('li#input div.header').hide()
        $('.log-in-message').show()
        $('.eduzen.notes').addClass('guest')
        $('.eduzen .content-area input.submit.btn').unbind('click')
        _this.model.setCurrentUserName(undefined)
        _this.model.setCurrentUserTopic(undefined)
        setupLoginDialog() // fixme: setupGuest avoid duplicates
    }

    this.setupLoginDialog= function() {
        $('div.login-menu').remove()
        $('a.login-menu-button').remove()
        var $loginMenu = $('<div class="login-menu">')
        var $username = $('<input type="text" placeholder="Username">')
            $username.addClass('username-input')
        var $secret = $('<input type="password" placeholder="Password">')
            $secret.addClass('secret')
            $secret.keyup(function (event) {
                if (event.keyCode === $.ui.keyCode.ENTER) doLogin()
                return function (e) {}
            })
        var $button = $('<input type="button" class="btn login" value="Login">')
            $button.click(doLogin)
        var $menuToggle = $('<a class="login-menu-button btn" href="#login">Login</a>')
            $menuToggle.click(function (e) {
                $('div.login-menu').toggle()
                $menuToggle.toggleClass('pressed')
            })

        $loginMenu.append($username).append($secret).append($button)
            .append('<span class="message">'
                + '<a href="http://www.eduzen.tu-berlin.de/zur-notizen-webanwendung#account">Account?</a>'
                + '</span>')
        $($menuToggle).insertBefore('a#info')
        //
        $('.about-login').html('Um Beitr&auml;ge zu verfassen musst du eingeloggt sein. Einen Account bekommst du '
            + '<a href="http://www.eduzen.tu-berlin.de/zur-notizen-webanwendung#account">hier</a>.</div>')
        //
        $($loginMenu).insertBefore('a#info')

        function doLogin() {
            var user = checkUserAuthorization() // login button handler
            if (user != null) renderView() // render ordinary timeline
        }

        function checkUserAuthorization (id, secret) {
            if (id === undefined && secret === undefined) {
                id = $('input.username-input').val()
                secret = $('input.secret').val()
            }
            try {
                var authorization = authorization()
                if (authorization === undefined) return null
                // throws 401 if login fails
                dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": authorization})
                // _this.renderNotification("Session started. Have fun thinking and be nice!", OK, TIMELINE)
                return _this.checkLoggedInUser()
            } catch (e) {
                $('div.login-menu .message').addClass("failed")
                $('div.login-menu .message').text('Nutzername oder Passwort ist falsch.')
                // _this.renderNotification("The application could not initiate a working session for you.", 403, TIMELINE)
                // throw new Error("401 - Sorry, the application ccould not establish a user session.")
                return null
            }

            /** Returns value for the "Authorization" header. */
            function authorization() {
                return "Basic " + btoa(id + ":" + secret)   // ### FIXME: btoa() might not work in IE
            }
        }
    }

    this.setupDetailView = function () {
        // set page-data
        // setupCKEditor()
        // initalize add tags field
        // setupTagFieldControls('input.tag')
        setupMathJaxRenderer()
        var status = checkLoggedInUser()
        if (status !== null) {
            var $editButton = $('input.submit.btn')
                $editButton.show()
                $editButton.unbind('click')
                $editButton.val('Inhalt ändern')
                $editButton.click(setupEditDetailView) // edit button handler
        } else {
            $('input.submit.btn').hide()
        }
        renderUserInfo()
        renderDetailView()

        function setupEditDetailView () {
            //
            setupCKEditor()
            renderEditDetailView()
            // todo: add "cancel" button
            var $save = $('input.submit.btn') // save button handler
                $save.unbind('click')
                $save.val("Änderungen speichern")
                $save.click(_this.doSaveResource)
            //
            function renderEditDetailView () {
                var sourceData = getTeXAndHTMLSource(document.getElementById("resource_input"))
                // var data = _this.model.getCurrentResource().composite[NOTE_CONTENT_URI].value
                // set content of resource
                $('#resource_input').attr("contenteditable", true)
                if (CKEDITOR.instances.hasOwnProperty('resource_input')) {
                    CKEDITOR.instances['resource_input'].setData(sourceData)
                } else {
                    $('#resource_input').html(sourceData)
                }
                //
                /** var $container = $('#resource_input .math-output')
                $.each($container, function (e, item) {
                    //
                    console.log("registering click handler on item ... ")
                    item.click(function(e) {
                        console.log(e)
                        console.log(this)
                        this.focus()
                    })
                }) **/
                // skip tags, they are already setup for this resource
                quickfixPDFImageRendering() // hacketi hack
                // formula needs to be rendered to be edited..
                setTimeout(function() {renderMathInArea('resource_input')}, 500)
            }
        }

    }

    this.loadResources = function (pageNr) {
        // todo: optimize this, maybe we already have all necessary resources here!
        // finally request resources (by tagIds) for a tag-specific timeline
        if (_this.model.getTagFilter().length > 1) {
            // for more than 1 tag
            var parameter = {tags: _this.model.getTagFilter()}
            emc.loadAllResourcesByTags(parameter)
            current_view = FILTERED_TIMELINE
        } else if (_this.model.getTagFilter().length == 1) {
            // for exactly 1 tag
            var selectedTag = _this.model.getTagFilter()[0]
            emc.loadAllResourcesByTagId(selectedTag.id)
            current_view = FILTERED_TIMELINE
        } else {
            // load all resources, could not identify any tag given
            var offset = (pageNr == undefined) ? offset = 0 : offset = (pageNr * NOTES_LIMIT)
            emc.loadSomeResources(NOTES_LIMIT, offset, false)
            current_view = FULL_TIMELINE
        }
        // initially load and sort
        if (_this.model.isSortedByScore) {
            _this.model.getAvailableResources().sort(_this.score_sort_asc)
        } else {
            _this.model.getAvailableResources().sort(_this.created_at_sort_asc)
        }
    }

    this.checkLoggedInUser = function () {
        // var password = ""
        // var username = "admin"
        var loggedIn = emc.getCurrentUser()
        if (loggedIn !== "") {
            _this.getLoggedInUserTopic(loggedIn)
            return loggedIn
        }
        return null
    }

    this.setDefaultWorkspaceCookie = function () {
        var workspaceTopic = dmc.get_topic_by_value("uri", "de.workspaces.deepamehta")
        js.set_cookie("dm4_workspace_id", workspaceTopic.id)
    }

    this.getLoggedInUserTopic = function (username) {
        _this.model.setCurrentUserName(username)
        var userTopic = emc.getCurrentUserTopic()
        _this.model.setCurrentUserTopic(userTopic)
    }

    this.renderUserInfo = function () {

        var $username = $('.username')
        var name = _this.model.getCurrentUserName()

        if (name === undefined) {
            $username.text('Willkommen')
        } else {
            var user = _this.model.getCurrentUserTopic()
            var $my = $('<a class="btn my" title="Meine Beitr&auml;ge">' + name+ '</a>')
                $my.click(function (e) {
                    _this.go_to_personal_timeline(user)
                    _this.pushPersonalViewState(user)
                })
            $username.html('Hi').append($my)

            var $logout = $('<a class="btn logout" title="Session beenden">(Logout)</a>')
                $logout.click(function (e) {
                    if (emc.logout()) {
                        _this.model.setCurrentUserTopic(undefined)
                        _this.model.setCurrentUserName(undefined)
                        $("body").text("You're logged out now.")
                    } else {
                        _this.model.setCurrentUserTopic(undefined)
                        _this.model.setCurrentUserName(undefined)
                        renderView()
                    }
                })
            $username.append($logout)
        }
    }

    this.setupTagFieldControls = function (identifier) {
        $(identifier).bind( "keydown", function (event) {
            if ( event.keyCode === $.ui.keyCode.TAB && $( this ).data( "ui-autocomplete" ).menu.active ) {
                event.preventDefault();
            } else if (event.keyCode === $.ui.keyCode.ENTER) {
                // fixme: think of submitting posting through keyboard
            }
        }).autocomplete({minLength: 0,
            source: function ( request, response ) {
                // delegate back to autocomplete, but extract the last term
                response( $.ui.autocomplete.filter( _this.model.getAvailableTags(), extractLast( request.term ) ) );
            },
            focus: function () {
                // prevent value inserted on focus
                return false;
            },
            select: function ( event, ui ) {
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

    this.setupPageControls = function () {
        // setting up sort-controls and input button
        $("a#new").click(function (e) {window.scrollTo(0, 0)})
        $(".onoffswitch-label").click(function (e) {

            if (_this.model.isSortedByScore) { // turn toggle-off
                // $("a#most-popular").removeClass("selected")
                _this.model.setAvailableResources(getAlphabeticalResources())
                // _this.model.setTagFilter([]) // fixme: allow during filtering
                _this.model.isSortedByScore = false // set resultset sorting flag
                console.log("sorted by time" + _this.model.isSortedByScore)
                console.log(_this.model.getAvailableResources())
            } else { // turn toggle-on
                // $("a#most-popular").addClass("selected")  //
                // just sort all currently existing resources (client-side)
                _this.model.setAvailableResources(getHighestResources())
                // _this.model.setTagFilter([]) // fixme: allow during filtering
                _this.model.isSortedByScore = true // set resultset sorting flag
                console.log("sorted by score " + _this.model.isSortedByScore)
                console.log(_this.model.getAvailableResources())
            }
            // fixme: this is a partial, more efficient page-update hack, not using our routing
            if (checkLoggedInUser() !== null) {
                // render loaded resources in timeline
                showResultsetView(false)
            } else {
                // render loaded resources in timeline
                showResultsetView(true)
            }
        })
    }

    this.renderDetailView = function () {

        $('#resource_input').attr("contenteditable", false)
        // set content of resource
        // fixme: catch notes without content
        $('#resource_input').html(_this.model.getCurrentResource().composite[NOTE_CONTENT_URI].value)
        var creator = emc.getFirstRelatedCreator(_this.model.getCurrentResource().id)
        var creator_name = (creator == null) ? "Anonymous" : creator.value
        var creator_link = '<a title="Besuche '+creator_name+'s Timeline" href="/notes/user/' +creator.id+ '">'+creator_name+'</a>'
        //
        var created_at = new Date(_this.model.getCurrentResource().composite[CREATED_AT_URI].value)
        var last_modified_at  = new Date(_this.model.getCurrentResource().composite[LAST_MODIFIED_URI].value)
        if (created_at) {
            $('b.header-title').text(
                created_at.getDate() + "." + dict.monthNames[created_at.getMonth()] +" "+ created_at.getFullYear()
            )
        }
        if (creator_link) {
            $('.content-area .creator').html(creator_link)
        }
        if (last_modified_at) {
            $('b.header-title').append(', <b class="label">zuletzt bearbeitet am</b> ' +
                last_modified_at.getDate() + "." + dict.monthNames[last_modified_at.getMonth()] +" "+ last_modified_at.getFullYear()
            )
        }
        // show tags for resource
        var currentTags = _this.model.getCurrentResource().composite[TAG_URI]
        $('#tags').empty()
        if (currentTags != undefined) {
            for (var i=0; i < currentTags.length; i++) {
                var tag = currentTags[i]
                $('#tags').append('<a class="btn tag" title="Browse all notes tagged with \"' +tag.value+ '\"" '
                    + 'href="/notes/tagged/' +tag.value+ '">' +tag.value+ '</a>&nbsp;')
                // <img src="/de.deepamehta.tags/images/tag_32.png" width="20"' + 'alt="Tag: '+tag.value+'">'
            }
        }
        renderMathInArea("resource_input")
        quickfixPDFImageRendering() // hacketi hack
    }

    this.showResultsetView = function (guest) {
        // future needed variations showResultsetView will be:
        // a) load the latest 30 resources b) load the 30 most popular resources
        // c) load all resources with _one_ given tag d) load all resources with _two_ given tags
        // e) load all resources with _three_ given tags

        $('#list-message').html('<br/><br/><b class="label">Calculating results</b>')
        if (_this.model.getAvailableResources().length > 0) {
            renderResultList(guest)
            $('#list-message').html("")
        } else {
            $('#list-message').html('<br/><br/><b class="label">Aint no content found. Please insert coin.</b>')
            $('.result-text').text('')
        }
    }

    this.renderResultList = function (guest) {
        var results = _this.model.getAvailableResources()
        /** $(".result-count").text(results.length + " Ergebnis/se ")
        $('.result-text').text('sortiert') **/
        //
        var $resultlist = $('#resources .list')
        if (!guest) {
            $resultlist.html(_this.createInputListItem())
        } else {
            $resultlist.empty()
        }
        $.each(results, function (e, item) {
            var $topic = setupResultListItem(item)
            $resultlist.append($topic)
        })
        // $('div.results').html($resultlist)
        // render math in the whole page
        renderMathInArea("resources")
        quickfixPDFImageRendering() // hacketi hack
        _this.skroller.refresh()

    }

    this.addToResultList = function (items) {
        var $resultlist = $('#resources .list')
        $.each(items, function (e, item) {
            var $topic = setupResultListItem(item)
            $resultlist.append($topic)
        })
        renderMathInArea("resources")
        quickfixPDFImageRendering() // hacketi hack
        _this.skroller.refresh()

    }

    this.createInputListItem = function () {
        return ''
        + '<li id="input">'
            + '<div class="header">'
                + '<span class="header-title">Neuen Beitrag verfassen<a class="help">*</a></span><br/><br/>'
                + '<div class="help info">'
                    + 'Du kannst mithilfe unseres Editors Beitr&auml;ge in Form von HTML verfassen. Unser Editor erm&ouml;glicht dir momentan <b>Mathe-Formeln</b>, <b>Bilder</b>, <b>Web-Videos</b> und <b>Web-Sound</b> in HTML einzubetten.<br/>'
                    + 'Hier eine kleine Illustration die euch diese 4 Funktionen im Editor-Bereich zeigt.<br/>'
                    + '<img src="/org.deepamehta.eduzen-tagging-notes/images/cK_Editor_help_01.png" /><br/>'
                    + 'Aktuell ist es erstmals experimentell m&ouml;glich <b>&uuml;ber den Bild-Dialog auch PDF-Dokumente hochzuladen und einzubetten</b>.<br/>'
                    + 'Wir wollen diesen Editor-Bereich st&auml;ndig weiter verbessern, ein robusteres PDF-Feature wollen wir dabei mit als n&auml;chstes angehen.<br/>'
                    + '<br/><br/>'
                + '</div>'
                + '<div class="content-area">'
                    + '<div id="resource_input" contenteditable="false"></div>'
                    + '<br/>'
                    + '<span class="header-title">Tags hinzuf&uuml;gen</span>'
                    + '<input type="text" placeholder="..." class="tag"></input>'
                + '</div>'
                + '<div class="toolbar">'
                    + '<a class="submit btn">Hinzuf&uuml;gen</a>'
                + '</div>'
            + '</div>'
        + '</li>'
    }

    this.quickfixPDFImageRendering = function () {
        $.each($('img'), function (e, item) {
            if(item.src.toLowerCase().indexOf(".pdf") != -1 ) {
                // console.log("remove img, render PDF-object instead.. ")
                $('<object data="'+item.src+'" width="760" height="640" type="application/pdf">').insertAfter(item)
                //
                if(typeof item.remove === 'function') {
                    item.remove()
                }
            }
        })
    }

    this.setupResultListItem = function (item) {

        var score = (item.composite[REVIEW_SCORE_URI] != undefined) ? item.composite[REVIEW_SCORE_URI].value : 0
        var tags = (item.composite[TAG_URI] != undefined) ? item.composite[TAG_URI] : []
        var content = (item.composite[NOTE_CONTENT_URI] != undefined) ? item.composite[NOTE_CONTENT_URI].value : ""
        // construct list item, header and content-area first
        var title = (item.composite[CREATED_AT_URI] != undefined) ? new Date(parseInt(item.composite[CREATED_AT_URI].value)) : new Date()

        var $topic = $("li#" + item.id) // we have an id triple in this "component"
        if ($topic.length <= 0) $topic = $('<li id="' +item.id+ '">') // create the new gui-"component"

        var creator = emc.getFirstRelatedCreator(item.id)
        var creator_name = (creator == null) ? "Anonymous" : creator.value
        var $creator_link = $('<a id="user-' +creator.id+ '" title="Zeige '+creator_name+'s Timeline" class="profile btn"></a>')
            $creator_link.text(creator_name)
            $creator_link.click(function(e) {
                _this.go_to_personal_timeline(creator)
                _this.pushPersonalViewState(creator)
            })

        var headline = 'Bewertung: <span class="score-info">' + score + '</span><span class="creation-date">Erstellt am ' + title.getDate() + '.'
                + dict.monthNames[title.getMonth()] + ' ' + title.getFullYear() + ' um ' + title.getHours() + ':'
                + title.getMinutes() + ' Uhr</span>'

        var $body = $('<div class="item-content">' + content + '</div>');
        // bottom area, tag and score info area
        var $toolbar = $('<div class="toolbar"></div>')
        // tag info area
        var $tagInfo = $('<span>Tags: </span>')
            renderTagInfo($tagInfo, tags)
        // create edit and add buttons per result-list item
        var $addDialog = $('<div class="add-tag-dialog"></div>')
        var $addTag = $('<a class="add-tag btn">Tags hinzu</a>')
            $addTag.click(function (e) {
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
                    $saveBtn.click(function () {
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
                        renderTagView()
                        setupResultListItem(item)
                        // update gui, remove dialog
                        $addDialog.remove()
                        $addTag.removeClass("selected")
                    })
                var $cancelBtn = $('<a class="btn close-tag">Abbrechen</a>')
                    $cancelBtn.click(function () {
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
        var $edit = $('<a class="edit-item btn" href="/notes/'+item.id+'">zur Detailansicht dieses Beitrags</a>.')
        // score info area
        var $votes = $('<div class="votes">Bewerte diesen Inhalt </div>')
        var $upvote = $('<a id="' +item.id+ '" class="btn vote">+</a>') // we have an id triple in this "component"
            $upvote.click(function (e) {
                var updatedTopic = dmc.request("GET", "/review/upvote/" + e.target.id)
                _this.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                // piwikTracker.trackGoal(3)
                // todo: update our result-set view immedieatly after upvoting
                setupResultListItem(updatedTopic)
            })
        var $downvote = $('oder <a id="' +item.id+ '" class="btn vote">-</a>') // id triple in this "component"
            $downvote.click(function (e) {
                var updatedTopic = dmc.request("GET", "/review/downvote/" + e.target.id)
                _this.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                // piwikTracker.trackGoal(3)
                // todo: update our result-set view immedieatly after upvoting
                setupResultListItem(updatedTopic)
            })

        // finally append votebar, tagbar and body to list-item
        $votes.append($upvote).append($downvote)
        $toolbar.append(' f&uuml;ge').append($addTag).append(" oder gehe ")
        $toolbar.append($edit)
        // $toolbar.append($tagInfo)

        $topic.html($votes).append($toolbar).append($body).append('Autor: ').append($creator_link).append(headline)
        // out tag listing before body
        if (tags.length > 0) $tagInfo.insertAfter($creator_link)
        return $topic

        function renderTagInfo($tagInfoArea, givenTags) {
            var commaCounter = 0
            for (var ri=0; ri < givenTags.length; ri++) {
                // use tag icon..
                $tagInfoArea.append('<i class="tag">' +givenTags[ri].value+ '</i>')
                commaCounter++
                (commaCounter < givenTags.length) ? $tagInfoArea.append(', ') : $tagInfoArea.append('&nbsp;&nbsp;&nbsp;')
            }
        }
    }

    this.showTagButtons = function ($parent, tags) {
        //
        if (tags == undefined) return undefined
        for (var i=0; i < tags.length; i++) {
            var element = tags[i]
            var $tag = $('<a id="' +element.id+ '" class="btn tag">' +element.value+ '</a>')
            // the event handler, if a filter-request is made
            $tag.click(function (e) {
                var tagId = e.target.id
                // remove the clicked button from the filter dialog
                $("a#" + tagId).remove()
                // prepare new page model
                var selectedTag = _this.model.getTagById(tagId)
                _this.model.addTagToFilter(selectedTag)
                // go to updated view
                _this.go_to_timeline()
                // fixme: formerly here were just (optimal) view updates
                _this.pushTaggedViewState()

            })
            $parent.append($tag)
        }
        return null
    }

    this.renderTagView = function () {

        // setup components _this.model
        var tagsToShow = undefined
        if (_this.model.getTagFilter().length == 0) {
            // filter not set, list all available tags as filter-options
            tagsToShow = _this.model.getAvailableTags()
        } else {
            // filter set, render all tags in current results
            tagsToShow = getAllTagsInCurrentResults()
            tagsToShow = sliceAboutFilteredTags(tagsToShow)
        }
        // in any case, show tag-view area
        $('.eduzen .rendered #nav.info').show()
        // render ui/dialog
        var html_label = "Filter alle Beitr&auml;ge nach Tags"
        if (tagsToShow.length > 0) {

            var $tagview = undefined
            if ($('div.timeline .info div.tag-list').length == 0) {
                // create ui/dialog
                $tagview = $('<div class="tag-list"><span class="label">'+html_label+'</span></div>')
                // place ui/dialog in info area of our timeline-view
                $('div.timeline .info').append($tagview)
            } else {
                // clean up ui/dialog
                // $('div.timeline .info').empty()
                $('div.timeline .info div.tag-list a').remove()
                $tagview = $('div.timeline .info div.tag-list')
            }
            $('div.timeline .info div.tag-list span.label').html(html_label)
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

    this.hideTagView = function () {
        $('div.timeline .info div.tag-list').hide()
    }

    this.emptyTagfilterInfo = function () {
        $('.tag-filter-info').empty()
    }

    this.showTagfilterInfo = function () {
        var tags = _this.model.getTagFilter()
        if (tags.length == 0) {
            $('.tag-filter-info').empty()
            return undefined
        }
        // fixme: hide login-dialog if present, cause these two overlap..
        $('div.login-menu').hide()
        $('a.login-menu-button').removeClass('pressed')
        var tagsLength = _this.model.getAvailableResources().length
        var filterMessage = ""
        if (tagsLength > 1) {
            filterMessage = '<b>' + tagsLength +'</b> Beitr&auml;ge getagged mit'
        } else {
            filterMessage = '<b>' + tagsLength +'</b> Beitrag getagged mit'
        }
        var $filterMeta = $('<span class="meta">'+ filterMessage +'</span>')
        var $filterButtons = $('<span class="buttons"></span>')
        for (var i=0; i < tags.length; i++) {
            var $closeButton = $('<a id="' +tags[i].id+ '" class="close" title="Tag aus dem Filter entfernen">x</a>')
                $closeButton.click(function (e) {
                    var tagId = parseInt(e.target.id)
                    var tag = _this.model.getTagById(tagId)
                    _this.model.removeTagFromFilter(tag)
                    _this.go_to_timeline()
                    _this.pushTaggedViewState()
                })
            var $tagButton = $('<a class="btn tag selected">' +tags[i].value+ '</a>')
                $tagButton.append($closeButton)
            $filterButtons.append($tagButton)
        }
        var $clearButton = $('<a class="btn" title="Alle Tags aus dem Filter entfernen">').html('Filter zur&uuml;cksetzen')
            $clearButton.click(function(e) {
                // prepare model
                _this.model.setTagFilter([])
                // go to new view
                _this.go_to_timeline()
                _this.pushTaggedViewState()
            })
        $filterButtons.append($clearButton)
        $('.tag-filter-info').html($filterMeta).append($filterButtons)

        return null
    }

    this.renderNotification = function (message, errorCode, area, css_class, time, callback) {

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
        $("#"+area).fadeIn(time, function () {
            if (errorCode === OK) {
                // render a nice message
                $(this).removeClass().addClass(css_class).delay(2000).fadeOut(time, callback)
            } else {
                // render a nasty message
                $(this).removeClass().addClass(css_class).delay(2000).fadeOut(time, callback)
                console.log(message + "("+errorCode+")")
            }
        })
    }

    this.getHighestResources = function () {
        var results = _this.model.getAvailableResources()
        return results.sort(score_sort_asc)
    }

    this.getAlphabeticalResources = function () {
        var results = _this.model.getAvailableResources()
        return results.sort(created_at_sort_asc)
    }

    this.getAllTagsInCurrentResults = function () {
        var availableFilterTags = []
        var availableResources = _this.model.getAvailableResources()
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

    this.sliceAboutFilteredTags = function (tags) {
        var filteredTags = _this.model.getTagFilter()
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
        // setup cK-Editor help
        $('.header a.help').click(function (e) {
            $('.header .help.info').toggle()
            $('.header .help.info').click(function (e) {
                $('.header .help.info').toggle()
            })
        })
        // upload-fallback: $(".button.upload").click(this.open_upload_dialog(uploadPath, this.handleUploadResponse))
        // mathjax preview handling
        var $input = $('#resource_input')
            $input.attr('contenteditable', true)
        /** $input.keyup(function (e) {
            renderMathInArea('resource_input')
            return function (){}
        })**/

        CKEDITOR.inline( document.getElementById( 'resource_input' ) )
        // check if initialization was successfull
        if (!CKEDITOR.instances.hasOwnProperty('resource_input')) {
            _this.renderNotification("Hinweis: Wir haben in diesem Web-Browser seit neuestem das Problem dir einen "
                + " Rich-Text-Editor  zur Verfügung stellen. Wir arbeiten bereits an einer Lösung.   ",
                500, UNDER_THE_TOP, "", 3000, undefined)
        }
    }

    this.setupMathJaxRenderer = function () {
        MathJax.Ajax.config.root = "http://localhost:8080/de.tu-berlin.eduzen.mathjax-renderer/script/vendor/mathjax"
        MathJax.Hub.Config({
            "extensions": ["tex2jax.js", "mml2jax.js", "MathEvents.js", "MathZoom.js", "MathMenu.js", "toMathML.js",
            "TeX/noErrors.js","TeX/noUndefined.js","TeX/AMSmath.js","TeX/AMSsymbols.js", "FontWarnings.js"],
            "jax": ["input/TeX", "output/HTML-CSS"], // "input/MathML", , "output/NativeMML", "output/SVG"
            "tex2jax": {"inlineMath": [["$","$"],["\\(","\\)"]]},
            "menuSettings": {
                "mpContext": true, "mpMouse": true, "zscale": "200%", "texHints": true
            },
            "errorSettings": {
                "message": ["[Math Error]"]
            },
            "displayAlign": "left",
            "HTML-CSS": {"scale": 110},
            // "SVG": {"blacker": 8, "scale": 110},
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

    this.updateFormulas = function () {
        var formulas = MathJax.Hub.getAllJax()
        console.log(formulas)
        for (var els in formulas) {
            var formula = formulas[els]
            formula.needsUpdate()
            formula.Rerender()
            formula.needsUpdate()
            console.log(formula)
        }
    }



    /** HTML5 History API utility methods **/

    this.registerHistoryStates = function () {
        if (window.history) window.addEventListener('popstate', _this.popHistory)
        // if (window.history && window.history.pushState) window.addEventListener('pushstate', _this.pushHistory)
    }

    /** PopState Event Handler */
    this.popHistory = function (pop) {

        if (pop.state == null) {
            // fixme:
            // this event pops initially up in chromium-browsers and on returning to full timeline (after one click)
            // the next 3 lines are therefore necessary to maintain-deep-linkin functionality for such browser
            // these 2 cases can just be distinct by current url
            // if "/notes/tagged/" is set its a deep link else its a (resetting) back

        } else if (pop.state.name == FILTERED_TIMELINE) {

            // update app-model
            _this.model.setTagFilter(pop.state.data.tags)
            _this.go_to_timeline()

        } else if (pop.state.name == FULL_TIMELINE) {

            // update app-model
            _this.model.setTagFilter([])
            _this.go_to_timeline()

        } else if (pop.state.name == PERSONAL_TIMELINE) {

            var userId = pop.state.data.userid
            var user = dmc.get_topic_by_id(userId, true)
            // fixme: re-set tagfilter..
            _this.model.setTagFilter([])
            _this.go_to_personal_timeline(user)

        } else {
            console.log("unknown view.. ")
            console.log(pop)
        }
    }

    this.pushTaggedViewState = function () {

        //  say where we're we are now, resp. what we've visited yet'
        var view_state = undefined
        if (_this.model.getTagFilter().length > 0) {
            view_state = {"name": FILTERED_TIMELINE, "data": {"tags": _this.model.getTagFilter(), "userid": 0}}
            _this.pushHistory(view_state, "Tagged Timeline", "/notes/tagged/" + _this.model.getTagFilterURI())
        } else {
            // say we've visited main timeline..
            view_state = {"name": FULL_TIMELINE, "data": {"tags": [], "userid": 0}}
            _this.pushHistory(view_state, "Notizen Timeline", "/notes/")
        }

    }

    this.pushPersonalViewState = function (creator) {
        // say we've visited personal timeline..
        var view_state = {"name": PERSONAL_TIMELINE, "data": {"tags": _this.model.getTagFilter(), "userid": creator.id}}
        _this.pushHistory(view_state, "Personal Timeline", "/notes/user/" + creator.id)
    }

    /** Internal helper method to push view_state to the browser, if supported. */
    this.pushHistory = function (state, name, link) {
        if (!window.history) return
        var history_entry = {state: state, name: name, url: link}
        window.history.pushState(history_entry.state, name, history_entry.url)
    }



    /** GUIToolkit Helper Methods copied among others from dm4-webclient module **/

    /** sorting asc by item.composite[model.REVIEW_SCORE_TYPE_URI].value */
    this.score_sort_asc = function (a, b) {
        var scoreA = 0
        var scoreB = 0
        if (a.composite.hasOwnProperty(REVIEW_SCORE_URI)) scoreA = a.composite[REVIEW_SCORE_URI].value
        if (b.composite.hasOwnProperty(REVIEW_SCORE_URI)) scoreB = b.composite[REVIEW_SCORE_URI].value

        if (scoreA > scoreB) // sort string descending
          return -1
        if (scoreA < scoreB)
          return 1
        return 0 //default return value (no sorting)
    }

    /** sorting asc by item.value */
    this.created_at_sort_asc = function (a, b) {
        var scoreA = 0
        var scoreB = 0
        if (a.composite.hasOwnProperty(CREATED_AT_URI)) scoreA = a.composite[CREATED_AT_URI].value
        if (b.composite.hasOwnProperty(CREATED_AT_URI)) scoreB = b.composite[CREATED_AT_URI].value

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
            for (var k=0; k < _this.model.getAvailableTags().length; k++) {
                var tagTopic = _this.model.getAvailableTags()[k]
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

    /** via our pre-formatted div-containers (rendered-html) we fetch all accompanying scipt-containers (latex-source)
     *  to save math-formulas as source data in our database and not as rendered-html
     */
    this.getTeXAndHTMLSource = function (body) {

        var objects = $('.math-output', body)
        var data = ""
        for (var i=0; i < objects.length; i++) {
            var div = objects[i]
            var source = div.getAttribute("data-tex")
            if ( source ) {
                // put latexSource into div-preview container before saving this data
                div.innerHTML = '<div class=\"math-preview\">$$ '+ source + ' $$</div>'
                // $('#'+ containerId, body).html('<div class=\"math-preview\">$$ '+ source + ' $$</div>')
            } else {
                console.log("ERROR: MathJaxSourceNotFound for container => " + containerId + " and " + containerId)
                // throw new Error ("MathJaxSourceNotFound for container => " + containerId)
            }
        }
        // var data = CKEDITOR.instances.resource_input.getData();
        // var data = $("" + body.innerHTML + "") // copy raw-data of ck-editor
        data = body.innerHTML
        MathJax.Hub.Typeset() // typeset ck-editor again
        return data
            /** duplicate helperfunction in mathjax/dialogs/mathjax.js
            function getInputSourceById(id) {
                var allJax = MathJax.Hub.getAllJax()
                for (var obj in allJax) {
                    var jaxElement = allJax[obj]
                    if (jaxElement.inputID === id) return jaxElement.originalText
                }
                return null
            } */
    }

    this.doSubmitResource = function () {
        // TODO: clean up this mixed up method.
        // var pageContent = $('#resource_input').val()
        var valueToSubmit = getTeXAndHTMLSource(document.getElementById("resource_input"))
        var qualifiedTags = getTagsSubmitted("input.tag")
        // differentiate in tags to create and existing tags in db (which need to be associated)
        var tagsToReference = getTagTopicsToReference(qualifiedTags)
        var tagsToCreate = getTagTopicsToCreate(qualifiedTags, tagsToReference)
        // rendering notifications
        // _this.renderNotification("Saving...", OK, UNDER_THE_TOP, '', 'fast')
        // $('div.header').css("opacity", ".6")
        // creating the new resource, with aggregated new tags
        var resource = undefined
        if (valueToSubmit.match(/\S/) != null && valueToSubmit !== "<p><br></p>") { // no empty strings
            resource = emc.createResourceTopic(valueToSubmit, tagsToCreate)
            if (resource != undefined) {
                // an creating/associtating tags with this resource
                /* createNewTagsForResource(resource, tagsToCreate) **/
                for (var k=0; k < tagsToReference.length; k++) {
                    if (tagsToReference[k] != undefined) {
                        var newAssoc = emc.createResourceTagAssociation(resource, tagsToReference[k])
                        if (!newAssoc) console.log("WARNING: not created a resource tag association ..")
                    }
                }
                // assign authorhsip of resource to the current user
                emc.assignAuthorship(resource, _this.model.getCurrentUserTopic())
                // track "added resource" goal
                // piwikTracker.trackGoal(5)
                $('#resource_input').html("")
                $('input.tag').val("")
                $('div.header').css("opacity", "1")
                // rendering notifications
                // _this.renderNotification("Note submitted.", OK,  UNDER_THE_TOP, '', 'fast')
            }
        } else {
            _this.renderNotification("Wir werden nur unfreiwillig inhaltsfreie Beitr&auml;ge speichern.",
                400, TIMELINE_AREA, '', 'slow')
        }
        // unnecessary, just inserBefore the createResourceTopic at the top of our list
        // or better implement observables, a _this.model the ui can "bind" to
        _this.go_to_timeline() // todo: maybe we're currently on our personal timeline?
    }

    this.doSaveResource = function () {
        var valueToSubmit = getTeXAndHTMLSource(document.getElementById("resource_input"))
        if (valueToSubmit.match(/\S/) != null && valueToSubmit !== "<p><br></p>") { // no empty strings
            var resource = _this.model.getCurrentResource()
                resource.composite[NOTE_CONTENT_URI].value = valueToSubmit
            // var updated = dmc.update_topic(resource)
            var updated = emc.updateResourceTopic(resource)
            if (updated != undefined) {
                // assign co-authorhsip of resource to the current user
                emc.assignCoAuthorship(updated, _this.model.getCurrentUserTopic())
                // rendering notifications
                // _this.renderNotification("Note updated.", OK, UNDER_THE_TOP, "", 'fast', function() {
                    // track "edited resource" goal
                    // piwikTracker.trackGoal(1)
                    // _this.pushHistory("timelineView", "Notes Timeline", "/notes")
                // })
                _this.model.updateAvailableResource(resource)
                if (CKEDITOR.instances.hasOwnProperty('resource_input')) {
                    CKEDITOR.instances['resource_input'].destroy()
                }
                setupDetailView()
            } else {
                _this.renderNotification("Sorry! Wir konnten die Notiz nicht aktualisieren.", 500, UNDER_THE_TOP, '', 'fast')
            }
        } else {
            _this.renderNotification("Wir werden nur unfreiwillig inhaltsfreie Postings speichern.",
                400, UNDER_THE_TOP, '', 'slow')
        }
    }

})(CKEDITOR, MathJax, jQuery, console, new RESTClient("/core"))
