
(function (CKEDITOR, MathJax, $, console, dmc) {

    var _this = this
        _this.skroller = undefined

    _this.model = AppModel()
    // ItemRendererImpl need access to this
    _this.dict = new EduzenDictionary("DE")
    _this.dmc = dmc
    _this.emc = new EMC(dmc, _this.model)
    _this.piwikTracker = (typeof piwikTracker !== "undefined") ? piwikTracker : undefined
    //
    var profile = undefined
    var application_host = document.location.host
    //
    var current_view = "" // fixme: remove this helper
    var TAG_URI = "dm4.tags.tag" // fixme: doublings
    var REVIEW_SCORE_URI = "org.deepamehta.reviews.score" // fixme: doublings
    var CREATED_AT_URI = "org.deepamehta.resources.created_at" // fixme: doublings
    var LAST_MODIFIED_URI = "org.deepamehta.resources.last_modified_at" // fixme: doublings
    var NOTES_URI = "org.deepamehta.resources.resource" // fixme: doublings
    var NOTE_CONTENT_URI = "org.deepamehta.resources.content" // fixme: doublings
    var NOTE_LOCKED_URI = "org.deepamehta.resources.blocked_for_edits" // fixme: doublings
    var NOTES_LIMIT = 15
    var OK = 200
    // Notification Areas
    var UNDER_THE_TOP = "message-top"
    var TIMELINE_AREA = "message-timeline"
    // Views Identifier
    var PERSONAL_TIMELINE = "personal-timeline"
    var FILTERED_TIMELINE = "filtered-timeline"
    var FULL_TIMELINE = "timeline"
    var DETAIL_VIEW= "detail-view"

    var TAGGING_FIELD_SELECTOR = "input.tagging"



    this.initDetailView = function (objectId) {

        _this.emc.loadResourceById(objectId) // initialize page-view detail model
        renderPage(undefined, objectId)
        current_view = DETAIL_VIEW
        //
        showDetailElements()
        _this.hideProgressBar()

    }

    this.initTimeline = function (render_progressbar, hide_progressbar) {

        if (render_progressbar) _this.renderProgressBar()
        // prepare page model (according to filter)
        _this.loadResources() // optimize: maybe we dont need to load it again
        // render timeline view
        renderPage()
        if (hide_progressbar) _this.hideProgressBar() // this is needed when no DOM Load Event can hide our progressbar
        //
        showTimelineElements()

    }

    this.initPersonalTimeline = function (account, render_progressbar, hide_progressbar) {

        if (render_progressbar) _this.renderProgressBar()
        // prepare page model
        _this.model.setTagFilter([])
        // render update before we load all the stuff
        // renderTagView('div.sidebar')
        hideTagView()
        // enforce (re-)loading of full composite user topic in preparation for personal-timeline rendering
        var user_account = _this.emc.getTopicById(account.id)
        // render profile-header first
        profile = new User(_this, _this.dict, _this.emc, user_account)
        profile.setupView($('#profile'))
        // then load all the stuff according to user
        emc.loadAllContributions(user_account.id)
        sortCurrentResources()
        // render page view
        renderPage(user_account) // fixme: setup without tag-filter-dialog
        //
        current_view = PERSONAL_TIMELINE
        if (hide_progressbar) _this.hideProgressBar()
        showTimelineElements(true)

    }

    this.initProfileEditorView = function (account) {

        // enforce (re-)loading of full composite user topic in preparation for personal-timeline rendering
        var user_account = _this.emc.getTopicById(account.id)
        profile = new User(_this, _this.dict, _this.emc, user_account)
        profile.setupView($('#profile'))
        // clean up timeline-gui, where we've definitely coming from (here)
        $('#resources .list').empty()
        //
        var $profile_view = $('#profile')
        profile.renderSettingsEditor($profile_view)
        profile.renderAccountEditor($profile_view)

    }

    this.showTimelineElements = function (is_user_timeline) {

        // in any case
        $("div.content-area").hide()
        $("body.eduzen").removeClass("note")

        $("div#resources").show()
        $("div.sidebar").show()

        if (is_user_timeline) {
            $("div#profile").show()
        } else {
            $("div#profile").hide()
            showTagView()
        }

        if (CKEDITOR.instances.hasOwnProperty('add_resource')) {
            CKEDITOR.instances['add_resource'].destroy()
            console.log("Destroyed CKEditor instance for ADDs")
        }
        //
        if (typeof _this.model.getCurrentUserName() !== 'undefined') {
            setupCKEditorAdd()
        }
    }

    this.showDetailElements = function () {
        $("body.eduzen").addClass("note")
        $("div#resources").hide()
        $("div.sidebar").hide()
        $("div#profile").hide()
        $("div.content-area").show()
        //
    }

    this.sortCurrentResources = function () {
        // initially load and sort
        if (_this.model.isSortedByScore) {
            _this.model.getAvailableResources().sort(_this.score_sort_asc)
        } else {
            _this.model.getAvailableResources().sort(_this.created_at_sort_asc)
        }
    }

    this.sortTags = function () {
        // initially load and sort
        _this.model.getAvailableTags().sort(_this.name_sort_asc)
    }

    this.renderProgressBar = function () {
        var $progressbar = $( "#progressbar" ).progressbar( "widget" );
            $progressbar.progressbar( "enable" );
            $progressbar.show()
            $progressbar.progressbar({value: 10, max: 100});
    }

    this.hideProgressBar = function () {
        var $progressbar = $('#progressbar')
            $progressbar.progressbar({value: 100});
            $progressbar.progressbar( "disable" );
            $progressbar.hide()
    }

    /**
     * Rendering our interactive page. Either "personal" or "ordinary" and either for "guests" or "authenticated users".
     */

    this.renderPage = function (user, noteId) {

        // auth-check (potential doublette if setupPageControls was already called)
        var status = checkLoggedInUser()
        renderUserinfo()

        $('#progressbar').progressbar({value: 15});
        // fixme: render upper menu for either personal or ordinary timeline
        if (user) {
            renderTimelineButton(user)
            showTagfilterInfo() // this to clear tag-filter-info view (if this is called after from a filtered-timeline)
            $('.eduzen .options .tag-filter-info').html('<span class="meta">Alle Beitr&auml;ge von <b>' + user.value + '</b></span>')
            $('.eduzen .rendered #nav.info').hide()
            $('.eduzen.notes').addClass('personal')
            if (user.value === emc.getCurrentUser()) $('.eduzen #menu .username a.btn.my').addClass('pressed')
            hideTagView()

        } else if (noteId) {
            //
            renderTimelineButton(null, noteId)
            showDetailView() // render detail view
            //
        } else {
            removeTimelineButton()
            $('.eduzen #menu .username a.btn.my').removeClass('pressed')
            $('.eduzen.notes').removeClass('personal')
            // $('.eduzen .rendered #nav.info').show()
            // render tag specific filter-info header
            showTagfilterInfo()
            // render avaialble tag-filter buttons
            renderTagView('div.sidebar')
        }
        $('#progressbar').progressbar({value: 50});
        //
        if (status !== null) {
            setupUserPage()
            showResultsetView(false)
            // setupCKEditorAdd()
            setupTagFieldControls(TAGGING_FIELD_SELECTOR)
            $('.eduzen #input input.submit').bind('click', _this.doSubmitResource)
        } else {
            setupGuestPage()
            showResultsetView(true)
        }
        //
        $('#progressbar').progressbar({value: 80});
        _this.skroller.refresh()
    }

    this.renderLoadMoreButton = function () {
        var $load_more = undefined
        if ($('.list .load-more').length == 0) {
            // create new one
            $load_more = $('<input type="button" class="load-more" value="Ältere Notizen ..." />')
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

    this.renderTimelineButton = function (user_profile, note_id) {
        var $homeButton = undefined
            //
            $homeButton = $('<a class="home-menu-button btn" title="Zur&uuml;ck zur Timeline-Ansicht">Timeline</a>')
            if (ON_RESOURCE_HTML) $homeButton.attr("href", "/notes")
            //
            $homeButton.click(function (e) {
                if (typeof note_id === "undefined") {
                    _this.pushDetailViewState(_this.model.getCurrentResource())
                } else if (typeof user_profile === "undefined") {
                    _this.pushPersonalViewState(user_profile)
                } else {
                    _this.pushTimelineViewState()
                }
                _this.initTimeline(true, true)
                // window.history.back()
            })
            $('#menu').append($homeButton)
    }

    this.removeTimelineButton = function () {
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
        $('.about-login').html('Um Beitr&auml;ge zu verfassen musst du eingeloggt sein.</div>')
        //
        $($loginMenu).insertBefore('a#info')

        function doLogin() {
            var user = checkUserAuthorization() // login button handler
            if (user != null) {
                // _this.initTimeline(false)
                // _this.pushTimelineViewState()
                // see checkUserAuthorization() for convenience
            }
        }

        function checkUserAuthorization (id, secret) {

            if (id === undefined && secret === undefined) {
                id = $('input.username-input').val()
                secret = $('input.secret').val()
            }

            var authorization = authorization()
            var response = null
            if (authorization === undefined) return null

            $.ajax({
                type: "POST", url: "/accesscontrol/login", headers: {"Authorization": authorization}, async: false
            }).done(function(e) {
                _this.initTimeline(false)
                _this.pushTimelineViewState()
                response = _this.checkLoggedInUser()
            }).fail(function(e) {
                $('div.login-menu .message').addClass("failed")
                $('div.login-menu .message').text('Nutzername oder Passwort ist falsch.')
                // _this.renderNotification("The application could not initiate a working session for you.", 403, TIMELINE)
                // throw new Error("401 - Sorry, the application ccould not establish a user session.")
                response = null
            }).always(function(e) {
                return response
            })

            /** Returns value for the "Authorization" header. */
            function authorization() {
                return "Basic " + btoa(id + ":" + secret)   // ### FIXME: btoa() might not work in IE
            }
        }
    }

    this.showDetailView = function () {
        // set page-data
        var creator = _this.getRelatedUserAccount(_this.model.getCurrentResource().id)
        var display_name = creator.value
        //
        if (creator.composite.hasOwnProperty('org.deepamehta.identity.display_name')) {
            display_name = creator.composite['org.deepamehta.identity.display_name'].value
        }
        var creator_name = (creator == null) ? "Anonymous" : display_name
        var isLocked = false
        if (_this.model.getCurrentResource().composite.hasOwnProperty(NOTE_LOCKED_URI)) {
            isLocked = _this.model.getCurrentResource().composite[NOTE_LOCKED_URI].value
        } else {
            // is most probably an old resource and in any case not locked
            isLocked = false
        }
        // initalize add tags field
        // setupTagFieldControls(TAGGING_FIELD_SELECTOR)
        setupMathJaxRenderer()
        var status = checkLoggedInUser()
        var $editButton = $('input.submit.btn')
        if (status !== null) {
            var is_author = (creator_name === status) ? true : false
            if (is_author || !isLocked) {
                $editButton.show()
                $editButton.unbind('click')
                $editButton.val('Inhalt ändern')
                $editButton.click(setupEditDetailView) // edit button handler
            } else {
                // fixme: show notification
                console.warn("You cannot edit this resource because it was set to be not editable by its creator")
                $editButton.hide()
            }
        } else {
            $editButton.hide()
        }
        // just got traction when coming from edit view
        $('input.lock').hide()
        $('label.lock').hide()
        //
        renderUserinfo()
        renderDetailView()

        function setupEditDetailView () {
            //
            if (CKEDITOR.instances.hasOwnProperty('resource_input')) {
                CKEDITOR.instances['resource_input'].destroy()
                console.log("Destroyed CKEditor instance for EDITs")
                console.log(CKEDITOR.instances)
            }
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
                if (creator_name === emc.getCurrentUser()) {
                    var $check = $('input.lock')
                        $check.attr("checked", isLocked)
                        $check.show()
                    $('label.lock').show()
                }
                // skip tags, they are already setup for this resource
                quickfixPDFImageRendering() // hacketi hack
                // formula needs to be rendered to be edited..
                setTimeout(function() {renderMathInArea('resource_input', true)}, 500)
            }
        }

    }

    this.loadResources = function (pageNr) {
        // todo: optimize this, maybe we already have all necessary resources here!
        // finally request resources (by tagIds) for a tag-specific timeline
        if (_this.model.getTagFilter().length > 1) {
            // for more than 1 tag
            emc.loadAllResourcesByTags({tags: _this.model.getTagFilter()})
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
        //
        sortCurrentResources()
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

    this.renderUserinfo = function () {

        var $username = $('.username')
        var name = _this.model.getCurrentUserName()

        if (typeof name === 'undefined') {
            $username.text('Willkommen')
            if (current_view === DETAIL_VIEW) $username.hide()
        } else {
            var user = _this.model.getCurrentUserTopic()
            // fixme: we have currently 2 different buttons, depending on the current view
            var $my = $('<a class="btn my" title="Zeige meine Beitr&auml;ge">' + name+ '</a>')
            if (current_view === DETAIL_VIEW ){
                $my.attr("href", "/notes/user/" + user.id)
            } else {
                $my.click(function (e) {
                    _this.initPersonalTimeline(user, true, true)
                    _this.pushPersonalViewState(user)
                })
            }
            //
            $username.html('Hi').append($my)

            var $logout = $('<a class="btn logout" title="Session beenden">Logout</a>')
                $logout.click(function (e) {
                    if (emc.logout()) {
                        _this.model.setCurrentUserTopic(undefined)
                        _this.model.setCurrentUserName(undefined)
                        $("body").html("You're logged out now. <br/><br/><a href=\"/\">Reload Application</a>")
                    } else {
                        _this.model.setCurrentUserTopic(undefined)
                        _this.model.setCurrentUserName(undefined)
                        renderPage()
                    }
                })
            $username.append($logout)
        }
    }

    this.setupTagFieldControls = function (identifier) {
        $(identifier).bind( "keydown" , function (event) {
            if (event.keyCode === $.ui.keyCode.TAB && $( this ).data( "ui-autocomplete" ).menu.active ) {
                event.preventDefault();
            } else if (event.keyCode === $.ui.keyCode.ENTER) {
                // fixme: think of submitting posting through keyboard
            }
        }).autocomplete({
            minLength: 0,
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
        $(".onoffswitch-label").click(function (e) {
            if (_this.model.isSortedByScore) { // turn toggle-off
                // $("a#most-popular").removeClass("selected")
                _this.model.setAvailableResources(getAlphabeticalResources())
                // _this.model.setTagFilter([]) // fixme: allow during filtering
                _this.model.isSortedByScore = false // set resultset sorting flag
            } else { // turn toggle-on
                // $("a#most-popular").addClass("selected")  //
                // just sort all currently existing resources (client-side)
                _this.model.setAvailableResources(getHighestResources())
                // _this.model.setTagFilter([]) // fixme: allow during filtering
                _this.model.isSortedByScore = true // set resultset sorting flag
            }
            // fixme: this is a partial, more efficient page-update hack, which does not us our routing
            if (checkLoggedInUser() !== null) {
                // render loaded resources in timeline
                showResultsetView(false)
            } else {
                // render loaded resources in timeline
                showResultsetView(true)
            }
        })
    }

    /** fix: application_host in...
     *  - meta property="og:url"
     *  - a.source-info text
     *  - a.source-info href
     * */
    this.renderDetailView = function () {

        var $input_area = $('#resource_input')
            $input_area.attr("contenteditable", false)
            // set content of resource
            // fixme: catch notes without content
            $input_area.html(_this.model.getCurrentResource().composite[NOTE_CONTENT_URI].value)
        //
        $('a.print-view').attr('href', '/notes/' + _this.model.getCurrentResource().id + '/print')
        var creator = _this.getAccountTopic(_this.model.getCurrentResource())
        var display_name = creator.value
        //
        if (creator.composite.hasOwnProperty('org.deepamehta.identity.display_name')) {
            display_name = creator.composite['org.deepamehta.identity.display_name'].value
        }
        // creator-link: now relies on baseUrl (for print-view)
        var creator_name = (creator == null) ? "Anonymous" : display_name
        var creator_link = '<a title="Gehe zur Timeline von  ' +creator_name+ '" href="http://' +application_host+ '/notes/user/' +creator.id+ '">'+creator_name+'</a>'

        var contributor = emc.getAllContributor(_this.model.getCurrentResource().id)
        if (contributor != null) {
            $('b.contributor.label').text("Mitwirkende:")
            var $contribs = $('span.contributor')
                $contribs.empty()
            for (var key in contributor) {
                var user = contributor[key]
                // contributor-link: now relies on baseUrl (for print-view)
                var contributor_link = '<a title="Besuche '+user.value+'s Timeline" href="http://' +application_host+ '/notes/user/' +user.id+ '">'+user.value+'</a>&nbsp;'
                $contribs.append(contributor_link)
            }
        }
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
        // tag-link: now relies on baseUrl (for print-view)
        var currentTags = _this.model.getCurrentResource().composite[TAG_URI]
        $('#tags').empty()
        if (currentTags != undefined) {
            for (var i=0; i < currentTags.length; i++) {
                var tag = currentTags[i]
                $('#tags').append('<a class="btn tag" title="Browse all notes tagged with ' +tag.value+ '" '
                    + 'href="http://' +application_host+ '/notes/tagged/' +tag.value+ '">' +tag.value+ '</a>&nbsp;')
                // <img src="/de.deepamehta.tags/images/tag_32.png" width="20"' + 'alt="Tag: '+tag.value+'">'
            }
        }
        renderMathInArea("resource_input", false)
        quickfixPDFImageRendering() // hacketi hack
    }

    this.showResultsetView = function (guest) {
        // future needed variations showResultsetView will be:
        // a) load the latest 30 resources b) load the 30 most popular resources
        // c) load all resources with _one_ given tag d) load all resources with _two_ given tags
        // e) load all resources with _three_ given tags

        $('#list-message').html('<br/><br/><b class="label">Calculating results</b>')
        if (_this.model.getAvailableResources().length > 0) {
            $('#list-message').html("")
        } else {
            $('#list-message').html('<br/><br/><b class="label">No posts to show.</b>')
            $('.result-text').text('')
        }
        renderResultList(guest)
    }

    this.renderResultList = function (guest) {
        var results = _this.model.getAvailableResources()
        /** $(".result-count").text(results.length + " Ergebnis/se ")
        $('.result-text').text('sortiert') **/
        //
        var $resultlist = $('#resources .list')
        if (!guest) {
            $resultlist.html(_this.setupInputListItem())
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
        // _this.skroller.refresh()

    }

    this.setupInputListItem = function () {
        return ''
        + '<li id="input">'
            + '<div class="header">'
                + '<span class="header-title label">Neuen Beitrag verfassen<a class="help">*</a></span><br/><br/>'
                + '<div class="help info">'
                    + 'Du kannst mithilfe unseres Editors Beitr&auml;ge in Form von HTML verfassen. Unser Editor erm&ouml;glicht dir momentan <b>Mathe-Formeln</b>, <b>Bilder</b>, <b>Web-Videos</b> und <b>Web-Sound</b> in HTML einzubetten.<br/>'
                    + 'Hier eine kleine Illustration die euch diese 4 Funktionen im Editor-Bereich zeigt.<br/>'
                    + '<img src="/org.deepamehta.eduzen-tagging-notes/images/cK_Editor_help_01.png" /><br/>'
                    + 'Aktuell ist es erstmals experimentell m&ouml;glich <b>&uuml;ber den Bild-Dialog auch PDF-Dokumente hochzuladen und einzubetten</b>.<br/>'
                    + 'Wir wollen diesen Editor-Bereich st&auml;ndig weiter verbessern, ein robusteres PDF-Feature wollen wir dabei mit als n&auml;chstes angehen.<br/>'
                    + '<br/><br/>'
                + '</div>'
                + '<div class="input-area">'
                    + '<div id="add_resource" contenteditable="false"></div>'
                    + '<br/>'
                    + '<span class="header-title label">Tags hinzuf&uuml;gen</span><br/>'
                    + '<input type="text" placeholder="..." class="tagging" title="Notiz verschlagworten"></input>'
                    + '<input type="button" class="submit" value="Hinzuf&uuml;gen" title="Notiz speichern"/>'
                + '</div>'
            + '</div>'
        + '</li>'
    }

    this.setupResultListItem = function (item) {

        var $item_dom = $("li#" + item.id) // creates a new DOMElement
        return new NoteItemRenderer(item, _this).create($item_dom) // sets up new item in DOMElement
        // and the caller appends newly set up item in DOM?
        // new MoodleItemRenderer(item).render($item_dom)

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

        if (!CKEDITOR.instances.hasOwnProperty('resource_input')) { // initialize if not present
            CKEDITOR.inline( document.getElementById( 'resource_input' ) )
            console.log("initializing CKEditor for EDITs")
        } else {
            console.warn("CKEditor was already setup for EDITs")
            console.log(CKEDITOR.instances)
        }
        // extend/back the global CKEditor instance with a reference to our application model
        CKEDITOR.app_model = _this.model
    }

    this.setupCKEditorAdd = function () {

        // setup cK-Editor help
        $('.header a.help').click(function (e) {
            $('.header .help.info').toggle()
            $('.header .help.info').click(function (e) {
                $('.header .help.info').toggle()
            })
        })
        // mathjax preview handling
        var $input = $('#add_resource')
            $input.attr('contenteditable', true)

        // check if initialization was successfull
        if (!CKEDITOR.instances.hasOwnProperty('add_resource')) { // initialize if not present
            console.log("initializing CKEditor for ADDs")
            CKEDITOR.inline( document.getElementById( 'add_resource' ) )
        } else {
            console.warn("CKEditor was already setup for ADDs")
            console.log(CKEDITOR.instances)
        }
        // extend/back the global CKEditor instance with a reference to our application model
        CKEDITOR.app_model = _this.model
    }

    this.setupMathJaxRenderer = function () {
        MathJax.Ajax.config.root = "/de.tu-berlin.eduzen.mathjax-renderer/script/vendor/mathjax"
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
            "elements": ["resource_input, add_resource, math-live-preview, resources"]
        });
        // console.log("testing to get at an iframe.. into mathJax rendering")
        // console.log($(".cke_wysiwyg_frame").context.childNodes[1].childNodes[2])
        MathJax.Hub.Configured() // bootstrap mathjax.js lib now
        MathJax.Hub.Typeset()
    }

    this.renderMathInArea = function (identifier, editable) {
        // typeset all elements containing TeX to SVG or HTML in designated area
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, identifier]);
        if (editable) {
            // registering selection-handler on all visible formulas
            $('div.math-output').click(function(e) {

                var previous = _this.model.getSelectedFormula()
                if (_this.model.getSelectedFormula() != undefined) {
                    _this.deselectEditableFormula(previous)
                }
                // select new, if not the identical
                if ($(previous).attr('data-tex') !== $(this).attr('data-tex')) {
                    _this.selectEditableFormula(this)
                }
                //
                CKEDITOR.instances[identifier].selectionChange()

            })

            $('div.math-output').dblclick(function(e) {
                _this.selectEditableFormula(this)
                CKEDITOR.instances[identifier].openDialog('mathjaxDialog')
            })

        }
    }

    this.deselectEditableFormula = function(element) {
        $(element).removeClass('selected')
        _this.model.setSelectedFormula(undefined)
    }

    this.selectEditableFormula = function(element) {
        _this.model.setSelectedFormula(element)
        $(element).addClass('selected')
    }

    this.showTagButtons = function ($parent, tags) {
        //
        if (tags == undefined) return undefined
        for (var i=0; i < tags.length; i++) {
            var element = tags[i]
            var $tag = $('<a id="' +element.id+ '" class="btn tag" title="Filter Timeline nach '+element.value+'">'
                + element.value + '</a>')
            // the event handler, if a filter-request is made
            $tag.click(function (e) {
                var tagId = e.target.id
                // remove the clicked button from the filter dialog
                $("a#" + tagId).remove()
                // prepare new page model
                var selectedTag = _this.model.getTagById(tagId)
                _this.model.addTagToFilter(selectedTag)
                // go to updated view
                _this.initTimeline(true, true)
                // fixme: formerly here were just (optimal) view updates
                _this.pushTimelineViewState()

            })
            $parent.append($tag)
        }
        return null
    }

    this.renderTagView = function (parent_selector) {

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
        $('.eduzen #nav.info').show()
        $('.tag-cloud-header').html('Filter Beitr&auml;ge nach Tags')
        // render ui/dialog
        if (tagsToShow.length > 0) {

            var $tagview = undefined
            if ($(parent_selector + ' .info div.tag-list').length == 0) {
                // create ui/dialog
                $tagview = $('<div class="tag-list">')
                // place ui/dialog in info area of our timeline-view
                $(parent_selector + ' .info').append($tagview)
            } else {
                // clean up ui/dialog
                // $('div.timeline .info').empty()
                $(parent_selector + ' .info div.tag-list a').remove()
                $tagview = $(parent_selector + ' .info div.tag-list')
            }
            $(parent_selector + ' .info div.tag-list').show()
            // render all tags as buttons into our ui/dialog
            showTagButtons($tagview, tagsToShow)
        } else {
            // clean up ui/dialog
            $(parent_selector + ' .info div.tag-list a').remove()
            $(parent_selector + ' .info div.tag-list').hide()
        }

    }

    this.hideTagView = function () {
        $('.eduzen #nav.info').hide()
    }

    this.showTagView = function () {
        $('.eduzen #nav.info').show()
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
        $('div.login-menu').hide() // ### removal to be checked
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
                    _this.initTimeline(true, true)
                    _this.pushTimelineViewState()
                })
            var $tagButton = $('<a class="btn tag selected">' +tags[i].value+ '</a>')
                $tagButton.append($closeButton)
            $filterButtons.append($tagButton)
        }
        var $clearButton = $('<a class="reset btn" title="Alle Tags aus dem Filter entfernen">')
            .html('Filter zur&uuml;cksetzen')
            $clearButton.click(function(e) {
                // prepare model
                _this.model.setTagFilter([])
                // go to new view
                _this.initTimeline(true, true)
                _this.pushTimelineViewState()
            })
        $('.tag-filter-info').html($filterMeta).append($clearButton).append($filterButtons)

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
            _this.initTimeline(true, true)

        } else if (pop.state.name == FULL_TIMELINE) {

            // update app-model
            _this.model.setTagFilter([])
            _this.initTimeline(true, true)

        } else if (pop.state.name == PERSONAL_TIMELINE) {

            var userId = pop.state.data.userid
            var user = dmc.get_topic_by_id(userId, true)
            // fixme: re-set tagfilter..
            _this.model.setTagFilter([])
            _this.initPersonalTimeline(user, true, true)

        } else if (pop.state.name == DETAIL_VIEW) {

            _this.initDetailView(pop.state.data.id)

        } else {
            console.log("unknown view.. ")
            console.log(pop)
        }
    }

    this.pushTimelineViewState = function () {

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

    this.pushDetailViewState = function (note) {
        // say we've seen a note in detail
        var view_state = {"name": DETAIL_VIEW, "data": note}
        _this.pushHistory(view_state, "Note Detail View", "/notes/" + note.id)
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

    /** sorting asc by item.value */
    this.name_sort_asc = function (a, b) {
        var nameA = a.value
        var nameB = b.value
        //
        if (nameA.toLowerCase() > nameB.toLowerCase()) // sort string descending
          return 1
        if (nameA.toLowerCase() < nameB.toLowerCase())
          return -1
        return 0 //default return value (no sorting)
    }

    this.getRelatedUserAccount = function (topicId) {
        var creator = emc.getFirstRelatedCreator(topicId)
            creator = emc.getTopicById(creator.id)
        return creator
    }

    this.getAccountTopic = function (topic) {
        if (topic.composite.hasOwnProperty('dm4.accesscontrol.user_account')) {
            return topic.composite['dm4.accesscontrol.user_account']
        }
        return null
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
        var valueToSubmit = getTeXAndHTMLSource(document.getElementById("add_resource"))
        var qualifiedTags = getTagsSubmitted(TAGGING_FIELD_SELECTOR)
        // differentiate in tags to create and existing tags in db (which need to be associated)
        var tagsToReference = getTagTopicsToReference(qualifiedTags)
        var tagsToCreate = getTagTopicsToCreate(qualifiedTags, tagsToReference)
        // creating the new resource, with aggregated new tags
        var resource = undefined
        if (valueToSubmit.match(/\S/) != null && valueToSubmit !== "<p><br></p>") { // no empty strings
            resource = emc.createResourceTopic(valueToSubmit, tagsToCreate) // ### use catch here
            if (resource != undefined) {
                // an creating/associtating tags with this resource
                /* createNewTagsForResource(resource, tagsToCreate) **/
                for (var k=0; k < tagsToReference.length; k++) {
                    if (tagsToReference[k] != undefined) {
                        var newAssoc = emc.createResourceTagAssociation(resource, tagsToReference[k])
                        if (!newAssoc) console.warn("We could not create a Resource <-> Tag association ..")
                    }
                }
                // track "added resource" goal
                if (typeof piwikTracker !== 'undefined') piwikTracker.trackGoal(5)
                $('#add_resource').html("")
                $(TAGGING_FIELD_SELECTOR).val("")
                $('div.header').css("opacity", "1")
                // rendering notifications
                // _this.renderNotification("Note submitted.", OK,  UNDER_THE_TOP, '', 'fast')
            }
        } else {
            _this.renderNotification("Wir werden nur unfreiwillig inhaltsfreie Beitr&auml;ge speichern.",
                400, TIMELINE_AREA, '', 'slow')
        }
        // fixme: if we're adding a resource on our personal timeline, we currently return to the global one
        _this.initTimeline(false)
    }

    this.doSaveResource = function () {
        // ui-workaround/clean-up: we do not want to save our (ui-selection realized as html) as part of our data
        var previous = _this.model.getSelectedFormula()
        if (_this.model.getSelectedFormula() != undefined) {
            _this.deselectEditableFormula(previous)
        }
        // get data
        var valueToSubmit = getTeXAndHTMLSource(document.getElementById("resource_input"))
        var isLocked = ( $('input.lock').attr('checked') === "checked") ? true : false
        if (valueToSubmit.match(/\S/) != null && valueToSubmit !== "<p><br></p>") { // no empty strings
            var resource = _this.model.getCurrentResource()
                resource.composite[NOTE_CONTENT_URI].value = valueToSubmit
                resource.composite[NOTE_LOCKED_URI] = {"value": isLocked , "type_uri": NOTE_LOCKED_URI, "uri": ""}
            // var updated = dmc.update_topic(resource)
            var updated = emc.updateResourceTopic(resource)
            if (updated != undefined) {
                // rendering notifications
                // _this.renderNotification("Note updated.", OK, UNDER_THE_TOP, "", 'fast', function() {
                    // track "edited resource" goal
                if (typeof piwikTracker !== 'undefined') piwikTracker.trackGoal(1)
                    // _this.pushHistory("timelineView", "Notes Timeline", "/notes")
                // })
                _this.model.updateAvailableResource(resource)
                // destroy the CKEditor instance (if present)
                if (CKEDITOR.instances.hasOwnProperty('resource_input')) {
                    CKEDITOR.instances['resource_input'].destroy()
                }
                renderPage(undefined, updated.id)
            } else {
                _this.renderNotification("Sorry! Wir konnten die Notiz nicht aktualisieren.", 500, UNDER_THE_TOP, '', 'fast')
            }
        } else {
            _this.renderNotification("Wir werden nur unfreiwillig inhaltsfreie Postings speichern.",
                400, UNDER_THE_TOP, '', 'slow')
        }
    }

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
                if (info.curTop > (info.maxTop - 200)) _this.renderLoadMoreButton()
            }
        }})

        // setup page-controls (once!)
        registerHistoryStates()
        setupMathJaxRenderer()
        setDefaultWorkspaceCookie()
        setupPageControls()

        // in any case
        emc.loadAllTags()
        sortTags()
        // route to distinct views
        if (noteId === undefined || noteId === "") {

            _this.initTimeline(true, false) // load timeline with no filter set
            $(window).on('load', function(event) {_this.hideProgressBar()});

        } else if (noteId === "tagged") {

            var tags = attributes[3]
                tags = (tags.indexOf('+') != -1) ? tags.split("+") : tags.split("%2B")
            var selectedTag = undefined
            for (var i=0; i < tags.length; i++) {
                var label = decodeURIComponent(tags[i])
                selectedTag = _this.model.getTagByName(label)
                if (selectedTag != undefined) _this.model.addTagToFilter(selectedTag)
            }
            _this.initTimeline(true, false) // call timeline after filter was set.
            $(window).on('load', function(event) {_this.hideProgressBar()});

        } else if (noteId === "user") {

            var userId = attributes[3]
            var user = dmc.get_topic_by_id(userId, true)
            _this.initPersonalTimeline(user, true, false)
            $(window).on('load', function(event) {_this.hideProgressBar()});

        } else {

            _this.initDetailView(noteId)
            // fixme: historyApi // _this.pushHistory("detailView", "Note Info: " + noteId, "/notes/" + noteId)

        }

    }

})(CKEDITOR, MathJax, jQuery, console, new RESTClient("/core"))
