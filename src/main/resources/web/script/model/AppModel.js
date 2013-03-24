function AppModel() {

    var instance = (function() {

        var availableTags = undefined
        var availableResources = undefined
        var currentResource = undefined

        var isSortedByScore = undefined

        var tagFilter = []

        return {
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
                for (i=0; i < availableResources.length; i++) {
                    var oldItem = availableResources[i]
                    if (oldItem.id == newItem.id) {
                        availableResources[i] = newItem
                        return availableResources[i]
                        break
                    }
                }
                return undefined
            },
            associateTagWithAvailableResource: function (tag, resourceId) {
                for (i=0; i < availableResources.length; i++) {
                    var oldItem = availableResources[i]
                    if (oldItem.id == resourceId) {
                        var resource = availableResources[i]
                        var existingTags = resource.composite['dm4.tags.tag']
                        if (existingTags == undefined) {
                            resource.composite['dm4.tags.tag'] = tag
                        } else {
                            resource.composite['dm4.tags.tag'].push(tag)
                        }
                        return resource
                    }
                }
                return undefined
            },
            addTagToFilter: function (tag) {
                tagFilter.push(tag)
            },
            removeTagFromFilter: function (givenTag) {
                var newTagFilter = []
                for (i=0; i <= tagFilter.length; i++) {
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
            getTagById: function(id) {
                for (i=0; i < availableTags.length; i++) {
                    var el = availableTags[i]
                    if (el.id == id) {
                        return el
                    }
                }
                return undefined
            }
        };
    })();

    AppModel = function () { // re-define the function for subsequent calls
        instance.isSortedByScore = false
        return instance
    }

    return AppModel() // call the new function

    // js singleton implementation credits go to http://stackoverflow.com/users/5445/cms
    // with http://stackoverflow.com/questions/1895635/javascript-singleton-question#1895669

}