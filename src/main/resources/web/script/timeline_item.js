
// Define List Item Renderer Interface
// Note: Every action declared in the class gets executed at the time of instantiation.
function TimelineItemRenderer () {}

TimelineItemRenderer.prototype.create = function ($parent) {
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

    var model = object
    var controler = router

    this.click = click_handler

    this.create = function($parent) {
        console.log("Rendering Moodle Timeline Item ..")
        console.log(this.model)
    }

}

// Implement List Item Renderer
function NoteItemRenderer (object, router, click_handler) {

    var TAG_URI = "dm4.tags.tag" // fixme: doublings
    var REVIEW_SCORE_URI = "org.deepamehta.reviews.score" // fixme: doublings
    var CREATED_AT_URI = "org.deepamehta.resources.created_at" // fixme: doublings
    var NOTE_CONTENT_URI = "org.deepamehta.resources.content" // fixme: doublings

    var model = object
    var controler = router

    this.click = click_handler

    this.create = function($parent) {

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
        //
        if (creator.composite.hasOwnProperty('org.deepamehta.identity.display_name')) {
            display_name = creator.composite['org.deepamehta.identity.display_name'].value
        }
        var creator_name = (creator == null) ? "Anonymous" : display_name
        var $creator_link = $('<a id="user-' +creator.id+ '" title="Zeige '+creator_name+'s Timeline" class="profile btn"></a>')
            $creator_link.text(creator_name)
            $creator_link.click(function(e) {
                controler.initPersonalTimeline(creator, true, true)
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
                        var existingTags = model.composite[TAG_URI]
                        var tagsToAssociate = getTagTopicsToReference(qualifiedTags)
                        var tagsToPossiblyCreate = getTagTopicsToCreate(qualifiedTags, tagsToAssociate)
                        var tagsToCreateAndAssociate = getTagTopicsToCreate(tagsToPossiblyCreate, existingTags)
                        emc.createResourceTagAssociations(model, tagsToAssociate)
                        emc.createNewTagsForResource(model, tagsToCreateAndAssociate)
                        // track "added tag"-goal
                        if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(4)
                        // re-render both views
                        renderTagView('div.sidebar')
                        setupResultListItem(model)
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
        var $edit = $('<a class="edit-item btn" href="javascript:void(0)"'
            + ' title="Öffne Detailansicht dieser Notiz">zur Detailansicht dieses Beitrags</a>.')
            $edit.click(function(e) {
                console.log("Show details for this item (" + model.id + ")")
                controler.initDetailView(model.id)
                controler.pushDetailViewState(model)
            })
        // score info area
        var $votes = $('<div class="votes">Bewerte diesen Inhalt </div>')
        var $upvote = $('<a id="' +model.id+ '" class="btn vote">+</a>') // we have an id triple in this "component"
            $upvote.click(function (e) {
                var updatedTopic = controler.dmc.request("GET", "/review/upvote/" + e.target.id)
                controler.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(3)
                // todo: update our result-set view immedieatly after upvoting
                setupResultListItem(updatedTopic)
            })
        var $downvote = $('oder <a id="' +model.id+ '" class="btn vote">-</a>') // id triple in this "component"
            $downvote.click(function (e) {
                var updatedTopic = controler.dmc.request("GET", "/review/downvote/" + e.target.id)
                controler.model.updateAvailableResource(updatedTopic)
                // track "voted resource" goal
                if (typeof controler.piwikTracker !== 'undefined') controler.piwikTracker.trackGoal(3)
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

}
