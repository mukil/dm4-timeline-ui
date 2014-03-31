
/**
 * @author Malte Reißig <malte.reissig@tu-berlin.de>
 * @website https://github.com/mukil/org.deepamehta-tagging-resources
 * @license GPL Version 3.0
 * @version 0.2.4-SNAPSHOT
 */

// Define List Item Renderer Interface
// Note: Every action declared in the class gets executed at the time of instantiation.
function TimelineItemRenderer () {}

TimelineItemRenderer.prototype.render = function ($parent) {
    console.log("Creating TimelineItem ..")
    console.log($parent)
}

TimelineItemRenderer.prototype.debug_model = function () {
    console.log(this.model)
}

TimelineItemRenderer.prototype.click = function()  {
    console.log("TimelineItemRenderer received command _showDetailView")
}

// Implement List Item Renderer
function MoodleItemRenderer (object, router, click_handler) {

    var REVIEW_SCORE_URI = "org.deepamehta.reviews.score"
    var MOODLE_MODIFIED_URI = "org.deepamehta.moodle.item_modified"
    var MOODLE_ICON_URI = "org.deepamehta.moodle.item_icon"
    var MOODLE_ITEM_REMOTE_URL_URI = "org.deepamehta.moodle.item_url";
    var MOODLE_ITEM_DESC_URI = "org.deepamehta.moodle.item_description";
    var MOODLE_ITEM_HREF_URI = "org.deepamehta.moodle.item_href";

    var TAG_URI = "dm4.tags.tag"

    var model = object
    var controler = router
    var _this = this

    this.click = click_handler

    this.render = function($parent) {

        /**
         * -- Moodle Item Renderer ---
         *
         * * PDFs' Direct Download Link (via Moodle Security Key)
         * * Youtube Watch Feature is there experimentally (hacked)
         *
         **/

        var $moodle_item = $parent
        if ($moodle_item.length <= 0) $moodle_item = $('<li id="' +model.id+ '" class="moodle-item">') // create the new gui-"component"
        // prepare value for view
        var score = (model.composite[REVIEW_SCORE_URI] != undefined) ? model.composite[REVIEW_SCORE_URI].value : 0
        var icon_url = model.composite[MOODLE_ICON_URI].value
        var date_name = (model.composite.hasOwnProperty(MOODLE_MODIFIED_URI)) ? new Date(parseInt(model.composite[MOODLE_MODIFIED_URI].value)) : 0
        var tags = (model.composite[TAG_URI] != undefined) ? model.composite[TAG_URI] : []
        var remote_url = (model.composite[MOODLE_ITEM_REMOTE_URL_URI] != undefined) ? model.composite[MOODLE_ITEM_REMOTE_URL_URI].value : ""
        var description = (model.composite[MOODLE_ITEM_DESC_URI] != undefined) ? model.composite[MOODLE_ITEM_DESC_URI].value : ""
        var href = (model.composite[MOODLE_ITEM_HREF_URI] != undefined) ? model.composite[MOODLE_ITEM_HREF_URI].value : ""
        // create item elements
        var tagInfo = ""
        if (tags.length > 0) {
            tagInfo = '<span>Tags: '
            var commaCounter = 0
            for (var ri=0; ri < tags.length; ri++) {
                tagInfo += '<i class="tag">' +tags[ri].value+ '</i>'
                commaCounter++
                (commaCounter < tags.length) ? tagInfo += ', ' : tagInfo += '&nbsp;&nbsp;&nbsp;'
            }
            tagInfo += '</span>'
        }
        var headline = ""
        if (date_name != 0) {
            headline = tagInfo + 'Bewertung: <span class="score-info">' + score + '</span><span class="creation-date">'
                + 'Zuletzt geändert am ' + date_name.getDate() + '.'
                + controler.dict.monthNames[date_name.getMonth()] + ' ' + date_name.getFullYear() + ' um '
                + date_name.getHours() + ':' + date_name.getMinutes() + ' Uhr</span>'
        } else {
            headline = tagInfo + 'Bewertung: <span class="score-info">' + score + '</span><span class="creation-date">'
                + 'Zuletzt geändert ist unbekannt</span>'
        }
        // tag info area
        // item-area
        var $icon = $('<img src="' +icon_url+ '">')
        var $body = $('<div class="item-content">')
            $body.append($icon).append(model.value)
            if (description != "") $body.append("<br/><small>"+description+"</small>")
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
                $addTag.addClass("selected")
                $addDialog.empty()
                // construct new dialog
                var $newField = $('<input type="text" placeholder="..." '
                    + 'class="new-tag ui-autocomplete"></input>')
                var $saveBtn = $('<a class="btn save-tag">Speichern</a>')
                    $saveBtn.click(function () {
                        // save tags, if not yet associated to this resource
                        var tagFieldId = 'li#' +clickedListItem+ ' .toolbar div.add-tag-dialog input.new-tag'
                        var qualifiedTags = controler.get_entered_tags(tagFieldId)
                        var existingTags = model.composite[TAG_URI]
                        var tagsToAssociate = getTagTopicsToReference(qualifiedTags)
                        var tagsToPossiblyCreate = getTagTopicsToCreate(qualifiedTags, tagsToAssociate)
                        var tagsToCreateAndAssociate = getTagTopicsToCreate(tagsToPossiblyCreate, existingTags)
                        controler.emc.createResourceTagAssociations(model, tagsToAssociate)
                        controler.emc.createNewTagsForResource(model, tagsToCreateAndAssociate)
                        // track "added tag"-goal
                        if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(4)
                        _this.render($moodle_item)
                        // re-render tag-view
                        controler.sort_current_tags()
                        controler.render_tag_items('div.sidebar')
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
                //
                controler.setup_tag_completion('li#' +clickedListItem+ ' .toolbar div.add-tag-dialog input.new-tag')
                //
                $addDialog.show("slow")
            })
            // ### maybe introduce a second, slightly bigger button to go to detail-view
            // ### maybe retreive security key, if user is not logged into isis 2 ATM
        var $edit = ""
        if (remote_url.indexOf("youtube") != -1) {
            $edit = $('<a class="edit-item btn" title="Video anschauen">Watch</a>.')
            $edit.click(function(e) {
                    var $content_area = $('li#' + model.id + ' .item-content')
                    if ($('#youtube-' + model.id).length <= 0) {
                        $content_area.append('<p><iframe id="youtube-'+model.id+'" src="'+remote_url+'" '
                            + 'height="460" width="640" frameBorder="0"></iframe></p>')
                    }
            })
        } else {
            $edit = $('<a class="edit-item btn" href="' +href+ '" title="ISIS Material abrufen">View / Download</a>.')
        }

        // score info area
        var $votes = $('<div class="votes">Bewerte diesen ISIS-Inhalt </div>')
        var $upvote = $('<a id="' +model.id+ '" class="btn vote">+</a>') // we have an id triple in this "component"
            $upvote.click(function (e) {
                var updatedTopic = controler.dmc.request("GET", "/review/upvote/" + e.target.id)
                controler.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(3)
                model = updatedTopic
                _this.render($moodle_item)
            })
        var $downvote = $('oder <a id="' +model.id+ '" class="btn vote">-</a>') // id triple in this "component"
            $downvote.click(function (e) {
                var updatedTopic = controler.dmc.request("GET", "/review/downvote/" + e.target.id)
                controler.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(3)
                model = updatedTopic
                _this.render($moodle_item)
            })
        // finally append votebar, tagbar and body to list-item
        $votes.append($upvote).append($downvote)
        // bottom area, tag and score info area
        var $toolbar = $('<div class="toolbar">')
        $toolbar.append(' f&uuml;ge').append($addTag)
        // $oolbar.append(" oder gehe ")
        $toolbar.append($edit)
        $moodle_item.html($votes).append($toolbar).append($body).append(headline)
        return $moodle_item

    }

}

