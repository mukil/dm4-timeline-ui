
function require_config () {

    require.config({
        baseUrl: '/org.deepamehta.eduzen-tagging-notes/script/',
        paths: {
            jquery: 'vendor/jquery-1.7.2.min',
            jquery_ui: 'vendor/jquery-ui-1.8.21.custom.min',
            jquery_ui_progressbar: 'vendor/jquery-ui-progressbar',
            jquery_ui_widget: 'vendor/jquery-ui-widget',
            knockout: 'vendor/knockout-3.1.0',
            d3: 'vendor/d3.min',
            domReady: 'vendor/domReady'
        },
        shim: {
            'jquery_ui': ['jquery'],
            'jquery_ui_widget': ['jquery_ui'],
            'jquery_ui_progressbar': ['jquery_ui_widget'],
            'knockout': ['jquery']
        }
    })

    require(['jquery'], function ($) {
        // console.log('jquery_core is loaded')
    })

    require(['knockout', 'modules/notes_app_model', 'domReady!'], function(ko, model) {
        ko.applyBindings(model)
        console.log("require_main::ko.appliedBindings to controler and model")
    });

    require(['modules/notes_route'], function(notes_route) {
        notes_route.page_route()
    })

    /** require(['jquery', 'jquery_ui', 'jquery_ui_widget', 'jquery_ui_progressbar'],
    function ($, $jQueryUi, $jQueryWidget, $jQueryProgressbar) {
        //jQuery, canvas and the app/sub module are all
        //loaded and can be used here now.
        console.log("jQuery and modules are loaded")
    })

    require(['async', 'knockout', 'knockout_mapping', 'd3'],
    function(async, ko, ko_mapping, d3) {
        console.log("async, ko, ko-mapping and d3 are loaded")
        //This function is called when scripts/helper/util.js is loaded.
        //If util.js calls define(), then this function is not fired until
        //util's dependencies have loaded, and the util argument will hold
        //the module value for "helper/util".
    }) **/

} require_config()