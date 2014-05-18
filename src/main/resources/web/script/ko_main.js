
function ko_app (restc, app_model) {

    /** Main */

    this.init = function () {

        var all_tags = restc.request("GET", "/tag/with_related_count/org.deepamehta.resources.resource")

        // clean up (pre-populated) ko-model
        app_model.tags.all_available_tags.removeAll()

        // add all loaded tags to app-model
        for (var i = 0; i < all_tags.length; i++) {
            app_model.tags.all_available_tags.push(all_tags[i])
        }

        // set view meta-info
        app_model.tags.nr_of_tags(all_tags.length)

    }

}
