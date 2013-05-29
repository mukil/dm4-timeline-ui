CKEDITOR.dialog.add( 'mathjaxDialog', function( editor ) {

    var DELIMITER = "$"

    return {
        title : 'Math Input Dialog',
        minWidth : 400,
        minHeight : 340,
        contents: [
            {
                id: 'input-tab',
                label: 'Eingabe',
                elements:[
                    {   //input element for the width
                        type: 'html',
                        html: '<span class="label">Mathe-Eingabefenster (Tippe LaTeX-Code in $-Zeichen)</span><br/>'
                            + '<textarea id="math-input-dialog"></textarea>',
                        setup: function( element ) {
                            // console.log("setting up " + element.getText())
                            this.setValue( element.getText() )
                        },
                        commit: function( element ) {
                            element.setText( this.getValue() )
                        }
                    }, {
                        type: 'html',
                        html: '<span class="label">MathJax Preview</span><br/>'
                            + '<div id="math-live-preview"></div>',
                        setup: function (element) {
                            var textarea = editor.document.getById("math-input-dialog")
                            // var textarea = editor.document.getElementsByClassName("cke_dialog_ui_input_textarea")
                            // var $textarea = $('#math-input-dialog')
                            var livePreview = editor.document.getById("math-live-preview")
                            if (livePreview != undefined) livePreview.setText("") // clear preview
                            // register live-preview handler
                            if (textarea) {
                                // var t = textarea.$
                                var t = textarea.$
                                // initial preview-build up
                                livePreview.setText(t.value)
                                MathJax.Hub.Queue(["Typeset", MathJax.Hub, "math-live-preview"])
                                // render preview after every keychange
                                t.onkeyup = function(e) {
                                    livePreview.setText(t.value)
                                    MathJax.Hub.Queue(["Typeset", MathJax.Hub, "math-live-preview"])
                                }
                            }
                        }
                    }
                ]
            }, {
                id: 'help-tab',
                label: 'Hilfe (LaTeX-Spickzettel)',
                elements:[
                    {
                        type: 'html',
                        html: '<b>LaTeX Spickzettel</b></br><p>Aktuell k&ouml;nnen wir euch leider nur '
                            + 'auf die <a target="_blank" '
                            + 'href="http://de.wikipedia.org/wiki/Hilfe:TeX">Wikipedia-Hilfe Seite für '
                            + 'TeX</a><br/>verweisen, dort findet Ihr einen gut strukturierten Einstieg.</p>'
                    }
                ]
            }
        ], onLoad: function() {
            // initial pop-up
            this.setupContent(editor.document.createText(DELIMITER+ "  " +DELIMITER))
        }, onShow: function() {
            var selection = editor.getSelection()
            var element = selection.getStartElement()
            var newElement = undefined
            var latexSource = undefined // this is what we need to edit this math-formula
            // find our ascendant math-output/div container
            if ( element ) {
                var mathjaxDiv = element.getAscendant('div')
                // FIXME check if we have the output container generated by mathjax at hand
                if ( mathjaxDiv ) {
                    // truncate ID from DOM Element works with (MathJax 2.0)
                    var mathjaxId = mathjaxDiv.$.firstChild.id.replace('-Frame', '')
                    // console.log("find mathjax-element with id \"" + mathjaxId+ "\"")
                    var parentDiv = mathjaxDiv.getAscendant('div')
                    // now we have our output container at hand
                    var math = getInputSourceById(MathJax.Hub.getAllJax("MathDiv"), mathjaxId)
                    if ( math ) {
                        newElement = parentDiv
                        latexSource = math.originalText
                    } else {
                        new Error("Sorry. MathJax Source for element with id="+element.id+" not found. "
                             + "Get the formulas LaTeX-Source (via the MathJax-Context-Menu) and start a new-formula.")
                        // ### prevent dialog from opening up
                    }
                }
            }

            // edit or insert math-formula
            // console.log(element)
            if ( !newElement ) {

                this.insertMode = true
                editor.document.getById('math-input-dialog').$.value = DELIMITER+ "  " +DELIMITER

            } else {

                if (latexSource) {
                    // override verbose html generated and inserted by mathjax-renderer
                    // replace it with our source within two dollar signs
                    // console.log("latex source set..." + latexSource)
                    newElement.setHtml(DELIMITER+ " "+latexSource+ " " +DELIMITER)
                    editor.document.getById('math-input-dialog').$.value = DELIMITER+ " " +latexSource+ " " +DELIMITER
                    var preview = editor.document.getById("math-live-preview")
                    preview.setText(element.getHtml())
                    this.insertMode = false
                } else {
                    // Oops, no latex-source.. 404
                    // console.log("no latex source set...")
                }
            }

            if ( !this.insertMode ) {
                this.setupContent( newElement )
            } else {
                this.setupContent(editor.document.createText(DELIMITER+ " "+DELIMITER))
            }

            function getInputSourceById(elements, id) {
                for (obj in elements) {
                    var element = elements[obj]
                    if (element.inputID === id) return element
                }
                return undefined
            }

        }, onOk: function () {


            var dialog = this
            var math = editor.document.getById('math-input-dialog').$.value
            var mathObjectId = MathJax.Hub.getAllJax("MathDiv").length

            var preview, content = undefined

            if (dialog.insertMode) {

                // this element is our mathjax-source container
                content = editor.document.createElement('div')
                    content.setAttribute('class', 'math-output')
                    content.setAttribute('id', 'formula-'+ mathObjectId)
                // this element gets replaced by the mathjax-renderer
                preview = editor.document.createElement('span')
                    preview.setAttribute('class', 'math-preview')
                    preview.setText(math)
                content.append(preview)

                editor.insertElement( content )

            } else {

                // this element is our mathjax-source container
                content = editor.document.createElement('div')
                    content.setAttribute('class', 'math-output')
                    content.setAttribute('id', 'formula-'+ mathObjectId)
                // this element gets replaced by the mathjax-renderer
                preview = editor.document.createElement('span')
                    preview.setAttribute('class', 'math-preview')
                    preview.setText(math)
                content.append(preview)

                // dialog.commitContent(math)
                // fixme: dialog.commitContent() suddenly does not work as expected anymore, duplicating formula now
                editor.insertElement(content)

            }

            MathJax.Hub.Queue(["Typeset", MathJax.Hub, "resource_input"])

        }, onHide: function() {
            // console.log("just hiding the dialog, typesetting math in any case..")
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, "resource_input"])
        }, onCancel: function() {
            // console.log("just cancelled the dialog, typesetting math in any case..")
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, "resource_input"])
        }
    }
});
