package org.deepamehta.plugins.eduzen.migrations;

import java.util.logging.Logger;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.model.*;

/** This imperative migration is just a note on the current State-of-DB, it is not "Active" and was never tested. */

public class Migration3 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    private String REVIEW_SCORE = "org.deepamehta.reviews.score";

    private String WEB_RESOURCE_URI = "dm4.webbrowser.web_resource";
    private String WS_DEFAULT_URI = "de.workspaces.deepamehta";

    @Override
    public void run() {

        // 1) assign type of "org.deepamehta-reviews"-plugin to default workspace "DeepaMehta"
        TopicType reviewScore = dms.getTopicType(REVIEW_SCORE, null);
        assignWorkspace(reviewScore);
        // 2) assign more types of "org.deepamehta-tagging-resources"-plugin to default workspace "DeepaMehta"?
        
    }

    // === Workspace ===

    private void assignWorkspace(Topic topic) {
        if (hasWorkspace(topic)) {
            return;
        }
        Topic defaultWorkspace = dms.getTopic("uri", new SimpleValue(WS_DEFAULT_URI), false, null);
        dms.createAssociation(new AssociationModel("dm4.core.aggregation",
            new TopicRoleModel(topic.getId(), "dm4.core.parent"),
            new TopicRoleModel(defaultWorkspace.getId(), "dm4.core.child")
        ), null);
    }

    private boolean hasWorkspace(Topic topic) {
        return topic.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent", "dm4.core.child",
            "dm4.workspaces.workspace", false, false, 0, null).getSize() > 0;
    }
}