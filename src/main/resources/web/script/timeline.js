
(function (CKEDITOR, MathJax, $, console, dmc) {

    var _this = this

    _this.model = AppModel()
    // ItemRendererImpl need access to this
    _this.dict = new EduzenDictionary("DE")
    _this.dmc = dmc
    _this.emc = new EMC(dmc, _this.model)
    _this.piwikTracker = (typeof piwikTracker !== "undefined") ? piwikTracker : undefined
    //
    var profile = undefined
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
    // Tag Input Field
    var TAGGING_FIELD_SELECTOR = "input.tagging"



    this.prepare_detail_page = function (objectId) {
        // 0) keep track of current view-state
        current_view = DETAIL_VIEW
        // 1) initialize page-view detail model
        _this.emc.loadResourceById(objectId)
        // 3) render detail-page-view
        _this.render_toolbar()
        _this.prepare_detail_view()
        _this.render_detail_view()
        _this.hide_progress_bar()
        _this.show_detail_elements()
    }

    this.prepare_index_page = function (render_progressbar, hide_progressbar) {
        if (render_progressbar) _this.show_progress_bar()
        // 1) prepare timeline page model (according to filter) and keep track of current view-state
        // ### optimize: maybe we dont need to load it again
        _this.load_resources() // note: is where current_view is set to either FILTERED- or FULL_TIMELINE
        _this.sort_available_resources()
        // ..) setup timeline controls (on_profile)
        _this.setup_timeline_controls(false)
        // 2) render timeline page view
        _this.render_toolbar()
        $('.eduzen .rendered #nav.info').show()
        _this.render_tag_filter_info() // render tag specific filter-info header
        _this.render_tag_items('div.sidebar')
        _this.render_result_view(false) // false == without contributions
        // 3) hide and show
        if (hide_progressbar) _this.hide_progress_bar() // this we need when no DOM Load Event can hide our progressbar
        _this.show_timeline_elements()
    }

    this.prepare_profile_page = function (account, render_progressbar, hide_progressbar) {
        // 1) keep track of current view-state
        current_view = PERSONAL_TIMELINE
        if (render_progressbar) _this.show_progress_bar()
        // 2) prepare page model
        _this.model.setTagFilter([])
        // ..) setup timeline controls (on profile)
        _this.setup_timeline_controls(true)
        // 4) enforce (re-)loading of full composite user topic in preparation for personal-timeline rendering
        var user_model = _this.emc.getTopicById(account.id)
        // 5) render custom profile-header first
            profile = new User(_this, _this.dict, _this.emc, user_model)
            profile.setupView($('#profile'))
        // 6) then load all the stuff according to user
        _this.load_contributions(user_model.id)
        _this.sort_contributed_resources()
        // 7) render profile page content
        _this.render_toolbar()
        _this.render_tag_filter_info() // render tag specific filter-info header
        // ..) Prepare (for) Timeline View Render ResultList (true == with contributions)
        _this.render_result_view(true)
       if (hide_progressbar) _this.hide_progress_bar()
        _this.show_timeline_elements(true)
    }

    this.prepare_profile_editor_view = function (account) {
        // clean up timeline-gui, where we've definitely coming from (here)
        $('#resources .list').empty()
        // enforce (re-)loading of full composite user topic in preparation for personal-timeline rendering
        var user_account = _this.emc.getTopicById(account.id)
        profile = new User(_this, _this.dict, _this.emc, user_account)
        profile.setupView($('#profile'))
        //
        var $profile_view = $('#profile')
        profile.renderSettingsEditor($profile_view)
        profile.renderAccountEditor($profile_view)
    }

    this.prepare_detail_view = function () {
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
        var status = checkLoggedInUser()
        // ..) Resource is Locked Check
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
        $('input.lock').hide()
        $('label.lock').hide()
        //
        function setupEditDetailView () {
            //
            if (CKEDITOR.instances.hasOwnProperty('resource_input')) {
                CKEDITOR.instances['resource_input'].destroy()
            }
            _this.setup_ckeditor('resource_input')
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
                if (creator_name === _this.emc.getCurrentUser()) {
                    var $check = $('input.lock')
                        $check.attr("checked", isLocked)
                        $check.show()
                    $('label.lock').show()
                }
                // skip tags, they are already setup for this resource
                quickfixPDFImageRendering() // hacketi hack
                // formula needs to be rendered to be edited..
                setTimeout(function() {process_math_in_area('resource_input', true)}, 500)
            }
        }

    }

    /** fix: document.location.host */
    this.render_detail_view = function () {

        var $input_area = $('#resource_input')
            $input_area.attr("contenteditable", false)
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
        // ### creator-link: now relies on baseUrl (for print-view)
        var creator_name = (creator == null) ? "Anonymous" : display_name
        var $creator_link = $('<a title="Gehe zur Timeline von  ' +creator_name+ '" class="btn link">'+creator_name+'</a>')
            $creator_link.click(function (e) {
                _this.prepare_profile_page(creator, true, true)
                _this.pushPersonalViewState(creator)
            })

        var contributor = _this.emc.getAllContributor(_this.model.getCurrentResource().id)
        if (contributor != null) {
            $('b.contributor.label').text("Mitwirkende:")
            var $contribs = $('span.contributor')
                $contribs.empty()
            for (var key in contributor) {
                var user = contributor[key]
                // ### contributor-link: now relies on baseUrl (for print-view)
                var $contributor_link = $('<a id="' +user.id+ '" title="Besuche ' + user.value + 's Timeline" '
                     + 'class="btn link">' +user.value+ '</a>').append("&nbsp;")
                    $contributor_link.click(function (e) {
                        var profile_id = e.target.id
                        var profile = _this.emc.getTopicById(profile_id)
                        _this.prepare_profile_page(profile, true, true)
                        _this.pushPersonalViewState(profile)
                    })
                $contribs.append($contributor_link)
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
        if ($creator_link) {
            $('.content-area .creator').html($creator_link)
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
                    + 'href="http://' +document.location.host+ '/notes/tagged/' +tag.value+ '">' +tag.value+ '</a>&nbsp;')
                // <img src="/de.deepamehta.tags/images/tag_32.png" width="20"' + 'alt="Tag: '+tag.value+'">'
            }
        }
        process_math_in_area("resource_input", false)
        quickfixPDFImageRendering() // hacketi hack
    }

    this.render_result_view = function (is_profile_view) {

        $('#list-message').html('<br/><br/><b class="label">Calculating results</b>')
        var results = _this.model.getAvailableResources()
        if (is_profile_view) {
            results = _this.model.getProfileResources()
        }
        //
        if (results.length > 0) {
            $('#list-message').html("")
            var $resultlist = $('#resources .list')
            // .. ) insert or remove input-aarea item
            if (_this.is_logged_in()) {
                $resultlist.html(_this.create_input_item_view())
                // ..) create input view
                setup_ckeditor('add_resource')
                setupTagFieldControls(TAGGING_FIELD_SELECTOR)
                $('.eduzen #input input.submit').bind('click', _this.doSubmitResource)
            } else {
                $resultlist.empty()
            }
            // ..) insert complete resultset
            $.each(results, function (e, item) {
                var $topic = _this.create_result_item_view(item)
                $resultlist.append($topic)
            })
            // ..) render math elements in html-resultset
            process_math_in_area("resources")
            quickfixPDFImageRendering() // hacketi hack
            _this.render_load_more_button()
        } else {
            $('#list-message').html('<br/><br/><b class="label">No posts to show.</b>')
            $('.result-text').text('')
        }

    }

    this.render_load_more_button = function () {
        // render just on this view
        if (current_view == FULL_TIMELINE) {
            var $load_more = undefined
            if ($('.list .load-more').length == 0) {
                // create new one
                $load_more = $('<input type="button" class="load-more" value="Ältere Notizen ..." />')
                $load_more.click(function(e) {
                    _this.append_page_to_result_view()
                })
                $('#resources .list').append($load_more)
            }
        }
    }

    _this.append_page_to_result_view = function () {
        $('.list .load-more').remove()
        _this.model.page_nr = _this.model.page_nr + 1
        var offset = _this.model.page_nr * NOTES_LIMIT
        console.log("Appending page " + _this.model.page_nr + " to current result_set, offset is " + offset)
        _this.show_progress_bar()
        var resources = _this.emc.loadSomeResources(NOTES_LIMIT, offset, true) // true == append
        _this.add_to_resultlist_view(resources)
        _this.hide_progress_bar()
    }

    this.render_toolbar = function () {

        _this.render_user_info()

        if (current_view == DETAIL_VIEW ||
            current_view == PERSONAL_TIMELINE) {
            var $homeButton = undefined
                //
                $homeButton = $('<a class="home-menu-button btn" title="Zur&uuml;ck zur Timeline-Ansicht">Timeline</a>')
                $homeButton.click(function (e) {
                    _this.prepare_index_page(true, true)
                    _this.pushTimelineViewState()
                })
            $('#menu').append($homeButton)
        } else {
            $('#menu .home-menu-button').remove()
        }
    }

    this.render_tag_filter_info = function () {
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
                    // ### find better solution than to reald if this was the last tag in our filter
                    if (_this.model.getTagFilter().length == 0) {
                        _this.model.setAvailableResources([]) // this forces a re-initialization of main-timeline
                    }
                    _this.prepare_index_page(true, true)
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
                // ### find better solution than to reset allAvailableResources
                // cause: if application is initialized with a tagged timeline
                //        allAvailableResources are very limited, thus we need to reset it to fetch at least latest 15
                _this.model.setAvailableResources([]) // this forces a re-initialization of main-timeline
                _this.prepare_index_page(true, true)
                _this.pushTimelineViewState()
            })
        $('.tag-filter-info').html($filterMeta).append($clearButton).append($filterButtons)
        return null
    }

    this.render_tag_items = function (parent_selector) {
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
        // ### $('.eduzen #nav.info').show()
        $('.tag-cloud-header').html('Filter Beitr&auml;ge nach Tags')
        // render tag ui/dialog
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
            render_tag_buttons($tagview, tagsToShow)
        } else {
            // clean up ui/dialog
            $(parent_selector + ' .info div.tag-list a').remove()
            $(parent_selector + ' .info div.tag-list').hide()
        }

    }

    this.render_tag_buttons = function ($parent, tags) {
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
                _this.prepare_index_page(true, true)
                // fixme: formerly here were just (optimal) view updates
                _this.pushTimelineViewState()

            })
            $parent.append($tag)
        }
        return null
    }



    /** --- GUI Helpers --- **/

    this.render_current_view = function () {
        if (current_view == DETAIL_VIEW) {
            _this.prepare_detail_page(_this.model.getCurrentResource().id);
        } else if (current_view == PERSONAL_TIMELINE) {
            var profile = _this.emc.getTopicById(_this.model.getCurrentProfileId())
            _this.prepare_profile_page(profile);
        } else if (current_view == FILTERED_TIMELINE ||
                   current_view == FULL_TIMELINE) {
            _this.prepare_index_page(false, false)
        }
    }

    this.show_timeline_elements = function (is_user_timeline) {
        $("div.content-area").hide()
        $("div#resources").show()
        $("div.sidebar").show()
        $("body.eduzen").removeClass("note")
        if (is_user_timeline) {
            $("body.eduzen").addClass("personal")
            $("div#profile").show()
            $('.eduzen #nav.info').hide()
        } else {
            $("body.eduzen").removeClass("personal")
            $("div#profile").hide()
            $('.eduzen #nav.info').show()
        }
    }

    this.show_detail_elements = function () {
        $("body.eduzen").addClass("note")
        $("body.eduzen").removeClass("personal")
        $("div#resources").hide()
        $("div.sidebar").hide()
        $("div#profile").hide()
        $('.eduzen #nav.info').hide()
        $("div.content-area").show()
    }

    this.show_progress_bar = function () {
        var $progressbar = $( "#progressbar" ).progressbar( "widget" );
            $progressbar.progressbar( "enable" );
            $progressbar.show()
            $progressbar.progressbar({value: 10, max: 100});
    }

    this.hide_progress_bar = function () {
        var $progressbar = $('#progressbar')
            $progressbar.progressbar({value: 100});
            $progressbar.progressbar( "disable" );
            $progressbar.hide()
    }

    this.create_login_view = function() {
        $('div.login-menu').remove()
        $('a.login-menu-button').remove()
        var $loginMenu = $('<div class="login-menu">')
        var $username = $('<input type="text" placeholder="Username">')
            $username.addClass('username-input')
        var $secret = $('<input type="password" placeholder="Password">')
            $secret.addClass('secret')
            $secret.keyup(function (event) {
                if (event.keyCode === $.ui.keyCode.ENTER) check_authorization()
                return function (e) {}
            })
        var $button = $('<input type="button" class="btn login" value="Login">')
            $button.click(check_authorization)
        var $menuToggle = $('<a class="login-menu-button btn" href="#login">Login</a>')
            $menuToggle.click(function (e) {
                $('div.login-menu').toggle()
                $menuToggle.toggleClass('pressed')
            })
        $loginMenu.append($username).append($secret).append($button)
            .append('<span class="message">'
                + '<a href="http://www.eduzen.tu-berlin.de/zur-notizen-webanwendung#account">Account?</a>'
                + '</span>')
        $menuToggle.insertBefore('div.pages')
        $loginMenu.insertBefore('div.pages')
        $('.about-login').html('Um Beitr&auml;ge zu verfassen musst du eingeloggt sein.</div>')

        function check_authorization (id, secret) {

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
                _this.render_current_view()
                response = _this.checkLoggedInUser()
            }).fail(function(e) {
                $('div.login-menu .message').addClass("failed")
                $('div.login-menu .message').text('Nutzername oder Passwort ist falsch.')
                // _this.notify_browser("The application could not initiate a working session for you.", 403, TIMELINE)
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

    this.load_resources = function (pageNr) {
        if (_this.model.getTagFilter().length > 1) {            // for more than 1 tag
            _this.emc.loadAllResourcesByTags({tags: _this.model.getTagFilter()})
            current_view = FILTERED_TIMELINE
        } else if (_this.model.getTagFilter().length == 1) {    // for exactly 1 tag
            var selectedTag = _this.model.getTagFilter()[0]
            _this.emc.loadAllResourcesByTagId(selectedTag.id)
            current_view = FILTERED_TIMELINE
        } else {
            // load first page of resources (but just if no resources are avaiable..)
            if (_this.model.getAvailableResources().length <= 1) { // 1 it is if initial view was a (saved) detail-view
                _this.emc.loadSomeResources(NOTES_LIMIT, 0, false) // false == append
            }
            current_view = FULL_TIMELINE
        }
    }

    this.load_contributions = function (userId) {
        // load contributed resources (but just if no resources are avaiable..) for this user
        if (_this.model.getProfileResources().length == 0 ||
            _this.model.getProfileResourcesId() != userId) {
            _this.emc.loadAllContributions(userId)
        }
    }

    /** --- Page Model Helpers ---**/

    this.sort_available_resources = function () {
        if (_this.model.isSortedByScore) {
            _this.model.getAvailableResources().sort(_this.score_sort_asc)
        } else {
            _this.model.getAvailableResources().sort(_this.created_at_sort_asc)
        }
    }

    this.sort_contributed_resources = function () {
        if (_this.model.isSortedByScore) {
            _this.model.getProfileResources().sort(_this.score_sort_asc)
        } else {
            _this.model.getProfileResources().sort(_this.created_at_sort_asc)
        }
    }

    this.sort_current_tags = function () {
        _this.model.getAvailableTags().sort(_this.name_sort_asc)
    }

    /** @see 1. done of LOGIN, 2. to see if Resource is locked by current username */
    this.checkLoggedInUser = function () {
        var loggedIn = _this.emc.getCurrentUser() // gets current username ?
        if (loggedIn !== "") {
            return loggedIn
        }
        return null
    }

    /** checks if user is logged in and (if so) sets username of logged in user to*/
    this.is_logged_in = function () {
        var loggedIn = _this.emc.getCurrentUser()
        return (loggedIn !== "") ? true : false
    }

    this.setDefaultWorkspaceCookie = function () {
        var workspaceTopic = dmc.get_topic_by_value("uri", "de.workspaces.deepamehta")
        js.set_cookie("dm4_workspace_id", workspaceTopic.id)
    }

    /** fixme: why do we need a username based account model? */
    this.getLoggedInUserTopic = function () {
        return _this.emc.getCurrentUserTopic()
    }

    this.render_user_info = function () {

        var $username = $('.username')
        if (!_this.is_logged_in()) {

            $username.text('Willkommen')

            // ..) hide input view
            $('li#input div.header').hide()
            $('.log-in-message').show()
            $('.eduzen.notes').addClass('guest')
            $('.eduzen .content-area input.submit.btn').unbind('click')
            _this.create_login_view()

        } else {

            // ..) hide login view
            $('.eduzen.notes').removeClass('guest')
            $('.log-in-message').hide()
            $('div.login-menu').hide()
            $('a.login-menu-button').hide()
            $('li#input div.header').show()

            // create user-profile button for logged in user
            var user = _this.emc.getCurrentUserTopic()
            var $my = $('<a class="btn my" title="Zeige meine Beitr&auml;ge">' + user.value+ '</a>')
                $my.click(function (e) {
                    _this.prepare_profile_page(user, true, true)
                    _this.pushPersonalViewState(user)
                })
            // create logout button
            $username.html('Hi').append($my)
            var $logout = $('<a class="btn logout" title="Session beenden">Logout</a>')
                $logout.click(function (e) {
                    if (_this.emc.logout()) {
                        $("body").html("<div class=\"logout-message\">You're logged out now.<br/>"
                            + "<br/><a href=\"/\">Reload Application</a></div>")
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

    /** rneame: create_page_controls and move up? */
    this.setup_timeline_controls = function (on_profile) {

        // 1) setting up sort-controls and input button
        $(".onoffswitch-label").unbind('click')
        $(".onoffswitch-label").click(function (e) {
            // define click-handler
            if (_this.model.isSortedByScore) { // A) turn score-toggle OFF
                if (on_profile) {
                    _this.model.setProfileResources(getAlphabeticalContributions())
                } else {
                    _this.model.setAvailableResources(getAlphabeticalAvailable())
                }
                _this.model.isSortedByScore = false
            } else { // B) turn score-toggle ON
                if (on_profile) {
                    _this.model.setProfileResources(getHighestContributions())
                } else {
                    _this.model.setAvailableResources(getHighestAvailable())
                }
                _this.model.isSortedByScore = true
            }
            // 2) re-paint sorted result-list fixme: this is a partial, more efficient page-update hack
            _this.render_result_view(on_profile)
        })

    }

    this.add_to_resultlist_view = function (items) {
        var $resultlist = $('#resources .list')
        $.each(items, function (e, item) {
            var $topic = _this.create_result_item_view(item)
            $resultlist.append($topic)
        })
        _this.render_load_more_button()
        process_math_in_area("resources")
        quickfixPDFImageRendering() // hacketi hack
    }

    this.create_input_item_view = function () {
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

    this.create_result_item_view = function (item) {

        var $item_dom = $("li#" + item.id) // creates a new DOMElement
        return new NoteItemRenderer(item, _this).render($item_dom) // sets up new item in DOMElement
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

    this.setup_ckeditor = function (element_id) {
        if (CKEDITOR.instances.hasOwnProperty(element_id)) {
            CKEDITOR.instances[element_id].destroy()
        }
        // setup cK-Editor help
        $('.header a.help').click(function (e) {
            $('.header .help.info').toggle()
            $('.header .help.info').click(function (e) {
                $('.header .help.info').toggle()
            })
        })
        var $input = $('#'+element_id)
            $input.attr('contenteditable', true)
        // check if initialization was successfull
        if (!CKEDITOR.instances.hasOwnProperty(element_id)) { // initialize if not present
            CKEDITOR.inline( document.getElementById(element_id) )
            CKEDITOR.instances[element_id].selectionChange = function () {
                // all formula needs to get an edit-handle .. setup mathjax preview handling
                _this.process_math_in_area(element_id, true)
            }
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
        MathJax.Hub.Register.StartupHook("TeX Jax Ready", function () {
            _this.notify_browser("Die Mathe-TeX Umgebung wurde soeben geladen und kann jetzt benutzt werden.", OK)
        })
        MathJax.Hub.Configured() // bootstrap mathjax.js lib now
        MathJax.Hub.Typeset()
    }

    this.process_math_in_area = function (identifier, editable) {
        // typeset all elements containing TeX to SVG or HTML in designated area
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, identifier]);
        if (editable) {
            // registering selection-handler on all visible formulas
            $('div.math-output').unbind('click')
            $('div.math-output').unbind('dblclick')
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

    this.notify_browser = function (message, errorCode, area, css_class, time, callback) {
        (errorCode == OK) ? console.log(message) :  console.warn(message)
    }

    this.getHighestAvailable = function () {
        var results = _this.model.getAvailableResources()
        return results.sort(score_sort_asc)
    }

    this.getAlphabeticalAvailable = function () {
        var results = _this.model.getAvailableResources()
        return results.sort(created_at_sort_asc)
    }

    this.getHighestContributions = function () {
        var results = _this.model.getAvailableResources()
        return results.sort(score_sort_asc)
    }

    this.getAlphabeticalContributions = function () {
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
            _this.prepare_index_page(true, true)
        } else if (pop.state.name == FULL_TIMELINE) {
            // update app-model
            _this.model.setTagFilter([])
            _this.prepare_index_page(true, true)
        } else if (pop.state.name == PERSONAL_TIMELINE) {
            var userId = pop.state.data.userid
            var user = dmc.get_topic_by_id(userId, true)
            // fixme: re-set tagfilter..
            _this.model.setTagFilter([])
            _this.prepare_profile_page(user, true, true)
        } else if (pop.state.name == DETAIL_VIEW) {
            _this.prepare_detail_page(pop.state.data.id)
        } else {
            console.log("unknown view.. ")
            console.log(pop)
        }
    }

    this.pushTimelineViewState = function () {
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
        var creator = _this.emc.getFirstRelatedCreator(topicId)
            creator = _this.emc.getTopicById(creator.id)
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
        data = body.innerHTML
        MathJax.Hub.Typeset() // typeset ck-editor again
        return data
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
            resource = _this.emc.createResourceTopic(valueToSubmit, tagsToCreate) // ### use catch here
            if (resource != undefined) {
                // an creating/associtating tags with this resource
                /* createNewTagsForResource(resource, tagsToCreate) **/
                for (var k=0; k < tagsToReference.length; k++) {
                    if (tagsToReference[k] != undefined) {
                        var newAssoc = _this.emc.createResourceTagAssociation(resource, tagsToReference[k])
                        if (!newAssoc) console.warn("We could not create a Resource <-> Tag association ..")
                    }
                }
                // track "added resource" goal
                if (typeof piwikTracker !== 'undefined') piwikTracker.trackGoal(5)
                $('#add_resource').html("")
                $(TAGGING_FIELD_SELECTOR).val("")
                $('div.header').css("opacity", "1")
                // rendering notifications
                // _this.notify_browser("Note submitted.", OK,  UNDER_THE_TOP, '', 'fast')
            }
        } else {
            _this.notify_browser("Wir werden nur unfreiwillig inhaltsfreie Beitr&auml;ge speichern.",
                400, TIMELINE_AREA, '', 'slow')
        }
        // fixme: if we're adding a resource on our personal timeline, we currently return to the global one
        _this.prepare_index_page(false)
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
            var updated = _this.emc.updateResourceTopic(resource)
            if (updated != undefined) {
                // track "edited resource" goal
                if (typeof piwikTracker !== 'undefined') piwikTracker.trackGoal(1)
                _this.model.updateAvailableResource(resource)
                // destroy the CKEditor instance (if present)
                if (CKEDITOR.instances.hasOwnProperty('resource_input')) {
                    CKEDITOR.instances['resource_input'].destroy()
                }
                _this.prepare_detail_page(updated.id)
            } else {
                _this.notify_browser("Sorry! Wir konnten die Notiz nicht aktualisieren.", 500, UNDER_THE_TOP, '', 'fast')
            }
        } else {
            _this.notify_browser("Wir werden nur unfreiwillig inhaltsfreie Postings speichern.",
                400, UNDER_THE_TOP, '', 'slow')
        }
    }

    /** Main router to all views */

    this.page_route = function () {

        // parse requested location
        var pathname = window.location.pathname
        var attributes = pathname.split('/')
        var noteId = attributes[2]

        _this.registerHistoryStates()
        _this.setupMathJaxRenderer()
        _this.setDefaultWorkspaceCookie()

        // in any case
        _this.emc.loadAllTags()
        _this.sort_current_tags()
        // route to distinct views
        if (noteId === undefined || noteId === "") {

            _this.prepare_index_page(true, false) // load timeline with no filter set
            $(window).on('load', function(event) {_this.hide_progress_bar()});

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
            _this.prepare_index_page(true, false) // call timeline after filter was set.
            $(window).on('load', function(event) {_this.hide_progress_bar()});

        } else if (noteId === "user") {

            // 3) setup personal timeline view
            var userId = attributes[3]
            var user = dmc.get_topic_by_id(userId, true)
            _this.prepare_profile_page(user, true, false)
            $(window).on('load', function(event) {_this.hide_progress_bar()});

        } else {

            // 4) setup detail view
            _this.prepare_detail_page(noteId)
            // fixme: historyApi // _this.pushHistory("detailView", "Note Info: " + noteId, "/notes/" + noteId)

        }
    }

})(CKEDITOR, MathJax, jQuery, console, new RESTClient("/core"))
