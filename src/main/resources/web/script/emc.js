function EMC (dmc, model) {


    var _this = this

    /** RESTful utility methods for the trt-views **/

    this.createResourceTopic = function(value, tagsToCreate) {

        if (value != undefined) {
            // FIXME: doubled URIs in code find out how to use variables as keys in a declarative object construction
            // TODO: initializ aggregated license properly on each new resource
            var topicModel = {
                "type_uri": "org.deepamehta.resources.resource",
                "composite": {
                    "org.deepamehta.resources.name": "",
                    "org.deepamehta.resources.content": value,
                    "org.deepamehta.resources.created_at": new Date().getTime(),
                    "org.deepamehta.resources.last_modified_at": new Date().getTime(),
                    "org.deepamehta.resources.author": "Anonymous",
                    "org.deepamehta.resources.is_published": true,
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
            var resourceTopic = dmc.create_topic(topicModel)
            if (resourceTopic == undefined) throw new Error("Something mad happened.")
            var updated = model.addToAvailableResources(resourceTopic)
            if (updated == undefined) {
                throw new Error("Something mad happened while updating client side application cache.")
            }
            return resourceTopic
        }
        return undefined

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

    this.associationExists = function (topicOne, topicTwo, assocType) {
        var assocs = dmc.get_associations(topicOne, topicTwo, assocType)
        return (assocs.length == 0) ? false :  true
    }

    this.getCurrentUser = function () {
        _this.username = dmc.request("GET", "/accesscontrol/user", undefined, undefined, "text")
        if (_this.username != undefined && _this.username != "") {
          return _this.username
        } else {
          return undefined
        }
    }

}
