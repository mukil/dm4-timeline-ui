
define(['modules/notes_app_model', 'd3'], function(model, d3) {

        return {

            load_some_notes: function (amount, offset) {
                var xhr = d3.json('/notes/fetch/'+amount+'/'+offset)
                    xhr.get()
                    xhr.on('load', function (data) {
                        model.items.all(data)
                    })
                    xhr.on('error'), function (error) {
                        console.log("d3.error:: " + error)
                        throw Error("notes_main_timeline_view::init " + error)
                    }
            },

            load_timerange_index: function (callback) {

                var now = new Date().getTime()
                var since = new Date("1.1.2012").getTime()
                // update gui
                d3.select('.data-container').style({'display': 'inline-block'})
                // issue request
                var xhr = d3.json('/notes/all/index/'+since+'/'+now)
                    xhr.get()
                    xhr.on('load', function (data) {
                        // update model
                        model.set_timerange(data)
                        // update gui
                        d3.select('.data-container').style({'display': 'none'})
                        // callback
                        if (typeof callback !== "undefined") callback()
                    })
                    xhr.on('error'), function (error) {
                        console.log("d3.error:: " + error)
                        throw Error("notes_main_timeline_view::init " + error)
                    }
            },

            load_topics_in_range: function (since, to, callback) {

                // update model
                model.set_from_time(since)
                model.set_to_time(to)
                // update gui
                d3.select('.data-container').style({'display': 'inline-block'})
                // issue request
                var xhr = d3.json('/notes/by_time/' +model.get_timestamp_option()+ '/'+since+'/'+to)
                    xhr.get()
                    xhr.on('load', function (data) {
                        model.set_items(data)
                        // update gui
                        d3.select('.data-container').style({'display': 'none'})
                        d3.select('.timeline-info').style({'display': 'inline-block'})
                        d3.select('.timeline-info .state.items').text(data.length)
                        // callback
                        if (typeof callback !== "undefined") callback()
                    })
                    xhr.on('error'), function (error) {
                        console.log("d3.error:: " + error)
                        throw Error("notes_rest_client::load_topics_in_range" + error)
                    }

            },

            is_logged_in: function () {
                /** ### send synchronous request
                 *var xhr = d3.json('/accesscontrol/user')
                    xhr.get()
                    xhr.on('load', function (data) {
                        console.log(data)
                    })
                    xhr.on('error'), function (error) {
                        console.log("d3.error:: " + error)
                        throw Error("notes_rest_client::is_logged_in " + error)
                    } **/
            },

            get_clientside_model: function () {
                return model
            }

        }

    }
)