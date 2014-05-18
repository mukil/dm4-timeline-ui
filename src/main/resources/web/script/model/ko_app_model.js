
function app_model() {

    var self = this

    self.tags = {
        all_available_tags: ko.observableArray([]),
        viewName: ko.observable("Fancy Tagcloud"),
        nr_of_tags: ko.observable(0)
    }

    self.controler = {
        tag_cloud_click: function (data, event) {
            console.log("clicked tag in cloud ")
            console.log(data)
            window.document.location = "/notes/tagged/" + data.value;
        }
    }

}
