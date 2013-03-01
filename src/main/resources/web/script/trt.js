(function(CKEDITOR, MathJax, $, console, dmc) {

    this.submitResource = function() {
        // var pageContent = $('#resource-input').val()
        var valueToSubmit = this.getTeXAndHTMLSource(document.getElementById("resource-input"))
        console.log(valueToSubmit)
        createResourceTopic(valueToSubmit)
        $('#resource-input').html("")
        // TODO: render some "Saved" Notification
    }

    this.loadTags = function(limit) { // lazy, unsorted, limited
        return dmc.get_topics("dm4.tags.tag", false, false, limit)
    }

    this.setupCKEditor = function () {
        // setup cK-editor
        CKEDITOR.inline(document.getElementById('resource-input'))
        CKEDITOR.config.filebrowserImageBrowseUrl = '/de.deepamehta.images/browse.html'
        CKEDITOR.config.filebrowserImageUploadUrl = '/images/upload'
        // upload-fallback: $(".button.upload").click(this.open_upload_dialog(uploadPath, this.handleUploadResponse))
        // mathjax preview handling
        $input = $('#resource-input')
        $input.keyup(function(e) {
            // console.log("key up on input... area.. rendering math in preview.. ")
            renderApproachMathPreview($input.val())
            return function(){}
        })

        this.renderMathInContentArea()

        function renderApproachMathPreview (value) {
            $("#math-preview").text(value)
            MathJax.Hub.Queue(["Typeset", MathJax.Hub])
            this.renderMathInContentArea()
            // $("#math-preview").html("<img src=\"http://latex.codecogs.com/gif.latex?"+ value +"\" alt=\""+ value +"\">")
        }

    }

    this.setupView = function() {
        console.log(dmc.get_all_topic_types(function(result){console.log(result)}))
        console.log("tagging resources in time, initialized..")
        this.registerHistoryStates()
        this.setupMathJaxRenderer()
        this.setupCKEditor()
    }

    this.renderMathInContentArea = function () {
        // typeset all elements containing TeX to SVG or HTML in default area #content
        MathJax.Hub.Typeset()
        // MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }

    /** HTML5 History API utility methods **/

    this.registerHistoryStates = function () {
        if (window.history && history.popState) window.addEventListener('popstate', this.popHistory)
        if (window.history && history.pushState) window.addEventListener('pushstate', this.pushHistory)
    }

    this.popHistory = function (state) {
        if (!window.history) return
        // do handle pop events
        console.log("popping state.. ")
    }

    this.pushHistory = function (state, name, link) {
        if (!window.history) return
        var history_entry = {state: state, url: link}
        console.log("pushing state.. to " + link)
        // window.history.pushState(history_entry.state, name, history_entry.url)
    }



    /** GUIToolkit Helper Methods copied from dm4-webclient module **/

    /**
    * @param   path        the file repository path (a string) to upload the selected file to. Must begin with "/".
    * @param   callback    the function that is invoked once the file has been uploaded and processed at server-side.
    *                      One argument is passed to that function: the object (deserialzed JSON)
    *                      returned by the (server-side) executeCommandHook. ### FIXDOC
    */
    this.open_upload_dialog = function(new_path, callback) {

        // 1) install upload target
        var upload_target = $("<iframe>", {name: "upload-target"}).hide()
        $("body").append(upload_target)

        // 2) create upload dialog
        var upload_form = $("<form>", {
        method:  "post",
        enctype: "multipart/form-data",
        target:  "upload-target"
        })
        .append($('<input type="file">').attr({name: "file", size: 60}))
        .append($('<input class=\"button\" type="submit">').attr({value: "Upload"}))
        //
        var upload_dialog = this.ui.dialog({title: "Upload File", content: upload_form})

        // 3) create dialog handler
        return function() {
        upload_form.attr("action", "/files/uebungen-uploads-wise12/" + new_path)
        upload_dialog.open()
        // bind handler
        upload_target.unbind("load")    // Note: the previous handler must be removed
        upload_target.load(upload_complete)

            function upload_complete() {
                upload_dialog.close()
                // Note: iframes must be accessed via window.frames
                var response = $("pre", window.frames["upload-target"].document).text()
                try {
                callback(JSON.parse(response))
                } catch (e) {
                alert("Upload failed: \"" + response + "\"\n\nException=" + JSON.stringify(e))
                }
            }
        }
    }

    this.setupMathJaxRenderer = function() {
        MathJax.Ajax.config.root = "/de.tu-berlin.eduzen.mathjax-renderer/script/vendor/mathjax"
        MathJax.Hub.Config({
            "extensions": ["tex2jax.js", "mml2jax.js", "MathEvents.js", "MathZoom.js", "MathMenu.js", "toMathML.js",
            "TeX/noErrors.js","TeX/noUndefined.js","TeX/AMSmath.js","TeX/AMSsymbols.js", "FontWarnings.js"],
            "jax": ["input/TeX", "output/SVG"], // "input/MathML", "output/HTML-CSS", "output/NativeMML"
            "tex2jax": {"inlineMath": [["$","$"],["\\(","\\)"]]},
            "menuSettings": {
                "mpContext": true, "mpMouse": true, "zscale": "200%", "texHints": true
            },
            "errorSettings": {
                "message": ["[Math Error]"]
            },
            "displayAlign": "left",
            "HTML-CSS": {"scale": 120},
            "SVG": {"blacker": 8, "scale": 110},
            "v1.0-compatible": false,
            "skipStartupTypeset": false,
            "elements": ["resource-input"]
        });
        MathJax.Hub.Configured() // bootstrap mathjax.js lib now
    }

    this.getTeXAndHTMLSource = function (body) {
        var objects = $('.math-output', body)
        for (i=0; i < objects.length; i++) {
            var div = objects[i]
            var containerId = div.id
            var mathjaxId = $('script', div).attr('id')
            // console.log("containerId: " + containerId + " mathjaxId: " + mathjaxId)
            // var math = getInputSourceById(MathJax.Hub.getAllJax("MathDiv"), mathjaxId)
            var math = $("#" + mathjaxId, body).text()
            if ( math ) {
                // put latexSource into div-preview container before saving this data
                $('#'+ containerId, body).html('<span class=\"math-preview\">$$ '+ math + ' $$</span>')
            } else {
                console.log("Not found.. ")
                // ### prevent dialog from opening up
            }
        }
        // var data = $("" + body.innerHTML + "") // copy raw-data of ck-editor
        // console.log(data)
        // MathJax.Hub.Typeset() // typeset ck-editor again
        return body.innerHTML

            // duplicate helperfunction in mathjax/dialogs/mathjax.js
            function getInputSourceById(id, body) {
                return $("#" + id, body).value
                /** for (obj in elements) {
                    var element = elements[obj]
                    console.log("element.inputID: " + element.inputID + " == " + id)
                    if (element.inputID === id) return element
                }**/
                // return undefined
            }

    }

    /** RESTful utility methods for the trt-views **/

    function createResourceTopic(value) {
        if (value != undefined) {
            var topicModel = {"type_uri": "dm4.resources.resource", "composite": {
                "dm4.resources.content": value, "dm4.resources.name": new Date().getTime().toString()
            }}
            // "dm4.resources.content": "ref_uri:tub.eduzen.approach_undecided",
            var resourceTopic = dmc.create_topic(topicModel)
            if (resourceTopic == undefined) throw new Error("Something mad happened.")
            return resourceTopic;
        }
        return undefined
    }

})(CKEDITOR, MathJax, jQuery, console, new RESTClient("/core"))