// Implement List Item Renderer
function NoteItemRenderer (object, router, click_handler) {

    var TAG_URI = "dm4.tags.tag" // fixme: doublings
    var REVIEW_SCORE_URI = "org.deepamehta.reviews.score" // fixme: doublings
    var CREATED_AT_URI = "dm4.time.created" // fixme: doublings
    var NOTE_CONTENT_URI = "org.deepamehta.resources.content" // fixme: doublings

    var model = object
    var controler = router
    var _this = this

    this.click = click_handler

    this.render = function($parent) {

        // prepare view model
        var title = (model.composite[CREATED_AT_URI] != undefined) ? new Date(parseInt(model.composite[CREATED_AT_URI].value)) : new Date()
        var content = (model.composite[NOTE_CONTENT_URI] != undefined) ? model.composite[NOTE_CONTENT_URI].value : ""
        var score = (model.composite[REVIEW_SCORE_URI] != undefined) ? model.composite[REVIEW_SCORE_URI].value : 0
        var tags = (model.composite[TAG_URI] != undefined) ? model.composite[TAG_URI] : []
        // setup (the to be returned) item dom
        var $topic = $parent
        if ($topic.length <= 0) $topic = $('<li id="' +model.id+ '">') // create the new gui-"component"
        var creator = controler.getAccountTopic(model)
        var display_name = creator.value
        if (creator.composite.hasOwnProperty('org.deepamehta.identity.display_name')) {
            display_name = creator.composite['org.deepamehta.identity.display_name'].value
        }
        var creator_name = (creator == null) ? "Anonymous" : display_name
        var $creator_link = $('<a id="user-' +creator.id+ '" title="Zeige '+creator_name+'s Timeline" class="profile btn"></a>')
            $creator_link.text(creator_name)
            $creator_link.click(function(e) {
                controler.prepare_profile_page(creator, true, true)
                controler.pushPersonalViewState(creator)
            })
        //
        var headline = 'Bewertung: <span class="score-info">' + score + '</span><span class="creation-date">Erstellt am ' + title.getDate() + '.'
                + controler.dict.monthNames[title.getMonth()] + ' ' + title.getFullYear() + ' um ' + title.getHours() + ':'
                + title.getMinutes() + ' Uhr</span>'
        var $body = $('<div class="item-content">' + content + '</div>');
        // bottom area, tag and score info area
        var $toolbar = $('<div class="toolbar"></div>')
        // tag info area
        var $tagInfo = $('<span>Tags: </span>')
            render_tag_info($tagInfo, tags)
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
                        var qualifiedTags = controler.get_entered_tags(tagFieldId)
                        var existingTags = model.composite[TAG_URI]
                        var tagsToAssociate = getTagTopicsToReference(qualifiedTags)
                        var tagsToPossiblyCreate = getTagTopicsToCreate(qualifiedTags, tagsToAssociate)
                        var tagsToCreateAndAssociate = getTagTopicsToCreate(tagsToPossiblyCreate, existingTags)
                        //
                        controler.emc.createResourceTagAssociations(model, tagsToAssociate)
                        controler.emc.createNewTagsForResource(model, tagsToCreateAndAssociate)
                        // track "added tag"-goal
                        if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(4)
                        _this.render($topic)
                        // re-render tag-view
                        controler.sort_current_tags()
                        controler.render_tag_items('div.sidebar')
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
                //
                controler.setup_tag_completion('li#' +clickedListItem+ ' .toolbar div.add-tag-dialog input.new-tag')
                //
                $addDialog.show("slow")
            })
            // ### maybe introduce a second, slightly bigger button to go to detail-view
        var $edit = $('<a class="edit-item btn" href="javascript:void(0)"'
            + ' title="Öffne Detailansicht dieser Notiz">zur Detailansicht dieses Beitrags</a>.')
            $edit.click(function(e) {
                controler.prepare_detail_page(model.id)
                controler.pushDetailViewState(model)
            })
        // score info area
        var $votes = $('<div class="votes">Bewerte diesen Beitrag </div>')
        var $upvote = $('<a id="' +model.id+ '" class="btn vote">+</a>') // we have an id triple in this "component"
            $upvote.click(function (e) {
                var updatedTopic = controler.dmc.request("GET", "/review/upvote/" + e.target.id)
                controler.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(3)
                model = updatedTopic
                _this.render($topic)
            })
        var $downvote = $('oder <a id="' +model.id+ '" class="btn vote">-</a>') // id triple in this "component"
            $downvote.click(function (e) {
                var updatedTopic = controler.dmc.request("GET", "/review/downvote/" + e.target.id)
                controler.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(3)
                model = updatedTopic
                _this.render($topic)
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

            function render_tag_info($tagInfoArea, givenTags) {
                var commaCounter = 0
                for (var ri=0; ri < givenTags.length; ri++) {
                    // use tag icon..
                    $tagInfoArea.append('<i class="tag">' +givenTags[ri].value+ '</i>')
                    commaCounter++
                    (commaCounter < givenTags.length) ? $tagInfoArea.append(', ') : $tagInfoArea.append('&nbsp;&nbsp;&nbsp;')
                }
            }

    }

}
