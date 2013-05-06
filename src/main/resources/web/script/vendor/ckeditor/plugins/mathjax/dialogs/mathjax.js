CKEDITOR.dialog.add( 'mathjaxDialog', function( editor ) {
    return {
        title : 'Math Input Dialog',
        minWidth : 400,
        minHeight : 200,
        contents: [
            {
                id: 'input-tab',
                label: 'Eingabe',
                elements:[
                    {  //input element for the width
                        type: 'textarea',
                        id: 'mathInput',
                        label: 'Eingabefenster f&uuml;r LaTeX-Quelltext',
                        setup: function( element ) {
                            this.setValue( element.getText() )
                        },
                        commit: function( element ) {
                            element.setText( this.getValue() )
                        }
                    }/** , {
                        type: 'html',
                        html: '<label>Vorschau</label><div id="math-live-preview"></div>',
                        setup: function (element) {
                            // var textarea = editor.document.getById("cke_184_textarea")
                            // var textarea = editor.document.getElementsByClassName("cke_dialog_ui_input_textarea")
                            // console.log($('textarea.cke_dialog_ui_input_textarea'));
                            var livePreview = editor.document.getById("math-live-preview")
                            if (livePreview != undefined) livePreview.setText("") // clear preview
                            // register live-preview handler
                            if (textarea) {
                                var t = textarea.$
                                // initial preview-build up
                                var preview = editor.document.getById("math-live-preview")
                                    preview.setText(t.value)
                                MathJax.Hub.Queue(["Typeset", MathJax.Hub, "math-live-preview"])
                                // render preview after every keychange
                                t.onkeyup = function(e) {
                                    preview.setText(t.value)
                                    MathJax.Hub.Queue(["Typeset", MathJax.Hub, "math-live-preview"])
                                }
                            }
                        }
                    }**/
                ]
            }, {
                id: 'help-tab',
                label: 'Hilfe (LaTeX-Spickzettel)',
                elements:[
                    {
                        type: 'html',
                        html: '<b>LaTeX Spickzettel</b></br><p>Aktuell k&ouml;nnen wir euch leider nur '
                            + 'auf die <a href="http://de.wikipedia.org/wiki/Hilfe:TeX">Wikipedia-Hilfe Seite für '
                            + 'TeX</a><br/>verweisen, dort findet Ihr einen gut strukturierten Einstieg.</p>'
                    }
                ]
            }
        ], onLoad: function() {
            // initial pop-up
            this.setupContent(editor.document.createText("$$  $$"))
        }, onShow: function() {
            var selection = editor.getSelection()
            var element = selection.getStartElement()
            var latexSource = undefined // this is what we need to edit this math-formula
            // find our ascendant math-output/div container
            if ( element ) {
                var mathjaxDiv = element.getAscendant('div')
                // FIXME check if we have the output container generated by mathjax at hand
                if ( mathjaxDiv ) {
                    // truncate ID from DOM Element works with (MathJax 2.0)
                    var mathjaxId = mathjaxDiv.$.firstChild.id.replace('-Frame', '')
                    console.log("find mathjax-element with id \"" + mathjaxId+ "\"")
                    var parentDiv = mathjaxDiv.getAscendant('div')
                    // now we have our output container at hand
                    var math = getInputSourceById(MathJax.Hub.getAllJax("MathDiv"), mathjaxId)
                    if ( math ) {
                        element = parentDiv
                        latexSource = math.originalText
                        console.log("setting latexSource variable and assigning element the parentDiv..")
                    } else {
                        console.log("Not found.. " + element.id)
                        // ### prevent dialog from opening up
                    }
                }
            }

            // edit or insert math-formula
            // console.log(element)
            if ( !element || element.getName() != 'div') {
                // console.log("Show... insert")
                this.insertMode = true
            } else {
                // console.log("Show... edit")
                if (latexSource) {
                    // override verbose html generated and inserted by mathjax-renderer
                    // replace it with our source within two dollar signs
                    element.setHtml("$$ "+ latexSource + " $$")
                    var preview = editor.document.getById("math-live-preview")
                    preview.setText(element.getHtml())
                    this.insertMode = false
                } else {
                    // Oops, no latex-source.. 404
                }
            }

            this.element = element

            if ( !this.insertMode ) {
                this.setupContent( this.element )
            } else {
                this.setupContent(editor.document.createText("$$  $$"))
            }

            function getInputSourceById(elements, id) {
                for (obj in elements) {
                    var element = elements[obj]
                    if (element.inputID === id) return element
                }
                return undefined
            }

        }, onOk: function () {

            console.log("Ok...")

            var dialog = this,
                mathjaxInput = dialog.element

            if (dialog.insertMode) {

                var math = dialog.getValueOf( 'input-tab', 'mathInput' )

                var mathObjectId = MathJax.Hub.getAllJax("MathDiv").length

                // this element is our mathjax-source container
                var content = editor.document.createElement('div')
                    content.setAttribute('class', 'math-output')
                    content.setAttribute('id', 'formula-'+ mathObjectId)
                // this element gets replaced by the mathjax-renderer
                var preview = editor.document.createElement('span')
                    preview.setAttribute('class', 'math-preview')
                    preview.setText(math)
                content.append(preview)

                editor.insertElement( content )
            } else {
                dialog.commitContent( mathjaxInput )
            }

            MathJax.Hub.Typeset()

        }, onHide: function() {
            // console.log("just hiding the dialog, typesetting math in any case..")
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, "resource_input"])
        }, onCancel: function() {
            // console.log("just cancelled the dialog, typesetting math in any case..")
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, "resource_input"])
        }
    }
});
