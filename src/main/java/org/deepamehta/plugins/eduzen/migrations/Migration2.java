package org.deepamehta.plugins.eduzen.migrations;

import java.util.logging.Logger;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.model.*;

public class Migration2 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    private String RESOURCE_URI = "org.deepamehta.resources.resource";
    private String RESOURCE_CONTENT_URI = "org.deepamehta.resources.content";
    private String REVIEW_SCORE = "org.deepamehta.reviews.score";
    private String TAG_URI = "dm4.tags.tag";

    private String WEB_RESOURCE_URI = "dm4.webbrowser.web_resource";
    private String WS_DEFAULT_URI = "de.workspaces.deepamehta";

    @Override
    public void run() {

        TopicType resource = dms.getTopicType(RESOURCE_URI);
        assignWorkspace(resource); // assign just the parent type to ws "DeepaMehta"

        // 1) Enrich the "Resource"-Type about many "Tags" and one "Score"
        resource.addAssocDef(new AssociationDefinitionModel("dm4.core.aggregation_def", RESOURCE_URI,
                TAG_URI, "dm4.core.one", "dm4.core.many"));
        resource.addAssocDef(new AssociationDefinitionModel("dm4.core.composition_def", RESOURCE_URI,
                REVIEW_SCORE, "dm4.core.one", "dm4.core.one"));

        // 2) Configure Simple MathJax Renderer from "dm4-mathjax-renderer"-plugin
        dms.getTopicType(RESOURCE_CONTENT_URI).getViewConfig().addSetting("dm4.webclient.view_config",
                "dm4.webclient.simple_renderer_uri", "tub.eduzen.mathjax_field_renderer");

        // 3) Enrich the "Resource"-Type about one "Web Resource"
        resource.addAssocDef(new AssociationDefinitionModel("dm4.core.aggregation_def",
            RESOURCE_URI, WEB_RESOURCE_URI, "dm4.core.one", "dm4.core.many"));

        // 4) hide "Web Resources" from "Create"-Menu, thus enforcing usage of our "Resource"-Topic
        dms.getTopicType(WEB_RESOURCE_URI).getViewConfig()
            .addSetting("dm4.webclient.view_config", "dm4.webclient.show_in_create_menu", false);

    }

    // === Workspace ===

    private void assignWorkspace(Topic topic) {
        if (hasWorkspace(topic)) {
            return;
        }
        Topic defaultWorkspace = dms.getTopic("uri", new SimpleValue(WS_DEFAULT_URI), false);
        dms.createAssociation(new AssociationModel("dm4.core.aggregation",
            new TopicRoleModel(topic.getId(), "dm4.core.parent"),
            new TopicRoleModel(defaultWorkspace.getId(), "dm4.core.child")
        ), null);
    }

    private boolean hasWorkspace(Topic topic) {
        return topic.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child",
            "dm4.workspaces.workspace", false, false, 0).getSize() > 0;
    }
}