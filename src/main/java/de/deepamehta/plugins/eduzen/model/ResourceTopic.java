package de.deepamehta.plugins.eduzen.model;

import de.deepamehta.core.model.CompositeValueModel;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import de.deepamehta.core.model.TopicModel;

public class ResourceTopic extends TopicModel {

    public static final String TYPE = "dm4.resources.resource";
    public static final String NAME = "dm4.resources.name";
    public static final String CONTENT = "dm4.resources.content";
    //
    public static final String FILE = "dm4.files.file"; // identifies associated file and web contents
    public static final String FILE_PATH = "dm4.files.file_path"; // identifies associated file and web contents
    public static final String URL = "dm4.webbrowser.url"; // identifies associated file and web contents

    /**
     * @param model { name: "name", content: "content" }
     * @throws JSONException
     */
    public ResourceTopic(JSONObject json) throws JSONException {
        super(TYPE);
        //
        CompositeValueModel value = new CompositeValueModel();
        //
        setCompositeValue(value.put(NAME, json.getString("name")));
        setCompositeValue(value.put(CONTENT, json.getString("content")));
    }

}
