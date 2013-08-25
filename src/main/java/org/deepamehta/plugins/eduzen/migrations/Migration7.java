package org.deepamehta.plugins.eduzen.migrations;

import java.util.logging.Logger;
import de.deepamehta.core.service.Migration;
import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.model.*;

/** This imperative migration is just a note on the current State-of-DB, it is not "Active" and was never tested. */

public class Migration7 extends Migration {

    private Logger logger = Logger.getLogger(getClass().getName());

    private String RESOURCE_TYPE_URI = "org.deepamehta.resources.resource";
    private String USER_ACCOUNT_TYPE_URI = "dm4.accesscontrol.user_account";

    private String BLOCKED_TYPE_URI = "org.deepamehta.resources.blocked_for_edits";
    private String STUDY_SUBJECT_TYPE_URI = "org.deepamehta.identity.subject_of_study";
    private String WS_DEFAULT_URI = "de.workspaces.deepamehta";

    @Override
    public void run() {

        // 1) assign new types to our default workspace
        TopicType blocked = dms.getTopicType(BLOCKED_TYPE_URI, null);
        assignWorkspace(blocked);
        TopicType study_subject = dms.getTopicType(STUDY_SUBJECT_TYPE_URI, null);
        assignWorkspace(study_subject);

        // 2) assign new types t o"org.deepamehta.resources.*" and "org.deepamehta.identity.*"

        TopicType account = dms.getTopicType(USER_ACCOUNT_TYPE_URI, null);
        logger.info("Eduzen Tagging Notes Migration7 => Enriching \"User Account\"-Type about \"Subject of study\"");
        account.addAssocDef(new AssociationDefinitionModel("dm4.core.composition_def", USER_ACCOUNT_TYPE_URI,
            STUDY_SUBJECT_TYPE_URI, "dm4.core.one", "dm4.core.one"));

        TopicType resource = dms.getTopicType(RESOURCE_TYPE_URI, null);
        logger.info("Eduzen Tagging Notes Migration7 => Enriching \"Resource\"-Type about \"Blocked for edits\"");
        resource.addAssocDef(new AssociationDefinitionModel("dm4.core.composition_def", RESOURCE_TYPE_URI,
            BLOCKED_TYPE_URI, "dm4.core.one", "dm4.core.one"));

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