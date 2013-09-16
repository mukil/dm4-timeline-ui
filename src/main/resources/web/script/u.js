
function User (controler, dict, emc, account) {

    var _this = this
        _this.ui = undefined
    var _user = {
        "account" : account // keeper of user account
    }

    var PICTURE_EDGE_TYPE_URI = "org.deepamehta.identity.profile_picture_edge"

    this.setupView = function ($parent) {

        _this.ui = new GUIToolkit() // used to create new upload-dialog

        // construct some generic html-containers for appending all view-elements to
        var $profile = $('<div class="profile">')
            $profile.append('<div class="view"></div>')
            $profile.append('<div class="settings"></div>')
        $parent.html($profile)

        if (_user.account != null) {
            var editable = (_user.account.value === emc.getCurrentUser()) ? true : false
            // _this.renderSettings()
            // _this.renderHelpLink()
            var $view = $('.profile .view')
            _this.renderDisplayName($view, editable)
            _this.renderProfileData($view)
        } else {
            // maybe we want to render the profile of the currently loged in user?
            _user.account = emc.getCurrentUserTopic()
        }
    }

    this.renderDisplayName = function ($parent, editable) {
        if (typeof _user.account === 'undefined' ) return undefined // holds account to render
        var object = _user.account.composite
        //
        var name = (object.hasOwnProperty('org.deepamehta.identity.display_name')) ? object['org.deepamehta.identity.display_name'].value : _user.account.value
        var $display_name = $('<div class="display-name">')
        // query for profile picture
        var profile_picture = emc.getFirstRelatedTopic(_user.account.id, PICTURE_EDGE_TYPE_URI, "dm4.files.file")
        if (profile_picture != null) {
            var imagePath = "/filerepo/profile-pictures/" + profile_picture.value
            var $profile_picture = $('<img src="'+imagePath+'" title="Profile picture" class="profile-picture">')
            $display_name.append($profile_picture)
        }
        // add name
        $display_name.append('<span class="name">' +name+ '</span>')
        // subject of study
        var subject_of_study = (object.hasOwnProperty('org.deepamehta.identity.subject_of_study')) ? object['org.deepamehta.identity.subject_of_study'].value : ""
        var $subject = $('<span class="subject-of-study">')
            $subject.append(subject_of_study)
        //
        if (subject_of_study !== "") $display_name.append('<br/>').append($subject)
        $parent.append('<br/>')
        // and edit button
        if (editable) {
            var $edit = $('<a class="btn edit-profile">')
                $edit.text("Bearbeite dein Profil")
                $edit.click(function (e) {
                    controler.goToProfileEditorView(_user.account)
                })
                var $edit_area = $('<span class="edit-area">')
                    $edit_area.append($edit)
                $display_name.append($edit_area)
        }
        // add item
        $parent.html($display_name)
    }

    this.renderProfileData = function ($parent) {
        if (typeof _user.account === 'undefined' ) return undefined // holds account to render
        var object = _user.account.composite
        // contact info
        var contact_entries = (object.hasOwnProperty('org.deepamehta.identity.contact')) ? object['org.deepamehta.identity.contact'] : undefined
        var $contact = $('<div class="contact-entries">')
        if (typeof contact_entries !== 'undefined') $contact.append('<span class="label">Kontaktm&ouml;glichkeit</span><br/>')
        for (var entry in contact_entries) {
            var contact_entry = contact_entries[entry]
            var label = (contact_entry.composite.hasOwnProperty('org.deepamehta.identity.contact_label')) ? contact_entry.composite['org.deepamehta.identity.contact_label'].value : ""
            var contact = (contact_entry.composite.hasOwnProperty('org.deepamehta.identity.contact_entry')) ? contact_entry.composite['org.deepamehta.identity.contact_entry'].value : ""
            $contact.append('<span class="label">'+label+'</span>')
            $contact.append('<span class="entry">'+contact+'</span>')
            $contact.append('<br/>')
        }
        //
        $parent.append($contact)
        // additional info
        var info = (object.hasOwnProperty('org.deepamehta.identity.infos')) ? object['org.deepamehta.identity.infos'].value : ""
        var $info = $('<div class="infos">')
            $info.append(info)
        //
        $parent.append($info)
    }

    this.renderUserEditor = function ($parent) {
        //
        $('#profile .profile').hide()
        $('#profile .user-settings').remove()
        //
        var object = _user.account.composite
        var name = (object.hasOwnProperty('org.deepamehta.identity.display_name')) ? object['org.deepamehta.identity.display_name'].value : _user.account.value
        var subject_of_study = (object.hasOwnProperty('org.deepamehta.identity.subject_of_study')) ? object['org.deepamehta.identity.subject_of_study'].value : ""
        // var info = (object.hasOwnProperty('org.deepamehta.identity.infos')) ? object['org.deepamehta.identity.infos'].value : ""
        // var contact_label = (object.hasOwnProperty('org.deepamehta.identity.contact')) ? object['org.deepamehta.identity.contact'][0].composite['org.deepamehta.identity.contact_label'].value : ""
        // var contact_entry = (object.hasOwnProperty('org.deepamehta.identity.contact')) ? object['org.deepamehta.identity.contact'][0].composite['org.deepamehta.identity.contact_entry'].value : ""
        // add settings-form to profile-view
        var $settings = $('<div class="user-settings">')
            $settings.append('<label for="display_name">Display Name</label>')
            $settings.append('<input type="text" name="display_name" value="' +name+ '"></input>')
            $settings.append('<label for="display_name">Studienfach</label>')
            $settings.append('<input type="text" name="subject_of_study" value="' +subject_of_study+ '"></input>')
        var $save_edits = $('<input type="button" class="save-edits" value="Änderungen speichern">')
            $save_edits.click(function(e) {
                _this.doSaveUserSettings()
                // update gui
                controler.goToPersonalTimeline(_user.account)
            })
            $settings.append($save_edits)
            /**
            $settings.append('<label for="contact_label">Kontaktm&ouml;glichkeit</label>')
            $settings.append('<input type="text" name="contact_label" value="' +contact_label+ '"></input>')
            $settings.append('<input type="text" name="contact_entry" value="' +contact_entry+ '"></input>')
            $settings.append('<label for="infos">Weitere Infos</label>')
            $settings.append('<textarea name="infos" value="' +info+ '"></textarea>') **/
        // query for profile picture
        var profile_picture = emc.getFirstRelatedTopic(_user.account.id, PICTURE_EDGE_TYPE_URI, "dm4.files.file")
        // either add or remove profile-picture
        var $picture_area = $('<div class="picture-area">')
        if (profile_picture != null) {
            var imagePath = "/filerepo/profile-pictures/" + profile_picture.value
                $picture_area.append('<label class"picture-label">Profile picture</label>')
            var $profile_picture = $('<img src="'+imagePath+'" title="Profile picture" class="profile-picture editable">')
            var $remove_item = $('<img src="/org.deepamehta.eduzen-tagging-notes/images/remove_item.png" title="Remove current profile pricture" class="remove">')
                $remove_item.click(function(e) {
                    var assoc = emc.getFirstAssociation(_user.account.id, profile_picture.id, PICTURE_EDGE_TYPE_URI)
                    emc.deleteAssociation(assoc.id)
                    // update gui
                    _this.renderUserEditor($parent)
                    var fileResponseHTML = "<br/><br/><br/>Dein Profilbild wurde entfernt."
                    $('div.picture-area').append(fileResponseHTML)
                })
            $picture_area.append($profile_picture)
            $picture_area.append($remove_item)
        } else {
                $picture_area.append('<label class"picture-label">Profile picture</label>')
            var $add_item = $('<img src="/org.deepamehta.eduzen-tagging-notes/images/add_item.png" title="Add new profile pricture" class="add">')
                $add_item.click(function(e) {
                    _this.openUploadDialog('/profile-pictures', _this.handleUploadResponse, $parent)
                })
            $picture_area.append($add_item)
        }
        $settings.append($picture_area)
        $parent.append($settings)
        //
        $settings.slideDown('slow')

    }

    this.doSaveUserSettings = function () {
        var display_name = $('[name=display_name]').val()
        var subject_of_study = $('[name=subject_of_study]').val()
        var model = {
            "id": _user.account.id,
            "composite": {
                "org.deepamehta.identity.display_name": display_name,
                "org.deepamehta.identity.subject_of_study": subject_of_study
            }
        }
        var updated = emc.updateTopic(model)
        console.log(updated) // fixme: throw error if update failed (otherwise than with http status code)
    }

    /**
     * GUIToolkit Helper Methods copied from dm4-webclient module
     * @param   filepath        the file repository path (a string) to upload the selected file to. Must begin with "/".
     * @param   callback    the function that is invoked once the file has been uploaded and processed at server-side.
     *                      One argument is passed to that function: the object (deserialzed JSON)
     *                      returned by the (server-side) executeCommandHook. ### FIXDOC
     * @param   $parent     jQuery Parent (DOM) Element
     */
    this.openUploadDialog = function(filepath, callback, $parent) {

        // 1) install upload target
        var upload_target = $("<iframe>", {name: "upload-target"}).hide()
        $("body").append(upload_target)

        // 2) create upload dialog
        var upload_form = $("<form>", {
            method:  "post",
            enctype: "multipart/form-data",
            target:  "upload-target",
            action:  "/files/" + filepath
        })
        .append($('<input type="file">').attr({name: "file", size: 60}))
        .append($('<input class=\"button\" type="submit">').attr({value: "Upload"}))
        .append($('<br/><br/><label>Hinweis: Dein Profilbild darf die Gr&ouml;&szlig;e von 180x180px nicht '
            + '&uuml;berschreiten.</label>'))
        //
        var upload_dialog = _this.ui.dialog({id:"picture-upload", title: "Füge Profilbild hinzu", content: upload_form})
        $('.ui-dialog.ui-widget').show()

        // 3) create dialog handler
        upload_dialog.open()
        // bind handler
        upload_target.unbind("load")    // Note: the previous handler must be removed
        upload_target.load(upload_complete)

            function upload_complete() {
                upload_dialog.close()
                // Note: iframes must be accessed via window.frames
                var response = $("pre", window.frames["upload-target"].document).text()
                try {
                    var response_object = JSON.parse(response)
                    callback(response_object, $parent)
                } catch (e) {
                    console.warn("Upload failed: \"" + response_object + "\"\nException=" + JSON.stringify(e))
                } finally {
                    $('.ui-dialog.ui-widget').hide()
                }
            }
        return undefined
    }

    this.renderProfilePicture = function(picture) {
        var profile_picture = picture
        if (typeof profile_picture === 'undefined') {
            profile_picture = emc.getFirstRelatedTopic(_user.account.id, PICTURE_EDGE_TYPE_URI, "dm4.files.file")
        }
        //
        if (profile_picture != null) {
            // var icon = host + "/de.deepamehta.files/images/sheet.png"
            var imagePath = "/filerepo/profile-pictures/" + profile_picture.value
            $('img.profile-picture editable').attr("src", imagePath)
        }
        return profile_picture
    }

    this.handleUploadResponse = function (response, $parent) {
        if (!response.hasOwnProperty("file_name")) {
            throw new Error("FileUpload curiously failed.")
            return undefined // no file given
        } else {
            // create profile_picture edge relation for _user.account.id
            emc.createProfilePictureAssociation(_user.account, response.topic_id)
            console.log("related new profile picture to user account")
            // update gui
            _this.renderUserEditor($parent)
            var fileResponseHTML = "<br/>Dein neues Profilbild \"" + response.file_name + "\" wurde "
                + "erfolgreich gespeichert."
            $('div.picture-area').append(fileResponseHTML)
            // $(".label.upload").append(fileResponseHTML)
            // ### allow users to delete their just accidentially uploaded file..

        }
    }

    this.renderSettings = function () {
        // this inits just the users profile view
        _this.renderEditableSettings()
        _this.renderPasswordField()
    }

    this.renderEditableSettings = function () {
        var display_name = _user.account.composite['org.deepamehta.identity.display_name'].value

        var html = "<br/><p class=\"buffer\"><a class=\"btn back\" href=\"javascript:history.back()\">Zur&uuml;ck</a><br/>"
            + "<br/>Kontoeinstellungen von <span class=\"label\">" + display_name + "</span></a>"
            + "<br/><br/><span class=\"logout button\">Logout</span><p><br/></p>"
            + "<form id=\"user-form\" name=\"search\" action=\"javascript:void(0)\"><p class=\"buffer\">"
            + "  <label for=\"pwdfield\">Your encrypted password</label><span class=\"edit button\">Edit</span>"
            + "  <input name=\"pwdfield\" class=\"pwdfield\" type=\"password\" disabled=\"disabled\""
            + "    placeholder=\"Password\"></input><br/><br/>"
            + "  <span class=\"pwdsave button\">Save</span></p>"
            + "</form>"
        $(".profile .settings").html(html)
        $(".edit.button").click(_this.pwdHandler)
        $(".logout.button").click(emc.logout)
        // $(".mailedit.button").click(_this.mailHandler)
        $(".pwdsave.button").hide()
    }

    this.renderPasswordField = function() {
        var password = _user.account.composite['dm4.accesscontrol.password'].value
        $(".pwdfield").val(password)
        $(".pwdsave.button").click(_this.submitPassword)
        /** var html = "<p class=\"buffer\">"
            + "  <label for=\"mailfield\">Your current mailbox</label><span class=\"mailedit button\">Edit</span>"
            + "  <input name=\"mailfield\" class=\"mailfield\" type=\"text\" disabled=\"disabled\""
            + "    placeholder=\"E-Mail\"></input><br/>"
            + "  <span class=\"emailsave button\">Save</span></p>"
        $("#user-form").append(html)
        $(".emailsave.button").hide()**/
        // ### display console.log(user.account)
    }

    this.renderHelpLink = function() {
        var mailto = "<p class=\"buffer\"><b class=\"label\">Ihr braucht Hilfe bei einer &Uuml;bung, habt Anregungen "
            + "oder Fragen zu dieser Web-Anwendung, schickt uns einfach eine Mail an <a class=\"btn mail\" "
            + "title=\"Mail an EducationZEN Hilfe\" "
            + "alt=\"Mail an Team\" href=\"mailto:team@eduzen.tu-berlin.de?subject=Anfrage an das EducationZEN-Team\">"
            + "team@eduzen.tu-berlin.de</a> - Danke!</b><br/><br/></p>"
        if ($(".btn.mail")[0] == undefined) {
            $("#header").append(mailto)
        }
    }

    this.pwdHandler = function (e) {
        if ($(".2nd.pwdfield")[0] == undefined) {
        $(".pwdfield").removeAttr("disabled")
        $("[for=pwdfield]").html("Enter your new password")
        $(".pwdsave.button").show()
        _this.renderAndPasswordField()
        } else {
        $(".pwdfield").attr("disabled", "disabled")
        $(".2nd.pwdfield").remove()
        $("[for=2ndpwdfield]").remove()
        $(".pwdsave.button").hide()
        }
        return void(0)
    }

    this.renderAndPasswordField = function () {
        var password = _user.account.composite['dm4.accesscontrol.password'].value
        var controlField = "<label for=\"2ndpwdfield\">Please retype your new password here</label>"
            + "<input name=\"2ndpwdfield\" class=\"2nd pwdfield\" type=\"password\" "
            + "placeholder=\"Password\" value=\"" + password + "\"></input>"
        $(controlField).insertBefore(".pwdsave.button")
    }

    this.submitPassword = function (e) {
        var next = $(".pwdfield").val()
        var and = $(".2nd.pwdfield").val()
        var pwd = undefined
        if (next === and) {
            pwd = "-SHA256-" + SHA256(next)
            _user.account.composite['dm4.accesscontrol.password'].value = pwd
            // emc.update_topic(user.account.composite['dm4.accesscontrol.password'])
        } else {
            console.log("password update not saved, 2 passwords did not match")
        }
        // update gui
        _this.initView()
    }

}
