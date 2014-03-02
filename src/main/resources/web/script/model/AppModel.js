function AppModel () {

    var instance = (function() {

        var availableTags = []
        var availableResources = []
        var profileResources = []
        var currentResource = undefined
        var currentUser = undefined
        var currentUserTopic = undefined
        var selectedFormula = undefined
        var profileResourcesId = undefined
        var userSubscriptions = undefined

        var tagFilter = []

        return {
            setCurrentUserName: function (username) {
                currentUser = username
            },
            getCurrentUserName: function () {
                return currentUser
            },
            setCurrentUserProfile: function (username) {
                currentUserTopic = username
            },
            getCurrentUserProfile: function () {
                return currentUserTopic
            },
            setAvailableTags: function (elements) {
                availableTags = elements
            },
            getAvailableTags: function () {
                return availableTags
            },
            setCurrentResource: function (resource) {
                currentResource = resource
            },
            getCurrentResource: function () {
                return currentResource
            },
            addToAvailableTags: function (tag) {
                return availableTags.push(tag)
            },
            setAvailableResources: function (elements) {
                availableResources = elements
            },
            getAvailableResources: function () {
                return availableResources
            },
            addToAvailableResources: function (resource) {
                return availableResources.push(resource)
            },
            updateAvailableResource: function (newItem) {
                for (var i=0; i < availableResources.length; i++) {
                    var oldItem = availableResources[i]
                    if (oldItem.id == newItem.id) {
                        availableResources[i] = newItem
                        return availableResources[i]
                        break
                    }
                }
                return undefined
            },
            setProfileResourcesId: function (profileId) {
                profileResourcesId = profileId
            },
            getProfileResourcesId: function () {
                return profileResourcesId
            },
            setProfileResources: function (elements) {
                profileResources = elements
            },
            getProfileResources: function () {
                return profileResources
            },
            setUserSubscriptions: function (subscriptions) {
                userSubscriptions = subscriptions
            },
            getUserSubscriptions: function () {
                return userSubscriptions
            },
            setUserNotifications: function (news) {
                userNotifications = news
            },
            getUserNotifications: function () {
                return userNotifications
            },
            addToProfileResources: function (resource) { // ### yet unused
                return profileResources.push(resource)
            },
            updateProfileResource: function (newItem) { // ### yet unused
                for (var i=0; i < profileResources.length; i++) {
                    var oldItem = profileResources[i]
                    if (oldItem.id == newItem.id) {
                        profileResources[i] = newItem
                        return profileResources[i]
                        break
                    }
                }
                return undefined
            },
            setSelectedFormula : function (math_container) {
                selectedFormula = math_container
            },
            getSelectedFormula: function () {
                return selectedFormula
            },
            associateTagWithAvailableResource: function (tag, resourceId) {
                for (var i=0; i < availableResources.length; i++) {
                    var oldItem = availableResources[i]
                    if (oldItem.id == resourceId) {
                        var resource = availableResources[i]
                        var existingTags = resource.composite[instance.TAGS_URI]
                        if (existingTags == undefined) {
                            resource.composite[instance.TAGS_URI] = [tag]
                        } else {
                            resource.composite[instance.TAGS_URI].push(tag)
                        }
                        return resource
                    }
                }
                return undefined
            },
            addTagToFilter: function (tag) {
                // fixme: add tag just to filter if not already present..
                // (though that doesnt change results of a tag-query, this case shall be catched before it triggers)
                tagFilter.push(tag)
            },
            removeTagFromFilter: function (givenTag) {
                var newTagFilter = []
                for (var i=0; i < tagFilter.length; i++) {
                    var tag = tagFilter[i]
                    if (tag.id != givenTag.id) newTagFilter.push(tag)
                }
                tagFilter = newTagFilter
            },
            setTagFilter: function (newTagFilter) {
                tagFilter = newTagFilter
            },
            getTagFilter: function () {
                return tagFilter
            },
            getTagFilterURI: function () {
                var filterURI = ""
                for (var i=0; i < tagFilter.length; i++) {
                    var tag = tagFilter[i]
                    if (i > 0) filterURI += "+"
                    filterURI += tag.value
                }
                return filterURI
            },
            getTagById: function(id) {
                for (var i=0; i < availableTags.length; i++) {
                    var el = availableTags[i]
                    if (el.id == id) {
                        return el
                    }
                }
                return undefined
            },
            getTagByName: function(name) {
                for (var i=0; i < availableTags.length; i++) {
                    var el = availableTags[i]
                    if (el.value === name) {
                        return el
                    }
                }
                return undefined
            },
            NOTES_URI: "org.deepamehta.resources.resource",
            NOTE_CONTENT_URI: "org.deepamehta.resources.content",
            NOTE_NAME_URI: "org.deepamehta.resources.name",
            NOTE_IS_PUBLISHED_URI: "org.deepamehta.resources.is_published",
            TAGS_URI: "dm4.tags.tag",
            TAG_LABEL_URI: "dm4.tags.label",
            TAG_DEFINITION_URI: "dm4.tags.definition",
            REVIEW_SCORE_URI: "org.deepamehta.reviews.score",
            isSortedByScore: false,
            page_nr: 0
        };
    })();

    AppModel = function () { // re-define the function for subsequent calls

        return instance
    }

    return AppModel() // call the new function

    // js singleton implementation credits go to http://stackoverflow.com/users/5445/cms
    // with http://stackoverflow.com/questions/1895635/javascript-singleton-question#1895669

}
