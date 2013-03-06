function AppModel() {

    var instance = (function() {

        var availableTags = undefined
        var availableResources = undefined

        return {
            setAvailableTags: function (elements) {
                availableTags = elements
            },
            getAvailableTags: function () {
                return availableTags
            },
            setAvailableResources: function (elements) {
                availableResources = elements
            },
            getAvailableResources: function () {
                return availableResources
            }
        };
    })();

    AppModel = function () { // re-define the function for subsequent calls
        return instance;
    };

    return AppModel(); // call the new function

    // js singleton implementation credits go to http://stackoverflow.com/users/5445/cms
    // with http://stackoverflow.com/questions/1895635/javascript-singleton-question#1895669

}