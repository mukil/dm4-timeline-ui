
/**
 * @author Malte Reißig <malte.reissig@tu-berlin.de>
 * @website https://github.com/mukil/org.deepamehta-tagging-resources
 * @license GPL Version 3.0
 * @version 0.2.4-SNAPSHOT
 */

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

    // Loads \"Moodle Items\" and \"Resources\" to model.availableResources
    this.loadItemsSinceDay = function (day_count) {
        //
        var time_now = new Date().getTime()
        var since = time_now - (86400000 * day_count) // a day
        var some_resources = dmc.request('GET', '/notes/by_time/created/' + since + '/' + time_now)
        if (some_resources.length > 0) {
            _this.model.setAvailableResources(some_resources)
        } else {
            _this.model.setAvailableResources([])
        }
        return some_resources
    }

    // Loads index about \"Moodle Items\", \"Tags\", \"Moodle Courses\", \"Resources\" and \"Files\"
    this.loadIndexSinceDay = function (day_count) {
        //
        var time_now = new Date().getTime()
        var since = time_now - (86400000 * day_count) // a day
        var everything = dmc.request('GET', '/notes/index/' + since + '/' + time_now)
        // .. do something nice with it :)
        return everything
    }

    this.loadAllContributions = function (userId) { // lazy, unsorted, possibly limited
        // update client-side model
        _this.model.setProfileResourcesId(userId)
        // load and cache user related data
        var all_contributions = dmc.request("GET", "/notes/fetch/contributions/" + userId)
        if (all_contributions.length > 0) {
            _this.model.setProfileResources(all_contributions)
        } else {
            _this.model.setProfileResources([])
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
        var all_tagged_resources = dmc.request("GET", "/resources/" +tagId)
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

    this.loadAllResourcesByTags = function (tagList) { // lazy, unsorted, possibly limited
        //
        var all_tagged_resources = dmc.request("POST", "/resources/by_many", tagList)
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

    this.loadUserSubscriptions= function () {
        //
        var subscriptions = dmc.request("GET", "/subscriptions/list")
        if (typeof subscriptions.items === "undefined") return undefined
        if (subscriptions.items.length > 0) {
            var subscribed_tags = []
            for (var i=0; i < subscriptions.items.length; i++) {
                var item = subscriptions.items[i]
                if (item['type_uri'] === "dm4.tags.tag") {
                    subscribed_tags.push(item)
                }
           }
            _this.model.setUserSubscriptions(subscribed_tags)
        } else {
            _this.model.setUserSubscriptions([])
        }
    }

    this.loadAllUserNotifications = function () {
        //
        var notifications = dmc.request("GET", "/subscriptions/notifications/all")
        if (typeof notifications.items === "undefined") return undefined
        if (notifications.items.length > 0) {
            return notifications.items
            _this.model.setUserNotifications(notifications)
        } else {
            _this.model.setUserNotifications([])
        }
    }

    this.loadAllUnseenUserNotifications = function () {
        //
        var notifications = dmc.request("GET", "/subscriptions/notifications/unseen")
        if (typeof notifications === "undefined") return undefined
        if (notifications.length > 0) {
            _this.model.setUserNotifications(notifications)
        } else {
            _this.model.setUserNotifications([])
        }
    }

    this.subscribeToTag = function (object_id) {
        //
        dmc.request("GET", "/subscriptions/subscribe/" + object_id)
    }

    this.setNotificationSeen = function (news_id) {
        //
        dmc.request("GET", "/subscriptions/notification/seen/" + news_id)
    }

    this.createResourceTopic = function(value, tagsToCreate, tagsToReference) {

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
            // fixme: this is currently never processed on server-side but done manually in timeline.js doSubmit()
             for (var t=0; t < tagsToCreate.length; t++) {
                topicModel.composite["dm4.tags.tag"].push({
                    "dm4.tags.label": tagsToCreate[t],
                    "dm4.tags.definition": ""
                })
            }
            for (var k=0; k < tagsToReference.length; k++) {
                if (tagsToReference[k] != undefined) {
                    topicModel.composite["dm4.tags.tag"].push( "ref_id:" + tagsToReference[k].id )
                }
            }
            // var resourceTopic = dmc.create_topic(topicModel)
            var resourceTopic = dmc.request("POST", "/notes/resource/create", topicModel)
            if (resourceTopic == undefined) throw new Error("Something mad happened.")
            var updated = model.addToAvailableResources(resourceTopic)
            // ### possibly addToProfileResources too
            // dont forget to add our new (tagsToCreate) tags to the client-side AppModel
            var new_tags = tagsToCreate
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
        // ### possibly addToProfileResources too
        if (updated == undefined) {
            throw new Error("Something mad happened while updating client side application cache.")
        }
        return resourceTopic
    }

    this.setMoodleKey = function(key, user_id) {
        var response = dmc.request("POST", "/moodle/key/" + user_id, key)
        if (response == undefined) throw new Error("Something mad happened.")
        return response
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
        return dmc.get_topic_by_value("dm4.accesscontrol.user_account", _this.username)
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
        if (typeof _this.username === "undefined" || _this.username === "") {
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
