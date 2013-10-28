function EMC (dmc, model) {

    var _this = this
        _this.model = model

    var TAG_URI = "dm4.tags.tag" // fixme: doublings
    var NOTES_URI = "org.deepamehta.resources.resource" // fixme: doublings

    /** RESTful utility methods for the trt-views **/

    this.loadAllResources = function () { // lazy, unsorted, possibly limited
        //
        var all_resources = dmc.get_topics(NOTES_URI, true, true, 0).items
        if (all_resources.length > 0) {
            _this.model.setAvailableResources(all_resources)
        } else {
            _this.model.setAvailableResources([])
        }
    }

    this.loadSomeResources = function (size, offset, append) { // lazy, unsorted, possibly limited
        //
        // var all_resources = dmc.get_topics(NOTES_URI, true, true, limit).items
        var some_resources = dmc.request('GET', '/notes/fetch/' + size + '/' + offset)
        if (some_resources.length > 0) {
            if (append) {
                for (var resource in some_resources) {
                    _this.model.addToAvailableResources(some_resources[resource])
                }
            } else {
                _this.model.setAvailableResources(some_resources)
            }
        } else {
            _this.model.setAvailableResources([])
        }
        return some_resources
    }

    this.loadAllContributions = function (userId) { // lazy, unsorted, possibly limited
        //
        var all_contributions = dmc.request("GET", "/notes/fetch/contributions/" + userId)
        if (all_contributions.length > 0) {
            _this.model.setAvailableResources(all_contributions)
        } else {
            _this.model.setAvailableResources([])
        }
    }

    this.loadResourceById = function (id) { // lazy, unsorted, possibly limited
        //
        var resource = dmc.get_topic_by_id(id, true)
        if (resource != undefined) {
            _this.model.setCurrentResource(resource)
        } else {
            throw new Error("Something mad happend while loading resource.")
        }
    }

    this.loadAllResourcesByTagId = function (tagId) { // lazy, unsorted, possibly limited
        //
        var all_tagged_resources = dmc.request("GET", "/tag/" +tagId+ "/" +NOTES_URI+ "/").items
        if (all_tagged_resources.length > 0) {
            // overriding previously set resultlist
            _this.model.setAvailableResources(all_tagged_resources)
        } else {
            _this.model.setAvailableResources([])
        }
    }

    this.loadAllResourcesByTags = function (tagList) { // lazy, unsorted, possibly limited
        //
        var all_tagged_resources = dmc.request("POST",
            "/tag/by_many/org.deepamehta.resources.resource", tagList).items
        if (all_tagged_resources != undefined) {
            if (all_tagged_resources.length > 0) {
                // overriding previously set resultlist
                _this.model.setAvailableResources(all_tagged_resources)
            } else {
                _this.model.setAvailableResources([])
            }
        } else {
            console.log(all_tagged_resources)
        }
    }

    this.loadAllTags = function (limit) { // lazy, unsorted, possibly limited
        //
        var all_tags = dmc.get_topics(TAG_URI, false, false, limit).items
        if (all_tags.length > 0) {
            _this.model.setAvailableTags(all_tags)
        } else {
            _this.model.setAvailableTags([])
        }
    }

    this.createResourceTopic = function(value, tagsToCreate) {

        if (value != undefined) {
            // FIXME: doubled URIs in code find out how to use variables as keys in a declarative object construction
            // TODO: initializ aggregated license properly on each new resource
            var topicModel = {
                "type_uri": "org.deepamehta.resources.resource",
                "composite": {
                    "org.deepamehta.resources.name": "",
                    "org.deepamehta.resources.content": value,
                    "dm4.tags.tag": [], // aggregated composite cannot be created (?)
                    "org.deepamehta.reviews.score": 0
                }
            }
            // create resource directly with all aggregated composite tags
            for (var t=0; t < tagsToCreate.length; t++) {
                topicModel.composite["dm4.tags.tag"].push({
                    "dm4.tags.label": tagsToCreate[t],
                    "dm4.tags.definition": ""
                })
            }
            // var resourceTopic = dmc.create_topic(topicModel)
            var resourceTopic = dmc.request("POST", "/notes/resource/create", topicModel)
            if (resourceTopic == undefined) throw new Error("Something mad happened.")
            var updated = model.addToAvailableResources(resourceTopic)
            // dont forget to add our new tags to the client-side AppModel
            var new_tags = resourceTopic.composite['dm4.tags.tag']
            if (typeof new_tags !== 'undefined') {
                for (var t=0; t < new_tags.length; t++) {
                    var new_tag = new_tags[t]
                    _this.model.addToAvailableTags(new_tag)
                }
            }
            if (updated == undefined) {
                throw new Error("Something mad happened while updating client side application cache.")
            }
            return resourceTopic
        }
        return undefined

    }

    this.updateTopic = function (topic) {
        return dmc.update_topic(topic)
    }

    this.getTopicById = function (topicId) {
        return dmc.get_topic_by_id(topicId, true)
    }

    this.updateResourceTopic = function(resource) {
        var resourceTopic = dmc.request("POST", "/notes/resource/update", resource)
        if (resourceTopic == undefined) throw new Error("Something mad happened.")
        var updated = model.addToAvailableResources(resourceTopic)
        if (updated == undefined) {
            throw new Error("Something mad happened while updating client side application cache.")
        }
        return resourceTopic
    }

    this.createNewTagsForResource = function (resource, tagsToCreate) {
        // creating new tags and associtating these with the given resource
        for (var i=0; i < tagsToCreate.length; i++) {
            var newTag = _this.createTagTopic(tagsToCreate[i])
            if (newTag != undefined) {
                var assoc = _this.createResourceTagAssociation(resource, newTag)
                if (assoc == undefined) {
                    throw new Error("Something mad happened while creating resource tag association.")
                }
            }
        }
    }

    // note: aggregated composites should be updated in an update call of resource (if assoc is part of the model)
    this.createResourceTagAssociations = function (resource, tagsToReference) {
        for (var k=0; k < tagsToReference.length; k++) {
            if (tagsToReference[k] != undefined) {
                var newAssoc = _this.createResourceTagAssociation(resource, tagsToReference[k])
            }
        }
    }

    this.createTagTopic = function (name) {
        if (name != undefined) {
            var topicModel = {
                "type_uri": "dm4.tags.tag",
                "composite": {
                    "dm4.tags.label": name,
                    "dm4.tags.definition": ""
                }
            }
            var tagTopic = dmc.create_topic(topicModel)
            if (tagTopic == undefined) throw new Error("Something mad happened.")
            var updated = model.addToAvailableTags(tagTopic)
            if (updated == undefined) {
                throw new Error("Something mad happened while updating client side application cache.")
            }
            return tagTopic;
        }
        return undefined
    }

    /** fixme: introduce a check if resource-tag assocation is not already existing */
    this.createResourceTagAssociation = function (resourceTopic, tagTopic) {
        if (resourceTopic != undefined && tagTopic != undefined) {
            if (!_this.associationExists(resourceTopic.id, tagTopic.id, "dm4.core.aggregation")) {
                var assocModel = {"type_uri": "dm4.core.aggregation",
                    "role_1":{"topic_id":resourceTopic.id, "role_type_uri":"dm4.core.parent"},
                    "role_2":{"topic_id":tagTopic.id, "role_type_uri":"dm4.core.child"}
                }
                // console.log("associating resource with tag in dB " + tagTopic.value)
                var association = dmc.create_association(assocModel)
                // console.log(association)
                if (association == undefined) throw new Error("Something mad happened.")
                // update also the value on client side
                // console.log("updating resource about tag on client-side..")
                var client_updated = model.associateTagWithAvailableResource(tagTopic, resourceTopic.id)
                if (client_updated == undefined) {
                    throw new Error("Something mad happened while updating client side application cache.")
                }
                return association;
            } else {
                console.log("INFO: skipping creation of yet another assocation between tag and resource")
            }
        }
        return undefined
    }

    this.createProfilePictureAssociation = function (account, pictureId) {
         if (account != undefined && pictureId != undefined) {
            if (!_this.associationExists(account.id, pictureId, "org.deepamehta.identity.profile_picture_edge")) {
                var assocModel = {"type_uri": "org.deepamehta.identity.profile_picture_edge",
                    "role_1":{"topic_id":account.id, "role_type_uri":"dm4.core.default"},
                    "role_2":{"topic_id":pictureId, "role_type_uri":"dm4.core.default"}
                }
                // console.log("associating resource with tag in dB " + tagTopic.value)
                var association = dmc.create_association(assocModel)
                // console.log(association)
                if (association == undefined) throw new Error("Something mad happened.")
                return association;
            } else {
                console.log("INFO: skipping creation of yet another assocation between tag and resource")
            }
        }
        return undefined
    }

    this.getFirstRelatedCreator = function(topicId) {
        var filter = {
            "assoc_type_uri" : "org.deepamehta.resources.creator_edge",
            "others_topic_type_uri" : "dm4.accesscontrol.user_account"
        }
        var creator = dmc.get_topic_related_topics(topicId, filter)
        return (creator.items.length > 0) ? creator.items[0] : null
    }

    this.getAllContributor = function (topicId) {
        var filter = {
            "assoc_type_uri" : "org.deepamehta.resources.contributor_edge",
            "others_topic_type_uri" : "dm4.accesscontrol.user_account"
        }
        var contributor = dmc.get_topic_related_topics(topicId, filter)
        return (contributor.items.length > 0) ? contributor.items : null
    }

    this.getCurrentUserTopic = function () {
        if (typeof _this.getCurrentUser() === 'undefined') throw Error("Not logged in.")
        var userTopic = dmc.get_topic_by_value("dm4.accesscontrol.user_account", _this.username)
        return userTopic
    }

    this.associationExists = function (topicOne, topicTwo, assocType) {
        var assocs = dmc.get_associations(topicOne, topicTwo, assocType)
        return (assocs.length == 0) ? false :  true
    }

    this.getFirstAssociation = function (topicOne, topicTwo, assocType) {
        var assocs = dmc.get_associations(topicOne, topicTwo, assocType)
        return (assocs.length == 0) ? false : assocs[0]
    }

    this.getFirstRelatedTopic = function (id, edge_type, topic_type) {
        var filter = {
            "assoc_type_uri" : edge_type,
            "others_topic_type_uri" : topic_type
        }
        var related = dmc.get_topic_related_topics(id, filter)
        return (related.items.length > 0) ? related.items[0] : null
    }

    this.deleteAssociation = function (associationId) {
        return dmc.delete_association(associationId)
    }

    this.getCurrentUser = function () {
        if (_this.username == undefined || _this.username == "") {
            _this.username = dmc.request("GET", "/accesscontrol/user", undefined, undefined, undefined, "text")
            if (_this.username == null) return ""
        }
        return _this.username
    }

    this.logout = function () {
        var loggedOut = false
        if (_this.username != undefined || _this.username != "") {
            try {
                var logoutRequest = dmc.request("POST", "/accesscontrol/logout", undefined, undefined, undefined, "text")
                if (logoutRequest === "") loggedOut = true
                _this.username = undefined
            } catch (e) {
                throw new Error("Sorry, we could not invalidate your session.")
            }
        }
        return loggedOut
    }

}
